import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../config/drizzle.js';
import {
    items,
    sellers,
    consignments,
    consignmentReturns,
    payments,
    staff,
    expenses,
    profitDistributions,
    categories,
    orders,
} from '../../schema/index.js';
import type { ConsignmentItemLine, DebtAllocation, ReturnItemLine } from '../../schema/index.js';
import type { TrashEntityType } from '../../types/index.js';
import { isClientId } from '../../schema/clientId.js';
import { badRequest, gone, notFound } from '../../core/utils/apiError.js';
import { nextCode } from '../../core/utils/code.js';
import { emitDataChanged } from '../../core/services/socketService.js';
import {
    ensureLegacySku,
    ensureLocation,
    recordMovements,
    resolveLegacySku,
    sellerCustodyLocationId,
    sellerWarehouseId,
    shelfLocationId,
    shopLocationId,
    syncLegacyStockCache,
    transferPair,
    type DbTx,
} from '../../core/services/inventoryLedgerService.js';
import {
    openSellerPayable,
    reduceSellerPayable,
    settleDebt,
} from '../../core/services/financialService.js';
import { entityActor, recordAudit } from '../../core/services/auditService.js';

// Shared type (frontend mirror in types/index.ts) re-exported for the
// workshop controllers that import it from this module.
export type { TrashEntityType };

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(includeDeleted = false) {
    const [rows, activeConsignments] = await Promise.all([
        includeDeleted
            ? db.select().from(items)
            : await db.select().from(items).where(eq(items.isDeleted, false)),
        db.select().from(consignments).where(eq(consignments.isDeleted, false)),
    ]);
    // Units out with street sellers: derived from active consignment lines
    // (quantity − returned − sold), never denormalized into items.
    const held = new Map<string, number>();
    for (const c of activeConsignments) {
        if (c.status === 'settled') continue;
        for (const l of c.items) {
            const out = l.quantity - l.returnedQuantity - l.soldQuantity;
            if (out > 0) held.set(l.itemId, (held.get(l.itemId) ?? 0) + out);
        }
    }
    return rows.map((r) => ({ ...r, sellerHeld: held.get(r.id) ?? 0 }));
}

/** Raw single-row read for before/after comparisons (no derived fields). */
export async function getItemRow(id: string) {
    const rows = await db.select().from(items).where(eq(items.id, id));
    return rows[0] ?? null;
}

export async function createItem(data: Partial<typeof items.$inferInsert>, actorId?: string) {
    if (!data.name || !data.category) throw badRequest('نام و دسته‌بندی کالا الزامی است');
    const name = data.name;
    const category = data.category;
    const id = isClientId(data.id) ? data.id : uuid();
    return db.transaction(async (tx) => {
        const codes = await tx.select({ code: items.code }).from(items);
        await tx.insert(items).values({
            id,
            code: data.code || nextCode('PLR', codes.map((c) => c.code)),
            name,
            category,
            costPrice: data.costPrice ?? 0,
            consignmentPrice: data.consignmentPrice ?? 0,
            retailPrice: data.retailPrice ?? 0,
            stockQuantity: data.stockQuantity ?? 0,
            websiteQuantity: 0,
            minStockThreshold: data.minStockThreshold ?? 5,
            sizes: data.sizes ?? [],
            colors: data.colors ?? [],
            fabric: data.fabric ?? '',
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.variantPrices !== undefined ? { variantPrices: data.variantPrices } : {}),
            ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
            ...(data.purchasePriceUsd !== undefined ? { purchasePriceUsd: data.purchasePriceUsd } : {}),
            ...(data.costBreakdown !== undefined ? { costBreakdown: data.costBreakdown } : {}),
            ...(data.productionStatus !== undefined ? { productionStatus: data.productionStatus } : {}),
            images: data.images ?? [],
        });
        // P0-B #6: new items get a deterministic primary sku; opening stock is
        // posted through the ledger, never a direct column write.
        const skuId = await ensureLegacySku(tx, id);
        const openingStock = data.stockQuantity ?? 0;
        if (openingStock > 0) {
            await recordMovements(tx, [
                {
                    skuId,
                    locationId: shelfLocationId(),
                    movementType: 'ADJUSTMENT_IN',
                    quantityDelta: openingStock,
                    referenceType: 'item',
                    referenceId: id,
                    reason: 'افتتاح حساب موجودی',
                    ...(actorId !== undefined ? { actorId } : {}),
                },
            ]);
        }
        await syncLegacyStockCache(tx, id);
        const inserted = await tx.select().from(items).where(eq(items.id, id));
        emitDataChanged('item', 'create');
        return inserted[0]!;
    });
}

export async function updateItem(
    id: string,
    data: Partial<typeof items.$inferInsert>,
    actorId?: string,
    meta?: { ip?: string; userAgent?: string },
) {
    const existing = await db.select().from(items).where(eq(items.id, id));
    if (!existing[0]) throw notFound('کالا یافت نشد');
    const before = existing[0]!;
    const { id: _id, code: _code, stockQuantity: _stockQuantity, websiteQuantity: _websiteQuantity, ...patch } = data;
    await db
        .update(items)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(items.id, id));
    const updated = await db.select().from(items).where(eq(items.id, id));
    // P0-B item 27: price changes are audited with before/after snapshots —
    // the generic controller 'update' row has no payload, so this row is only
    // emitted when an actual price field changed.
    const PRICE_FIELDS = ['costPrice', 'consignmentPrice', 'retailPrice', 'variantPrices', 'purchasePriceUsd'] as const;
    const pricePatch = Object.fromEntries(PRICE_FIELDS.map((f) => [f, patch[f]]) as [string, unknown][]);
    const priceChanged = PRICE_FIELDS.some((f) => (patch[f] ?? null) !== (before as Record<string, unknown>)[f]);
    if (priceChanged && Object.keys(pricePatch).length > 0) {
        recordAudit({
            actor: await entityActor(db, actorId),
            action: 'update',
            entityType: 'item',
            entityId: id.slice(0, 64),
            before: {
                costPrice: before.costPrice,
                consignmentPrice: before.consignmentPrice,
                retailPrice: before.retailPrice,
                variantPrices: before.variantPrices,
                purchasePriceUsd: before.purchasePriceUsd,
            },
            after: {
                costPrice: (updated[0] as typeof before)!.costPrice,
                consignmentPrice: (updated[0] as typeof before)!.consignmentPrice,
                retailPrice: (updated[0] as typeof before)!.retailPrice,
                variantPrices: (updated[0] as typeof before)!.variantPrices,
                purchasePriceUsd: (updated[0] as typeof before)!.purchasePriceUsd,
            },
            details: `قیمت کالای «${before.name}» (کد ${before.code}) تغییر کرد`,
            ...(meta?.ip !== undefined ? { ip: meta.ip } : {}),
            ...(meta?.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
        });
    }
    emitDataChanged('item', 'update');
    return updated[0]!;
}

