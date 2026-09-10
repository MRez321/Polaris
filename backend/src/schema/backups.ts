import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, json, datetime } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Backup system settings (Settings → پشتیبان‌گیری)
// ---------------------------------------------------------------------------

/**
 * Backup settings (single JSON-blob row, same pattern as
 * notificationSettings/companySettings): schedule toggle + interval,
 * retention, storage facts, cPanel API credentials and Telegram notify flag.
 * The cPanel token is a secret but must be editable from the UI, so unlike
 * notification secrets it lives in this row (admin-only surface).
 */
export const backupSettings = mysqlTable('backup_settings', {
    id: varchar('id', { length: 36 }).primaryKey(),
    data: json('data').$type<Record<string, unknown>>().notNull(),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
