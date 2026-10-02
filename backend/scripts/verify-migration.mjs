#!/usr/bin/env node
// P0-B post-migration verification (spec: docs/superpowers/specs/2026-09-14-p0b-architecture-design.md
// items 1, 11-13, 26-28). Read-only: proves the schema landed and the data
// invariants hold, so a fresh dev/prod box can be signed off with one command.
//
//   node scripts/verify-migration.mjs
//
// Asserts, in order:
//   1. the 17 new-model tables exist (0017)
//   2. the audit enrichment columns exist on audit_logs (0017, item 27)
//   3. deleted_by exists on the 9 legacy soft-delete tables (item 28)
//   4. every 0019 secondary index exists
//   5. every 0018 foreign key exists (by constraint name — 0018 IS the FK
//      contract; newModel.ts declares no .references())
//   6. items.stockQuantity/websiteQuantity == Σ ledger (shelf / shop)
//      sku_locations.quantity == Σ ledger(sku, location)
//   7. sellers.currentDebt == Σ(PAYABLE·dir) − Σ(PAYMENT)
//   8. no orphan ledger rows; every movement carries a reference
//
// Pure mysql2 by design — no drizzle/better-auth imports (cPanel hosts OOM on
// the wasm bundle; same constraint as scripts/backfill-new-model.mjs).
// Exits 0 only when every check passes.

import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';

const CFG = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    user: process.env.DB_USER ?? 'MRez',
    password: process.env.DB_PASSWORD ?? '64321608',
    database: process.env.DB_NAME ?? 'polaris',
};

