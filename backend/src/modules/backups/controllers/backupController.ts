/**
 * Backup endpoints. All routes are admin-only (mounted under the workshop
 * admin chain). Zod at the boundary, Persian audit messages, streaming
 * downloads guarded against path traversal.
 */
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import * as backupSettingsService from '../services/backupSettingsService.js';
import * as backupService from '../services/backupService.js';
import { BACKUPS_DIR } from '../services/backupService.js';
import { logAudit } from '../../../core/services/auditService.js';
import { pathParam, badRequest } from '../../../core/utils/apiError.js';

const backupSettingsSchema = z.object({
    autoEnabled: z.boolean().optional(),
    scheduleHours: z.number().int().min(1).max(720).optional(),
    retention: z.number().int().min(0).max(200).optional(),
    autoKind: z.enum(['database', 'website', 'full']).optional(),
    cpanelHost: z.string().max(255).optional(),
    cpanelUser: z.string().max(64).optional(),
    cpanelToken: z.string().max(255).optional(),
    notifyTelegram: z.boolean().optional(),
});

const runBackupSchema = z.object({
    kind: z.enum(['database', 'website', 'full', 'cpanel']),
});

export async function getBackupSettings(_req: Request, res: Response): Promise<void> {
    res.json(await backupSettingsService.getBackupSettings());
}

export async function updateBackupSettings(req: Request, res: Response): Promise<void> {
    const patch = backupSettingsSchema.parse(req.body);
    const updated = await backupSettingsService.updateBackupSettings(patch);
    logAudit(
        req.auth ?? null,
        'update',
        'backup',
        'تنظیمات پشتیبان‌گیری ذخیره شد',
        req.ip,
    );
    res.json(updated);
}

export async function listBackups(_req: Request, res: Response): Promise<void> {
    res.json(backupService.listBackupFiles());
}

export async function runBackupNow(req: Request, res: Response): Promise<void> {
    const { kind } = runBackupSchema.parse(req.body);

    // Host-side cPanel backup: UAPI call, no local file produced.
    if (kind === 'cpanel') {
        const settings = await backupSettingsService.getBackupSettings();
        await backupService.triggerCpanelFullBackup(settings);
        logAudit(
            req.auth ?? null,
            'create',
            'backup',
            'درخواست پشتیبان کامل روی هاست cPanel ثبت شد',
            req.ip,
        );
        backupService.announceBackup('full', null, false);
        res.json({ message: 'درخواست پشتیبان‌گیری روی هاست ثبت شد — پس از تکمیل، فایل در حساب cPanel شما قرار می‌گیرد' });
        return;
    }

    const meta = await backupService.runBackup(kind, false);
    logAudit(
        req.auth ?? null,
        'create',
        'backup',
        `پشتیبان ${kind === 'database' ? 'دیتابیس' : kind === 'website' ? 'فایل‌های سایت' : 'کامل'} ساخته شد: ${meta.filename}`,
        req.ip,
    );
    backupService.announceBackup(kind, meta, false);
    res.status(201).json(meta);
}

export async function downloadBackup(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه پشتیبان');
    const filePath = backupService.getBackupFilePath(id);
    const filename = backupService.getBackupFilename(id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
        if (!res.headersSent) res.status(500).json({ error: 'خطا در خواندن فایل پشتیبان' });
        else stream.destroy();
    });
    stream.pipe(res);
}

export async function deleteBackup(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه پشتیبان');
    const filename = await backupService.deleteBackupFile(id);
    logAudit(
        req.auth ?? null,
        'delete',
        'backup',
        `فایل پشتیبان «${filename}» حذف شد`,
        req.ip,
    );
    res.json({ message: 'فایل پشتیبان حذف شد' });
}

/** Scheduler tick: run the configured automatic backup when due. */
export async function runScheduledBackupIfDue(): Promise<void> {
    const settings = await backupSettingsService.getBackupSettings();
    if (!settings.autoEnabled || settings.scheduleHours <= 0) return;

    const last = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
    const dueAt = last + settings.scheduleHours * 3_600_000;
    if (Date.now() < dueAt) return;

    try {
        const meta = await backupService.runBackup(settings.autoKind, true);
        await backupSettingsService.markBackupCompleted(new Date());
        console.log(`🗂️  پشتیبان خودکار ساخته شد: ${meta.filename}`);
        logAudit(null, 'create', 'backup', `پشتیبان خودکار ساخته شد: ${meta.filename}`);
        backupService.announceBackup(settings.autoKind, meta, true);
    } catch (err) {
        console.error('⚠️ Automatic backup failed:', err instanceof Error ? err.message : err);
    }
}

/** Boot-time init shared with server.ts: ensure the storage dir exists. */
export function initBackups(): void {
    backupService.ensureBackupsDir();
    fs.writeFileSync(path.join(BACKUPS_DIR, '.gitkeep'), '');
}

