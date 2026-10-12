import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, datetime, int, bigint, boolean, index } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// P0-D sales types — channel kinds, order lifecycle, seller-sale lifecycle,
// commission model, payment methods, and currencies. These are the
// server-side vocabularies; frontend DTOs mirror them in types/index.ts.
// ---------------------------------------------------------------------------

export type SalesChannelType =
    | 'website'
    | 'instagram'
    | 'telegram'
    | 'bale'
    | 'eitaa'
    | 'basalam'
    | 'wholesale'
    | 'consignment'
    | 'manual_retail';

export type SalesOrderType = 'retail' | 'wholesale' | 'consignment' | 'manual';

export type SalesOrderStatus =
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'paid'
    | 'picking'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'returned'
    | 'refunded'
    | 'cancelled';

export type SalesPaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'voided';

export type SellerSaleStatus = 'draft' | 'submitted' | 'confirmed' | 'settled' | 'cancelled';

export type CommissionType = 'percentage' | 'fixed' | 'none';

export type SalesPaymentMethod = 'cash' | 'card_transfer' | 'bank_transfer' | 'pos' | 'cheque';

export type CurrencyCode = 'IRT' | 'USD';

// ---------------------------------------------------------------------------
// seller_sales: a seller's actual sale of consigned inventory (or direct
// stock). Distinct from a consignment handover (inventory moved into seller
// custody) — handover ≠ sale. A seller sale is a financial event: the seller
// sold an item and owes commission / is owed settlement.
// ---------------------------------------------------------------------------

export const sellerSales = mysqlTable(
    'seller_sales',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).notNull().unique(),
        sellerId: varchar('seller_id', { length: 36 }).notNull(),
        channelId: varchar('channel_id', { length: 36 }).notNull(),
        saleDate: datetime('sale_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
        commissionAmount: bigint('commission_amount', { mode: 'number' }).notNull().default(0),
        netSettlementAmount: bigint('net_settlement_amount', { mode: 'number' }).notNull().default(0),
        settledAmount: bigint('settled_amount', { mode: 'number' }).notNull().default(0),
        remainingSettlement: bigint('remaining_settlement', { mode: 'number' }).notNull().default(0),
        note: text('note'),
        submittedBy: varchar('submitted_by', { length: 36 }),
        confirmedBy: varchar('confirmed_by', { length: 36 }),
        confirmedAt: datetime('confirmed_at'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        isDeleted: boolean('is_deleted').notNull().default(false),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('seller_sales_seller_id_idx').on(t.sellerId),
        index('seller_sales_channel_id_idx').on(t.channelId),
        index('seller_sales_code_idx').on(t.code),
        index('seller_sales_status_idx').on(t.status),
        index('seller_sales_sale_date_idx').on(t.saleDate),
        index('seller_sales_is_deleted_idx').on(t.isDeleted),
    ],
);

export const sellerSaleLines = mysqlTable(
    'seller_sale_lines',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        sellerSaleId: varchar('seller_sale_id', { length: 36 }).notNull(),
        itemId: varchar('item_id', { length: 36 }),
        itemCode: varchar('item_code', { length: 32 }),
        itemName: varchar('item_name', { length: 255 }),
        size: varchar('size', { length: 64 }),
        color: varchar('color', { length: 64 }),
        quantity: int('quantity').notNull(),
        unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
        lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('seller_sale_lines_sale_id_idx').on(t.sellerSaleId),
        index('seller_sale_lines_item_id_idx').on(t.itemId),
    ],
);