/**
 * P0-B item 13/production deprecation: the made-to-order production flow is
 * retired — every legacy item already carries productionStatus 'ready' and
 * new items are born ready. The endpoint survives only as a 410 so old
 * clients get an explicit, actionable error instead of a silent no-op.
 */
export async function markItemReady(_id: string): Promise<never> {
    throw gone('جریان تولید حذف شده است؛ کالاها بلافاصله پس از ایجاد قابل فروش هستند');
}

export async function softDeleteItem(id: string, actorId?: string) {
    const existing = await db.select().from(items).where(eq(items.id, id));
    const row = existing[0];
    if (!row) throw notFound('کالا یافت نشد');
    await db
        .update(items)
        .set({ isDeleted: true, deletedAt: new Date(), ...(actorId !== undefined ? { deletedBy: actorId } : {}) })
        .where(eq(items.id, id));
    emitDataChanged('item', 'delete');
    return row;
}

/**
 * Allocates warehouse units to the website shop channel (or pulls them
 * back). Moves happen inside a row-locked transaction so a concurrent
 * handover or website order can never over-allocate. websiteQuantity is
 * the absolute target; the delta transfers against stockQuantity.
 */
export async function setShopAllocation(id: string, websiteQuantity: number, actorId?: string) {
    if (!Number.isInteger(websiteQuantity) || websiteQuantity < 0) {
        throw badRequest('تعداد تخصیصی فروشگاه باید عدد صحیح و بزرگ‌تر یا مساوی صفر باشد');
    }

    const updated = await db.transaction(async (tx) => {
        const rows = await tx.select().from(items).where(eq(items.id, id)).for('update');
        const item = rows[0];
        if (!item || item.isDeleted) throw notFound('کالا یافت نشد');

        const delta = websiteQuantity - item.websiteQuantity;
        if (delta > 0 && item.stockQuantity < delta) {
            throw badRequest(
                `موجودی آزاد «${item.name}» برای تخصیص به فروشگاه کافی نیست (موجودی آزاد: ${item.stockQuantity})`,
            );
        }

        // P0-B #2: shelf ↔ shop transfer pair through the ledger.
        if (delta !== 0) {
            const skuId = await resolveLegacySku(tx, id);
            const moves =
                delta > 0
                    ? transferPair({
                          skuId,
                          fromLocationId: shelfLocationId(),
                          toLocationId: shopLocationId(),
                          quantity: delta,
                          referenceType: 'legacy',
                          referenceId: id,
                          reason: 'تخصیص به فروشگاه آنلاین',
                          unitCost: item.costPrice,
                          ...(actorId !== undefined ? { actorId } : {}),
                      })
                    : transferPair({
                          skuId,
                          fromLocationId: shopLocationId(),
                          toLocationId: shelfLocationId(),
                          quantity: -delta,
                          referenceType: 'legacy',
                          referenceId: id,
                          reason: 'بازگشت از فروشگاه آنلاین',
                          unitCost: item.costPrice,
                          ...(actorId !== undefined ? { actorId } : {}),
                      });
            await recordMovements(tx, moves);
        }
        await syncLegacyStockCache(tx, id);
        return (await tx.select().from(items).where(eq(items.id, id)))[0]!;
    });

    emitDataChanged('item', 'update');
    return updated;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories() {
    return db.select().from(categories).orderBy(asc(categories.label));
}

export async function createCategory(label: string) {
    if (!label.trim()) throw badRequest('عنوان دسته‌بندی الزامی است');
    const id = uuid();
    await db.insert(categories).values({ id, label: label.trim() });
    return { id, label: label.trim() };
}

// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------

export async function listSellers(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(sellers)
        : db.select().from(sellers).where(eq(sellers.isDeleted, false));
}

export async function getSeller(id: string) {
    const rows = await db.select().from(sellers).where(eq(sellers.id, id));
    if (!rows[0]) throw notFound('دست‌فروش یافت نشد');
    return rows[0];
}

export async function createSeller(data: Partial<typeof sellers.$inferInsert>) {
    const name = data.name;
    const phone = data.phone;
    if (!name || !phone) throw badRequest('نام و شماره تماس دستفروش الزامی است');
    const codes = await db.select({ code: sellers.code }).from(sellers);
    const id = isClientId(data.id) ? data.id : uuid();
    const code = data.code || nextCode('SLR', codes.map((c) => c.code));
    // The custody location is FK-referenced by every ledger row that moves
    // goods to this seller, so it is created with the seller — before/without
    // the backfill. Idempotent, so a pre-existing row is left untouched.
    await db.transaction(async (tx) => {
        await ensureSellerCustodyLocation(tx, { id, code, name });
        await tx.insert(sellers).values({
            id,
            code,
            name,
            phone,
            additionalPhones: data.additionalPhones ?? [],
            nationalCode: data.nationalCode ?? '',
            streetLocation: data.streetLocation ?? '',
            hasGuarantee: data.hasGuarantee ?? false,
            guaranteeType: data.guaranteeType ?? 'promissory_note',
            guaranteeAmount: data.guaranteeAmount ?? 0,
            guaranteeDetails: data.guaranteeDetails ?? '',
            creditLimit: data.creditLimit ?? 0,
            bankAccounts: data.bankAccounts ?? [],
            currentDebt: 0,
            totalHandoversValue: 0,
            totalPaid: 0,
            status: data.status ?? 'active',
            ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
        });
    });
    emitDataChanged('seller', 'create');
    return getSeller(id);
}

/**
 * Ensures this seller's custody location exists. Called from createSeller and
 * defensively from every flow that posts custody movements, because sellers
 * created before the backfill (or restored from an old dump) may predate it.
 */
export async function ensureSellerCustodyLocation(
    tx: DbTx,
    seller: { id: string; code: string; name: string },
): Promise<void> {
    await ensureLocation(tx, sellerCustodyLocationId(seller.id), {
        warehouseId: sellerWarehouseId(),
        code: `CUST-${seller.code}`.slice(0, 32),
        name: `امانتی ${seller.name}`.slice(0, 255),
    });
}

export async function updateSeller(id: string, data: Partial<typeof sellers.$inferInsert>) {
    const existing = await db.select().from(sellers).where(eq(sellers.id, id));
    if (!existing[0]) throw notFound('دست‌فروش یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    await db
        .update(sellers)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(sellers.id, id));
    emitDataChanged('seller', 'update');
    return getSeller(id);
}

export async function softDeleteSeller(id: string, actorId?: string) {
    const existing = await db.select().from(sellers).where(eq(sellers.id, id));
    const row = existing[0];
    if (!row) throw notFound('دست‌فروش یافت نشد');
    await db
        .update(sellers)
        .set({ isDeleted: true, deletedAt: new Date(), ...(actorId !== undefined ? { deletedBy: actorId } : {}) })
        .where(eq(sellers.id, id));
    emitDataChanged('seller', 'delete');
    return row;
}

// ---------------------------------------------------------------------------
// Consignments (Handovers)
// ---------------------------------------------------------------------------

export interface HandoverInput {
    sellerId: string;
    dueDate: string;
    /** Future handover date; when set, the consignment is created pending delivery. */
    deliveryDate?: string;
    notes?: string;
    itemsList: {
        itemId: string;
        quantity: number;
        unitPrice: number;
        selectedSize?: string;
        selectedColor?: string;
    }[];
}

export async function listConsignments(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(consignments)
        : db.select().from(consignments).where(eq(consignments.isDeleted, false));
}

export async function createHandover(input: HandoverInput, actorName: string, actorId?: string) {
    const due = new Date(input.dueDate);
    if (Number.isNaN(due.getTime())) throw badRequest('تاریخ سررسید معتبر نیست');
    if (!input.itemsList || input.itemsList.length === 0) throw badRequest('حداقل یک کالا برای تحویل انتخاب کنید');

    // Scheduled handover («حواله در انتظار تحویل»): goods leave on a later
    // date. Stock is reserved immediately (keeps the FOR UPDATE oversell
    // guard + stock-split invariant), but seller debt and the due-date
    // countdown only start when markDelivered runs.
    const deliveryDate = input.deliveryDate;
    const isScheduled = deliveryDate !== undefined;
    const deliveryAt = isScheduled ? new Date(deliveryDate) : null;
    if (deliveryAt !== null && Number.isNaN(deliveryAt.getTime())) {
        throw badRequest('تاریخ تحویل معتبر نیست');
    }

    return db.transaction(async (tx) => {
        const sellerRows = await tx
            .select()
            .from(sellers)
            .where(and(eq(sellers.id, input.sellerId), eq(sellers.isDeleted, false)));
        const seller = sellerRows[0];
        if (!seller) throw notFound('دست‌فروش یافت نشد');
        // Custody location must exist before the transfer pairs below — sellers
        // created before the backfill may not have one yet (idempotent).
        await ensureSellerCustodyLocation(tx, seller);

        const lines: ConsignmentItemLine[] = [];
        let totalAmount = 0;
        // P0-B #1: collect per-line transfer pairs; posted atomically after
        // the consignment row exists so referenceId is stable.
        const moves: Parameters<typeof recordMovements>[1] = [];
        const touchedItemIds: string[] = [];

        for (const line of input.itemsList) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw badRequest('تعداد کالا باید بزرگ‌تر از صفر باشد');
            }
            if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
                throw badRequest('قیمت واحد معتبر نیست');
            }
            const itemRows = await tx
                .select()
                .from(items)
                .where(and(eq(items.id, line.itemId), eq(items.isDeleted, false)))
                .for('update');
            const item = itemRows[0];
            if (!item) throw notFound(`کالای ${line.itemId} یافت نشد`);
            if (item.stockQuantity < line.quantity) {
                throw badRequest(`موجودی «${item.name}» کافی نیست (موجودی: ${item.stockQuantity}، درخواستی: ${line.quantity})`);
            }

            const skuId = await resolveLegacySku(tx, item.id);
            moves.push(
                ...transferPair({
                    skuId,
                    fromLocationId: shelfLocationId(),
                    toLocationId: sellerCustodyLocationId(seller.id),
                    quantity: line.quantity,
                    referenceType: 'consignment',
                    referenceId: '', // backfilled below once the consignment id exists
                    reason: 'تحویل به دستفروش',
                    unitCost: item.costPrice,
                    ...(actorId !== undefined ? { actorId } : {}),
                }),
            );
            touchedItemIds.push(item.id);

            const totalPrice = line.quantity * line.unitPrice;
            totalAmount += totalPrice;
            lines.push({
                itemId: item.id,
                itemName: item.name,
                itemCode: item.code,
                quantity: line.quantity,
                returnedQuantity: 0,
                soldQuantity: 0,
                unitPrice: line.unitPrice,
                totalPrice,
                ...(line.selectedSize !== undefined ? { selectedSize: line.selectedSize } : {}),
                ...(line.selectedColor !== undefined ? { selectedColor: line.selectedColor } : {}),
            });
        }

        const codes = await tx.select({ code: consignments.code }).from(consignments);
        const code = nextCode('HND', codes.map((c) => c.code));
        const id = uuid();
        const now = new Date();
        await tx.insert(consignments).values({
            id,
            code,
            sellerId: seller.id,
            sellerName: seller.name,
            date: now,
            dueDate: due,
            deliveryStatus: isScheduled ? 'pending' : 'delivered',
            deliveredAt: isScheduled ? null : now,
            deliveryDate: deliveryAt,
            status: 'active',
            items: lines,
            totalAmount,
            returnedAmount: 0,
            netAmount: totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            handedOverBy: actorName,
        });

        for (const m of moves) m.referenceId = id;
        await recordMovements(tx, moves);
        for (const itemId of touchedItemIds) await syncLegacyStockCache(tx, itemId);

        // Debt only applies to delivered goods; a scheduled handover owes
        // nothing until markDelivered runs. openSellerPayable owns both the
        // PAYABLE row and the legacy sellers cache bump.
        if (!isScheduled) {
            await openSellerPayable(tx, {
                sellerId: seller.id,
                amount: totalAmount,
                reference: { type: 'consignment', id },
                description: `واگذاری ${code}`,
                ...(actorId !== undefined ? { actorId } : {}),
            });
        }

        const created = await tx.select().from(consignments).where(eq(consignments.id, id));
        emitDataChanged('consignment', 'create');
        return created[0]!;
    });
}

