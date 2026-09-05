import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, datetime, bigint, json, index } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Customer orders (public storefront checkout)
// ---------------------------------------------------------------------------

/** One line of a customer order; prices are snapshots from the order moment. */
export interface OrderItemLine {
    itemId: string;
    code: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    imageUrl?: string;
}

/**
 * Customer orders placed through the public storefront checkout. Prices and
 * totals are computed server-side from the items table (never trusted from
 * the client) and stock is decremented inside the create transaction.
 */
export const orders = mysqlTable(
    'orders',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).notNull().unique(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        customerName: varchar('customer_name', { length: 255 }).notNull(),
        phone: varchar('phone', { length: 32 }).notNull(),
        city: varchar('city', { length: 128 }).notNull().default(''),
        province: varchar('province', { length: 64 }).notNull().default(''),
        postalCode: varchar('postal_code', { length: 16 }).notNull().default(''),
        trackingCode: varchar('tracking_code', { length: 64 }),
        deliveredAt: datetime('delivered_at'),
        address: text('address').notNull(),
        note: text('note'),
        paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('cod'),
        status: varchar('status', { length: 32 }).notNull().default('pending'),
        total: bigint('total', { mode: 'number' }).notNull().default(0),
        items: json('items').$type<OrderItemLine[]>().notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('orders_user_id_idx').on(t.userId),
        index('orders_status_idx').on(t.status),
        index('orders_created_at_idx').on(t.createdAt),
    ],
);
