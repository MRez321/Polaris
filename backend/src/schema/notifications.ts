import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, datetime, json, index } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// In-app workshop notifications (bell panel). NOT the outbound Telegram /
// Melipayamak settings row (notification_settings below) — this file now
// also owns the in-app event feed consumed by the workshop header bell.
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

/**
 * In-app notification events shown in the workshop bell panel.
 *
 * Two flavors share one table:
 *  - Event rows (type critical/need_action/notification/system) written at
 *    business-action touch points (payment recorded, handover created, stock
 *    transitions, settings change, login).
 *  - Read-markers for *derived* notifications (overdue consignment, low
 *    stock, …) that are computed on read and have no stored event. Those use
 *    entityType='derived_marker' + entityId like "overdue:HND-0007", with a
 *    null type/title/body; they only remember "the user marked this state
 *    as read" so it disappears from the unread feed until the state clears.
 */
export const workshopNotifications = mysqlTable(
    'workshop_notifications',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        type: varchar('type', { length: 32 }),
        title: varchar('title', { length: 255 }),
        body: text('body'),
        entityType: varchar('entity_type', { length: 64 }).notNull(),
        entityId: varchar('entity_id', { length: 128 }).notNull(),
        link: varchar('link', { length: 255 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        readAt: datetime('read_at'),
    },
    (t) => [
        index('workshop_notifications_created_at_idx').on(t.createdAt),
        index('workshop_notifications_entity_idx').on(t.entityType, t.entityId),
    ],
);