export async function softDeleteConsignment(id: string, actorId?: string) {
    const consignment = await db.transaction(async (tx) => {
        const rows = await tx.select().from(consignments).where(eq(consignments.id, id)).for('update');
        const existing = rows[0];
        if (!existing) throw notFound('واگذاری یافت نشد');

        if (existing.deliveryStatus === 'pending') {
            // Goods never left: reverse the reserved transfer pair back to the
            // warehouse pool (no debt was applied, so there is nothing to release).
            const moves: Parameters<typeof recordMovements>[1] = [];
            const touchedItemIds: string[] = [];
            for (const line of existing.items) {
                const out = line.quantity - line.returnedQuantity;
                if (out <= 0) continue;
                const itemRows = await tx.select().from(items).where(eq(items.id, line.itemId)).for('update');
                const item = itemRows[0];
                if (item) {
                    const skuId = await resolveLegacySku(tx, item.id);
                    moves.push(
                        ...transferPair({
                            skuId,
                            fromLocationId: sellerCustodyLocationId(existing.sellerId),
                            toLocationId: shelfLocationId(),
                            quantity: out,
                            referenceType: 'consignment',
                            referenceId: id,
                            reason: 'حذف واگذاری در انتظار تحویل',
                            unitCost: item.costPrice,
                            ...(actorId !== undefined ? { actorId } : {}),
                        }),
                    );
                    touchedItemIds.push(item.id);
                }
            }
            if (moves.length > 0) await recordMovements(tx, moves);
            for (const itemId of touchedItemIds) await syncLegacyStockCache(tx, itemId);
        } else if (existing.remainingAmount > 0) {
            // Release the outstanding debt back off the seller while in trash.
            await reduceSellerPayable(tx, {
                sellerId: existing.sellerId,
                amount: existing.remainingAmount,
                reference: { type: 'consignment', id },
                description: `حذف واگذاری ${existing.code}`,
                ...(actorId !== undefined ? { actorId } : {}),
            });
        }

        await tx
            .update(consignments)
            .set({
                isDeleted: true,
                deletedAt: new Date(),
                ...(actorId !== undefined ? { deletedBy: actorId } : {}),
            })
            .where(eq(consignments.id, id));
        return existing;
    });
    emitDataChanged('consignment', 'delete');
    return consignment;
}

