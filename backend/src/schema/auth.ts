import { mysqlTable, varchar, boolean, timestamp, int, text } from 'drizzle-orm/mysql-core';

// 1. Users Table (Extended with Roles and Soft Delete)
export const user = mysqlTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    emailVerified: boolean('email_verified').default(false),
    image: varchar('image', { length: 500 }), // Profile picture from Google/GitHub
    role: varchar('role', { length: 50 }).default('user'), // admin, manager, user
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
    deletedAt: timestamp('deleted_at'), // Soft Delete column
});

// 2. Sessions Table (Required by Better Auth)
export const session = mysqlTable('session', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
});

// 3. Accounts Table (For Account Linking: Google/GitHub/Email)
export const account = mysqlTable('account', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
    providerId: varchar('provider_id', { length: 50 }).notNull(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    accessToken: varchar('access_token', { length: 500 }),
    refreshToken: varchar('refresh_token', { length: 500 }),
    expiresAt: timestamp('expires_at'),
});

// 4. Verification Table (For email verification tokens)
export const verification = mysqlTable('verification', {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: varchar('value', { length: 500 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(), // <--- ADDED THIS
});

// 5. Audit Logs (To track who did what)
export const auditLog = mysqlTable('audit_log', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => user.id),
    action: varchar('action', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 100 }),
    details: text('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow(),
});