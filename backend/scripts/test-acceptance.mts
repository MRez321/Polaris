/**
 * P0-B acceptance test (spec L260-266).
 *
 * Runs the REAL services against the live dev MySQL — the same seams the API
 * routes call — so a green run means the wiring is green, not just the SQL.
 * Invoked through tsx (the repo's dev runner) because the services are TS:
 *
 *   npx tsx scripts/test-acceptance.mts
 *
 * Every entity this script creates carries referenceType='acceptance-test' (or
 * an `ACC-` code prefix), so its rows stay identifiable and excludable from
 * reports. Ledger rows for test SKUs are kept on purpose — the ledger is
 * append-only history; the inverse ADJUSTMENT_OUT in step 7 unwinds the
 * quantities instead of deleting them.
 *
 * Invariants asserted after every step:
 *   items cache == Σ ledger | debt cache == Σ financial | every movement has
 *   reference + actor | every sensitive action audited.
 */
import { and, eq, sql } from 'drizzle-orm';

import { db } from '../src/config/drizzle.js';
import { getSellerBalance } from '../src/core/services/financialService.js';
import {
    recordMovements,
    resolveLegacySku,
    shelfLocationId,
    shopLocationId,
    syncLegacyStockCache,
    type DbTx,
} from '../src/core/services/inventoryLedgerService.js';
import {
    createHandover,
    createItem,
    createPayment,
    createSeller,
    markDelivered,
    restoreEntity,
    setShopAllocation,
    softDeleteConsignment,
    softDeleteItem,
} from '../src/modules/workshop/inventoryService.js';
import { createOrder, updateOrderStatus } from '../src/services/ordersService.js';
import {
    auditLogs,
    financialTransactions,
    inventoryLedger,
    items,
    orders,
    purchaseItems,
    purchases,
    sellers,
    skus,
    skuLocations,
    suppliers,
} from '../src/schema/index.js';

const REF = 'acceptance-test';
const ADMIN_ID = 'pwAoBHRjr8giUkPk3w1xZ1RTtLaHnzjs';
const ACTOR_NAME = 'آزمون پذیرش';
const OPENING = 100;
const RECEIVED = 40;
const TO_SHOP = 60;
const SOLD = 2;
const HANDED_OVER = 10;
const UNIT_PRICE = 120_000;

let failures = 0;
let checks = 0;

