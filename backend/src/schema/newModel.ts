import { sql } from 'drizzle-orm';
import {
    mysqlTable,
    varchar,
    text,
    boolean,
    datetime,
    int,
    bigint,
    json,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// P0-B new business model (spec: docs/superpowers/specs/2026-09-14-p0b-architecture-design.md)
// Supplier -> Purchase -> Receiving -> Warehouse/Location -> Inventory -> Order -> Payment/Settlement.
// Legacy workshop tables stay read-compatible and keep their workflows; these
// tables are the new source of truth. Stock lives ONLY in inventory_ledger /
// sku_locations; the legacy items.stock_quantity / website_quantity columns
// become derived caches written exclusively by the ledger service.
// ---------------------------------------------------------------------------

// Inventory movement types (item 12). Append-only vocabulary.
export type InventoryMovementType =
    | 'PURCHASE_RECEIPT'
    | 'SALE'
    | 'RETURN_IN'
    | 'RETURN_OUT'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT';

// Financial transaction types (item 26). Append-only vocabulary.
export type FinancialTxnType =
    | 'INCOME'
    | 'EXPENSE'
    | 'RECEIVABLE'
    | 'PAYABLE'
    | 'PAYMENT'
    | 'REFUND'
    | 'SETTLEMENT';

// Counterparty discriminator for financial rows (which table the id points into).
export type FinancialCounterpartyType = 'seller' | 'supplier' | 'customer' | 'staff' | 'other';

// ===== Catalog (item 11): Product -> Variant -> SKU; SKU is the only stock/order reference =====

export const products = mysqlTable(
    'products',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        // categories.id (legacy table, kept — FK added in migration 0018)
        categoryId: varchar('category_id', { length: 64 }),
        description: text('description'),
        imageUrl: varchar('image_url', { length: 512 }),
        status: varchar('status', { length: 32 }).notNull().default('active'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('products_category_id_idx').on(t.categoryId),
        index('products_deleted_at_idx').on(t.deletedAt),
    ],
);

export const productVariants = mysqlTable(
    'product_variants',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        productId: varchar('product_id', { length: 36 }).notNull(),
        // { color?: string, size?: string } — one axis pair per variant row;
        // backfill creates a single variant per legacy item with both axes raw.
        attributes: json('attributes').$type<{ color?: string; size?: string }>(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [index('product_variants_product_id_idx').on(t.productId)],
);

export const skus = mysqlTable(
    'skus',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        productVariantId: varchar('product_variant_id', { length: 36 }).notNull(),
        // Unique across the whole new model AND disjoint from legacy items.code
        // (backfill prefixes: item code becomes `${itemCode}-...`).
        code: varchar('code', { length: 64 }).notNull().unique(),
        barcode: varchar('barcode', { length: 64 }).unique(),
        name: varchar('name', { length: 255 }),
        costPrice: bigint('cost_price', { mode: 'number' }).notNull().default(0),
        salePrice: bigint('sale_price', { mode: 'number' }).notNull().default(0),
        minStockThreshold: int('min_stock_threshold').notNull().default(0),
        // item legacy id this sku was backfilled from (traceability; null for new)
        legacyItemId: varchar('legacy_item_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('skus_product_variant_id_idx').on(t.productVariantId),
        index('skus_legacy_item_id_idx').on(t.legacyItemId),
        index('skus_deleted_at_idx').on(t.deletedAt),
    ],
);

// ===== Parties: suppliers (P0-C extends), customers (P0-D extends); sellers stay legacy =====

export const suppliers = mysqlTable(
    'suppliers',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        name: varchar('name', { length: 255 }).notNull(),
        phone: varchar('phone', { length: 32 }),
        note: text('note'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [index('suppliers_deleted_at_idx').on(t.deletedAt)],
);

export const customers = mysqlTable(
    'customers',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        fullName: varchar('full_name', { length: 255 }).notNull(),
        phone: varchar('phone', { length: 32 }),
        address: varchar('address', { length: 512 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [index('customers_deleted_at_idx').on(t.deletedAt)],
);

// ===== Physical (item 13): Warehouse != Location =====

export const warehouses = mysqlTable(
    'warehouses',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).notNull().unique(),
        name: varchar('name', { length: 255 }).notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [index('warehouses_deleted_at_idx').on(t.deletedAt)],
);

export const locations = mysqlTable(
    'locations',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        warehouseId: varchar('warehouse_id', { length: 36 }).notNull(),
        code: varchar('code', { length: 32 }).notNull(),
        name: varchar('name', { length: 255 }).notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        uniqueIndex('locations_warehouse_code_uk').on(t.warehouseId, t.code),
        index('locations_warehouse_id_idx').on(t.warehouseId),
    ],
);

// ===== Channel: sales_channels seeded website + consignment =====

export const salesChannels = mysqlTable(
    'sales_channels',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).notNull().unique(),
        name: varchar('name', { length: 128 }).notNull(),
        type: varchar('type', { length: 32 }).notNull().default('store'),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
);

// ===== Purchasing (item 14/15/16 workflows land in P0-C; tables here) =====

export const purchases = mysqlTable(
    'purchases',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        supplierId: varchar('supplier_id', { length: 36 }).notNull(),
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
        note: text('note'),
        actorId: varchar('actor_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('purchases_supplier_id_idx').on(t.supplierId),
        index('purchases_status_idx').on(t.status),
    ],
);

export const purchaseItems = mysqlTable(
    'purchase_items',
    {
    id: varchar('id', { length: 36 }).primaryKey(),
        purchaseId: varchar('purchase_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull(),
        unitCost: bigint('unit_cost', { mode: 'number' }).notNull(),
        receivedQuantity: int('received_quantity').notNull().default(0),
    },
    (t) => [
        index('purchase_items_purchase_id_idx').on(t.purchaseId),
        index('purchase_items_sku_id_idx').on(t.skuId),
    ],
);

// ===== Sales (P0-D workflows; minimal service in P0-B for tests) =====

export const salesOrders = mysqlTable(
    'sales_orders',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        channelId: varchar('channel_id', { length: 36 }).notNull(),
        customerId: varchar('customer_id', { length: 36 }),
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
        note: text('note'),
        actorId: varchar('actor_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('sales_orders_channel_id_idx').on(t.channelId),
        index('sales_orders_status_idx').on(t.status),
    ],
);

export const salesOrderLines = mysqlTable(
    'sales_order_lines',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        salesOrderId: varchar('sales_order_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull(),
        unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
        lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
    },
    (t) => [
        index('sales_order_lines_order_id_idx').on(t.salesOrderId),
        index('sales_order_lines_sku_id_idx').on(t.skuId),
    ],
);

export const salesPayments = mysqlTable(
    'sales_payments',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        salesOrderId: varchar('sales_order_id', { length: 36 }).notNull(),
        amount: bigint('amount', { mode: 'number' }).notNull(),
        method: varchar('method', { length: 32 }),
        paidAt: datetime('paid_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        actorId: varchar('actor_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('sales_payments_order_id_idx').on(t.salesOrderId)],
);

// ===== Finance (item 26): every money flow becomes a row =====

export const financialTransactions = mysqlTable(
    'financial_transactions',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        txnType: varchar('txn_type', { length: 32 }).notNull(),
        direction: int('direction').notNull(),
        amount: bigint('amount', { mode: 'number' }).notNull(),
        counterpartyType: varchar('counterparty_type', { length: 32 }),
        counterpartyId: varchar('counterparty_id', { length: 36 }),
        referenceType: varchar('reference_type', { length: 64 }),
        referenceId: varchar('reference_id', { length: 64 }),
        description: varchar('description', { length: 512 }),
        actorId: varchar('actor_id', { length: 36 }),
        occurredAt: datetime('occurred_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('financial_txn_type_idx').on(t.txnType),
        index('financial_counterparty_idx').on(t.counterpartyType, t.counterpartyId),
        index('financial_reference_idx').on(t.referenceType, t.referenceId),
    ],
);

export const settlements = mysqlTable(
    'settlements',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        counterpartyType: varchar('counterparty_type', { length: 32 }).notNull(),
        counterpartyId: varchar('counterparty_id', { length: 36 }).notNull(),
        amount: bigint('amount', { mode: 'number' }).notNull(),
        note: varchar('note', { length: 512 }),
        actorId: varchar('actor_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('settlements_counterparty_idx').on(t.counterpartyType, t.counterpartyId)],
);

// ===== Inventory (item 12): ledger is the source of truth =====

export const inventoryLedger = mysqlTable(
    'inventory_ledger',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        locationId: varchar('location_id', { length: 36 }).notNull(),
        movementType: varchar('movement_type', { length: 32 }).notNull(),
        quantityDelta: int('quantity_delta').notNull(),
        unitCost: bigint('unit_cost', { mode: 'number' }),
        referenceType: varchar('reference_type', { length: 64 }).notNull(),
        referenceId: varchar('reference_id', { length: 64 }).notNull(),
        reason: varchar('reason', { length: 255 }),
        actorId: varchar('actor_id', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('inventory_ledger_sku_location_idx').on(t.skuId, t.locationId),
        index('inventory_ledger_reference_idx').on(t.referenceType, t.referenceId),
        index('inventory_ledger_created_at_idx').on(t.createdAt),
    ],
);

// Derived cache: sku x location -> on-hand qty. Written ONLY by the ledger service.
export const skuLocations = mysqlTable(
    'sku_locations',
    {
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        locationId: varchar('location_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull().default(0),
    },
    (t) => [primaryKey({ columns: [t.skuId, t.locationId] })],
);