/**
 * «تحویل شد»: a scheduled handover physically leaves the workshop. Debt,
 * the due-date countdown, and handover-value counters all start now —
 * mirroring what createHandover applies immediately for on-the-spot rows.
 */
export async function markDelivered(id: string, actorName: string, actorId?: string) {
    const updated = await db.transaction(async (tx) => {
        const rows = await tx
            .select()
            .from(consignments)
            .where(and(eq(consignments.id, id), eq(consignments.isDeleted, false)))
            .for('update');
        const existing = rows[0];
        if (!existing) throw notFound('واگذاری یافت نشد');
        if (existing.deliveryStatus !== 'pending') {
            throw badRequest('این واگذاری قبلاً تحویل شده است');
        }

        const now = new Date();
        await tx
            .update(consignments)
            .set({ deliveryStatus: 'delivered', deliveredAt: now, updatedAt: now })
            .where(eq(consignments.id, id));

        // openSellerPayable owns the PAYABLE row + legacy sellers cache bump.
        await openSellerPayable(tx, {
            sellerId: existing.sellerId,
            amount: existing.totalAmount,
            reference: { type: 'consignment', id },
            description: `تحویل واگذاری ${existing.code} توسط ${actorName}`,
            ...(actorId !== undefined ? { actorId } : {}),
        });

        const created = await tx.select().from(consignments).where(eq(consignments.id, id));
        return created[0]!;
    });
    emitDataChanged('consignment', 'update');
    return updated;
}


// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

export interface ReturnInput {
    consignmentId: string;
    returnItems: {
        itemId: string;
        quantity: number;
        condition: 'healthy' | 'damaged';
        reason?: string;
        selectedSize?: string;
        selectedColor?: string;
    }[];
    notes?: string;
}