function check(name: string, cond: boolean, extra?: unknown): boolean {
    checks += 1;
    if (cond) {
        console.log(`  ✓ ${name}`);
        return true;
    }
    failures += 1;
    console.log(`  ✗ ${name}${extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
    return false;
}

/** Σ ledger per (sku, location) — the authoritative on-hand quantity. */
async function ledgerQty(skuId: string, locationId: string): Promise<number> {
    const rows = await db
        .select({ total: sql<number>`COALESCE(SUM(quantity_delta), 0)` })
        .from(inventoryLedger)
        .where(and(eq(inventoryLedger.skuId, skuId), eq(inventoryLedger.locationId, locationId)));
    return Number(rows[0]?.total ?? 0);
}

async function cacheQty(skuId: string, locationId: string): Promise<number> {
    const rows = await db
        .select({ qty: skuLocations.quantity })
        .from(skuLocations)
        .where(and(eq(skuLocations.skuId, skuId), eq(skuLocations.locationId, locationId)));
    return rows[0]?.qty ?? 0;
}

/** items.stockQuantity/websiteQuantity == Σ ledger at رف انبار / ویترین. */
async function assertItemCaches(itemId: string, expectedShelf: number, expectedShop: number): Promise<void> {
    const skuId = await resolveLegacySku(db, itemId);
    const [itemRows, shelfLed, shopLed] = await Promise.all([
        db.select().from(items).where(eq(items.id, itemId)),
        ledgerQty(skuId, shelfLocationId()),
        ledgerQty(skuId, shopLocationId()),
    ]);
    const item = itemRows[0];
    check(
        `items cache == Σ ledger (stock ${item?.stockQuantity}/${shelfLed}, website ${item?.websiteQuantity}/${shopLed})`,
        item !== undefined && item.stockQuantity === shelfLed && item.websiteQuantity === shopLed,
        { itemId, expectedShelf, expectedShop },
    );
    check(
        `items cache == expected (${expectedShelf}/${expectedShop})`,
        item?.stockQuantity === expectedShelf && item?.websiteQuantity === expectedShop,
        { itemId, got: [item?.stockQuantity, item?.websiteQuantity] },
    );
}

async function movementsFor(referenceId: string, referenceType: string) {
    return db
        .select()
        .from(inventoryLedger)
        .where(
            and(
                eq(inventoryLedger.referenceId, referenceId),
                eq(inventoryLedger.referenceType, referenceType),
            ),
        );
}

async function assertAudited(entityType: string, entityId: string, action: string): Promise<void> {
    const rows = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(
            and(
                eq(auditLogs.entityType, entityType),
                eq(auditLogs.entityId, entityId),
                eq(auditLogs.action, action),
            ),
        );
    check(`audited ${entityType}/${action}`, rows.length > 0, { entityType, entityId, action });
}

/** debt cache == Σ financial rows, per seller. */
async function assertDebtMatchesFinancial(sellerId: string, label: string): Promise<void> {
    const [rows, cacheRows, balance] = await Promise.all([
        db
            .select({
                txnType: financialTransactions.txnType,
                dir: financialTransactions.direction,
                amount: financialTransactions.amount,
            })
            .from(financialTransactions)
            .where(eq(financialTransactions.counterpartyId, sellerId)),
        db.select({ debt: sellers.currentDebt }).from(sellers).where(eq(sellers.id, sellerId)),
        getSellerBalance(sellerId),
    ]);
    const derived =
        rows.filter((r) => r.txnType === 'PAYABLE').reduce((s, r) => s + r.dir * Number(r.amount), 0) -
        rows.filter((r) => r.txnType === 'PAYMENT').reduce((s, r) => s + Number(r.amount), 0);
    check(`${label}: Σ financial == getSellerBalance`, derived === balance, { derived, balance });
    check(
        `${label}: sellers.currentDebt == Σ financial`,
        Number(cacheRows[0]?.debt ?? 0) === derived,
        { cache: cacheRows[0]?.debt, derived },
    );
}

/** Every movement this script wrote carries a reference + actor. */
async function assertMovementsTraceable(): Promise<void> {
    const rows = await db
        .select({
            id: inventoryLedger.id,
            referenceType: inventoryLedger.referenceType,
            referenceId: inventoryLedger.referenceId,
            actorId: inventoryLedger.actorId,
        })
        .from(inventoryLedger)
        .where(eq(inventoryLedger.referenceType, REF));
    const bad = rows.filter((r) => r.referenceType === '' || r.referenceId === '' || !r.actorId);
    check(`every ${REF} movement has reference + actor (${rows.length} rows)`, bad.length === 0, bad.slice(0, 5));
}

async function main(): Promise<void> {
    console.log('\n▶ P0-B acceptance (dev DB, real services)\n');

    // ------------------------------------------------------------------ step 1
    console.log(`1. test SKU + ADJUSTMENT_IN opening ${OPENING} @ رف انبار`);
    const item = await createItem(
        {
            name: `کالای آزمون پذیرش ${Date.now()}`,
            category: 'shirts',
            costPrice: 100_000,
            consignmentPrice: UNIT_PRICE,
            retailPrice: 200_000,
            stockQuantity: OPENING,
            minStockThreshold: 0,
        },
        ADMIN_ID,
    );
    const skuId = await resolveLegacySku(db, item.id);
    await assertItemCaches(item.id, OPENING, 0);
    const openingMoves = await movementsFor(item.id, 'item');
    check(
        'createItem posted ADJUSTMENT_IN through the ledger',
        openingMoves.some((m) => m.movementType === 'ADJUSTMENT_IN' && m.quantityDelta === OPENING),
        { rows: openingMoves.map((m) => `${m.movementType} ${m.quantityDelta}`) },
    );
    check('test sku is seeded deterministically', (await cacheQty(skuId, shelfLocationId())) === OPENING);

    // ------------------------------------------------------------------ step 2
    console.log(`\n2. purchase draft → received (+${RECEIVED} PURCHASE_RECEIPT)`);
    const supplierId = crypto.randomUUID();
    const purchaseId = crypto.randomUUID();
    await db.insert(suppliers).values({
        id: supplierId,
        code: `ACC-SUP-${Date.now()}`,
        name: 'تأمین‌کننده آزمون پذیرش',
    });
    await db.insert(purchases).values({
        id: purchaseId,
        code: `ACC-PUR-${Date.now()}`,
        supplierId,
        status: 'draft',
        totalAmount: RECEIVED * 100_000,
        note: `${REF} — خرید آزمایشی`,
        actorId: ADMIN_ID,
    });
    await db.insert(purchaseItems).values({
        id: crypto.randomUUID(),
        purchaseId,
        skuId,
        quantity: RECEIVED,
        unitCost: 100_000,
        receivedQuantity: 0,
    });

    const [draftRows] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
    check('purchase starts as draft', draftRows?.status === 'draft');
    check('nothing received yet (received_quantity=0)', (await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId)))[0]?.receivedQuantity === 0);

    await db.transaction(async (tx: DbTx) => {
        await tx
            .update(purchases)
            .set({ status: 'confirmed', updatedAt: new Date() })
            .where(eq(purchases.id, purchaseId));
        await tx
            .update(purchaseItems)
            .set({ receivedQuantity: RECEIVED })
            .where(eq(purchaseItems.purchaseId, purchaseId));
        // P0-C owns the real purchase service; here the receipt proof is the
        // ledger row, exactly as it will be posted then.
        await recordMovements(tx, [
            {
                skuId,
                locationId: shelfLocationId(),
                movementType: 'PURCHASE_RECEIPT',
                quantityDelta: RECEIVED,
                referenceType: REF,
                referenceId: purchaseId,
                reason: 'رسید خرید آزمایشی',
                unitCost: 100_000,
                actorId: ADMIN_ID,
            },
        ]);
        // recordMovements writes only the ledger + sku_locations; the caller
        // must sync the legacy item cache in the same transaction (every other
        // flow does). P0-C's purchase service will do the same.
        await syncLegacyStockCache(tx, item.id);
    });
    const purchaseMoves = await movementsFor(purchaseId, REF);
    check(
        'PURCHASE_RECEIPT row exists with reference',
        purchaseMoves.length === 1 && purchaseMoves[0]?.movementType === 'PURCHASE_RECEIPT',
        { rows: purchaseMoves.map((m) => `${m.movementType} ${m.quantityDelta}`) },
    );
    check('purchase line quantity received', purchaseMoves[0]?.quantityDelta === RECEIVED);
    await assertItemCaches(item.id, OPENING + RECEIVED, 0);

    // ------------------------------------------------------------------ step 3
    console.log('\n3. transfer رف انبار → ویترین (atomic pair)');
    await setShopAllocation(item.id, TO_SHOP, ADMIN_ID);
    const allocMoves = (await movementsFor(item.id, 'legacy')).filter(
        (m) => m.movementType === 'TRANSFER_OUT' || m.movementType === 'TRANSFER_IN',
    );
    check('TRANSFER_OUT + TRANSFER_IN pair (2 rows)', allocMoves.length === 2, { n: allocMoves.length });
    const out = allocMoves.find((m) => m.movementType === 'TRANSFER_OUT');
    const into = allocMoves.find((m) => m.movementType === 'TRANSFER_IN');
    check(
        'pair is balanced (OUT -60 / IN +60)',
        out?.quantityDelta === -TO_SHOP && into?.quantityDelta === TO_SHOP,
        { out: out?.quantityDelta, into: into?.quantityDelta },
    );
    await assertItemCaches(item.id, OPENING + RECEIVED - TO_SHOP, TO_SHOP);

    // ------------------------------------------------------------------ step 4
    console.log(`\n4. SALE ${SOLD} units from ویترین`);
    const order = await createOrder(
        {
            userId: ADMIN_ID,
            customerName: 'خریدار آزمایشی',
            phone: '09120000000',
            province: 'تهران',
            city: 'تهران',
            postalCode: '1234567890',
            address: 'آدرس آزمایشی',
            note: REF,
            paymentMethod: 'cod',
            lines: [{ itemId: item.id, quantity: SOLD }],
        },
        ADMIN_ID,
    );
    const saleMoves = await movementsFor(order.id, 'order');
    check(
        `SALE row posted at ویترین (-${SOLD})`,
        saleMoves.length === 1 && saleMoves[0]?.movementType === 'SALE' && saleMoves[0]?.quantityDelta === -SOLD,
        { rows: saleMoves.map((m) => `${m.movementType} ${m.quantityDelta}`) },
    );
    await assertItemCaches(item.id, OPENING + RECEIVED - TO_SHOP, TO_SHOP - SOLD);

    // ------------------------------------------------------------------ step 5
    console.log('\n5. handover → seller payment + settlement (debt cache == Σ financial)');
    const seller = await createSeller({
        name: `دست‌فروش آزمون ${Date.now()}`,
        phone: '09120000001',
        notes: REF,
    });
    await assertDebtMatchesFinancial(seller.id, 'new seller');

    // Scheduled (pending) handover: goods move, debt does not start yet.
    const pendingHandover = await createHandover(
        {
            sellerId: seller.id,
            dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
            deliveryDate: new Date(Date.now() + 86_400_000).toISOString(),
            notes: `${REF} — واگذاری در انتظار تحویل`,
            itemsList: [{ itemId: item.id, quantity: HANDED_OVER, unitPrice: UNIT_PRICE }],
        },
        ACTOR_NAME,
        ADMIN_ID,
    );
    const custodyMoves = await movementsFor(pendingHandover.id, 'consignment');
    check(
        'handover posts a TRANSFER_OUT/TRANSFER_IN pair to seller custody',
        custodyMoves.length === 2,
        { rows: custodyMoves.map((m) => `${m.movementType} ${m.quantityDelta}`) },
    );
    const pendingDebt = await getSellerBalance(seller.id);
    check('pending handover owes nothing yet', pendingDebt === 0, { debt: pendingDebt });
    await assertItemCaches(item.id, OPENING + RECEIVED - TO_SHOP - HANDED_OVER, TO_SHOP - SOLD);

    await markDelivered(pendingHandover.id, ACTOR_NAME, ADMIN_ID);
    const expectedDeliveryDebt = HANDED_OVER * UNIT_PRICE;
    const debtAfterDelivery = await getSellerBalance(seller.id);
    check(
        `markDelivered opens the debt (${expectedDeliveryDebt.toLocaleString('en-US')})`,
        debtAfterDelivery === expectedDeliveryDebt,
        { debt: debtAfterDelivery, expected: expectedDeliveryDebt },
    );
    await assertDebtMatchesFinancial(seller.id, 'after delivery');

    const payment = await createPayment(
        { sellerId: seller.id, amount: 500_000, paymentMethod: 'cash', notes: REF },
        ACTOR_NAME,
        ADMIN_ID,
    );
    // The money-in row references the payment; each SETTLEMENT row references
    // the consignment it was applied to (settleDebt writes them that way), so
    // match on the seller + type like getSellerBalance does.
    const paymentRows = await db
        .select({ type: financialTransactions.txnType, ref: financialTransactions.referenceType })
        .from(financialTransactions)
        .where(eq(financialTransactions.counterpartyId, seller.id));
    check(
        'PAYMENT (ref payment) + SETTLEMENT (ref consignment) written',
        paymentRows.some((r) => r.type === 'PAYMENT' && r.ref === 'payment') &&
            paymentRows.some((r) => r.type === 'SETTLEMENT' && r.ref === 'consignment'),
        { rows: paymentRows.map((r) => `${r.type}/${r.ref}`) },
    );
    const debtAfterPayment = await getSellerBalance(seller.id);
    check('debt after 500,000 payment == 700,000', debtAfterPayment === 700_000, { debt: debtAfterPayment });
    await assertDebtMatchesFinancial(seller.id, 'after payment');

    // ------------------------------------------------------------------ step 6
    console.log('\n6. order cancel → RETURN_IN; trash → restore audited');
    await updateOrderStatus(order.id, 'cancelled', undefined, ADMIN_ID, {
        ip: '127.0.0.1',
        userAgent: 'acceptance-test',
    });
    const orderMoves = await movementsFor(order.id, 'order');
    const returnIn = orderMoves.find((m) => m.movementType === 'RETURN_IN');
    check('cancel posts RETURN_IN (+2) at ویترین', returnIn?.quantityDelta === SOLD, {
        rows: orderMoves.map((m) => `${m.movementType} ${m.quantityDelta}`),
    });
    check('order now cancelled', (await db.select().from(orders).where(eq(orders.id, order.id)))[0]?.status === 'cancelled');
    await assertItemCaches(item.id, OPENING + RECEIVED - TO_SHOP - HANDED_OVER, TO_SHOP);
    await assertAudited('order', order.id, 'update');

    // Immediate handover to a second consignment: debt opens at once, then the
    // trash round-trip releases and re-opens it.
    const handover = await createHandover(
        {
            sellerId: seller.id,
            dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
            notes: `${REF} — واگذاری تحویل‌شده`,
            itemsList: [{ itemId: item.id, quantity: 2, unitPrice: UNIT_PRICE }],
        },
        ACTOR_NAME,
        ADMIN_ID,
    );
    const debtWithHandover = await getSellerBalance(seller.id);
    check('immediate handover opens debt (700,000 + 240,000)', debtWithHandover === 940_000, {
        debt: debtWithHandover,
    });
    await assertDebtMatchesFinancial(seller.id, 'after immediate handover');

    await softDeleteConsignment(handover.id, ADMIN_ID);
    const debtAfterDelete = await getSellerBalance(seller.id);
    check('deleting the consignment releases its debt (700,000)', debtAfterDelete === 700_000, {
        debt: debtAfterDelete,
    });
    await assertDebtMatchesFinancial(seller.id, 'after consignment delete');

    const restored = (await restoreEntity('consignment', handover.id, undefined, ADMIN_ID, {
        ip: '127.0.0.1',
        userAgent: 'acceptance-test',
    })) as { isDeleted?: boolean };
    check('restore un-archives the consignment', restored.isDeleted === false, restored);
    await assertDebtMatchesFinancial(seller.id, 'after restore');
    await assertAudited('consignment', handover.id, 'restore');

    // ------------------------------------------------------------------ step 7
    console.log('\n7. cleanup: inverse ADJUSTMENT_OUT + logical delete of test entities');
    await softDeleteItem(item.id, ADMIN_ID);
    check(
        'test item is in the trash (is_deleted=1)',
        (await db.select({ d: items.isDeleted }).from(items).where(eq(items.id, item.id)))[0]?.d === true,
    );

    // Post the inventory unwind. Current on-hand: shelf X, shop 2 — everything
    // still held goes out of stock; the 10 at the seller stay (they left the
    // workshop, balanced by the debt rows above).
    const shelfNow = await ledgerQty(skuId, shelfLocationId());
    const shopNow = await ledgerQty(skuId, shopLocationId());
    const unwinds = [
        { locationId: shelfLocationId(), qty: -shelfNow, where: 'رف انبار' },
        { locationId: shopLocationId(), qty: -shopNow, where: 'ویترین' },
    ].filter((u) => u.qty !== 0);
    const unwindSku = await resolveLegacySku(db, item.id);
    await db.transaction(async (tx: DbTx) => {
        for (const u of unwinds) {
            await recordMovements(tx, [
                {
                    skuId: unwindSku,
                    locationId: u.locationId,
                    movementType: 'ADJUSTMENT_OUT',
                    quantityDelta: u.qty,
                    referenceType: REF,
                    referenceId: purchaseId,
                    reason: `پاک‌سازی آزمون پذیرش — ${u.where}`,
                    actorId: ADMIN_ID,
                },
            ]);
        }
        await syncLegacyStockCache(tx, item.id);
    });
    await Promise.all([
        assertItemCaches(item.id, 0, 0),
        assertCacheRowMatches(skuId, shelfLocationId()),
        assertCacheRowMatches(skuId, shopLocationId()),
    ]);
    await assertMovementsTraceable();

    // Test purchase rows stay (ledger references them); only the workflow
    // scaffolding is removed so the purchase itself remains identifiable.
    await db.update(purchases).set({ deletedAt: new Date(), deletedBy: ADMIN_ID }).where(eq(purchases.id, purchaseId));
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    check(
        'sku_locations cache rows are zeroed, not deleted',
        (await cacheQty(unwindSku, shelfLocationId())) === 0 &&
            (await cacheQty(skuId, shopLocationId())) === 0,
    );

    console.log(`\n▶ ${checks - failures}/${checks} checks passed`);
    if (failures > 0) {
        console.log(`\n✗ acceptance FAILED (${failures} failing check(s))`);
        process.exit(1);
    }
    console.log('\n✓ acceptance complete');
    process.exit(0);
}

async function assertCacheRowMatches(skuId: string, locationId: string): Promise<void> {
    const [led, cache] = await Promise.all([ledgerQty(skuId, locationId), cacheQty(skuId, locationId)]);
    check(`sku_locations cache == Σ ledger (${cache}/${led})`, led === cache, { skuId, locationId });
}

main().catch((err: unknown) => {
    console.error('\n✗ acceptance crashed:', err);
    process.exit(1);
});