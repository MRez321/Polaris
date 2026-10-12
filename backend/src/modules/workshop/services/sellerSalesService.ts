/**
 * P0-D: Seller Sales service.
 *
 * A seller sale records an actual sale by a street seller of consigned or
 * directly-held inventory. The seller's commission is computed server-side
 * from the seller's commissionType/rate and the item's consignment price.
 * Stock moves on confirmation (SALE out of seller custody pool).
 */
import { and, desc, eq, like } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { items, sellers, salesChannels, sellerSales, sellerSaleLines } from '../../../schema/index.js';
import type { SellerSale, SellerSaleLine } from '../../../types/index.js';
import { badRequest, notFound, conflict } from '../../../core/utils/apiError.js';
import { nextCode } from '../../../core/utils/code.js';
import {
    recordMovements,
    resolveLegacySku,
    sellerCustodyLocationId,
    syncLegacyStockCache,
} from '../../../core/services/inventoryLedgerService.js';
import { entityActor, recordAudit } from '../../../core/services/auditService.js';
import { toSellerSaleDto, toSellerSaleLineDto } from '../../../models/mappers.js';
import type { SellerSaleStatus } from '../../../schema/sales.js';

export interface SellerSaleLineInput {
    itemId?: string;
    itemCode?: string;
    quantity: number;
    size?: string;
    color?: string;
}
export interface SellerSaleInput {
    sellerId: string;
    channelId: string;
    saleDate?: string;
    lines: SellerSaleLineInput[];
    note?: string;
}

/**
 * Creates a seller sale in `draft` status. Commission is calculated from the
 * seller's commissionType/rate and the item's consignment price (never trusted
 * from the client). No stock movement on creation — that happens on `confirmed`.
 */
export async function createSellerSale(
    input: SellerSaleInput,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<SellerSale> {
    if (!input.lines.length) throw badRequest('هیچ کالایی انتخاب نشده است');

    return db.transaction(async (tx) => {
        // Validate seller exists and is active.
        const sellerRows = await tx
            .select()
            .from(sellers)
            .where(and(eq(sellers.id, input.sellerId), eq(sellers.isDeleted, false)))
            .for('update');
        const seller = sellerRows[0];
        if (!seller) throw notFound('فروشنده یافت نشد');
        if (seller.status !== 'active') throw conflict('فروشنده غیرفعال است');

        // Validate channel exists and is active.
        const channelRows = await tx
            .select()
            .from(salesChannels)
            .where(eq(salesChannels.id, input.channelId))
            .for('update');
        const channel = channelRows[0];
        if (!channel || !channel.isActive) throw badRequest('کانال فروش معتبر نیست');

        const codes = await tx.select({ code: sellerSales.code }).from(sellerSales);
        const id = uuid();
        const code = nextCode('SSL', codes.map((c) => c.code));

        let subtotal = 0;
        const lineRows: (typeof sellerSaleLines.$inferInsert)[] = [];
        const touchedItemIds: string[] = [];

        for (const line of input.lines) {
            if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
                throw badRequest('تعداد کالا باید عدد صحیح و بزرگ‌تر از صفر باشد');
            }

            // Resolve the item — by itemId or itemCode.
            const itemRows = await tx
                .select()
                .from(items)
                .where(
                    line.itemId
                        ? eq(items.id, line.itemId)
                        : eq(items.code, line.itemCode!),
                )
                .for('update');
            const item = itemRows[0];
            if (!item) throw badRequest('یکی از کالاها یافت نشد');

            // Price source: consignment price for consignment channels,
            // retail price for retail/physical sales through the seller.
            const unitPrice = item.consignmentPrice;
            const lineTotal = unitPrice * line.quantity;
            subtotal += lineTotal;

            lineRows.push({
                id: uuid(),
                sellerSaleId: id,
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name,
                size: line.size ?? null,
                color: line.color ?? null,
                quantity: line.quantity,
                unitPrice,
                lineTotal,
            });
            touchedItemIds.push(item.id);
        }

        // Server-side commission calculation.
        let commissionAmount = 0;
        if (seller.commissionType === 'percentage') {
            commissionAmount = Math.round((subtotal * Number(seller.commissionRate)) / 100);
        } else if (seller.commissionType === 'fixed') {
            commissionAmount = subtotal - Number(seller.commissionRate) * lineRows.length;
        } else {
            // 'none' — seller gets nothing, full amount is retained by workshop.
            commissionAmount = 0;
        }
        commissionAmount = Math.max(0, commissionAmount);
        const netSettlement = subtotal - commissionAmount;

        const saleDate = new Date(input.saleDate || new Date().toISOString());
        const saleRow: typeof sellerSales.$inferInsert = {
            id,
            code,
            sellerId: input.sellerId,
            channelId: input.channelId,
            saleDate,
            status: 'draft',
            subtotal,
            commissionAmount,
            netSettlementAmount: netSettlement,
            settledAmount: 0,
            remainingSettlement: netSettlement,
            note: input.note ?? null,
            submittedBy: actorId ?? null,
            confirmedBy: null,
            confirmedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
        };

        await tx.insert(sellerSales).values(saleRow);
        await tx.insert(sellerSaleLines).values(lineRows);
        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: 'seller-sale',
            entityId: id.slice(0, 64),
            after: {
                code,
                sellerId: input.sellerId,
                channelId: input.channelId,
                subtotal,
                commissionAmount,
                netSettlementAmount: netSettlement,
            },
            details: `فروش فروشنده ${code} برای ${seller.name} ایجاد شد`,
            ...(meta.ip ? { ip: meta.ip } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            tx,
        });


        const row = (await tx.select().from(sellerSales).where(eq(sellerSales.id, id)).limit(1))[0];
        if (!row) throw notFound('فروش فروشنده یافت نشد');

        const lines = await tx
            .select()
            .from(sellerSaleLines)
            .where(eq(sellerSaleLines.sellerSaleId, id));

        return {
            ...toSellerSaleDto(row),
            lines: lines.map(toSellerSaleLineDto),
            sellerName: seller.name,
        };
    });
}