export async function submitReturn(input: ReturnInput, actorName: string, actorId?: string) {
    if (!input.returnItems || input.returnItems.length === 0) {
        throw badRequest('حداقل یک کالا برای مرجوعی انتخاب کنید');
    }

    return db.transaction(async (tx) => {
        const consignmentRows = await tx
            .select()
            .from(consignments)
            .where(and(eq(consignments.id, input.consignmentId), eq(consignments.isDeleted, false)))
            .for('update');
        const consignment = consignmentRows[0];
        if (!consignment) throw notFound('واگذاری یافت نشد');
        if (consignment.status === 'settled') {
            throw badRequest('این واگذاری کاملاً تسویه شده و امکان مرجوعی ندارد');
        }

        // P0-B #4: the return record id is the ledger reference — generated up
        // front so healthy/damaged movements can reference it as they happen.
        const returnId = uuid();
        const updatedLines: ConsignmentItemLine[] = consignment.items.map((l) => ({ ...l }));
        const returnLines: ReturnItemLine[] = [];
        const moves: Parameters<typeof recordMovements>[1] = [];
        const touchedItemIds: string[] = [];
        let totalValue = 0;
        let healthyCount = 0;
        let damagedCount = 0;

        for (const ret of input.returnItems) {
            if (!Number.isFinite(ret.quantity) || ret.quantity <= 0) {
                throw badRequest('تعداد کالای مرجوعی باید بزرگ‌تر از صفر باشد');
            }
            // Prefer the line whose variant matches the request; an omitted size/color
            // on the incoming item acts as a wildcard. Legacy requests omitting both
            // fall back to a bare itemId match.
            let line = updatedLines.find(
                (l) =>
                    l.itemId === ret.itemId &&
                    (ret.selectedSize === undefined || l.selectedSize === ret.selectedSize) &&
                    (ret.selectedColor === undefined || l.selectedColor === ret.selectedColor),
            );
            if (!line && ret.selectedSize === undefined && ret.selectedColor === undefined) {
                line = updatedLines.find((l) => l.itemId === ret.itemId);
            }
            if (!line) throw badRequest('این کالا در واگذاری موردنظر وجود ندارد');
            const available = line.quantity - line.returnedQuantity;
            if (ret.quantity > available) {
                throw badRequest(`تعداد مرجوعی «${line.itemName}» بیش از حد مجاز است (قابل مرجوع: ${available})`);
            }

            const value = ret.quantity * line.unitPrice;
            totalValue += value;
            line.returnedQuantity += ret.quantity;
            if (ret.condition === 'healthy') healthyCount += ret.quantity;
            else damagedCount += ret.quantity;

            const skuId = await resolveLegacySku(tx, ret.itemId);
            if (ret.condition === 'healthy') {
                // Healthy items transfer custody → shelf (both rows posted).
                moves.push(
                    ...transferPair({
                        skuId,
                        fromLocationId: sellerCustodyLocationId(consignment.sellerId),
                        toLocationId: shelfLocationId(),
                        quantity: ret.quantity,
                        referenceType: 'consignment-return',
                        referenceId: returnId,
                        reason: 'مرجوعی سالم',
                        unitCost: line.unitPrice,
                        ...(actorId !== undefined ? { actorId } : {}),
                    }),
                );
            } else {
                // Damaged items never come back into sellable stock: they leave
                // seller custody as an explicit ADJUSTMENT_OUT.
                moves.push({
                    skuId,
                    locationId: sellerCustodyLocationId(consignment.sellerId),
                    movementType: 'ADJUSTMENT_OUT',
                    quantityDelta: -ret.quantity,
                    referenceType: 'consignment-return',
                    referenceId: returnId,
                    reason: 'مرجوعی آسیب‌دیده',
                    unitCost: line.unitPrice,
                    ...(actorId !== undefined ? { actorId } : {}),
                });
            }
            touchedItemIds.push(ret.itemId);

            returnLines.push({
                itemId: ret.itemId,
                itemName: line.itemName,
                quantity: ret.quantity,
                unitPrice: line.unitPrice,
                totalAmount: value,
                condition: ret.condition,
                ...(ret.reason !== undefined ? { reason: ret.reason } : {}),
                // Preserve the matched variant so return records show size/color.
                ...(line.selectedSize !== undefined ? { selectedSize: line.selectedSize } : {}),
                ...(line.selectedColor !== undefined ? { selectedColor: line.selectedColor } : {}),
            });
        }

        if (moves.length > 0) await recordMovements(tx, moves);
        for (const itemId of touchedItemIds) await syncLegacyStockCache(tx, itemId);

        const newReturnedAmount = consignment.returnedAmount + totalValue;
        const newNetAmount = consignment.totalAmount - newReturnedAmount;
        const newRemaining = Math.max(0, newNetAmount - consignment.paidAmount);
        const newStatus = newRemaining <= 0 ? 'settled' : consignment.paidAmount > 0 ? 'partially_settled' : 'active';

        await tx
            .update(consignments)
            .set({
                items: updatedLines,
                returnedAmount: newReturnedAmount,
                netAmount: newNetAmount,
                remainingAmount: newRemaining,
                status: newStatus,
                updatedAt: new Date(),
            })
            .where(eq(consignments.id, consignment.id));

        // Reduce seller debt by the returned value (negative PAYABLE row +
        // legacy currentDebt cache).
        if (totalValue > 0) {
            await reduceSellerPayable(tx, {
                sellerId: consignment.sellerId,
                amount: totalValue,
                reference: { type: 'consignment-return', id: returnId },
                description: `مرجوعی ${consignment.code}`,
                ...(actorId !== undefined ? { actorId } : {}),
            });
        }

        await tx.insert(consignmentReturns).values({
            id: returnId,
            consignmentId: consignment.id,
            consignmentCode: consignment.code,
            sellerId: consignment.sellerId,
            sellerName: consignment.sellerName,
            date: new Date(),
            items: returnLines,
            totalReturnAmount: totalValue,
            processedBy: actorName,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        });

        const [returnRecord] = await tx.select().from(consignmentReturns).where(eq(consignmentReturns.id, returnId));
        const [updatedConsignment] = await tx.select().from(consignments).where(eq(consignments.id, consignment.id));
        emitDataChanged('return', 'create');
        return { returnRecord: returnRecord!, updatedConsignment: updatedConsignment! };
    });
}

export async function listReturns() {
    return db
        .select()
        .from(consignmentReturns)
        .where(eq(consignmentReturns.isDeleted, false))
        .orderBy(desc(consignmentReturns.date));
}

// ---------------------------------------------------------------------------
// Payments (server-side FIFO allocation)
// ---------------------------------------------------------------------------

export interface PaymentInput {
    sellerId: string;
    amount: number;
    paymentMethod: string;
    trackingNumber?: string;
    notes?: string;
}

export async function listPayments() {
    return db.select().from(payments).where(eq(payments.isDeleted, false)).orderBy(asc(payments.date));
}

export async function createPayment(input: PaymentInput, actorName: string, actorId?: string) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw badRequest('مبلغ پرداختی باید بزرگ‌تر از صفر باشد');
    }

    return db.transaction(async (tx) => {
        const sellerRows = await tx
            .select()
            .from(sellers)
            .where(and(eq(sellers.id, input.sellerId), eq(sellers.isDeleted, false)))
            .for('update');
        const seller = sellerRows[0];
        if (!seller) throw notFound('دست‌فروش یافت نشد');

        // Oldest outstanding consignments first (FIFO), locked for update.
        // Pending deliveries carry no debt yet, so they are not allocatable.
        const outstanding = await tx
            .select()
            .from(consignments)
            .where(
                and(
                    eq(consignments.sellerId, seller.id),
                    eq(consignments.isDeleted, false),
                    ne(consignments.deliveryStatus, 'pending'),
                    gt(consignments.remainingAmount, 0),
                ),
            )
            .orderBy(asc(consignments.date))
            .for('update');

        let remainingPayment = input.amount;
        const allocations: DebtAllocation[] = [];

        for (const c of outstanding) {
            if (remainingPayment <= 0) break;
            const remainingDebtBefore = c.remainingAmount;
            const allocate = Math.min(remainingPayment, remainingDebtBefore);
            const remainingDebtAfter = remainingDebtBefore - allocate;
            const isFullySettled = remainingDebtAfter <= 0;

            allocations.push({
                consignmentId: c.id,
                consignmentCode: c.code,
                consignmentDate: c.date.toISOString(),
                allocatedAmount: allocate,
                remainingDebtBefore,
                remainingDebtAfter,
                isFullySettled,
            });

            const newPaid = c.paidAmount + allocate;
            const newRemaining = Math.max(0, remainingDebtAfter);
            const newStatus = isFullySettled ? 'settled' : newPaid > 0 ? 'partially_settled' : c.status;

            await tx
                .update(consignments)
                .set({ paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus, updatedAt: new Date() })
                .where(eq(consignments.id, c.id));

            remainingPayment -= allocate;
        }

        const allocatedTotal = input.amount - remainingPayment;
        const newDebt = Math.max(0, seller.currentDebt - allocatedTotal);
        await tx
            .update(sellers)
            .set({
                currentDebt: newDebt,
                totalPaid: seller.totalPaid + input.amount,
                status: newDebt === 0 && seller.status !== 'suspended' ? 'settled' : seller.status,
                updatedAt: new Date(),
            })
            .where(eq(sellers.id, seller.id));

        const codes = await tx.select({ code: payments.code }).from(payments);
        const id = uuid();
        await tx.insert(payments).values({
            id,
            code: nextCode('PAY', codes.map((c) => c.code)),
            sellerId: seller.id,
            sellerName: seller.name,
            amount: input.amount,
            date: new Date(),
            paymentMethod: input.paymentMethod,
            ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
            allocations,
            unallocatedAmount: remainingPayment,
            recordedBy: actorName,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        });

        // P0-B #9: PAYMENT + SETTLEMENT rows for the money in and its FIFO
        // destinations. The consignment + sellers cache writes above stay
        // verbatim (settleDebt touches only financial_transactions).
        await settleDebt(tx, {
            sellerId: seller.id,
            amount: input.amount,
            allocations,
            paymentId: id,
            ...(actorId !== undefined ? { actorId } : {}),
        });
        const created = await tx.select().from(payments).where(eq(payments.id, id));
        emitDataChanged('payment', 'create');
        return created[0]!;
    });
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function listStaff(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(staff)
        : db.select().from(staff).where(eq(staff.isDeleted, false));
}

