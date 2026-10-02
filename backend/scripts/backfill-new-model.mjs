#!/usr/bin/env node
// P0-B new-model backfill (spec: docs/superpowers/specs/2026-09-14-p0b-architecture-design.md L236-243).
//
// Idempotent (INSERT IGNORE / ON DUPLICATE KEY UPDATE) and deterministic (uuid v5
// over LEGACY_NS, the SAME namespace and keys the runtime bridge
// `src/core/services/inventoryLedgerService.ts` computes) so it can run before,
// after, or repeatedly against dev and prod.
//
// Pure mysql2 by design — no drizzle/better-auth imports (cPanel hosts OOM on the
// wasm bundle; see scripts/smoke.mjs for the same constraint).
//
// Stage 1  warehouses + locations + channels + per-seller custody locations
// Stage 2  products / variants / skus  (category «مانتو» -> women_clothing, logged)
// Stage 3  opening stock  (ADJUSTMENT_IN at رف انبار / ویترین, reason افتتاح حساب موجودی)
// Stage 4  opening seller debt  (per-seller PAYABLE, legacy consignment breakdown in metadata)
// Stage 5  legacy payments -> PAYMENT rows; legacy expenses -> EXPENSE rows
// Stage 6  damage records as-is; reconciliation asserts (cache == Σ ledger, Σ financial)
//
// Usage: node scripts/backfill-new-model.mjs [--dry-run]

import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';

const DRY_RUN = process.argv.includes('--dry-run');

const CFG = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    user: process.env.DB_USER ?? 'MRez',
    password: process.env.DB_PASSWORD ?? '64321608',
    database: process.env.DB_NAME ?? 'polaris',
};

/**
 * Stable namespace shared with the runtime bridge. uuid v5 = SHA-1(namespace + name).
 * Reimplemented here (instead of importing `uuid`) to keep the script free of
 * runtime deps beyond mysql2 — must stay byte-identical to inventoryLedgerService.
 */
const LEGACY_NS = '9f05f020-0000-4000-8000-51524f4d534b';

