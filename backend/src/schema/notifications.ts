import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, datetime, json } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Notifications tables: outbound Telegram / Melipayamak integrations
// ---------------------------------------------------------------------------

/**
 * Notification settings (single JSON-blob row, same pattern as
 * websiteSettings/companySettings): Telegram bot + Melipayamak SMS panel
 * toggles and recipients. Secrets (bot token, API key) live in .env and are
 * never stored here — this row only holds user-facing switches.
 */
export const notificationSettings = mysqlTable('notification_settings', {
    id: varchar('id', { length: 36 }).primaryKey(),
    data: json('data').$type<Record<string, unknown>>().notNull(),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
