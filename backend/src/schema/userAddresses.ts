import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, datetime, boolean, index } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Customer address book (public storefront profile + checkout)
// ---------------------------------------------------------------------------

/**
 * A saved shipping address owned by a website customer. Multiple addresses
 * per user; exactly one may be flagged `isDefault` at a time (enforced in the
 * service layer, which clears the previous default in the same update).
 */
export const userAddresses = mysqlTable(
    'user_addresses',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        label: varchar('label', { length: 64 }).notNull().default(''),
        receiverName: varchar('receiver_name', { length: 255 }).notNull(),
        phone: varchar('phone', { length: 32 }).notNull(),
        province: varchar('province', { length: 64 }).notNull().default(''),
        city: varchar('city', { length: 128 }).notNull().default(''),
        postalCode: varchar('postal_code', { length: 16 }).notNull().default(''),
        address: text('address').notNull(),
        isDefault: boolean('is_default').notNull().default(false),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('user_addresses_user_id_idx').on(t.userId)],
);
