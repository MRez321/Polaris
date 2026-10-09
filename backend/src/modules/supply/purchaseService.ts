import { v4 as uuid } from 'uuid';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '../../config/drizzle.js';
import {
    auditLogs,
    items,
    locations,
    purchaseItems,
    purchaseReceiptItems,
    purchaseReceipts,
    purchaseRequestItems,
    purchaseRequests,
    purchases,
    skus,
    suppliers,
    supplyCostAllocations,
    supplyCosts,
    warehouses,
} from '../../schema/index.js';
import { badRequest, notFound } from '../../core/utils/apiError.js';
import type { DbTx, MovementInput } from '../../core/services/inventoryLedgerService.js';
import {
    recordMovements,
    syncLegacyStockCache,
    shelfLocationId,
    LEGACY_NS,
} from '../../core/services/inventoryLedgerService.js';
import { recordTransaction } from '../../core/services/financialService.js';
import { entityActor, recordAudit } from '../../core/services/auditService.js';



// Workshop warehouse «کارگاه» + shelf «رف انبار» are seeded deterministically
// by scripts/backfill-new-model.mjs (uuid v5 over LEGACY_NS). They are stable
// seeds, not user data, so the location id is computed the same way here.

// ---------------------------------------------------------------------------
// Purchase service (P0-C): requests lifecycle + orders + request→order.
// Request: draft → submitted → approved|rejected → converted | cancelled
// Purchase: draft → ordered (legacy alias 'confirmed') → partially_received
//   → received | cancelled. 'confirmed' is normalized to 'ordered' on write.
// ---------------------------------------------------------------------------

export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted' | 'cancelled';
export type PurchaseStatus = 'draft' | 'ordered' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

export const normalizePurchaseStatus = (s: string): string => (s === 'confirmed' ? 'ordered' : s);
const EDITABLE_PURCHASE: Record<string, true> = { draft: true, ordered: true, confirmed: true };
const RECEIVABLE_PURCHASE: Record<string, true> = { ordered: true, confirmed: true, partially_received: true };

export const isReceivableStatus = (s: string): boolean => RECEIVABLE_PURCHASE[s] === true;

export interface OrderItemInput {
    skuId: string;
    quantity: number;
    unit?: string;
    unitCost: number;
}

export interface RequestItemInput {
    skuId: string;
    quantity: number;
    unit?: string;
    notes?: string;
}

