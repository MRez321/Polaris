import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, datetime, json } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Company settings (workshop branding: one row consumed by both CMS public
// pages and the workshop control panel)
// ---------------------------------------------------------------------------

export const companySettings = mysqlTable('company_settings', {
    id: varchar('id', { length: 36 }).primaryKey(),
    data: json('data').$type<Record<string, unknown>>().notNull(),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
