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
        contactPerson: varchar('contact_person', { length: 255 }),
        phone: varchar('phone', { length: 32 }),
        email: varchar('email', { length: 255 }),
        address: varchar('address', { length: 512 }),
        isActive: boolean('is_active').notNull().default(true),
        cooperationTerms: text('cooperation_terms'),
        paymentTerms: varchar('payment_terms', { length: 255 }),
        paymentDueDays: int('payment_due_days'),
        minOrderAmount: bigint('min_order_amount', { mode: 'number' }),
        note: text('note'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('suppliers_deleted_at_idx').on(t.deletedAt),
        index('suppliers_active_idx').on(t.isActive),
    ],
);

export const customers = mysqlTable(
    'customers',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        name: varchar('name', { length: 255 }).notNull(),
        phone: varchar('phone', { length: 32 }),
        email: varchar('email', { length: 255 }),
        province: varchar('province', { length: 64 }),
        city: varchar('city', { length: 128 }),
        address: varchar('address', { length: 512 }),
        postalCode: varchar('postal_code', { length: 16 }),
        creditLimit: bigint('credit_limit', { mode: 'number' }).notNull().default(0),
        currentDebt: bigint('current_debt', { mode: 'number' }).notNull().default(0),
        totalPurchases: bigint('total_purchases', { mode: 'number' }).notNull().default(0),
        orderCount: int('order_count').notNull().default(0),
        firstOrderAt: datetime('first_order_at'),
        lastOrderAt: datetime('last_order_at'),
        acquisitionChannelId: varchar('acquisition_channel_id', { length: 36 }),
        tags: json('tags').$type<string[]>(),
        notes: text('notes'),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        isDeleted: boolean('is_deleted').notNull().default(false),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('customers_deleted_at_idx').on(t.deletedAt),
        index('customers_phone_idx').on(t.phone),
        index('customers_name_idx').on(t.name),
        index('customers_active_idx').on(t.isActive),
        index('customers_is_deleted_idx').on(t.isDeleted),
    ],
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
        type: varchar('type', { length: 32 }).notNull().default('website'),
        description: text('description'),
        isActive: boolean('is_active').notNull().default(true),
        sortOrder: int('sort_order').notNull().default(0),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('sales_channels_type_idx').on(t.type),
        index('sales_channels_active_idx').on(t.isActive),
    ],
);

// ===== Purchasing (item 14/15/16 workflows land in P0-C; tables here) =====

export const purchases = mysqlTable(
    'purchases',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        supplierId: varchar('supplier_id', { length: 36 }).notNull(),
        requestId: varchar('request_id', { length: 36 }),
        // draft → ordered (= legacy 'confirmed') → partially_received → received | cancelled
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        orderDate: datetime('order_date'),
        expectedDate: datetime('expected_date'),
        subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
        additionalCosts: bigint('additional_costs', { mode: 'number' }).notNull().default(0),
        totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
        paymentTerms: varchar('payment_terms', { length: 255 }),
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
        index('purchases_request_id_idx').on(t.requestId),
    ],
);

