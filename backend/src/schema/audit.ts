import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, timestamp, index, json } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Audit trail (cross-module, written by core auditService)
// ---------------------------------------------------------------------------

export const auditLogs = mysqlTable(
    'audit_logs',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        userId: varchar('user_id', { length: 36 }).notNull().default(''),
        userName: varchar('user_name', { length: 255 }).notNull().default(''),
        userRole: varchar('user_role', { length: 32 }),
        action: varchar('action', { length: 64 }).notNull(),
        entity: varchar('entity', { length: 32 }).notNull(),
        // P0-B enrichment (item 27): structured entity identity + before/after
        // snapshots + user agent + arbitrary metadata. Legacy `entity` stays
        // (historical rows read through it; P0-F drops it).
        entityType: varchar('entity_type', { length: 64 }).notNull().default(''),
        entityId: varchar('entity_id', { length: 64 }),
        beforeJson: json('before_json'),
        afterJson: json('after_json'),
        userAgent: varchar('user_agent', { length: 255 }),
        metadata: json('metadata'),
        details: text('details').notNull(),
        ipAddress: varchar('ip_address', { length: 64 }),
        createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('audit_logs_created_at_idx').on(t.createdAt),
        index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    ],
);
