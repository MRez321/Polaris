import { sql } from 'drizzle-orm';
import {
    mysqlTable,
    varchar,
    boolean,
    datetime,
    text,
    index,
} from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// better-auth core tables (admin plugin adds role/banned fields to user)
// ---------------------------------------------------------------------------

export const user = mysqlTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: varchar('image', { length: 512 }),
    role: varchar('role', { length: 32 }),
    banned: boolean('banned').notNull().default(false),
    banReason: varchar('ban_reason', { length: 255 }),
    banExpires: datetime('ban_expires'),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const session = mysqlTable(
    'session',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        token: varchar('token', { length: 255 }).notNull().unique(),
        expiresAt: datetime('expires_at').notNull(),
        ipAddress: varchar('ip_address', { length: 64 }),
        userAgent: varchar('user_agent', { length: 512 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = mysqlTable(
    'account',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        accountId: varchar('account_id', { length: 255 }).notNull(),
        providerId: varchar('provider_id', { length: 255 }).notNull(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: datetime('access_token_expires_at'),
        refreshTokenExpiresAt: datetime('refresh_token_expires_at'),
        scope: varchar('scope', { length: 255 }),
        password: varchar('password', { length: 255 }),
        issuer: varchar('issuer', { length: 255 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = mysqlTable(
    'verification',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        identifier: varchar('identifier', { length: 255 }).notNull(),
        value: text('value').notNull(),
        expiresAt: datetime('expires_at').notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('verification_identifier_idx').on(t.identifier)],
);