export const purchaseItems = mysqlTable(
    'purchase_items',
    {
    id: varchar('id', { length: 36 }).primaryKey(),
        purchaseId: varchar('purchase_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull(),
        unit: varchar('unit', { length: 32 }),
        unitCost: bigint('unit_cost', { mode: 'number' }).notNull(),
        receivedQuantity: int('received_quantity').notNull().default(0),
    },
    (t) => [
        index('purchase_items_purchase_id_idx').on(t.purchaseId),
        index('purchase_items_sku_id_idx').on(t.skuId),
    ],
);

// ===== P0-C supply (items 14/15/16): supplier prices, requests, receipts, costs =====
// SKU is the product reference (P0-B canonical); supplierPrices.skuId is the
// "product" the spec asks for. Price rows are append-only history — a price
// change inserts a new row, never updates the current one in place.

export const supplierPrices = mysqlTable(
    'supplier_prices',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        supplierId: varchar('supplier_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        unit: varchar('unit', { length: 32 }),
        purchasePrice: bigint('purchase_price', { mode: 'number' }).notNull(),
        currency: varchar('currency', { length: 8 }).notNull().default('IRT'),
        effectiveDate: datetime('effective_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        expiresAt: datetime('expires_at'),
        minQuantity: int('min_quantity'),
        notes: text('notes'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('supplier_prices_supplier_id_idx').on(t.supplierId),
        index('supplier_prices_sku_id_idx').on(t.skuId),
        index('supplier_prices_effective_idx').on(t.supplierId, t.skuId, t.effectiveDate),
    ],
);

// Purchase request: draft → submitted → approved|rejected → converted | cancelled
export const purchaseRequests = mysqlTable(
    'purchase_requests',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        requestedBy: varchar('requested_by', { length: 36 }),
        requestDate: datetime('request_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        supplierId: varchar('supplier_id', { length: 36 }),
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        notes: text('notes'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('purchase_requests_status_idx').on(t.status),
        index('purchase_requests_supplier_id_idx').on(t.supplierId),
    ],
);

export const purchaseRequestItems = mysqlTable(
    'purchase_request_items',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        requestId: varchar('request_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull(),
        unit: varchar('unit', { length: 32 }),
        notes: text('notes'),
    },
    (t) => [
        index('purchase_request_items_request_id_idx').on(t.requestId),
        index('purchase_request_items_sku_id_idx').on(t.skuId),
    ],
);

// Goods receipt: independent record per delivery, traceable to its purchase.
export const purchaseReceipts = mysqlTable(
    'purchase_receipts',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        purchaseId: varchar('purchase_id', { length: 36 }).notNull(),
        supplierId: varchar('supplier_id', { length: 36 }).notNull(),
        warehouseId: varchar('warehouse_id', { length: 36 }),
        locationId: varchar('location_id', { length: 36 }),
        receivedDate: datetime('received_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        receivedBy: varchar('received_by', { length: 36 }),
        status: varchar('status', { length: 32 }).notNull().default('posted'),
        notes: text('notes'),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('purchase_receipts_purchase_id_idx').on(t.purchaseId),
        index('purchase_receipts_supplier_id_idx').on(t.supplierId),
        index('purchase_receipts_date_idx').on(t.receivedDate),
    ],
);

export const purchaseReceiptItems = mysqlTable(
    'purchase_receipt_items',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        receiptId: varchar('receipt_id', { length: 36 }).notNull(),
        purchaseItemId: varchar('purchase_item_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }).notNull(),
        quantity: int('quantity').notNull(),
        unitCost: bigint('unit_cost', { mode: 'number' }),
    },
    (t) => [
        index('purchase_receipt_items_receipt_id_idx').on(t.receiptId),
        index('purchase_receipt_items_purchase_item_id_idx').on(t.purchaseItemId),
        index('purchase_receipt_items_sku_id_idx').on(t.skuId),
    ],
);

// Supply cost type vocabulary (append-only). Kept OUT of financial_transactions:
// a supply cost is an EXPENSE on the purchase, while the supplier payable is a
// PAYABLE to the supplier — different rows, different counterparties.
export type SupplyCostType =
    | 'shipping'
    | 'packaging'
    | 'loading'
    | 'unloading'
    | 'customs'
    | 'commission'
    | 'other';

export type CostAllocationMethod = 'by_value' | 'by_quantity';

export const supplyCosts = mysqlTable(
    'supply_costs',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        purchaseId: varchar('purchase_id', { length: 36 }).notNull(),
        costType: varchar('cost_type', { length: 32 }).notNull().default('other'),
        description: varchar('description', { length: 512 }),
        amount: bigint('amount', { mode: 'number' }).notNull(),
        currency: varchar('currency', { length: 8 }).notNull().default('IRT'),
        costDate: datetime('cost_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        partyType: varchar('party_type', { length: 32 }),
        partyId: varchar('party_id', { length: 36 }),
        allocationMethod: varchar('allocation_method', { length: 32 }).notNull().default('by_value'),
        notes: text('notes'),
        createdBy: varchar('created_by', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('supply_costs_purchase_id_idx').on(t.purchaseId),
        index('supply_costs_type_idx').on(t.costType),
        index('supply_costs_date_idx').on(t.costDate),
    ],
);

export const supplyCostAllocations = mysqlTable(
    'supply_cost_allocations',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        costId: varchar('cost_id', { length: 36 }).notNull(),
        purchaseItemId: varchar('purchase_item_id', { length: 36 }).notNull(),
        amount: bigint('amount', { mode: 'number' }).notNull(),
    },
    (t) => [
        index('supply_cost_alloc_cost_id_idx').on(t.costId),
        index('supply_cost_alloc_item_id_idx').on(t.purchaseItemId),
    ],
);


// ===== Sales (P0-D workflows; minimal service in P0-B for tests) =====

export const salesOrders = mysqlTable(
    'sales_orders',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        orderType: varchar('order_type', { length: 32 }).notNull().default('retail'),
        channelId: varchar('channel_id', { length: 36 }).notNull(),
        customerId: varchar('customer_id', { length: 36 }),
        sellerId: varchar('seller_id', { length: 36 }),
        customerName: varchar('customer_name', { length: 255 }),
        customerPhone: varchar('customer_phone', { length: 32 }),
        customerAddress: text('customer_address'),
        status: varchar('status', { length: 32 }).notNull().default('draft'),
        paymentStatus: varchar('payment_status', { length: 32 }).notNull().default('pending'),
        subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
        discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
        shippingAmount: bigint('shipping_amount', { mode: 'number' }).notNull().default(0),
        taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
        totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
        paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
        remainingAmount: bigint('remaining_amount', { mode: 'number' }).notNull().default(0),
        currency: varchar('currency', { length: 8 }).notNull().default('IRT'),
        sourceReference: varchar('source_reference', { length: 255 }),
        utmSource: varchar('utm_source', { length: 128 }),
        utmMedium: varchar('utm_medium', { length: 128 }),
        utmCampaign: varchar('utm_campaign', { length: 128 }),
        trackingCode: varchar('tracking_code', { length: 128 }),
        note: text('note'),
        confirmedAt: datetime('confirmed_at'),
        paidAt: datetime('paid_at'),
        shippedAt: datetime('shipped_at'),
        deliveredAt: datetime('delivered_at'),
        cancelledAt: datetime('cancelled_at'),
        createdBy: varchar('created_by', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        isDeleted: boolean('is_deleted').notNull().default(false),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('sales_orders_channel_id_idx').on(t.channelId),
        index('sales_orders_status_idx').on(t.status),
        index('sales_orders_payment_status_idx').on(t.paymentStatus),
        index('sales_orders_customer_id_idx').on(t.customerId),
        index('sales_orders_seller_id_idx').on(t.sellerId),
        index('sales_orders_is_deleted_idx').on(t.isDeleted),
    ],
);

export const salesOrderLines = mysqlTable(
    'sales_order_lines',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        salesOrderId: varchar('sales_order_id', { length: 36 }).notNull(),
        skuId: varchar('sku_id', { length: 36 }),
        itemId: varchar('item_id', { length: 36 }),
        sku: varchar('sku', { length: 64 }),
        itemCode: varchar('item_code', { length: 32 }),
        itemName: varchar('item_name', { length: 255 }),
        size: varchar('size', { length: 64 }),
        color: varchar('color', { length: 64 }),
        quantity: int('quantity').notNull(),
        unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
        discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
        lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
        snapshot: json('snapshot').$type<Record<string, unknown>>(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('sales_order_lines_order_id_idx').on(t.salesOrderId),
        index('sales_order_lines_sku_id_idx').on(t.skuId),
        index('sales_order_lines_item_id_idx').on(t.itemId),
    ],
);

export const salesPayments = mysqlTable(
    'sales_payments',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        code: varchar('code', { length: 32 }).unique(),
        orderId: varchar('order_id', { length: 36 }),
        sellerSaleId: varchar('seller_sale_id', { length: 36 }),
        customerId: varchar('customer_id', { length: 36 }),
        sellerId: varchar('seller_id', { length: 36 }),
        amount: bigint('amount', { mode: 'number' }).notNull(),
        paymentMethod: varchar('payment_method', { length: 32 }),
        paymentDate: datetime('payment_date').notNull().default(sql`CURRENT_TIMESTAMP`),
        trackingNumber: varchar('tracking_number', { length: 255 }),
        status: varchar('status', { length: 32 }).notNull().default('pending'),
        note: text('note'),
        createdBy: varchar('created_by', { length: 36 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        isDeleted: boolean('is_deleted').notNull().default(false),
        deletedAt: datetime('deleted_at'),
        deletedBy: varchar('deleted_by', { length: 36 }),
    },
    (t) => [
        index('sales_payments_order_id_idx').on(t.orderId),
        index('sales_payments_seller_sale_id_idx').on(t.sellerSaleId),
        index('sales_payments_customer_id_idx').on(t.customerId),
        index('sales_payments_seller_id_idx').on(t.sellerId),
        index('sales_payments_status_idx').on(t.status),
        index('sales_payments_payment_date_idx').on(t.paymentDate),
    ],
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
