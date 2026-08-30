import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, timestamp, index } from 'drizzle-orm/mysql-core';

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
        details: text('details').notNull(),
        ipAddress: varchar('ip_address', { length: 64 }),
        createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('audit_logs_created_at_idx').on(t.createdAt)],
);