function uuidV5(name, namespace = LEGACY_NS) {
    const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
    const nameBytes = Buffer.from(name, 'utf8');
    const hash = createHash('sha1').update(Buffer.concat([nsBytes, nameBytes])).digest();
    const bytes = Buffer.from(hash.subarray(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Deterministic ids — MUST match inventoryLedgerService (same keys, same NS).
const productIdFor = (itemId) => uuidV5(`product:${itemId}`);
const variantIdFor = (itemId) => uuidV5(`variant:${itemId}`);
const skuIdFor = (itemId) => uuidV5(`sku:${itemId}`);
const workshopWarehouseId = () => uuidV5('warehouse:workshop');
const sellerWarehouseId = () => uuidV5('warehouse:sellers');
const shelfLocationId = () => uuidV5('location:shelf');
const shopLocationId = () => uuidV5('location:shop');
const sellerCustodyLocationId = (sellerId) => uuidV5(`location:seller:${sellerId}`);
// Deterministic row ids for the financial backfill (idempotent re-runs skip).
const backfillTxnId = (key) => uuidV5(`backfill:txn:${key}`);
const backfillMovementId = (itemId, locationId) => uuidV5(`backfill:move:${itemId}:${locationId}`);

/** Legacy item categories that predate the slug-based `categories` table. */
const LEGACY_CATEGORY_MAP = { 'مانتو': 'women_clothing' };

const REASON_OPENING = 'افتتاح حساب موجودی';
const REFERENCE_BACKFILL = 'backfill';

let conn;
const counts = {};
const log = (...a) => console.log(...a);
function bump(key, n = 1) {
    counts[key] = (counts[key] ?? 0) + n;
}

/** Runs `sql` (array form keeps values escaped) and reports what happened. */
async function run(sql, params = []) {
    if (DRY_RUN) return;
    const [res] = await conn.query(sql, params);
    return res;
}

async function main() {
    conn = await mysql.createConnection(CFG);
    log(`▶ backfill-new-model ${DRY_RUN ? '(DRY RUN — no writes)' : ''} db=${CFG.database}@${CFG.host}`);

    const admin = await pickActor();
    await stage1Locations();
    await stage2Catalog();
    await stage3OpeningStock(admin);
    await stage4SellerDebt(admin);
    await stage5PaymentsAndExpenses(admin);
    await stage6Damage();
    await reconcile();

    log('\n▶ summary');
    for (const [k, v] of Object.entries(counts)) log(`  ${k.padEnd(34)} ${v}`);
    log(DRY_RUN ? '\n✓ dry run complete — nothing written' : '\n✓ backfill complete');
    await conn.end();
}

/** The audit/backfill actor: the seeded admin. */
async function pickActor() {
    const [rows] = await conn.query(
        "SELECT id FROM user WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1",
    );
    if (!rows[0]) throw new Error('backfill: no admin user found to attribute rows to');
    log(`  actor: ${rows[0].id}`);
    return rows[0].id;
}

// ---------------------------------------------------------------------------
// Stage 1 — warehouses, locations, channels
// ---------------------------------------------------------------------------

async function stage1Locations() {
    const workshopId = workshopWarehouseId();
    const sellersWhId = sellerWarehouseId();
    const shelfId = shelfLocationId();
    const shopId = shopLocationId();

    await run('INSERT IGNORE INTO warehouses (id, code, name, created_at, updated_at) VALUES (?,?,?,NOW(),NOW())', [
        workshopId,
        'WS-MAIN',
        'کارگاه',
    ]);
    await run('INSERT IGNORE INTO warehouses (id, code, name, created_at, updated_at) VALUES (?,?,?,NOW(),NOW())', [
        sellersWhId,
        'WS-SELLERS',
        'نزد دستفروشان',
    ]);
    bump('warehouses', 2);

    // رف انبار / ویترین live in the workshop warehouse — the two legacy stock buckets.
    await run(
        'INSERT IGNORE INTO locations (id, warehouse_id, code, name, created_at, updated_at) VALUES (?,?,?,?,NOW(),NOW()), (?,?,?,?,NOW(),NOW())',
        [
            shelfId,
            workshopId,
            'SHELF',
            'رف انبار',
            shopId,
            workshopId,
            'SHOP',
            'ویترین',
        ],
    );
    bump('locations (core)', 2);

    // One custody location per seller: goods physically held at their shop.
    const [sellers] = await conn.query('SELECT id, name, code FROM sellers WHERE is_deleted = 0');
    const placeholders = sellers.map(() => '(?,?,?,?,NOW(),NOW())').join(',');
    if (sellers.length > 0) {
        await run(
            `INSERT IGNORE INTO locations (id, warehouse_id, code, name, created_at, updated_at) VALUES ${placeholders}`,
            sellers.flatMap((s) => [sellerCustodyLocationId(s.id), sellersWhId, `CUST-${s.code}`.slice(0, 32), `امانتی ${s.name}`.slice(0, 255)]),
        );
        bump(`custody locations (${sellers.length} sellers)`, sellers.length);
    }

    await run(
        'INSERT IGNORE INTO sales_channels (id, code, name, type, is_active, created_at) VALUES (?,?,?,?,1,NOW()), (?,?,?,?,1,NOW())',
        [uuidV5('channel:website'), 'website', 'فروشگاه اینترنتی', 'online', uuidV5('channel:consignment'), 'consignment', 'واگذاری دستفروشان', 'consignment'],
    );
    bump('sales channels', 2);
}

// ---------------------------------------------------------------------------
// Stage 2 — products / variants / skus
// ---------------------------------------------------------------------------

async function stage2Catalog() {
    const [items] = await conn.query(
        `SELECT id, code, name, category, cost_price, retail_price, min_stock_threshold
         FROM items ORDER BY created_at ASC`,
    );

    let remappedCategories = 0;
    for (const it of items) {
        const productId = productIdFor(it.id);
        const variantId = variantIdFor(it.id);
        const skuId = skuIdFor(it.id);

        // Legacy categories («مانتو») must map onto real categories rows (FK added in 0018).
        let categoryId = it.category ?? null;
        if (categoryId && LEGACY_CATEGORY_MAP[categoryId]) {
            categoryId = LEGACY_CATEGORY_MAP[categoryId];
            remappedCategories += 1;
        }
        if (categoryId) {
            const [ok] = await conn.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
            if (ok.length === 0) categoryId = null; // orphan legacy value: leave uncategorized
        }

        await run(
            `INSERT INTO products (id, name, category_id, description, image_url, status, created_at, updated_at)
             VALUES (?,?,?,NULL,NULL,'active',NOW(),NOW())
             ON DUPLICATE KEY UPDATE name = VALUES(name), category_id = VALUES(category_id), updated_at = NOW()`,
            [productId, it.name, categoryId],
        );
        // Single variant per legacy item (the legacy row has no per-variant stock split).
        await run(
            `INSERT INTO product_variants (id, product_id, attributes, created_at)
             VALUES (?,?,JSON_OBJECT(),NOW())
             ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)`,
            [variantId, productId],
        );
        // '-P' keeps SKU codes disjoint from legacy item codes.
        await run(
            `INSERT INTO skus (id, product_variant_id, code, name, cost_price, sale_price, min_stock_threshold, legacy_item_id, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())
             ON DUPLICATE KEY UPDATE name = VALUES(name), cost_price = VALUES(cost_price), sale_price = VALUES(sale_price), legacy_item_id = VALUES(legacy_item_id), updated_at = NOW()`,
            [skuId, variantId, `${it.code}-P`.slice(0, 64), it.name, Number(it.cost_price ?? 0), Number(it.retail_price ?? 0), Number(it.min_stock_threshold ?? 0), it.id],
        );
    }
    bump(`products/variants/skus (${items.length} items)`, items.length);
    if (remappedCategories > 0) {
        bump(`category remapped مانتو->women_clothing`, remappedCategories);
        log(`  ↻ ${remappedCategories} item(s) remapped مانتو -> women_clothing`);
    }
}

// ---------------------------------------------------------------------------
// Stage 3 — opening stock (legacy cache buckets -> ledger)
// ---------------------------------------------------------------------------

async function stage3OpeningStock(actorId) {
    const shelf = shelfLocationId();
    const shop = shopLocationId();
    // Soft-deleted items hold no stock that the UI shows; opening balances mirror
    // the live buckets (is_deleted = 0) so cache == Σledger holds for every row.
    const [items] = await conn.query(
        'SELECT id, stock_quantity, website_quantity FROM items WHERE is_deleted = 0 ORDER BY code ASC',
    );

    const movements = [];
    const cache = [];
    for (const it of items) {
        const skuId = skuIdFor(it.id);
        const shelfQty = Number(it.stock_quantity ?? 0);
        const shopQty = Number(it.website_quantity ?? 0);
        if (shelfQty > 0) {
            movements.push([
                backfillMovementId(it.id, shelf),
                skuId,
                shelf,
                'ADJUSTMENT_IN',
                shelfQty,
                REFERENCE_BACKFILL,
                it.id,
                REASON_OPENING,
                actorId,
            ]);
            cache.push([skuId, shelf, shelfQty]);
        }
        if (shopQty > 0) {
            movements.push([
                backfillMovementId(it.id, shop),
                skuId,
                shop,
                'ADJUSTMENT_IN',
                shopQty,
                REFERENCE_BACKFILL,
                it.id,
                REASON_OPENING,
                actorId,
            ]);
            cache.push([skuId, shop, shopQty]);
        }
    }

    if (movements.length > 0) {
        const ph = movements.map(() => '(?,?,?,?,?,?,?,?,?,NOW())').join(',');
        await run(
            `INSERT IGNORE INTO inventory_ledger (id, sku_id, location_id, movement_type, quantity_delta, reference_type, reference_id, reason, actor_id, created_at)
             VALUES ${ph}`,
            movements.flat(),
        );
        bump(`ledger opening movements (${movements.reduce((s, m) => s + m[4], 0)} units)`, movements.length);
    }

    for (const [skuId, locationId, qty] of cache) {
        await run(
            `INSERT INTO sku_locations (sku_id, location_id, quantity) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
            [skuId, locationId, qty],
        );
    }
    if (cache.length > 0) bump('sku_locations cache rows', cache.length);
}

// ---------------------------------------------------------------------------
// Stage 4 — opening seller liability (gross).
//
// The live ledger needs both sides of history: the gross credit the seller
// received AND the payments they made — not the net currentDebt. Each
// seller gets ONE opening PAYABLE of (currentDebt + totalPaid) with the
// legacy consignment breakdown traced in the run log; stage 5 then posts the
// legacy payments as PAYMENT rows, so:
//   Σ(PAYABLE·dir) − Σ(PAYMENT) == sellers.currentDebt  (per seller, exact)
// Gross opening = 341,000,000; payments = 151,925,000; net = 189,075,000
// (the spec's L243 "total").
// ---------------------------------------------------------------------------

async function stage4SellerDebt(actorId) {
    const [sellers] = await conn.query(
        `SELECT sl.id, sl.code, sl.name, sl.current_debt,
                COALESCE((SELECT SUM(p.amount) FROM payments p
                          WHERE p.seller_id = sl.id AND p.is_deleted = 0), 0) AS paid
         FROM sellers sl WHERE sl.is_deleted = 0 ORDER BY sl.code ASC`,
    );

    for (const s of sellers) {
        const paid = Number(s.paid ?? 0);
        const gross = Number(s.current_debt ?? 0) + paid;
        if (gross <= 0) continue;

        // Legacy consignment breakdown for this seller — traceability.
        const [cons] = await conn.query(
            `SELECT code, total_amount, paid_amount, remaining_amount, status
             FROM consignments WHERE seller_id = ? AND is_deleted = 0 ORDER BY created_at ASC`,
            [s.id],
        );
        const breakdown = cons.map((c) => ({
            code: c.code,
            total: Number(c.total_amount ?? 0),
            paid: Number(c.paid_amount ?? 0),
            remaining: Number(c.remaining_amount ?? 0),
            status: c.status,
        }));
        if (breakdown.length > 0) {
            log(`    ${s.code}: legacy breakdown ${JSON.stringify(breakdown)}`);
        }

        const description = `بدهی اولیه ناخالص «${s.name}» (ناخالص ${gross.toLocaleString('en-US')}، وصول‌شده ${paid.toLocaleString('en-US')}، مانده ${Number(s.current_debt ?? 0).toLocaleString('en-US')})`;
        await run(
            `INSERT INTO financial_transactions (id, txn_type, direction, amount, counterparty_type, counterparty_id, reference_type, reference_id, description, actor_id, occurred_at, created_at)
             VALUES (?, 'PAYABLE', 1, ?, 'seller', ?, 'backfill', ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE amount = VALUES(amount), description = VALUES(description)`,
            [backfillTxnId(`seller-debt:${s.id}`), gross, s.id, s.id, description.slice(0, 512), actorId],
        );
        bump('seller PAYABLE opening rows', 1);
    }
    const [[total]] = await conn.query(
        `SELECT COALESCE(SUM(sl.current_debt),0) + COALESCE((SELECT SUM(p.amount) FROM payments p
          JOIN sellers s2 ON s2.id = p.seller_id WHERE p.is_deleted = 0 AND s2.is_deleted = 0),0) AS t
         FROM sellers sl WHERE sl.is_deleted = 0`,
    );
    log(`  seller PAYABLE gross opening Σ ${Number(total.t).toLocaleString('en-US')} تومان (خالص مانده 189,075,000)`);
}

// ---------------------------------------------------------------------------
// Stage 5 — legacy payments -> PAYMENT rows; legacy expenses -> EXPENSE rows
// ---------------------------------------------------------------------------

async function stage5PaymentsAndExpenses(actorId) {
    const [payments] = await conn.query(
        'SELECT id, code, seller_id, amount, date, payment_method FROM payments WHERE is_deleted = 0 ORDER BY date ASC',
    );
    for (const p of payments) {
        await run(
            `INSERT IGNORE INTO financial_transactions (id, txn_type, direction, amount, counterparty_type, counterparty_id, reference_type, reference_id, description, actor_id, occurred_at, created_at)
             VALUES (?, 'PAYMENT', -1, ?, 'seller', ?, 'payment', ?, ?, ?, COALESCE(?, NOW()), NOW())`,
            [
                backfillTxnId(`payment:${p.id}`),
                Number(p.amount ?? 0),
                p.seller_id,
                p.id,
                `پرداخت دستفروش ${p.code} (${p.payment_method ?? 'نامشخص'})`.slice(0, 512),
                actorId,
                p.date,
            ],
        );
        bump(`PAYMENT rows (${payments.length} payments)`, 1);
    }

    const [expenses] = await conn.query(
        'SELECT id, code, title, amount, date, category FROM expenses WHERE is_deleted = 0 ORDER BY date ASC',
    );
    for (const e of expenses) {
        await run(
            `INSERT IGNORE INTO financial_transactions (id, txn_type, direction, amount, counterparty_type, reference_type, reference_id, description, actor_id, occurred_at, created_at)
             VALUES (?, 'EXPENSE', -1, ?, 'other', 'expense', ?, ?, ?, COALESCE(?, NOW()), NOW())`,
            [
                backfillTxnId(`expense:${e.id}`),
                Number(e.amount ?? 0),
                e.id,
                `هزینه ${e.title} (${e.category ?? 'other'})`.slice(0, 512),
                actorId,
                e.date,
            ],
        );
        bump(`EXPENSE rows (${expenses.length} expenses)`, 1);
    }
}

// ---------------------------------------------------------------------------
// Stage 6 — damage records as-is
//
// The 3 live damage records predate the ledger bridge: createDamage never
// decremented legacy stock and 'fixed' rows returned quantity through direct
// items.stock_quantity writes — all of it already inside the stage 3 opening
// balances. Posting ADJUSTMENT_OUT here would double-count and break
// cache == Σledger. Report only.
// ---------------------------------------------------------------------------

async function stage6Damage() {
    const [rows] = await conn.query(
        `SELECT status, COUNT(*) AS n, COALESCE(SUM(quantity),0) AS q
         FROM damage_records WHERE is_deleted = 0 GROUP BY status`,
    );
    for (const r of rows) {
        log(`    damage ${r.status}: ${r.n} record(s), ${r.q} unit(s) — in opening stock, no rows posted`);
    }
    bump('damage records carried as-is', rows.reduce((s, r) => s + Number(r.n), 0));
}

// ---------------------------------------------------------------------------
// Reconciliation — the invariant the whole model rests on
// ---------------------------------------------------------------------------

async function reconcile() {
    const shelf = shelfLocationId();
    const shop = shopLocationId();
    log('\n▶ reconciliation');

    // 1. items.stockQuantity == Σ ledger at shelf ; websiteQuantity == Σ ledger at shop.
    const [mismatch] = await conn.query(
        `SELECT i.code, i.stock_quantity,
                COALESCE(SUM(CASE WHEN l.location_id = ? THEN l.quantity_delta ELSE 0 END), 0) AS shelf_ledger,
                i.website_quantity,
                COALESCE(SUM(CASE WHEN l.location_id = ? THEN l.quantity_delta ELSE 0 END), 0) AS shop_ledger
         FROM items i
         LEFT JOIN skus s ON s.legacy_item_id = i.id
         LEFT JOIN inventory_ledger l ON l.sku_id = s.id
         WHERE i.is_deleted = 0
         GROUP BY i.id, i.code, i.stock_quantity, i.website_quantity
         HAVING i.stock_quantity <> shelf_ledger OR i.website_quantity <> shop_ledger`,
        [shelf, shop],
    );
    if (mismatch.length > 0) {
        log(`  ✗ stock cache mismatch on ${mismatch.length} item(s):`);
        for (const m of mismatch.slice(0, 10)) log(`    ${m.code}: cache ${m.stock_quantity}/${m.website_quantity} vs ledger ${m.shelf_ledger}/${m.shop_ledger}`);
        throw new Error('backfill: stock cache != Σ ledger — fix before continuing');
    }
    log('  ✓ items.stockQuantity / websiteQuantity == Σ ledger (shelf / shop)');

    // 1b. sku_locations.quantity == Σ ledger(sku, location) — the per-location cache.
    const [cacheMismatch] = await conn.query(
        `SELECT sl.sku_id, sl.location_id, sl.quantity,
                COALESCE((SELECT SUM(l.quantity_delta) FROM inventory_ledger l
                          WHERE l.sku_id = sl.sku_id AND l.location_id = sl.location_id), 0) AS ledger_total
         FROM sku_locations sl
         HAVING sl.quantity <> ledger_total`,
    );
    if (cacheMismatch.length > 0) {
        log(`  ✗ sku_locations cache mismatch on ${cacheMismatch.length} row(s):`);
        for (const m of cacheMismatch.slice(0, 10)) log(`    ${m.sku_id}@${m.location_id}: cache ${m.quantity} vs ledger ${m.ledger_total}`);
        throw new Error('backfill: sku_locations != Σ ledger — fix before continuing');
    }
    log('  ✓ sku_locations.quantity == Σ ledger (per sku/location)');

    // 2. sellers.currentDebt == Σ(PAYABLE·dir) − Σ(PAYMENT) per seller.
    const [debtRows] = await conn.query(
        `SELECT sl.code, sl.current_debt,
                COALESCE((SELECT SUM(ft.amount * ft.direction) FROM financial_transactions ft
                          WHERE ft.txn_type = 'PAYABLE' AND ft.counterparty_type = 'seller' AND ft.counterparty_id = sl.id), 0)
              - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                          WHERE ft.txn_type = 'PAYMENT' AND ft.counterparty_type = 'seller' AND ft.counterparty_id = sl.id), 0)
                AS derived
         FROM sellers sl WHERE sl.is_deleted = 0 AND sl.current_debt > 0`,
    );
    const bad = debtRows.filter((r) => Number(r.current_debt) !== Number(r.derived));
    if (bad.length > 0) {
        log(`  ✗ debt mismatch on ${bad.length} seller(s):`);
        for (const m of bad.slice(0, 10)) log(`    ${m.code}: cache ${m.current_debt} vs derived ${m.derived}`);
        throw new Error('backfill: sellers.currentDebt != Σ financial — fix before continuing');
    }
    log('  ✓ sellers.currentDebt == Σ(PAYABLE) − Σ(PAYMENT)');

    // 3. No orphan ledger/financial rows: every sku_id/location_id resolves.
    const [[orphanLedger]] = await conn.query(
        'SELECT COUNT(*) AS n FROM inventory_ledger l LEFT JOIN skus s ON s.id = l.sku_id LEFT JOIN locations loc ON loc.id = l.location_id WHERE s.id IS NULL OR loc.id IS NULL',
    );
    if (orphanLedger.n > 0) throw new Error(`backfill: ${orphanLedger.n} ledger row(s) reference missing sku/location`);
    log('  ✓ no orphan ledger rows');
}

main().catch(async (err) => {
    console.error('\n✗ backfill failed:', err.message);
    if (conn) await conn.end().catch(() => {});
    process.exit(1);
});
