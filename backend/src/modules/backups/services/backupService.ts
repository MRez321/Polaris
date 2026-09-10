/**
 * Backup engine: database dumps (mysqldump), website file archives (tar) and
 * combined full backups, plus retention pruning, the cPanel full-backup
 * trigger (UAPI) and Telegram announcements. Everything is spawned through
 * child_process with PATH → common-install-dir → env-override resolution so
 * the same code works on the Windows dev box and the cPanel Linux host.
 *
 * Storage layout: backend/backups/<kind>-YYYYMMDD-HHmmss.(sql.gz|tar.gz).
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { badRequest, notFound } from '../../../core/utils/apiError.js';
import {
    getBackupSettings,
    type BackupSettingsData,
} from './backupSettingsService.js';
import { sendTelegramMessage } from '../../notifications/services/telegramService.js';
import { logAudit } from '../../../core/services/auditService.js';

/** What a backup includes. Local alias — shared with frontend types by value. */
export type BackupKind = 'database' | 'website' | 'full';

export const BACKUPS_DIR = path.join(process.cwd(), 'backups');

/** mkdir -p for the storage dir; cheap enough to call before every build. */
export function ensureBackupsDir(): void {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export interface BackupFileMeta {
    id: string;
    filename: string;
    kind: BackupKind | 'database-sql';
    size: number;
    createdAt: string;
    automatic: boolean;
}

// ---------------------------------------------------------------------------
// External binary resolution (mysqldump / tar)
// ---------------------------------------------------------------------------

const COMMON_MYSQLDUMP_DIRS = [
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin',
    'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin',
    '/usr/bin',
    '/usr/local/bin',
    '/usr/local/mysql/bin',
];

/** Resolves mysqldump: env override → PATH → common install dirs. */
function resolveMysqldump(): string {
    const envOverride = process.env.MYSQLDUMP_PATH;
    if (envOverride && fs.existsSync(envOverride)) return envOverride;

    const fromPath = resolveOnPath('mysqldump');
    if (fromPath) return fromPath;

    const exe = process.platform === 'win32' ? 'mysqldump.exe' : 'mysqldump';
    for (const dir of COMMON_MYSQLDUMP_DIRS) {
        const candidate = path.join(dir, exe);
        if (fs.existsSync(candidate)) return candidate;
    }
    throw badRequest(
        'برنامه mysqldump روی سرور پیدا نشد — مسیر آن را در متغیر محیطی MYSQLDUMP_PATH تنظیم کنید',
    );
}

/** Resolves tar: env override → PATH → Windows System32 fallback. */
function resolveTar(): string {
    const envOverride = process.env.TAR_PATH;
    if (envOverride && fs.existsSync(envOverride)) return envOverride;

    const fromPath = resolveOnPath('tar');
    if (fromPath) return fromPath;

    if (process.platform === 'win32') {
        const candidate = 'C:\\Windows\\System32\\tar.exe';
        if (fs.existsSync(candidate)) return candidate;
    }
    throw badRequest('برنامه tar روی سرور پیدا نشد — مسیر آن را در متغیر محیطی TAR_PATH تنظیم کنید');
}

/** where/which lookup without spawning a shell. */
function resolveOnPath(binary: string): string | null {
    const exe = process.platform === 'win32' ? `${binary}.exe` : binary;
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
        if (!dir) continue;
        const candidate = path.join(dir, exe);
        try {
            fs.accessSync(candidate, fs.constants.X_OK);
            return candidate;
        } catch {
            // keep scanning
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------
interface SpawnResult {
    code: number;
    stderr: string;
}

function runCommand(bin: string, args: string[], opts?: { cwd?: string }): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, { shell: false, cwd: opts?.cwd });
        let stderr = '';
        child.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString('utf8');
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code: code ?? -1, stderr }));
    });
}

/** Runs a command, piping stdout into a file stream; rejects on spawn errors. */
function runCommandToFile(bin: string, args: string[], outFile: string): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(outFile);
        const child = spawn(bin, args, { shell: false });
        let stderr = '';
        child.stdout.pipe(out);
        child.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString('utf8');
        });
        out.on('error', reject);
        child.on('error', (err: Error) => {
            out.destroy();
            reject(err);
        });
        child.on('close', (code) => {
            out.end(() => resolve({ code: code ?? -1, stderr }));
        });
    });
}