/** Lists seller sales with optional filtering. Excludes soft-deleted. */
export async function listSellerSales(filters: {
    sellerId?: string;
    status?: string;
    channelId?: string;
    code?: string;
} = {}): Promise<SellerSale[]> {
    const conditions = [eq(sellerSales.isDeleted, false)];
    if (filters.sellerId) conditions.push(eq(sellerSales.sellerId, filters.sellerId));
    if (filters.status) conditions.push(eq(sellerSales.status, filters.status as SellerSaleStatus));
    if (filters.channelId) conditions.push(eq(sellerSales.channelId, filters.channelId));
    if (filters.code) conditions.push(like(sellerSales.code, `%${filters.code}%`));

    const rows = await db
        .select()
        .from(sellerSales)
        .where(and(...conditions))
        .orderBy(desc(sellerSales.createdAt));

    const result: SellerSale[] = [];
    for (const row of rows) {
        const sellerRows = await db
            .select()
            .from(sellers)
            .where(eq(sellers.id, row.sellerId))
            .limit(1);
        const lineRows = await db
            .select()
            .from(sellerSaleLines)
            .where(eq(sellerSaleLines.sellerSaleId, row.id));
        result.push({
            ...toSellerSaleDto(row),
            lines: lineRows.map(toSellerSaleLineDto),
            sellerName: sellerRows[0]?.name,
        });
    }
    return result;
}

/** Fetches a single seller sale with its lines and seller info. */
export async function getSellerSale(id: string): Promise<SellerSale> {
    const rows = await db
        .select()
        .from(sellerSales)
        .where(and(eq(sellerSales.id, id), eq(sellerSales.isDeleted, false)))
        .limit(1);
    if (!rows[0]) throw notFound('فروش فروشنده یافت نشد');

    const sellerRows = await db
        .select()
        .from(sellers)
        .where(eq(sellers.id, rows[0].sellerId))
        .limit(1);
    const lineRows = await db
        .select()
        .from(sellerSaleLines)
        .where(eq(sellerSaleLines.sellerSaleId, id));

    const sale = toSellerSaleDto(rows[0]);
    sale.lines = lineRows.map(toSellerSaleLineDto);
    sale.sellerName = sellerRows[0]?.name;
    return sale;
}

/**
 * Transitions a seller sale to a new status. On `confirmed`, posts SALE
 * movements to the seller's custody pool via the inventory ledger.
 */