export async function createStaff(data: Partial<typeof staff.$inferInsert>) {
    if (!data.name || !data.role) throw badRequest('نام و نقش پرسنل الزامی است');
    const codes = await db.select({ code: staff.code }).from(staff);
    const id = isClientId(data.id) ? data.id : uuid();
    await db.insert(staff).values({
        id,
        code: data.code || nextCode('STF', codes.map((c) => c.code)),
        name: data.name,
        role: data.role,
        roleTitle: data.roleTitle ?? '',
        phones: data.phones ?? [],
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.nationalCode !== undefined ? { nationalCode: data.nationalCode } : {}),
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        salaryType: data.salaryType ?? 'monthly',
        salaryAmount: data.salaryAmount ?? 0,
        bankAccounts: data.bankAccounts ?? [],
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        status: data.status ?? 'active',
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.resumeUrl !== undefined ? { resumeUrl: data.resumeUrl } : {}),
        ...(data.resumeAttachmentName !== undefined ? { resumeAttachmentName: data.resumeAttachmentName } : {}),
        ...(data.resumeAttachmentData !== undefined ? { resumeAttachmentData: data.resumeAttachmentData } : {}),
        tasksCompletedCount: data.tasksCompletedCount ?? 0,
        activityHistory: data.activityHistory ?? [],
    });
    const rows = await db.select().from(staff).where(eq(staff.id, id));
    emitDataChanged('staff', 'create');
    return rows[0]!;
}

