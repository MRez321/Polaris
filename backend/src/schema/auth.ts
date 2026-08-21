// backend/src/schema/auth.ts
import { mysqlTable, varchar, boolean, timestamp, text } from 'drizzle-orm/mysql-core';

export const user = mysqlTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    emailVerified: boolean('email_verified').default(false),
    image: varchar('image', { length: 500 }),
    role: varchar('role', { length: 50 }).default('user'),
    password: varchar('password', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
    deletedAt: timestamp('deleted_at'),
});

export const session = mysqlTable('session', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
});

export const account = mysqlTable('account', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
    providerId: varchar('provider_id', { length: 50 }).notNull(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    accessToken: varchar('access_token', { length: 500 }),
    refreshToken: varchar('refresh_token', { length: 500 }),
    expiresAt: timestamp('expires_at'),
    issuer: varchar('issuer', { length: 255 }),
});

export const verification = mysqlTable('verification', {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: varchar('value', { length: 500 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const auditLog = mysqlTable('audit_log', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => user.id),
    action: varchar('action', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 100 }),
    details: text('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow(),
});