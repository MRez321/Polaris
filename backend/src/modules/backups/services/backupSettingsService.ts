/**
 * Backup settings persistence — single JSON-blob row (id='backups') in the
 * backup_settings table, same pattern as notificationService. Channel-level
 * deep-merge so partial PUTs don't wipe fields, upsert on save.
 */
import { eq } from 'drizzle-orm';

import { db } from '../../../config/drizzle.js';
import { backupSettings } from '../../../schema/index.js';

/** What a backup includes — mirrored from backupService (no circular import). */
type BackupKind = 'database' | 'website' | 'full';
export const SETTINGS_ROW_ID = 'backups';

export interface BackupSettingsData {
    autoEnabled: boolean;
    /** Interval between scheduled backups in hours (>=1). */
    scheduleHours: number;
    /** Keep at most N backup files; older pruned. 0 = keep everything. */
    retention: number;
    /** What a scheduled backup includes: database / website / full. */
    autoKind: BackupKind;
    /** cPanel host for host-side backups, e.g. server1.example.com. */
    cpanelHost: string;
    /** cPanel username (API token owner). */
    cpanelUser: string;
    /** cPanel API token — secret, editable from the admin UI. */
    cpanelToken: string;
    /** Telegram announcement after each scheduled backup. */
    notifyTelegram: boolean;
    /** ISO timestamp of the last completed backup (server-managed). */
    lastBackupAt: string;
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettingsData = {
    autoEnabled: false,
    scheduleHours: 24,
    retention: 10,
    autoKind: 'full',
    cpanelHost: '',
    cpanelUser: '',
    cpanelToken: '',
    notifyTelegram: false,
    lastBackupAt: '',
};

function mergeSettings(
    current: Partial<BackupSettingsData>,
    patch: Partial<BackupSettingsData>,
): BackupSettingsData {
    const merged: BackupSettingsData = { ...DEFAULT_BACKUP_SETTINGS, ...current };
    if (patch.autoEnabled !== undefined) merged.autoEnabled = patch.autoEnabled;
    if (patch.scheduleHours !== undefined) merged.scheduleHours = patch.scheduleHours;
    if (patch.retention !== undefined) merged.retention = patch.retention;
    if (patch.autoKind !== undefined) merged.autoKind = patch.autoKind;
    if (patch.cpanelHost !== undefined) merged.cpanelHost = patch.cpanelHost;
    if (patch.cpanelUser !== undefined) merged.cpanelUser = patch.cpanelUser;
    if (patch.cpanelToken !== undefined) merged.cpanelToken = patch.cpanelToken;
    if (patch.notifyTelegram !== undefined) merged.notifyTelegram = patch.notifyTelegram;
    // lastBackupAt is server-managed — never patched from the UI payload.
    return merged;
}

export async function getBackupSettings(): Promise<BackupSettingsData> {
    const [row] = await db.select().from(backupSettings).where(eq(backupSettings.id, SETTINGS_ROW_ID));
    if (!row) return { ...DEFAULT_BACKUP_SETTINGS };
    const stored = (row.data ?? {}) as Partial<BackupSettingsData>;
    return mergeSettings(stored, {});
}

export async function updateBackupSettings(patch: Partial<BackupSettingsData>): Promise<BackupSettingsData> {
    const current = await getBackupSettings();
    const merged = mergeSettings(current, patch);
    await db
        .insert(backupSettings)
        .values({ id: SETTINGS_ROW_ID, data: merged as unknown as Record<string, unknown> })
        .onDuplicateKeyUpdate({ set: { data: merged as unknown as Record<string, unknown>, updatedAt: new Date() } });
    return merged;
}

/** Server-internal: stamps the last completed backup time. */
export async function markBackupCompleted(at: Date): Promise<void> {
    const current = await getBackupSettings();
    const merged = { ...current, lastBackupAt: at.toISOString() };
    await db
        .insert(backupSettings)
        .values({ id: SETTINGS_ROW_ID, data: merged as unknown as Record<string, unknown> })
        .onDuplicateKeyUpdate({ set: { data: merged as unknown as Record<string, unknown>, updatedAt: new Date() } });
}