/** Same namespace and derivation as the runtime bridge + backfill. */
const LEGACY_NS = '9f05f020-0000-4000-8000-51524f4d534b';
function uuidV5(name, namespace = LEGACY_NS) {
    const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
    const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest();
    const bytes = Buffer.from(hash.subarray(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
const shelfLocationId = () => uuidV5('location:shelf');
const shopLocationId = () => uuidV5('location:shop');

// 1. The 17 new-model tables (src/schema/newModel.ts).
const NEW_MODEL_TABLES = [
    'products',
    'product_variants',
    'skus',
    'suppliers',
    'customers',
    'warehouses',
    'locations',
    'sales_channels',
    'purchases',
    'purchase_items',
    'sales_orders',
    'sales_order_lines',
    'sales_payments',
    'financial_transactions',
    'settlements',
    'inventory_ledger',
    'sku_locations',
];

// 2. audit_logs enrichment columns (item 27).
const AUDIT_COLUMNS = ['entity_type', 'entity_id', 'before_json', 'after_json', 'user_agent', 'metadata', 'ip_address'];

// 3. The 9 legacy soft-delete tables that gained deleted_by (item 28).
const LEGACY_DELETED_BY_TABLES = [
    'items',
    'sellers',
    'consignments',
    'consignment_returns',
    'payments',
    'staff',
    'expenses',
    'damage_records',
    'workshop_todos',
];

// 4. Secondary indexes from drizzle/0019_p0b_indexes.sql.
const INDEXES_0019 = [
    ['customers_deleted_at_idx', 'customers'],
    ['financial_txn_type_idx', 'financial_transactions'],
    ['financial_counterparty_idx', 'financial_transactions'],
    ['financial_reference_idx', 'financial_transactions'],
    ['inventory_ledger_sku_location_idx', 'inventory_ledger'],
    ['inventory_ledger_reference_idx', 'inventory_ledger'],
    ['inventory_ledger_created_at_idx', 'inventory_ledger'],
    ['locations_warehouse_id_idx', 'locations'],
    ['product_variants_product_id_idx', 'product_variants'],
    ['products_category_id_idx', 'products'],
    ['products_deleted_at_idx', 'products'],
    ['purchase_items_purchase_id_idx', 'purchase_items'],
    ['purchase_items_sku_id_idx', 'purchase_items'],
    ['purchases_supplier_id_idx', 'purchases'],
    ['purchases_status_idx', 'purchases'],
    ['sales_order_lines_order_id_idx', 'sales_order_lines'],
    ['sales_order_lines_sku_id_idx', 'sales_order_lines'],
    ['sales_orders_channel_id_idx', 'sales_orders'],
    ['sales_orders_status_idx', 'sales_orders'],
    ['sales_payments_order_id_idx', 'sales_payments'],
    ['settlements_counterparty_idx', 'settlements'],
    ['skus_product_variant_id_idx', 'skus'],
    ['skus_legacy_item_id_idx', 'skus'],
    ['skus_deleted_at_idx', 'skus'],
    ['suppliers_deleted_at_idx', 'suppliers'],
    ['warehouses_deleted_at_idx', 'warehouses'],
    ['audit_logs_entity_idx', 'audit_logs'],
];

// 5. Constraint names from drizzle/0018_p0b_foreign_keys.sql, asserted by name
// (the schema file declares no .references(); this migration IS the FK contract).
const FKS_0018 = [
    ['product_variants', 'product_variants_product_id_fk'],
    ['skus', 'skus_product_variant_id_fk'],
    ['products', 'products_category_id_fk'],
    ['locations', 'locations_warehouse_id_fk'],
    ['inventory_ledger', 'inventory_ledger_sku_id_fk'],
    ['inventory_ledger', 'inventory_ledger_location_id_fk'],
    ['sku_locations', 'sku_locations_sku_id_fk'],
    ['sku_locations', 'sku_locations_location_id_fk'],
    ['purchase_items', 'purchase_items_purchase_id_fk'],
    ['purchase_items', 'purchase_items_sku_id_fk'],
    ['purchases', 'purchases_supplier_id_fk'],
    ['sales_order_lines', 'sales_order_lines_order_id_fk'],
    ['sales_orders', 'sales_orders_channel_id_fk'],
    ['sales_payments', 'sales_payments_order_id_fk'],
    ['purchase_items', 'purchase_items_purchase_id_purchases_id_fk'],
];

let failures = 0;
let checks = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => {
    checks += 1;
    log(`  ✓ ${msg}`);
};
const bad = (msg, detail) => {
    checks += 1;
    failures += 1;
    log(`  ✗ ${msg}`);
    for (const line of detail) log(`      ${line}`);
};

async function main() {
    const conn = await mysql.createConnection(CFG);
    log(`▶ verify-migration db=${CFG.database}@${CFG.host}`);

    // ---------------------------------------------------------------- schema
    log('\n▶ schema: new-model tables (0017)');
    const [tables] = await conn.query('SHOW TABLES');
    const present = new Set(tables.map((row) => Object.values(row)[0]));
    const missingTables = NEW_MODEL_TABLES.filter((t) => !present.has(t));
    if (missingTables.length > 0) bad(`${missingTables.length} table(s) missing`, missingTables);
    else ok(`all ${NEW_MODEL_TABLES.length} new-model tables exist`);

    // Column presence, grouped by table so each table is inspected once.
    const columnsByTable = new Map();
    const inspect = [...NEW_MODEL_TABLES, 'audit_logs', ...LEGACY_DELETED_BY_TABLES].filter((t) => present.has(t));
    for (const table of inspect) {
        const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
        columnsByTable.set(table, new Set(cols.map((c) => c.Field)));
    }

    log('\n▶ schema: audit enrichment columns (0017, item 27)');
    const auditCols = columnsByTable.get('audit_logs') ?? new Set();
    const missingAudit = AUDIT_COLUMNS.filter((c) => !auditCols.has(c));
    if (missingAudit.length > 0) bad(`${missingAudit.length} audit_logs column(s) missing`, missingAudit);
    else ok(`audit_logs has all ${AUDIT_COLUMNS.length} enrichment columns`);

    log('\n▶ schema: deleted_by on legacy soft-delete tables (item 28)');
    const missingDeletedBy = LEGACY_DELETED_BY_TABLES.filter((t) => !(columnsByTable.get(t) ?? new Set()).has('deleted_by'));
    if (missingDeletedBy.length > 0) bad(`${missingDeletedBy.length} table(s) lack deleted_by`, missingDeletedBy);
    else ok(`all ${LEGACY_DELETED_BY_TABLES.length} legacy tables have deleted_by`);

    log('\n▶ schema: secondary indexes (0019)');
    const indexesByTable = new Map();
    for (const table of new Set(INDEXES_0019.map(([, t]) => t))) {
        const [idx] = await conn.query(`SHOW INDEX FROM \`${table}\``);
        indexesByTable.set(table, new Set(idx.map((r) => r.Key_name)));
    }
    const missingIdx = INDEXES_0019.filter(([name, table]) => !(indexesByTable.get(table) ?? new Set()).has(name));
    if (missingIdx.length > 0) bad(`${missingIdx.length} index(es) missing`, missingIdx.map(([n, t]) => `${t}.${n}`));
    else ok(`all ${INDEXES_0019.length} 0019 indexes exist`);

    log('\n▶ schema: foreign keys (0018)');
    const ddlByTable = new Map();
    for (const table of new Set(FKS_0018.map(([t]) => t))) {
        const [fks] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
        ddlByTable.set(table, String(Object.values(fks[0])[1]));
    }
    const missingFks = FKS_0018.filter(([table, name]) => !ddlByTable.get(table).includes(`\`${name}\``));
    if (missingFks.length > 0) {
        bad(`${missingFks.length} foreign key(s) missing`, missingFks.map(([t, n]) => `${t}: ${n}`));
    } else ok(`all ${FKS_0018.length} 0018 constraints exist`);

    // ----------------------------------------------------------------- data
    const shelf = shelfLocationId();
    const shop = shopLocationId();
    log('\n▶ data: inventory cache == Σ ledger');
    const [stockMismatch] = await conn.query(
        `SELECT i.code, i.stock_quantity, i.website_quantity,
                COALESCE(SUM(CASE WHEN l.location_id = ? THEN l.quantity_delta ELSE 0 END), 0) AS shelf_ledger,
                COALESCE(SUM(CASE WHEN l.location_id = ? THEN l.quantity_delta ELSE 0 END), 0) AS shop_ledger
         FROM items i
         LEFT JOIN skus s ON s.legacy_item_id = i.id
         LEFT JOIN inventory_ledger l ON l.sku_id = s.id
         WHERE i.is_deleted = 0
         GROUP BY i.id, i.code, i.stock_quantity, i.website_quantity
         HAVING i.stock_quantity <> shelf_ledger OR i.website_quantity <> shop_ledger`,
        [shelf, shop],
    );
    if (stockMismatch.length > 0) {
        bad(`stock cache mismatch on ${stockMismatch.length} item(s)`, stockMismatch.slice(0, 10).map((m) => `${m.code}: cache ${m.stock_quantity}/${m.website_quantity} vs ledger ${m.shelf_ledger}/${m.shop_ledger}`));
    } else ok('items.stockQuantity / websiteQuantity == Σ ledger (shelf / shop)');

    const [skuCacheMismatch] = await conn.query(
        `SELECT sl.sku_id, sl.location_id, sl.quantity,
                COALESCE((SELECT SUM(l.quantity_delta) FROM inventory_ledger l
                          WHERE l.sku_id = sl.sku_id AND l.location_id = sl.location_id), 0) AS ledger_total
         FROM sku_locations sl
         HAVING sl.quantity <> ledger_total`,
    );
    if (skuCacheMismatch.length > 0) {
        bad(`sku_locations mismatch on ${skuCacheMismatch.length} row(s)`, skuCacheMismatch.slice(0, 10).map((m) => `${m.sku_id}@${m.location_id}: cache ${m.quantity} vs ledger ${m.ledger_total}`));
    } else ok('sku_locations.quantity == Σ ledger (per sku/location)');

    log('\n▶ data: seller debt == Σ financial');
    const [debtRows] = await conn.query(
        `SELECT sl.code, sl.current_debt,
                COALESCE((SELECT SUM(ft.amount * ft.direction) FROM financial_transactions ft
                          WHERE ft.txn_type = 'PAYABLE' AND ft.counterparty_type = 'seller' AND ft.counterparty_id = sl.id), 0)
              - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                          WHERE ft.txn_type = 'PAYMENT' AND ft.counterparty_type = 'seller' AND ft.counterparty_id = sl.id), 0)
                AS derived
         FROM sellers sl
         WHERE sl.is_deleted = 0 AND sl.current_debt > 0`,
    );
    const badDebt = debtRows.filter((r) => Number(r.current_debt) !== Number(r.derived));
    if (badDebt.length > 0) {
        bad(`debt mismatch on ${badDebt.length} seller(s)`, badDebt.slice(0, 10).map((m) => `${m.code}: cache ${m.current_debt} vs derived ${m.derived}`));
    } else ok(`sellers.currentDebt == Σ(PAYABLE) − Σ(PAYMENT) across ${debtRows.length} indebted seller(s)`);

    log('\n▶ data: referential integrity');
    const [[orphanLedger]] = await conn.query(
        `SELECT COUNT(*) AS n FROM inventory_ledger l
         LEFT JOIN skus s ON s.id = l.sku_id WHERE s.id IS NULL`,
    );
    if (orphanLedger.n > 0) bad(`${orphanLedger.n} ledger row(s) reference a missing sku`, []);
    else ok('every inventory_ledger row resolves to a sku');

    const [[orphanLedgerLoc]] = await conn.query(
        `SELECT COUNT(*) AS n FROM inventory_ledger l
         LEFT JOIN locations loc ON loc.id = l.location_id WHERE loc.id IS NULL`,
    );
    if (orphanLedgerLoc.n > 0) bad(`${orphanLedgerLoc.n} ledger row(s) reference a missing location`, []);
    else ok('every inventory_ledger row resolves to a location');

    const [[untraceable]] = await conn.query(
        `SELECT COUNT(*) AS n FROM inventory_ledger
         WHERE reference_type IS NULL OR reference_type = '' OR reference_id IS NULL OR reference_id = ''`,
    );
    if (untraceable.n > 0) bad(`${untraceable.n} ledger row(s) lack reference_type/reference_id`, []);
    else ok('every movement carries a reference_type + reference_id (append-only traceability)');

    await conn.end();

    log(`\n▶ ${checks - failures}/${checks} checks passed`);
    if (failures > 0) {
        log(`\n✗ verify-migration FAILED (${failures} failing check(s))`);
        process.exit(1);
    }
    log('\n✓ migration verified');
}

main().catch((err) => {
    console.error('ERR:', err.message);
    process.exit(1);
});