export async function transitionSellerSaleStatus(
    id: string,
    newStatus: SellerSaleStatus,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<SellerSale> {
    return db.transaction(async (tx) => {
        const rows = await tx
            .select()
            .from(sellerSales)
            .where(and(eq(sellerSales.id, id), eq(sellerSales.isDeleted, false)))
            .for('update');
        const sale = rows[0];
        if (!sale) throw notFound('فروش فروشنده یافت نشد');

        const currentStatus = sale.status as SellerSaleStatus;
        // Seller sale transition matrix: draft→submitted→confirmed→settled, any→cancelled.
        const allowed: Record<string, SellerSaleStatus[]> = {
            draft: ['submitted', 'cancelled'],
            submitted: ['confirmed', 'cancelled'],
            confirmed: ['settled', 'cancelled'],
            settled: [],
            cancelled: [],
        };
        if (currentStatus !== newStatus && !allowed[currentStatus]?.includes(newStatus)) {
            throw badRequest(`انتقال وضعیت از «${currentStatus}» به «${newStatus}» معتبر نیست`);
        }
        if (currentStatus === newStatus) {
            const lineRows = await tx
                .select()
                .from(sellerSaleLines)
                .where(eq(sellerSaleLines.sellerSaleId, id));
            return { ...toSellerSaleDto(sale), lines: lineRows.map(toSellerSaleLineDto) };
        }

        // On confirmation, post SALE movements to the seller's custody location.
        if (newStatus === 'confirmed' && currentStatus !== 'confirmed') {
            const lineRows = await tx
                .select()
                .from(sellerSaleLines)
                .where(eq(sellerSaleLines.sellerSaleId, id));
            const moves: {
                skuId: string;
                locationId: string;
                movementType: 'SALE';
                quantityDelta: number;
                referenceType: string;
                referenceId: string;
                reason: string;
                unitCost: number;
                actorId?: string;
            }[] = [];
            const touchedItemIds: string[] = [];

            for (const line of lineRows) {
                if (!line.itemId) continue;
                const itemRows = await tx
                    .select()
                    .from(items)
                    .where(eq(items.id, line.itemId))
                    .for('update');
                const item = itemRows[0];
                if (!item) continue;
                const skuId = await resolveLegacySku(tx, item.id);
                moves.push({
                    skuId,
                    locationId: sellerCustodyLocationId(sale.sellerId),
                    movementType: 'SALE',
                    quantityDelta: -line.quantity,
                    referenceType: 'seller-sale',
                    referenceId: id,
                    reason: `فروش ${sale.code}`,
                    unitCost: item.costPrice,
                    ...(actorId !== undefined ? { actorId } : {}),
                });
                touchedItemIds.push(item.id);
            }

            if (moves.length > 0) {
                await recordMovements(tx, moves);
                for (const itemId of touchedItemIds) await syncLegacyStockCache(tx, itemId);
            }
        }

        const confirmedAt = newStatus === 'confirmed' && currentStatus !== 'confirmed'
            ? new Date()
            : sale.confirmedAt;

        await tx
            .update(sellerSales)
            .set({ status: newStatus, updatedAt: new Date(), confirmedBy: actorId ?? null, confirmedAt })
            .where(eq(sellerSales.id, id));

        const updated = (
            await tx.select().from(sellerSales).where(eq(sellerSales.id, id)).limit(1)
        )[0];
        if (!updated) throw notFound('فروش فروشنده یافت نشد');

        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'update',
            entityType: 'seller-sale',
            entityId: id.slice(0, 64),
            before: { status: currentStatus },
            after: { status: newStatus },
            details: `وضعیت فروش ${updated.code} از «${currentStatus}» به «${newStatus}» تغییر کرد`,
            ...(meta.ip ? { ip: meta.ip } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            tx,
        });

        const sellerRow = (
            await tx.select().from(sellers).where(eq(sellers.id, sale.sellerId)).limit(1)
        )[0];
        const lineRows = await tx
            .select()
            .from(sellerSaleLines)
            .where(eq(sellerSaleLines.sellerSaleId, id));

        return {
            ...toSellerSaleDto(updated),
            lines: lineRows.map(toSellerSaleLineDto),
            sellerName: sellerRow?.name,
        };
    });
}