export async function updateStaff(
    id: string,
    data: Partial<typeof staff.$inferInsert>,
    actorId?: string,
    meta?: { ip?: string; userAgent?: string },
) {
    const existing = await db.select().from(staff).where(eq(staff.id, id));
    if (!existing[0]) throw notFound('پرسنل یافت نشد');
    const before = existing[0]!;
    const { id: _id, code: _code, ...patch } = data;
    if (typeof data.hireDate === 'string') patch.hireDate = new Date(data.hireDate);
    await db.update(staff).set(patch).where(eq(staff.id, id));
    const rows = await db.select().from(staff).where(eq(staff.id, id));
    const after = rows[0]!;
    // P0-B item 27: RBAC/permission changes are audited with before/after —
    // the generic controller 'update' row carries no role payload.
    if (patch.role !== undefined && patch.role !== before.role) {
        recordAudit({
            actor: await entityActor(db, actorId),
            action: 'update',
            entityType: 'staff',
            entityId: id.slice(0, 64),
            before: { role: before.role, roleTitle: before.roleTitle },
            after: { role: after.role, roleTitle: after.roleTitle },
            details: `نقش پرسنل «${before.name}» از «${before.roleTitle || before.role}» به «${after.roleTitle || after.role}» تغییر کرد`,
            ...(meta?.ip !== undefined ? { ip: meta.ip } : {}),
            ...(meta?.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
        });
    }
    emitDataChanged('staff', 'update');
    return rows[0]!;
}

export async function softDeleteStaff(id: string, actorId?: string) {
    const existing = await db.select().from(staff).where(eq(staff.id, id));
    const row = existing[0];
    if (!row) throw notFound('پرسنل یافت نشد');
    await db
        .update(staff)
        .set({ isDeleted: true, deletedAt: new Date(), ...(actorId !== undefined ? { deletedBy: actorId } : {}) })
        .where(eq(staff.id, id));
    emitDataChanged('staff', 'delete');
    return row;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function listExpenses(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(expenses)
        : db.select().from(expenses).where(eq(expenses.isDeleted, false));
}

export async function createExpense(data: Partial<typeof expenses.$inferInsert>) {
    if (!data.title || data.amount === undefined) throw badRequest('عنوان و مبلغ هزینه الزامی است');
    const codes = await db.select({ code: expenses.code }).from(expenses);
    const id = isClientId(data.id) ? data.id : uuid();
    await db.insert(expenses).values({
        id,
        code: data.code || nextCode('CST', codes.map((c) => c.code)),
        title: data.title,
        category: data.category ?? 'other',
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        paidBy: data.paidBy ?? 'صندوق کارگاه',
        paymentMethod: data.paymentMethod ?? 'cash',
        ...(data.receiptImageUrl !== undefined ? { receiptImageUrl: data.receiptImageUrl } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        isRecurring: data.isRecurring ?? false,
        costAllocation: data.costAllocation ?? 'workshop_fund',
        costShares: data.costShares ?? [],
    });
    const rows = await db.select().from(expenses).where(eq(expenses.id, id));
    emitDataChanged('cost', 'create');
    return rows[0]!;
}

export async function updateExpense(id: string, data: Partial<typeof expenses.$inferInsert>) {
    const existing = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing[0]) throw notFound('هزینه یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    if (typeof data.date === 'string') patch.date = new Date(data.date);
    await db.update(expenses).set(patch).where(eq(expenses.id, id));
    const rows = await db.select().from(expenses).where(eq(expenses.id, id));
    emitDataChanged('cost', 'update');
    return rows[0]!;
}

export async function softDeleteExpense(id: string, actorId?: string) {
    const existing = await db.select().from(expenses).where(eq(expenses.id, id));
    const row = existing[0];
    if (!row) throw notFound('هزینه یافت نشد');
    await db
        .update(expenses)
        .set({ isDeleted: true, deletedAt: new Date(), ...(actorId !== undefined ? { deletedBy: actorId } : {}) })
        .where(eq(expenses.id, id));
    emitDataChanged('cost', 'delete');
    return row;
}

// ---------------------------------------------------------------------------
// Profit distributions
// ---------------------------------------------------------------------------

export async function listProfitDistributions() {
    return db.select().from(profitDistributions);
}

export async function createProfitDistribution(data: Partial<typeof profitDistributions.$inferInsert>) {
    if (!data.periodName) throw badRequest('عنوان دوره تسویه الزامی است');
    const id = uuid();
    await db.insert(profitDistributions).values({
        id,
        periodName: data.periodName,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        grossRevenue: data.grossRevenue ?? 0,
        totalExpenses: data.totalExpenses ?? 0,
        reinvestmentReserve: data.reinvestmentReserve ?? 0,
        netProfit: data.netProfit ?? 0,
        distributionMode: data.distributionMode ?? 'units',
        totalShareUnits: data.totalShareUnits ?? 0,
        recipients: data.recipients ?? [],
        status: data.status ?? 'draft',
        calculatedAt: data.calculatedAt ? new Date(data.calculatedAt) : new Date(),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
    const rows = await db.select().from(profitDistributions).where(eq(profitDistributions.id, id));
    emitDataChanged('profit', 'create');
    return rows[0]!;
}

// ---------------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------------


const trashTables = {
    item: items,
    seller: sellers,
    staff: staff,
    expense: expenses,
    consignment: consignments,
} as const;

export async function listTrash() {
    const [deletedItems, deletedSellers, deletedStaff, deletedExpenses, deletedConsignments] = await Promise.all([
        db.select().from(items).where(eq(items.isDeleted, true)),
        db.select().from(sellers).where(eq(sellers.isDeleted, true)),
        db.select().from(staff).where(eq(staff.isDeleted, true)),
        db.select().from(expenses).where(eq(expenses.isDeleted, true)),
        db.select().from(consignments).where(eq(consignments.isDeleted, true)),
    ]);
    return { deletedItems, deletedSellers, deletedStaff, deletedExpenses, deletedConsignments };
}

/**
 * Legacy `entity` bucket per trash type — shared by the trash controller and
 * the service-layer restore/archive audit rows so both land in the same
 * filterable category the frontend already labels.
 */
export const TRASH_ENTITY_TYPE: Record<TrashEntityType, 'item' | 'seller' | 'staff' | 'cost' | 'consignment'> = {
    item: 'item',
    seller: 'seller',
    staff: 'staff',
    expense: 'cost',
    consignment: 'consignment',
};

/** Persian display name of a trash row (rows share name/code/title columns). */
export function entityDisplayName(type: TrashEntityType, row: unknown): string {
    if (!row || typeof row !== 'object') return 'مورد نامشخص';
    const r = row as Record<string, unknown>;
    switch (type) {
        case 'item':
            return `کالای «${r.name}» با کد ${r.code}`;
        case 'seller':
            return `دستفروش «${r.name}» با کد ${r.code}`;
        case 'staff':
            return `پرسنل «${r.name}» با کد ${r.code}`;
        case 'expense':
            return `هزینه «${r.title}»`;
        case 'consignment':
            return `واگذاری ${r.code} برای ${r.sellerName} به مبلغ ${r.totalAmount}`;
        default:
            return 'مورد نامشخص';
    }
}
export async function restoreEntity(
    type: TrashEntityType,
    id: string,
    patch?: Record<string, unknown>,
    actorId?: string,
    meta?: { ip?: string; userAgent?: string },
) {
    const table = trashTables[type];
    if (!table) throw badRequest('نوع موجودیت نامعتبر است');

    return db.transaction(async (tx) => {
        const rows = await tx.select().from(table).where(eq(table.id, id)).for('update');
        const row = rows[0] as (Record<string, unknown> & { isDeleted: boolean }) | undefined;
        if (!row) throw notFound('مورد یافت نشد');
        if (!row.isDeleted) throw badRequest('این مورد در سطل بازیافت نیست');

        const setPayload: Record<string, unknown> = {
            ...(patch ?? {}),
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            updatedAt: new Date(),
        };
        delete setPayload.id;
        delete setPayload.code;

        await tx.update(table).set(setPayload).where(eq(table.id, id));

        // Restoring a delivered consignment re-opens its outstanding debt as a
        // PAYABLE so the financial ledger stays consistent with sellers.currentDebt.
        if (type === 'consignment') {
            const consignmentRows = await tx
                .select()
                .from(consignments)
                .where(eq(consignments.id, id));
            const consignment = consignmentRows[0];
            if (
                consignment &&
                consignment.deliveryStatus === 'delivered' &&
                consignment.remainingAmount > 0
            ) {
                await openSellerPayable(tx, {
                    sellerId: consignment.sellerId,
                    amount: consignment.remainingAmount,
                    reference: { type: 'consignment', id },
                    description: `بازیافت واگذاری ${consignment.code}`,
                    ...(actorId !== undefined ? { actorId } : {}),
                });
            }
        }

        const restored = await tx.select().from(table).where(eq(table.id, id));
        const restoredRow = (restored as unknown[])[0] as Record<string, unknown> | undefined;
        // P0-B item 27: restore is logged as action 'restore' with the archived
        // state before and the live state after — inside the transaction so the
        // audit row commits/rolls back with the restore itself.
        const didEdit = patch !== undefined && Object.keys(patch).length > 0;
        recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'restore',
            entityType: TRASH_ENTITY_TYPE[type],
            entityId: id.slice(0, 64),
            before: row,
            after: restoredRow,
            details: `${entityDisplayName(type, restoredRow)} ${didEdit ? 'ویرایش و بازیابی' : 'بازیابی'} شد`,
            ...(meta?.ip !== undefined ? { ip: meta.ip } : {}),
            ...(meta?.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
            tx,
        });
        emitDataChanged(type, 'restore');
        return restoredRow;
    });
}

// Entities with financial/ledger history cannot be hard-deleted without
// breaking referential integrity. Archive them instead and surface a clear
// Persian marker so the controller can relay it to the UI.
const ARCHIVE_ONLY_TYPES = new Set<TrashEntityType>(['item', 'seller', 'consignment']);

export async function permanentDeleteEntity(
    type: TrashEntityType,
    id: string,
    actorId?: string,
    meta?: { ip?: string; userAgent?: string },
): Promise<{ archived: boolean; row: Record<string, unknown> }> {
    const table = trashTables[type];
    if (!table) throw badRequest('نوع موجودیت نامعتبر است');

    return db.transaction(async (tx) => {
        const rows = await tx.select().from(table).where(eq(table.id, id)).for('update');
        const row = rows[0] as Record<string, unknown> | undefined;
        if (!row) throw notFound('مورد یافت نشد');

        if (ARCHIVE_ONLY_TYPES.has(type)) {
            await tx
                .update(table)
                .set({
                    isDeleted: true,
                    deletedAt: new Date(),
                    ...(actorId !== undefined ? { deletedBy: actorId } : {}),
                })
                .where(eq(table.id, id));
            // P0-B item 27: archiving is audited as action 'archive' with the
            // live row before and the archived row after, inside the
            // transaction so the audit row commits with the archive itself.
            const archivedRows = await tx.select().from(table).where(eq(table.id, id));
            const archivedRow = (archivedRows as unknown[])[0] as Record<string, unknown> | undefined;
            recordAudit({
                actor: await entityActor(tx, actorId),
                action: 'archive',
                entityType: TRASH_ENTITY_TYPE[type],
                entityId: id.slice(0, 64),
                before: row,
                after: archivedRow,
                details: `${entityDisplayName(type, row)} بایگانی شد`,
                ...(meta?.ip !== undefined ? { ip: meta.ip } : {}),
                ...(meta?.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
                tx,
            });
            emitDataChanged(type, 'archive');
            return { archived: true, row };
        }

        // Hard delete: the controller keeps the 'delete' row (it carries the
        // request context for this non-financial, non-recoverable removal).
        await tx.delete(table).where(eq(table.id, id));
        emitDataChanged(type, 'permanent-delete');
        return { archived: false, row };
    });
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
    const now = new Date();
    // Start of today in Asia/Tehran (fixed UTC+03:30, no DST): take Tehran's
    // calendar date (YYYY-MM-DD), then back off 3.5h from its UTC midnight.
    const tehranToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
    const startOfToday = new Date(Date.parse(`${tehranToday}T00:00:00Z`) - 3.5 * 3600 * 1000);

    const [activeSellers, activeItems, activeConsignments, todayPaymentRows, allExpenses, allPayments, allOrders] =
        await Promise.all([
            db.select().from(sellers).where(eq(sellers.isDeleted, false)),
            db.select().from(items).where(eq(items.isDeleted, false)),
            db.select().from(consignments).where(eq(consignments.isDeleted, false)),
            db.select().from(payments).where(and(eq(payments.isDeleted, false), sql`${payments.date} >= ${startOfToday}`)),
            db
                .select({ amount: expenses.amount, paidBy: expenses.paidBy, date: expenses.date })
                .from(expenses)
                .where(eq(expenses.isDeleted, false)),
            db.select({ amount: payments.amount, date: payments.date }).from(payments).where(eq(payments.isDeleted, false)),
            db.select({ total: orders.total, createdAt: orders.createdAt }).from(orders),
        ]);

    const pendingConsignments = activeConsignments.filter((c) => c.deliveryStatus === 'pending');
    const deliveredConsignments = activeConsignments.filter((c) => c.deliveryStatus !== 'pending');
    const totalActiveDebt = activeSellers.reduce((s, r) => s + r.currentDebt, 0);
    const overdueConsignments = deliveredConsignments.filter(
        (c) => c.dueDate < now && c.status !== 'settled',
    );
    const totalOverdueDebt = overdueConsignments.reduce((s, c) => s + c.remainingAmount, 0);
    const todayPayments = todayPaymentRows.reduce((s, p) => s + p.amount, 0);
    const totalInventoryValue = activeItems.reduce(
        (s, i) => s + (i.stockQuantity + i.websiteQuantity) * i.costPrice,
        0
    );
    const totalItemsInHands = deliveredConsignments
        .filter((c) => c.status !== 'settled')
        .reduce((s, c) => s + c.items.reduce((ls, l) => ls + (l.quantity - l.returnedQuantity - l.soldQuantity), 0), 0);
    const activeConsignmentsCount = deliveredConsignments.filter((c) => c.remainingAmount > 0).length;
    const lowStockItemsCount = activeItems.filter((i) => i.stockQuantity <= i.minStockThreshold).length;
    const totalWorkshopCosts = allExpenses.reduce((s, e) => s + e.amount, 0);
    const totalCollected = allPayments.reduce((s, p) => s + p.amount, 0);
    const totalConsignmentValue = deliveredConsignments.reduce((s, c) => s + c.netAmount, 0);
    // Workshop liquid balance: total collected minus expenses paid from the
    // workshop fund (paidBy contains «صندوق»), mirroring the finances page.
    const fundPaidExpenses = allExpenses
        .filter((e) => e.paidBy.includes('صندوق'))
        .reduce((s, e) => s + e.amount, 0);
    const liquidBalance = totalCollected - fundPaidExpenses;

    // Weekly/monthly income windows, aligned to Tehran calendar days (the
    // same en-CA + 3.5h back-off used for "today" above).
    const tehranDayStart = (offsetDays: number) => new Date(startOfToday.getTime() - offsetDays * 86400000);
    const weekStart = tehranDayStart(6);
    const monthStart = tehranDayStart(29);
    const windowSums = (from: Date) => {
        const collected = allPayments.filter((p) => p.date >= from).reduce((s, p) => s + p.amount, 0);
        const costs = allExpenses.filter((e) => e.date >= from).reduce((s, e) => s + e.amount, 0);
        const consignmentGross = deliveredConsignments
            .filter((c) => c.createdAt >= from)
            .reduce((s, c) => s + c.netAmount, 0);
        const ordersGross = allOrders.filter((o) => o.createdAt >= from).reduce((s, o) => s + o.total, 0);
        return { pure: collected - costs, gross: consignmentGross + ordersGross };
    };
    const week = windowSums(weekStart);
    const month = windowSums(monthStart);


    return {
        totalActiveDebt,
        totalOverdueDebt,
        todayPayments,
        totalInventoryValue,
        totalItemsInHands,
        activeConsignmentsCount,
        overdueConsignmentsCount: overdueConsignments.length,
        lowStockItemsCount,
        totalSellersCount: activeSellers.length,
        activeSellersCount: activeSellers.filter((s) => s.status === 'active').length,
        totalOutstandingDebt: totalActiveDebt,
        totalWorkshopCosts,
        netWorkshopProfit: totalCollected - totalWorkshopCosts,
        totalConsignmentValue,
        totalCollected,
        pendingDeliveriesCount: pendingConsignments.length,
        liquidBalance,
        weekPureIncome: week.pure,
        weekGrossIncome: week.gross,
        monthPureIncome: month.pure,
        monthGrossIncome: month.gross,
    };
}
