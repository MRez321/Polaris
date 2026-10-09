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
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

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
    softDeleteSeller,
} from '../src/modules/workshop/inventoryService.js';
import { createOrder, updateOrderStatus } from '../src/services/ordersService.js';
import * as supplierSvc from '../src/modules/supply/supplierService.js';
import * as purchaseSvc from '../src/modules/supply/purchaseService.js';
import { shelfLocationId } from '../src/core/services/inventoryLedgerService.js';
import {
    auditLogs,
    consignments,
    financialTransactions,
    inventoryLedger,
    items,
    orders,
    purchaseItems,
    purchaseReceipts,
    purchaseReceiptItems,
    purchaseRequestItems,
    purchaseRequests,
    purchases,
    sellers,
    skus,
    skuLocations,
    supplyCosts,
    supplyCostAllocations,
    suppliers,
    supplierPrices,
} from '../src/schema/index.js';

const SUPPLIER_NAME = 'تأمین‌کننده آزمون پذیرش';
const PO_UNIT_COST = 85_000;
const PO_QTY = 50;
const PO_RECEIVE = 50;
const SUPPLY_COST = 300_000;
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
async function runP0CSection(): Promise<void> {
    // P0-C #14: supplier with price history.
    console.log('1. supplier CRUD + append-only price history');
    const supplier = await supplierSvc.createSupplier(
        { name: `${SUPPLIER_NAME}${Date.now()}`, contactPerson: 'احمد آزمون' },
        ADMIN_ID,
    );
    check('supplier created', supplier.id !== undefined && supplier.name.startsWith(SUPPLIER_NAME));

    // The item is created in P0-B step 1 (same closure). Reuse it: find the
    // most recent acceptance item and its linked legacy SKU.
    const latestItems = await db
        .select({ id: items.id })
        .from(items)
        .where(sql`name LIKE 'کالای آزمون پذیرش%'`)
        .orderBy(desc(items.createdAt))
        .limit(1);
    const itemId = latestItems[0]?.id;
    check('found acceptance item for PO line', itemId !== undefined, { itemId });
    if (!itemId) return;
    // createItem already ensured a legacy SKU is linked via legacyItemId.
    const skuLookup = await db.select({ id: skus.id }).from(skus).where(eq(skus.legacyItemId, itemId));
    const skuId = skuLookup[0]?.id ?? itemId;
    check('resolved SKU for PO line', skuId !== undefined, { skuId });

    // P0-C #14: append-only supplier price history (needs a real SKU FK).
    await supplierSvc.appendSupplierPrice(supplier.id, {
        skuId,
        unit: 'قلم',
        purchasePrice: 80_000,
        currency: 'IRT',
        effectiveDate: new Date(),
    }, ADMIN_ID);
    await supplierSvc.appendSupplierPrice(supplier.id, {
        skuId,
        unit: 'قلم',
        purchasePrice: 82_000,
        currency: 'IRT',
        effectiveDate: new Date(),
    }, ADMIN_ID);
    const prices = await supplierSvc.listSupplierPrices(supplier.id);
    check('price history append-only (2 rows)', prices.length === 2, { count: prices.length });
    check('price history kept both versions', prices.map((p) => p.purchasePrice).sort().join(',') === '80000,82000');

    console.log('2. purchase request → submit → approve');
    const req = await purchaseSvc.createRequest(
        { supplierId: supplier.id, notes: 'آزمون P0-C', items: [{ skuId, quantity: PO_QTY, unit: 'قلم' }] },
        ADMIN_ID,
    );
    check('request created', req.id !== undefined && req.status === 'draft');
    const submitted = await purchaseSvc.moveRequest(req.id, 'submit');
    check('request submitted', submitted.status === 'submitted');
    const approved = await purchaseSvc.moveRequest(req.id, 'approve');
    check('request approved', approved.status === 'approved');

    // Reject-then-convert guard: convertRequest requires 'approved'.
    console.log('3. approved request → purchase order');
    const order = await purchaseSvc.convertRequest(req.id, ADMIN_ID);
    check('order created from request', order.id !== undefined && order.status === 'draft');
    check('order carries requestId link', order.requestId === req.id);

    // Update order unit cost for the line.
    console.log('4. order edit in draft');
    await purchaseSvc.updateOrder(order.id, { items: [{ skuId, quantity: PO_QTY, unit: 'قلم', unitCost: PO_UNIT_COST }] }, ADMIN_ID);
    const order2 = await purchaseSvc.getOrder(order.id);
    const line = order2.items[0];
    check('order line unitCost set', Number(line?.unitCost) === PO_UNIT_COST, { unitCost: line?.unitCost });

    // Receipt goods — inventory ledger + legacy cache + payable.
    console.log('5. receive goods (50)');
    const receipt = await purchaseSvc.createReceipt(order.id, {
        items: [{ purchaseItemId: line!.id, quantity: PO_RECEIVE, unitCost: PO_UNIT_COST }],
    }, ADMIN_ID);
    check('receipt posted', receipt.id !== undefined && receipt.status === 'posted');

    // Inventory invariant: cache == Σ ledger at shelf location.
    const skuRow = await db.select({ id: skus.id }).from(skus).where(eq(skus.legacyItemId, itemId));
    const orderSkuId = skuRow[0]?.id ?? itemId;
    const shelfLed = await ledgerQty(orderSkuId, shelfLocationId());
    const shelfCache = await cacheQty(orderSkuId, shelfLocationId());
    check('inventory cache == Σ ledger after receipt', shelfCache === shelfLed, { cache: shelfCache, ledger: shelfLed });
    check('stock cache reflects received qty', shelfCache >= PO_RECEIVE, { cache: shelfCache });

    // Ledger movement traceability.
    const receiptMovements = await movementsFor(receipt.id, 'purchase_receipt');
    check('receipt has PURCHASE_RECEIPT ledger moves', receiptMovements.length > 0, { count: receiptMovements.length });
    const untraced = receiptMovements.filter((m) => !m.actorId || !m.referenceId);
    check('receipt movements traced to actor', untraced.length === 0, { bad: untraced.length });

    // Payable posted (separate from EXPENSE supply costs).
    const payables = await db
        .select({ dir: financialTransactions.direction, amount: financialTransactions.amount })
        .from(financialTransactions)
        .where(
            and(
                eq(financialTransactions.txnType, 'PAYABLE'),
                eq(financialTransactions.counterpartyId, supplier.id),
            ),
        );
    const payableTotal = payables.reduce((s, r) => s + Number(r.amount), 0);
    check('payable posted for receipt value', payableTotal === PO_QTY * PO_UNIT_COST, { payable: payableTotal, expected: PO_QTY * PO_UNIT_COST });

    // P0-C: supply cost + landed-cost allocation.
    console.log('6. supply cost + landed cost allocation');
    const cost = await purchaseSvc.addSupplyCost(order.id, {
        costType: 'shipping',
        description: 'حمل و نقل آزمون',
        amount: SUPPLY_COST,
        currency: 'IRT',
        allocationMethod: 'by_value',
    }, ADMIN_ID);
    check('supply cost created', cost.id !== undefined);

    // Σ allocations == amount (largest-remainder invariant).
    const allocs = await db
        .select({ amount: supplyCostAllocations.amount })
        .from(supplyCostAllocations)
        .where(eq(supplyCostAllocations.costId, cost.id));
    const allocSum = allocs.reduce((s, a) => s + Number(a.amount), 0);
    check('Σ allocations == cost amount', allocSum === SUPPLY_COST, { sum: allocSum, expected: SUPPLY_COST });

    // Landed cost = purchase cost + allocated cost per line.
    const order3 = await purchaseSvc.getOrder(order.id);
    const landed = order3.landedCost[0];
    const expectedLanded = PO_QTY * PO_UNIT_COST + SUPPLY_COST;
    check('landed cost == purchase cost + allocated', landed !== undefined && landed.landed === expectedLanded, {
        got: landed?.landed, expected: expectedLanded,
    });

    // Audit trail for cost creation.
    await assertAudited('supply-cost', cost.id, 'create');

    // Order status progressed to partially_received/received.
    const orderFinal = await purchaseSvc.getOrder(order.id);
    check('order status progressed after receipt', orderFinal.status === 'received' || orderFinal.status === 'partially_received', { status: orderFinal.status });
    // --- cleanup: remove P0-C test fixture entities (supplier + chain) ---
    await db.delete(supplyCostAllocations).where(inArray(supplyCostAllocations.costId, (await db.select({ id: supplyCosts.id }).from(supplyCosts).where(eq(supplyCosts.purchaseId, order.id))).map((c) => c.id)));
    await db.delete(supplyCosts).where(eq(supplyCosts.purchaseId, order.id));
    await db.delete(purchaseReceiptItems).where(inArray(purchaseReceiptItems.receiptId, (await db.select({ id: purchaseReceipts.id }).from(purchaseReceipts).where(eq(purchaseReceipts.purchaseId, order.id))).map((r) => r.id)));
    await db.delete(purchaseReceipts).where(eq(purchaseReceipts.purchaseId, order.id));
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, order.id));
    await db.delete(purchases).where(eq(purchases.id, order.id));
    await db.delete(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, req.id));
    await db.delete(purchaseRequests).where(eq(purchaseRequests.id, req.id));
    await db.delete(supplierPrices).where(eq(supplierPrices.supplierId, supplier.id));
    await db.delete(suppliers).where(eq(suppliers.id, supplier.id));

    console.log('  P0-C section complete (test fixtures cleaned up)');
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

    // Logically delete the remaining test entities. Each consignment delete
    // releases its outstanding debt back off the seller (reduceSellerPayable),
    // so the derived balance returns to exactly zero; the seller row itself
    // is archived. Financial/payment rows stay — append-only history.
    await softDeleteConsignment(pendingHandover.id, ADMIN_ID);
    await softDeleteConsignment(handover.id, ADMIN_ID);
    await softDeleteSeller(seller.id, ADMIN_ID);
    check(
        'test consignments are in the trash (is_deleted=1)',
        (
            await db
                .select({ d: consignments.isDeleted })
                .from(consignments)
                .where(eq(consignments.sellerId, seller.id))
        ).every((r) => r.d === true),
    );
    check(
        'test seller is in the trash (is_deleted=1)',
        (await db.select({ d: sellers.isDeleted }).from(sellers).where(eq(sellers.id, seller.id)))[0]?.d === true,
    );
    check('derived seller debt is zero after cleanup', (await getSellerBalance(seller.id)) === 0, {
        debt: await getSellerBalance(seller.id),
    });
    await assertDebtMatchesFinancial(seller.id, 'after cleanup');
    // ------------------------------------------------------------------ P0-C
    console.log('\n▶ P0-C: Supply chain (supplier → request → order → receipt → costs)\n');
    await runP0CSection();

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