function genCode(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
        .toString(36)
        .toUpperCase()
        .padStart(2, '0')}`;
}

function assertOrderItems(items: OrderItemInput[]): void {
    if (items.length === 0) throw badRequest('سفارش خرید باید حداقل یک قلم داشته باشد');
    for (const it of items) {
        if (!it.skuId) throw badRequest('شناسه کالا (SKU) در اقلام الزامی است');
        if (!Number.isInteger(it.quantity) || it.quantity <= 0) throw badRequest('مقدار هر قلم باید عدد صحیح مثبت باشد');
        if (!Number.isFinite(it.unitCost) || it.unitCost < 0) throw badRequest('قیمت واحد هر قلم باید صفر یا بیشتر باشد');
    }
}

function totals(items: OrderItemInput[], additionalCosts: number): { subtotal: number; total: number } {
    const subtotal = items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
    return { subtotal, total: subtotal + additionalCosts };
}

// --- requests ---------------------------------------------------------------

export async function listRequests(params: { page?: number; limit?: number; status?: string; supplierId?: string }) {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
    const conds = [];
    if (params.status) conds.push(eq(purchaseRequests.status, params.status));
    if (params.supplierId) conds.push(eq(purchaseRequests.supplierId, params.supplierId));
    const where = conds.length ? and(...conds) : undefined;
    const [rows, totalRows] = await Promise.all([
        db.select().from(purchaseRequests).where(where).orderBy(desc(purchaseRequests.createdAt)).limit(limit).offset((page - 1) * limit),
        db.select({ n: sql<number>`COUNT(*)` }).from(purchaseRequests).where(where),
    ]);
    return { rows, total: Number(totalRows[0]?.n ?? 0) };
}

export async function getRequest(id: string) {
    const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    const row = rows[0];
    if (!row) throw notFound('درخواست خرید یافت نشد');
    const items = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, id));
    return { ...row, items };
}

async function requestStatusTx(tx: DbTx, id: string): Promise<string> {
    const rows = await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    const row = rows[0];
    if (!row) throw notFound('درخواست خرید یافت نشد');
    return row.status;
}

function assertRequestEditable(status: string): void {
    if (status !== 'draft' && status !== 'submitted') throw badRequest('فقط درخواست‌های پیش‌نویس یا ثبت‌شده قابل ویرایش هستند');
}

export async function createRequest(
    input: { supplierId?: string; notes?: string; items: RequestItemInput[] },
    actorId?: string,
) {
    if (!input.items || input.items.length === 0) throw badRequest('درخواست خرید باید حداقل یک قلم داشته باشد');
    for (const it of input.items) {
        if (!it.skuId) throw badRequest('شناسه کالا (SKU) در اقلام الزامی است');
        if (!Number.isInteger(it.quantity) || it.quantity <= 0) throw badRequest('مقدار هر قلم باید عدد صحیح مثبت باشد');
    }
    if (input.supplierId) {
        const s = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, input.supplierId));
        if (s.length === 0) throw badRequest('تأمین‌کننده یافت نشد');
    }
    const id = uuid();
    const now = new Date();
    await db.transaction(async (tx) => {
        await tx.insert(purchaseRequests).values({
            id,
            code: genCode('REQ'),
            ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
            status: 'draft',
            requestedBy: actorId ?? null,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            requestDate: now,
            createdAt: now,
            updatedAt: now,
        });
        await tx.insert(purchaseRequestItems).values(
            input.items.map((it) => ({
                id: uuid(),
                requestId: id,
                skuId: it.skuId,
                quantity: it.quantity,
                ...(it.unit !== undefined ? { unit: it.unit } : {}),
                ...(it.notes !== undefined ? { notes: it.notes } : {}),
            })),
        );
    });
    return getRequest(id);
}

export async function updateRequest(id: string, input: { supplierId?: string | null; notes?: string; items?: RequestItemInput[] }) {
    await db.transaction(async (tx) => {
        const status = await requestStatusTx(tx, id);
        assertRequestEditable(status);
        if (input.items !== undefined) {
            if (input.items.length === 0) throw badRequest('درخواست خرید باید حداقل یک قلم داشته باشد');
            for (const it of input.items) {
                if (!it.skuId) throw badRequest('شناسه کالا (SKU) در اقلام الزامی است');
                if (!Number.isInteger(it.quantity) || it.quantity <= 0) throw badRequest('مقدار هر قلم باید عدد صحیح مثبت باشد');
            }
            await tx.delete(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, id));
            await tx.insert(purchaseRequestItems).values(
                input.items.map((it) => ({
                    id: uuid(),
                    requestId: id,
                    skuId: it.skuId,
                    quantity: it.quantity,
                    ...(it.unit !== undefined ? { unit: it.unit } : {}),
                    ...(it.notes !== undefined ? { notes: it.notes } : {}),
                })),
            );
        }
        await tx
            .update(purchaseRequests)
            .set({
                ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(purchaseRequests.id, id));
    });
    return getRequest(id);
}

async function transitionRequest(id: string, from: string[], to: RequestStatus, errMsg: string) {
    await db.transaction(async (tx) => {
        const status = await requestStatusTx(tx, id);
        if (!from.includes(status)) throw badRequest(errMsg);
        await tx.update(purchaseRequests).set({ status: to, updatedAt: new Date() }).where(eq(purchaseRequests.id, id));
    });
    return getRequest(id);
}

const REQUEST_TRANSITIONS: Record<string, { from: string[]; to: RequestStatus; err: string }> = {
    submit: { from: ['draft'], to: 'submitted', err: 'فقط درخواست پیش‌نویس قابل ثبت است' },
    approve: { from: ['submitted'], to: 'approved', err: 'فقط درخواست ثبت‌شده قابل تأیید است' },
    reject: { from: ['submitted'], to: 'rejected', err: 'فقط درخواست ثبت‌شده قابل رد است' },
    cancel: { from: ['draft', 'submitted'], to: 'cancelled', err: 'فقط درخواست پیش‌نویس یا ثبت‌شده قابل لغو است' },
};
export async function moveRequest(id: string, action: 'submit' | 'approve' | 'reject' | 'cancel') {
    const t = REQUEST_TRANSITIONS[action];
    if (!t) throw badRequest('عملیات نامعتبر');
    return transitionRequest(id, t.from, t.to, t.err);
}

/** approved → creates purchase + items, marks request converted (transactional). */
export async function convertRequest(id: string, actorId?: string) {
    let purchaseId = '';
    await db.transaction(async (tx) => {
        const reqRows = await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
        const req = reqRows[0];
        if (!req) throw notFound('درخواست خرید یافت نشد');
        if (req.status !== 'approved') throw badRequest('فقط درخواست تأییدشده قابل تبدیل به سفارش است');
        if (!req.supplierId) throw badRequest('درخواست بدون تأمین‌کننده قابل تبدیل نیست');
        const reqItems = await tx.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, id));
        if (reqItems.length === 0) throw badRequest('درخواست بدون قلم قابل تبدیل نیست');

        purchaseId = uuid();
        const now = new Date();
        const items: OrderItemInput[] = reqItems.map((r) => ({ skuId: r.skuId, quantity: r.quantity, unitCost: 0 }));
        const { subtotal, total } = totals(items, 0);
        await tx.insert(purchases).values({
            id: purchaseId,
            code: genCode('PO'),
            supplierId: req.supplierId,
            requestId: id,
            status: 'draft',
            subtotal,
            additionalCosts: 0,
            totalAmount: total,
            actorId: actorId ?? null,
            createdAt: now,
            updatedAt: now,
        });
        await tx.insert(purchaseItems).values(
            items.map((it) => ({
                id: uuid(),
                purchaseId,
                skuId: it.skuId,
                quantity: it.quantity,
                unitCost: it.unitCost,
            })),
        );
        await tx.update(purchaseRequests).set({ status: 'converted', updatedAt: now }).where(eq(purchaseRequests.id, id));
    });
    return getOrder(purchaseId);
}

// --- orders -----------------------------------------------------------------

export async function listOrders(params: { page?: number; limit?: number; status?: string; supplierId?: string }) {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
    const conds = [isNull(purchases.deletedAt)];
    if (params.status) conds.push(eq(purchases.status, normalizePurchaseStatus(params.status)));
    if (params.supplierId) conds.push(eq(purchases.supplierId, params.supplierId));
    const where = and(...conds);
    const [rows, totalRows] = await Promise.all([
        db.select().from(purchases).where(where).orderBy(desc(purchases.createdAt)).limit(limit).offset((page - 1) * limit),
        db.select({ n: sql<number>`COUNT(*)` }).from(purchases).where(where),
    ]);
    return { rows, total: Number(totalRows[0]?.n ?? 0) };
}

export async function getOrder(id: string) {
    const rows = await db.select().from(purchases).where(and(eq(purchases.id, id), isNull(purchases.deletedAt)));
    const header = rows[0];
    if (!header) throw notFound('سفارش خرید یافت نشد');
    const [items, receipts, costs, timeline] = await Promise.all([
        db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)),
        db.select().from(purchaseReceipts).where(eq(purchaseReceipts.purchaseId, id)).orderBy(asc(purchaseReceipts.receivedDate)),
        db.select().from(supplyCosts).where(eq(supplyCosts.purchaseId, id)).orderBy(asc(supplyCosts.costDate)),
        db
            .select()
            .from(auditLogs)
            .where(and(eq(auditLogs.entityType, 'purchase'), eq(auditLogs.entityId, id)))
            .orderBy(desc(auditLogs.createdAt))
            .limit(20),
    ]);
    const allocs =
        costs.length > 0
            ? await db
                  .select()
                  .from(supplyCostAllocations)
                  .where(inArray(supplyCostAllocations.costId, costs.map((c) => c.id)))
            : [];
    const allocatedByItem: Record<string, number> = {};
    for (const a of allocs) allocatedByItem[a.purchaseItemId] = (allocatedByItem[a.purchaseItemId] ?? 0) + Number(a.amount);
    const itemsWithProgress = items.map((it) => ({
        ...it,
        remaining: it.quantity - it.receivedQuantity,
        allocated: allocatedByItem[it.id] ?? 0,
    }));
    const landedCost = items.map((it) => {
        const purchaseCost = it.quantity * Number(it.unitCost);
        const allocated = allocatedByItem[it.id] ?? 0;
        const landed = purchaseCost + allocated;
        return {
            purchaseItemId: it.id,
            skuId: it.skuId,
            purchaseCost,
            allocated,
            landed,
            landedUnit: it.receivedQuantity > 0 ? landed / it.receivedQuantity : null,
        };
    });
    return { ...header, items: itemsWithProgress, receipts, costs, landedCost, timeline };
}

export async function createOrder(
    input: {
        supplierId: string;
        requestId?: string;
        expectedDate?: Date;
        paymentTerms?: string;
        note?: string;
        additionalCosts?: number;
        items: OrderItemInput[];
    },
    actorId?: string,
) {
    if (!input.supplierId) throw badRequest('تأمین‌کننده الزامی است');
    const s = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, input.supplierId));
    if (s.length === 0) throw badRequest('تأمین‌کننده یافت نشد');
    assertOrderItems(input.items);
    if (input.requestId) {
        const r = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.requestId));
        if (!r[0]) throw notFound('درخواست خرید یافت نشد');
        if (r[0].status !== 'approved') throw badRequest('سفارش فقط از درخواست تأییدشده قابل ایجاد است');
    }
    const additionalCosts = input.additionalCosts ?? 0;
    if (!Number.isFinite(additionalCosts) || additionalCosts < 0) throw badRequest('هزینه‌های اضافی باید صفر یا بیشتر باشد');
    const { subtotal, total } = totals(input.items, additionalCosts);
    const id = uuid();
    const now = new Date();
    await db.transaction(async (tx) => {
        await tx.insert(purchases).values({
            id,
            code: genCode('PO'),
            supplierId: input.supplierId,
            ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
            status: 'draft',
            ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
            subtotal,
            additionalCosts,
            totalAmount: total,
            ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            actorId: actorId ?? null,
            createdAt: now,
            updatedAt: now,
        });
        await tx.insert(purchaseItems).values(
            input.items.map((it) => ({
                id: uuid(),
                purchaseId: id,
                skuId: it.skuId,
                quantity: it.quantity,
                ...(it.unit !== undefined ? { unit: it.unit } : {}),
                unitCost: it.unitCost,
            })),
        );
        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: 'purchase',
            entityId: id,
            details: `سفارش خرید ${id.slice(0, 8)} ایجاد شد`,
            metadata: { supplierId: input.supplierId, itemCount: input.items.length, totalAmount: total },
            tx,
        });
    });
    return getOrder(id);
}

export async function updateOrder(
    id: string,
    input: { expectedDate?: Date; paymentTerms?: string; note?: string; additionalCosts?: number; items?: OrderItemInput[] },
    actorId?: string,
) {
    await db.transaction(async (tx) => {
        const rows = await tx.select().from(purchases).where(eq(purchases.id, id));
        const header = rows[0];
        if (!header || header.deletedAt) throw notFound('سفارش خرید یافت نشد');
        if (!EDITABLE_PURCHASE[header.status]) throw badRequest('فقط سفارش‌های پیش‌نویس یا ثبت‌شده قابل ویرایش هستند');
        let subtotal = header.subtotal;
        let additionalCosts = header.additionalCosts;
        if (input.additionalCosts !== undefined) {
            if (!Number.isFinite(input.additionalCosts) || input.additionalCosts < 0) {
                throw badRequest('هزینه‌های اضافی باید صفر یا بیشتر باشد');
            }
            additionalCosts = input.additionalCosts;
        }
        if (input.items !== undefined) {
            assertOrderItems(input.items);
            const received = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
            const receivedBySku: Record<string, number> = {};
            for (const r of received) receivedBySku[r.skuId] = (receivedBySku[r.skuId] ?? 0) + r.receivedQuantity;
            for (const it of input.items) {
                if ((receivedBySku[it.skuId] ?? 0) > it.quantity) {
                    throw badRequest('مقدار جدید نمی‌تواند از مقدار دریافت‌شده کمتر باشد');
                }
            }
            await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
            await tx.insert(purchaseItems).values(
                input.items.map((it) => ({
                    id: uuid(),
                    purchaseId: id,
                    skuId: it.skuId,
                    quantity: it.quantity,
                    ...(it.unit !== undefined ? { unit: it.unit } : {}),
                    unitCost: it.unitCost,
                    receivedQuantity: Math.min(receivedBySku[it.skuId] ?? 0, it.quantity),
                })),
            );
            subtotal = totals(input.items, 0).subtotal;
        }
        await tx
            .update(purchases)
            .set({
                ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
                ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
                ...(input.note !== undefined ? { note: input.note } : {}),
                subtotal,
                additionalCosts,
                totalAmount: subtotal + additionalCosts,
                updatedAt: new Date(),
            })
            .where(eq(purchases.id, id));
    });
    recordAudit({
        actor: actorId ? { user: { id: actorId, name: actorId } } : null,
        action: 'update',
        entityType: 'purchase',
        entityId: id,
        details: 'سفارش خرید ویرایش شد',
        metadata: input,
    });
    return getOrder(id);
}

export async function cancelOrder(id: string, actorId?: string) {
    const rows = await db.select().from(purchases).where(eq(purchases.id, id));
    const header = rows[0];
    if (!header || header.deletedAt) throw notFound('سفارش خرید یافت نشد');
    if (header.status === 'received' || header.status === 'cancelled') {
        throw badRequest('این سفارش قابل لغو نیست');
    }
    await db.update(purchases).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(purchases.id, id));
    recordAudit({
        actor: actorId ? { user: { id: actorId, name: actorId } } : null,
        action: 'update',
        entityType: 'purchase',
        entityId: id,
        details: 'سفارش خرید لغو شد',
    });
    return getOrder(id);
}

/** Recomputes order status from received quantities (called inside receipt tx). */
export function nextPurchaseStatus(items: { quantity: number; receivedQuantity: number }[]): 'partially_received' | 'received' {
    const all = items.every((it) => it.receivedQuantity >= it.quantity);
    return all ? 'received' : 'partially_received';
}

export async function getReceiptsForOrder(purchaseId: string) {
    await getOrder(purchaseId);
    const receipts = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseId, purchaseId))
        .orderBy(asc(purchaseReceipts.receivedDate));
    if (receipts.length === 0) return [];
    const withItems = await Promise.all(
        receipts.map(async (r) => ({
            ...r,
            items: await db.select().from(purchaseReceiptItems).where(eq(purchaseReceiptItems.receiptId, r.id)),
        })),
    );
    return withItems;
}

// --- receipts (P0-C) -------------------------------------------------------

export interface ReceiptItemInput {
    purchaseItemId: string;
    quantity: number;
    unitCost?: number;
}

export interface ReceiptInput {
    warehouseId?: string;
    locationId?: string;
    notes?: string;
    items: ReceiptItemInput[];
}

/**
 * Transactional goods receipt: receipt row + receipt items + PURCHASE_RECEIPT
 * ledger moves (stock ↑) + legacy cache sync + receivedQuantity bump + PO status.
 * Over-receipt is rejected (received > remaining).
 */
export async function createReceipt(purchaseId: string, input: ReceiptInput, actorId?: string) {
    assertReceiptItems(input.items);
    const now = new Date();
    let receiptId = '';
    await db.transaction(async (tx) => {
        const purchase = await tx
            .select({ id: purchases.id, supplierId: purchases.supplierId, status: purchases.status })
            .from(purchases)
            .where(eq(purchases.id, purchaseId));
        const header = purchase[0];
        if (!header || header.status === 'cancelled' || header.status === 'received') {
            throw badRequest('فقط سفارش‌های فعال قابل دریافت هستند');
        }
        const poItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        if (poItems.length === 0) throw badRequest('سفارش بدون قلم قابل دریافت نیست');

        const byItem: Record<string, (typeof poItems)[number]> = {};
        for (const it of poItems) byItem[it.id] = it;

        const locationId = input.locationId ?? shelfLocationId();

        const totalReceived = input.items.reduce((s, it) => s + it.quantity, 0);
        receiptId = uuid();
        await tx.insert(purchaseReceipts).values({
            id: receiptId,
            code: genCode('RCP'),
            purchaseId,
            supplierId: header.supplierId,
            warehouseId: input.warehouseId ?? null,
            locationId,
            receivedBy: actorId ?? null,
            notes: input.notes ?? null,
            createdAt: now,
            receivedDate: now,
            status: 'posted',
        });

        const movements: MovementInput[] = [];
        for (const it of input.items) {
            const poItem = byItem[it.purchaseItemId];
            if (!poItem) throw badRequest('قلم دریافت یافت نشد');
            const remaining = poItem.quantity - poItem.receivedQuantity;
            if (it.quantity <= 0) throw badRequest('مقدار دریافتی باید مثبت باشد');
            if (it.quantity > remaining) throw badRequest('مقدار دریافتی نمی‌تواند از مانده سفارش بیشتر باشد');
            const unitCost = it.unitCost ?? Number(poItem.unitCost);
            await tx
                .update(purchaseItems)
                .set({ receivedQuantity: poItem.receivedQuantity + it.quantity })
                .where(eq(purchaseItems.id, poItem.id));
            movements.push({
                skuId: poItem.skuId,
                locationId,
                movementType: 'PURCHASE_RECEIPT',
                quantityDelta: it.quantity,
                referenceType: 'purchase_receipt',
                referenceId: receiptId,
                unitCost,
                actorId,
            });
            await tx.insert(purchaseReceiptItems).values({
                id: uuid(),
                receiptId,
                purchaseItemId: poItem.id,
                skuId: poItem.skuId,
                quantity: it.quantity,
                unitCost,
            });
        }

        await recordMovements(tx, movements);
        // Sync the legacy item cache for each affected SKU — the ONLY writer of
        // items.stockQuantity/websiteQuantity, so cache == Σ ledger per item.
        const legacyItemIds = await tx
            .selectDistinct({ itemId: skus.legacyItemId })
            .from(skus)
            .where(inArray(skus.id, movements.map((m) => m.skuId)));
        for (const row of legacyItemIds) {
            if (row.itemId) await syncLegacyStockCache(tx, row.itemId);
        }

        // Recompute PO status from received quantities.
        const afterItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        const newStatus = nextPurchaseStatus(afterItems);
        await tx.update(purchases).set({ status: newStatus, updatedAt: now }).where(eq(purchases.id, purchaseId));

        // Supplier payable: one row per receipt for the value received
        // (Σ quantity × unitCost). Payables to the supplier are SEPARATE from
        // supply costs (EXPENSE rows) — never mixed.
        const receiptValue = input.items.reduce((s, it) => {
            const poItem = byItem[it.purchaseItemId];
            if (!poItem) throw badRequest('قلم دریافت یافت نشد');
            const unitCost = it.unitCost ?? Number(poItem.unitCost);
            return s + it.quantity * unitCost;
        }, 0);
        if (receiptValue > 0) {
            await recordTransaction(tx, {
                txnType: 'PAYABLE',
                direction: 1,
                amount: receiptValue,
                counterparty: { type: 'supplier', id: header.supplierId },
                reference: { type: 'purchase', id: purchaseId },
                description: 'وجعی از دریافت کالا',
                actorId,
            });
        }

        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: 'purchase-receipt',
            entityId: receiptId,
            details: `دریافت کالا برای سفارش ${purchaseId}`,
            metadata: { purchaseId, supplierId: header.supplierId, itemCount: input.items.length },
            tx,
        });
    });
    return getReceipt(receiptId);
}

export async function getReceipt(id: string) {
    const rows = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.id, id));
    const header = rows[0];
    if (!header) throw notFound('دریافت کالا یافت نشد');
    const items = await db
        .select()
        .from(purchaseReceiptItems)
        .where(eq(purchaseReceiptItems.receiptId, id));
    return { ...header, items };
}

function assertReceiptItems(items: ReceiptItemInput[]): void {
    if (items.length === 0) throw badRequest('دریافت کالا باید حداقل یک قلم داشته باشد');
    for (const it of items) {
        if (!it.purchaseItemId) throw badRequest('شناسه قلم سفارش الزامی است');
        if (!Number.isInteger(it.quantity) || it.quantity <= 0) throw badRequest('مقدار دریافتی باید عدد صحیح مثبت باشد');
    }
}

// --- supply costs -----------------------------------------------------------

const SUPPLY_COST_TYPES: Record<string, true> = {
    shipping: true,
    packaging: true,
    loading: true,
    unloading: true,
    customs: true,
    commission: true,
    other: true,
};

export async function addSupplyCost(purchaseId: string, input: SupplyCostInput, actorId?: string) {
    if (!SUPPLY_COST_TYPES[input.costType]) throw badRequest('نوع هزینه نامعتبر است');
    if (!Number.isFinite(input.amount) || input.amount < 0) throw badRequest('مبنای هزینه باید صفر یا بیشتر باشد');
        const poItems = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    if (poItems.length === 0) throw badRequest('سفارش یافت نشد یا بدون قلم است');
    const costId = uuid();
    const now = new Date();
    await db.transaction(async (tx) => {
        await tx.insert(supplyCosts).values({
            id: costId,
            purchaseId,
            costType: input.costType,
            description: input.description ?? null,
            amount: input.amount,
            currency: input.currency ?? 'IRT',
            costDate: input.costDate ?? now,
            partyType: input.partyType ?? null,
            partyId: input.partyId ?? null,
            allocationMethod: input.allocationMethod ?? 'by_value',
            notes: input.notes ?? null,
            createdBy: actorId ?? null,
            createdAt: now,
            updatedAt: now,
        });
        await applyCostAllocations(tx, costId, purchaseId, input.amount, input.allocationMethod ?? 'by_value', poItems);
        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: 'supply-cost',
            entityId: costId,
            details: `هزینه ${input.costType} به مبلغ ${Number(input.amount).toLocaleString('fa-IR')} ثبت شد`,
            metadata: { purchaseId, costType: input.costType, allocationMethod: input.allocationMethod ?? 'by_value' },
            tx,
        });
    });
    return getCost(costId);
}

export interface SupplyCostInput {
    costType: string;
    description?: string;
    amount: number;
    currency?: string;
    costDate?: Date;
    partyType?: string;
    partyId?: string;
    allocationMethod?: 'by_value' | 'by_quantity';
    notes?: string;
}

export async function getCost(costId: string) {
    const rows = await db
        .select()
        .from(supplyCosts)
        .where(eq(supplyCosts.id, costId));
    const header = rows[0];
    if (!header) throw notFound('هزینه یافت نشد');
    const allocs = await db
        .select()
        .from(supplyCostAllocations)
        .where(eq(supplyCostAllocations.costId, costId));
    return { ...header, allocations: allocs };
}

export async function listCosts(purchaseId: string) {
    await getOrder(purchaseId);
    const costs = await db
        .select()
        .from(supplyCosts)
        .where(eq(supplyCosts.purchaseId, purchaseId))
        .orderBy(asc(supplyCosts.costDate));
    const withAllocations = await Promise.all(
        costs.map(async (c) => {
            const allocs = await db
                .select()
                .from(supplyCostAllocations)
                .where(eq(supplyCostAllocations.costId, c.id));
            return { ...c, allocations: allocs };
        }),
    );
    return withAllocations;
}

export async function updateCost(costId: string, input: PatchSupplyCostInput, actorId?: string) {
    const existing = await db.select().from(supplyCosts).where(eq(supplyCosts.id, costId));
    const prev = existing[0];
    if (!prev) throw notFound('هزینه یافت نشد');
    const next: Partial<typeof supplyCosts.$inferInsert> = {
        ...(input.costType !== undefined ? { costType: input.costType } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.costDate !== undefined ? { costDate: input.costDate } : {}),
        ...(input.partyType !== undefined ? { partyType: input.partyType } : {}),
        ...(input.partyId !== undefined ? { partyId: input.partyId } : {}),
        ...(input.allocationMethod !== undefined ? { allocationMethod: input.allocationMethod } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
    };
    await db.transaction(async (tx) => {
        await tx.update(supplyCosts).set(next).where(eq(supplyCosts.id, costId));
        // Re-allocate when amount/method/items-in-question changed.
        const poItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, prev.purchaseId));
        await applyCostAllocations(tx, costId, prev.purchaseId, Number(next.amount ?? prev.amount), (next.allocationMethod ?? prev.allocationMethod) as 'by_value' | 'by_quantity', poItems);
        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'update',
            entityType: 'supply-cost',
            entityId: costId,
            before: prev,
            after: { ...prev, ...next },
            details: 'هزینه تأمین به‌روزرسانی شد',
            tx,
        });
    });
    return getCost(costId);
}

export interface PatchSupplyCostInput {
    costType?: string;
    description?: string;
    amount?: number;
    currency?: string;
    costDate?: Date;
    partyType?: string;
    partyId?: string;
    allocationMethod?: 'by_value' | 'by_quantity';
    notes?: string;
}

export async function deleteCost(costId: string, actorId?: string) {
    const existing = await db.select().from(supplyCosts).where(eq(supplyCosts.id, costId));
    const prev = existing[0];
    if (!prev) throw notFound('هزینه یافت نشد');
    await db.transaction(async (tx) => {
        await tx.delete(supplyCostAllocations).where(eq(supplyCostAllocations.costId, costId));
        await tx.delete(supplyCosts).where(eq(supplyCosts.id, costId));
        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'delete',
            entityType: 'supply-cost',
            entityId: costId,
            before: prev,
            details: 'هزینه تأمین حذف شد',
            tx,
        });
    });
    return { id: costId };
}

/**
 * Integer allocation by largest-remainder so Σ allocations == amount exactly.
 * by_value: amount × itemValue / ΣitemValue ; by_quantity: amount × qty / Σqty.
 */
async function applyCostAllocations(
    tx: DbTx,
    costId: string,
    purchaseId: string,
    amount: number,
    method: 'by_value' | 'by_quantity',
    poItems: (typeof purchaseItems.$inferSelect)[],
) {
    await tx.delete(supplyCostAllocations).where(eq(supplyCostAllocations.costId, costId));
    if (poItems.length === 0 || amount === 0) return;

    const itemValues = poItems.map((it) => Number(it.unitCost) * it.quantity);
    const quantities = poItems.map((it) => it.quantity);
    const weights = method === 'by_quantity' ? quantities : itemValues;
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight === 0) {
        // Fallback: equal split.
        const each = Math.floor(amount / poItems.length);
        const remainder = amount - each * poItems.length;
        for (let i = 0; i < poItems.length; i++) {
            await tx.insert(supplyCostAllocations).values({ id: uuid(), costId, purchaseItemId: poItems[i]!.id, amount: each + (i < remainder ? 1 : 0) });
        }
        return;
    }

    const raw = weights.map((w) => (amount * w) / totalWeight);
    const floored = raw.map(Math.floor);
    const remainder = amount - floored.reduce((s, v) => s + v, 0);
    // Largest remainder method: distribute leftover to largest fractional parts.
    const order = floored
        .map((f, i) => ({ i, frac: (raw[i] ?? 0) - (f ?? 0) }))
        .sort((a, b) => b.frac - a.frac)
        .slice(0, remainder);
    const allocs = floored.map((v) => v ?? 0);
    for (const o of order) { allocs[o.i] = (allocs[o.i] ?? 0) + 1; }
    for (let i = 0; i < poItems.length; i++) {
        const qty = allocs[i];
        if (qty === undefined) continue;
        await tx.insert(supplyCostAllocations).values({ id: uuid(), costId, purchaseItemId: poItems[i]!.id, amount: qty });
    }

}