/** yyyyMMdd-HHmmss stamp used in every backup filename. */
function timestampName(): string {
    const d = new Date();
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** DB dump: mysqldump → .sql, then tar-czipped into .sql.gz. */
async function buildDatabaseBackup(): Promise<BackupFileMeta> {
    ensureBackupsDir();
    const mysqldump = resolveMysqldump();
    const filename = `db-${timestampName()}.sql`;
    const outFile = path.join(BACKUPS_DIR, filename);

    const args = [
        `--host=${process.env.DB_HOST ?? '127.0.0.1'}`,
        `--port=${process.env.DB_PORT ?? '3306'}`,
        `--user=${process.env.DB_USER ?? 'root'}`,
        `--password=${process.env.DB_PASSWORD ?? ''}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--default-character-set=utf8mb4',
        '--result-file',
        outFile,
    ];
    const { code, stderr } = await runCommand(mysqldump, [
        ...args,
        process.env.DB_NAME ?? 'polaris',
    ]);
    if (code !== 0) {
        try {
            fs.unlinkSync(outFile);
        } catch {
            /* best effort */
        }
        throw badRequest(`mysqldump خطا داد: ${stderr.trim().slice(0, 300)}`);
    }
    // gzip the dump (mysqldump --result-file can't compress on Windows builds)
    const { code: gzCode, stderr: gzErr } = await runCommand(resolveTar(), [
        '-czf',
        `${outFile}.gz`,
        '-C',
        BACKUPS_DIR,
        filename,
    ]);
    if (gzCode !== 0) {
        try {
            fs.unlinkSync(outFile);
        } catch {
            /* best effort */
        }
        throw badRequest(`فشرده‌سازی پشتیبان دیتابیس شکست خورد: ${gzErr.trim().slice(0, 300)}`);
    }
    fs.unlinkSync(outFile);

    const gzName = `${filename}.gz`;
    return metaFromFile(gzName, 'database', false);
}

/** Website archive: app source/config, excluding runtime + heavy dirs. */
async function buildWebsiteBackup(): Promise<BackupFileMeta> {
    ensureBackupsDir();
    const tar = resolveTar();
    const filename = `site-${timestampName()}.tar.gz`;
    const outFile = path.join(BACKUPS_DIR, filename);

    // Tar the backend root (source + package.json + drizzle + .env.example)
    // while excluding node_modules, backups themselves, uploads, dist/public.
    const { code, stderr } = await runCommand(tar, [
        '-czf',
        outFile,
        '--exclude=node_modules',
        '--exclude=backups',
        '--exclude=uploads',
        '--exclude=dist',
        '--exclude=public',
        '--exclude=.tmp',
        '-C',
        process.cwd(),
        'src',
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'drizzle',
    ]);
    if (code !== 0) {
        try {
            fs.unlinkSync(outFile);
        } catch {
            /* best effort */
        }
        throw badRequest(`ساخت پشتیبان فایل‌های سایت شکست خورد: ${stderr.trim().slice(0, 300)}`);
    }
    return metaFromFile(filename, 'website', false);
}

/** Full = database dump + website archive in one tar.gz. */
async function buildFullBackup(): Promise<BackupFileMeta> {
    ensureBackupsDir();
    // Reuse the builders, then bundle both artifacts into one archive.
    const dbMeta = await buildDatabaseBackup();
    const siteMeta = await buildWebsiteBackup();
    const tar = resolveTar();
    const filename = `full-${timestampName()}.tar.gz`;
    const outFile = path.join(BACKUPS_DIR, filename);

    const { code, stderr } = await runCommand(tar, [
        '-czf',
        outFile,
        '-C',
        BACKUPS_DIR,
        dbMeta.filename,
        siteMeta.filename,
    ]);
    // The two components are already safely stored; bundle failure is fatal
    // for the run but must not delete them.
    if (code !== 0) {
        try {
            fs.unlinkSync(outFile);
        } catch {
            /* best effort */
        }
        throw badRequest(`ساخت پشتیبان کامل شکست خورد: ${stderr.trim().slice(0, 300)}`);
    }
    return metaFromFile(filename, 'full', false);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function metaFromFile(filename: string, kind: BackupKind, automatic: boolean): BackupFileMeta {
    const full = path.join(BACKUPS_DIR, filename);
    const stat = fs.statSync(full);
    return {
        id: Buffer.from(filename).toString('base64url'),
        filename,
        kind,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        automatic,
    };
}

/** Lists every backup file, newest first. */
export function listBackupFiles(): BackupFileMeta[] {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.gz') || f.endsWith('.sql'))
        .map((f) => metaFromFile(f, kindFromFilename(f), f.startsWith('auto-')))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function kindFromFilename(filename: string): BackupKind {
    if (filename.startsWith('db-') || filename.startsWith('auto-db-')) return 'database';
    if (filename.startsWith('site-')) return 'website';
    return 'full';
}

function resolveBackupPath(id: string): string {
    // id is base64url(filename); guard against traversal by re-checking the
    // decoded name is a bare file name present in the backups dir.
    let filename: string;
    try {
        filename = Buffer.from(id, 'base64url').toString('utf8');
    } catch {
        throw notFound('پشتیبان موردنظر یافت نشد');
    }
    if (
        !filename ||
        filename.includes('/') ||
        filename.includes('\\') ||
        filename.includes('..') ||
        path.resolve(BACKUPS_DIR, filename) !== path.join(BACKUPS_DIR, filename)
    ) {
        throw notFound('پشتیبان موردنظر یافت نشد');
    }
    const full = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(full)) throw notFound('پشتیبان موردنظر یافت نشد');
    return full;
}

export function getBackupFilePath(id: string): string {
    return resolveBackupPath(id);
}

export function getBackupFilename(id: string): string {
    return path.basename(resolveBackupPath(id));
}

export async function deleteBackupFile(id: string): Promise<string> {
    const full = resolveBackupPath(id);
    const filename = path.basename(full);
    fs.unlinkSync(full);
    return filename;
}

/** Runs a backup now. `automatic` marks scheduler-triggered runs. */
export async function runBackup(
    kind: BackupKind,
    automatic = false,
): Promise<BackupFileMeta> {
    let meta: BackupFileMeta;
    if (automatic) {
        meta = await buildWithAutoPrefix(kind);
    } else {
        meta =
            kind === 'database'
                ? await buildDatabaseBackup()
                : kind === 'website'
                  ? await buildWebsiteBackup()
                  : await buildFullBackup();
    }
    await pruneOldBackups();
    return meta;
}

/** Scheduler wrapper: same builders, `auto-` filename prefix. */
async function buildWithAutoPrefix(kind: BackupKind): Promise<BackupFileMeta> {
    const meta =
        kind === 'database'
            ? await buildDatabaseBackup()
            : kind === 'website'
              ? await buildWebsiteBackup()
              : await buildFullBackup();
    // Mark as automatic by renaming with the auto- prefix.
    const marked = `auto-${meta.filename}`;
    fs.renameSync(path.join(BACKUPS_DIR, meta.filename), path.join(BACKUPS_DIR, marked));
    return metaFromFile(marked, kind, true);
}

/** Keeps at most `retention` backups (oldest pruned). 0 = keep everything. */
export async function pruneOldBackups(): Promise<number> {
    const settings = await getBackupSettings();
    if (!settings.retention || settings.retention <= 0) return 0;
    const files = listBackupFiles();
    const excess = files.slice(settings.retention);
    for (const f of excess) {
        try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f.filename));
        } catch {
            /* already gone */
        }
    }
    return excess.length;
}

// ---------------------------------------------------------------------------
// cPanel host-side full backup (UAPI)
// ---------------------------------------------------------------------------

/** Triggers a cPanel full backup via UAPI (host-side, support-restorable). */
export async function triggerCpanelFullBackup(settings: BackupSettingsData): Promise<void> {
    if (!settings.cpanelHost || !settings.cpanelUser || !settings.cpanelToken) {
        throw badRequest('برای پشتیبان‌گیری از cPanel، هاست، نام کاربری و توکن باید تنظیم شده باشند');
    }
    const host = settings.cpanelHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const url = `https://${host}:2083/execute/Backup/fullbackup`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `cpanel ${settings.cpanelUser}:${settings.cpanelToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });
    if (!res.ok) {
        throw badRequest(`خطای cPanel (کد ${res.status}) — هاست و توکن را بررسی کنید`);
    }
    const payload = (await res.json().catch(() => null)) as
        | { status?: number; messages?: string[]; errors?: string[] }
        | null;
    if (payload?.status !== 1) {
        const detail = payload?.errors?.join('؛ ') ?? payload?.messages?.join('؛ ') ?? '';
        throw badRequest(`cPanel پشتیبان‌گیری را نپذیرفت${detail ? `: ${detail}` : ''}`);
    }
}

// ---------------------------------------------------------------------------
// Telegram announcement
// ---------------------------------------------------------------------------

/** Fire-and-forget Telegram notice after a backup completes. */
export function announceBackup(
    kind: BackupKind,
    meta: BackupFileMeta | null,
    automatic: boolean,
): void {
    void getBackupSettings()
        .then(async (settings) => {
            if (!settings.notifyTelegram) return;
            const labels: Record<BackupKind, string> = {
                database: 'دیتابیس',
                website: 'فایل‌های سایت',
                full: 'کامل (دیتابیس + فایل‌ها)',
            };
            const sizeMb = meta ? (meta.size / (1024 * 1024)).toFixed(1) : '؟';
            const text = [
                `✅ پشتیبان‌گیری ${automatic ? 'خودکار' : 'دستی'} انجام شد`,
                `نوع: ${labels[kind]}`,
                meta ? `فایل: ${meta.filename} (${sizeMb} مگابایت)` : 'پشتیبان روی هاست cPanel ثبت شد',
            ].join('\n');
            await sendTelegramMessage(text);
        })
        .catch((err: unknown) => {
            console.error('⚠️ Backup Telegram notice failed:', err);
        });
}

