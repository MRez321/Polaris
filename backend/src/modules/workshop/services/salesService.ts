/**
 * P0-D: Unified Sales Order service.
 *
 * Sales orders are the customer-facing financial document. Prices are always
 * read from the `items` table (never client-provided). Orders start in `draft`;
 * stock is NOT moved on creation — SALE/RETURN_IN ledger movements happen on
 * status transitions (confirmed → SALE, returned/cancelled → RETURN_IN).
 */
import { and, desc, eq, gte, like, lte } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { items, salesChannels, salesOrders, salesOrderLines, customers } from '../../../schema/index.js';
import { toSalesOrderDto, toSalesOrderLineDto } from '../../../models/mappers.js';
import type { SalesOrder, SalesOrderLine } from '../../../types/index.js';
type SalesOrderRow = typeof salesOrders.$inferSelect;
type SalesChannelRow = typeof salesChannels.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;
import { badRequest, notFound } from '../../../core/utils/apiError.js';
import { nextCode } from '../../../core/utils/code.js';
import {
    recordMovements,
    resolveLegacySku,
    shopLocationId,
    syncLegacyStockCache,
} from '../../../core/services/inventoryLedgerService.js';
import { entityActor, recordAudit } from '../../../core/services/auditService.js';
import type { DbTx } from '../../../core/services/inventoryLedgerService.js';
import { canTransition, type SalesOrderStatus } from './salesOrderStatus.js';


export interface SalesOrderLineInput {
    itemId?: string;
    sku?: string;
    quantity: number;
    size?: string;
    color?: string;
    /** Per-line discount in the order's currency (toman/IRT); client cannot
     * override unitPrice — it comes from items.retailPrice. */
    discountAmount?: number;
}

export interface SalesOrderInput {
    orderType: 'retail' | 'wholesale' | 'consignment' | 'manual';
    channelId: string;
    customerId?: string;
    sellerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    lines: SalesOrderLineInput[];
    shippingAmount?: number;
    taxAmount?: number;
    note?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

export interface SalesOrderFilters {
    status?: string;
    channelId?: string;
    sellerId?: string;
    customerId?: string;
    code?: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Creates a sales order in `draft` status. All monetary totals (subtotal,
 * discount, tax, shipping, total, remaining) are computed server-side from the
 * items table. No stock movement occurs — that happens on the `confirmed`
 * transition.
 */
export async function createSalesOrder(
    input: SalesOrderInput,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<SalesOrder> {
    if (!input.lines.length) throw badRequest('سبد خرید خالی است');

    return db.transaction(async (tx) => {
        // Validate channel exists and is active.
        const channelRows = await tx
            .select()
            .from(salesChannels)
            .where(eq(salesChannels.id, input.channelId))
            .for('update');
        const channel = channelRows[0];
        if (!channel || !channel.isActive) throw badRequest('کانال فروش معتبر نیست');

        // Validate customer if provided.
        if (input.customerId) {
            const custRows = await tx
                .select()
                .from(customers)
                .where(eq(customers.id, input.customerId))
                .for('update');
            if (!custRows[0]) throw badRequest('مشتری یافت نشد');
        }

        const codes = await tx.select({ code: salesOrders.code }).from(salesOrders);
        const id = uuid();
        const code = nextCode('SOO', codes.map((c) => c.code ?? ''));

        let subtotal = 0;
        let discountTotal = 0;
        const lineRows: (typeof salesOrderLines.$inferInsert)[] = [];

        for (const line of input.lines) {
            if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
                throw badRequest('تعداد کالا باید عدد صحیح و بزرگ‌تر از صفر باشد');
            }

            const unitPrice = await resolveLinePrice(tx, line);
            const lineDiscount = line.discountAmount ?? 0;
            if (lineDiscount < 0) throw badRequest('تخفیف نمی‌تواند منفی باشد');
            const lineTotal = unitPrice * line.quantity - lineDiscount;

            subtotal += unitPrice * line.quantity;
            discountTotal += lineDiscount;

            lineRows.push({
                id: uuid(),
                salesOrderId: id,
                itemId: line.itemId ?? null,
                sku: line.sku ?? null,
                quantity: line.quantity,
                unitPrice,
                discountAmount: lineDiscount,
                lineTotal,
                size: line.size ?? null,
                color: line.color ?? null,
            });
        }

        const shipping = input.shippingAmount ?? 0;
        const tax = input.taxAmount ?? 0;
        const total = subtotal - discountTotal + shipping + tax;

        const orderRow: typeof salesOrders.$inferInsert = {
            id,
            code,
            orderType: input.orderType,
            channelId: input.channelId,
            customerId: input.customerId ?? null,
            sellerId: input.sellerId ?? null,
            customerName: input.customerName ?? null,
            customerPhone: input.customerPhone ?? null,
            customerAddress: input.customerAddress ?? null,
            status: 'draft',
            paymentStatus: 'pending',
            subtotal,
            discountAmount: discountTotal,
            shippingAmount: shipping,
            taxAmount: tax,
            totalAmount: total,
            paidAmount: 0,
            remainingAmount: total,
            currency: 'IRT',
            sourceReference: null,
            utmSource: input.utmSource ?? null,
            utmMedium: input.utmMedium ?? null,
            utmCampaign: input.utmCampaign ?? null,
            trackingCode: null,
            note: input.note ?? null,
            confirmedAt: null,
            paidAt: null,
            shippedAt: null,
            deliveredAt: null,
            cancelledAt: null,
            createdBy: actorId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
        };

        await tx.insert(salesOrders).values(orderRow);
        await tx.insert(salesOrderLines).values(lineRows);

        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: 'sales-order',
            entityId: id.slice(0, 64),
            after: { code, orderType: input.orderType, channelId: input.channelId, totalAmount: total },
            details: `سفارش فروش ${code} ایجاد شد`,
            ...(meta.ip ? { ip: meta.ip } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            tx,
        });

        const row = (await tx
            .select()
            .from(salesOrders)
            .where(eq(salesOrders.id, id))
            .limit(1))[0];
        if (!row) throw notFound('سفارش فروش یافت نشد');
        const lines = await tx
            .select()
            .from(salesOrderLines)
            .where(eq(salesOrderLines.salesOrderId, id));

        return {
            ...toSalesOrderDto(row),
            lines: lines.map(toSalesOrderLineDto),
        };
    });
}

/** Resolves the unit price for a line by looking up the item (client cannot set price). */
async function resolveLinePrice(tx: DbTx, line: SalesOrderLineInput): Promise<number> {
    if (line.itemId) {
        const rows = await tx.select().from(items).where(eq(items.id, line.itemId)).for('update');
        const item = rows[0];
        if (!item) throw badRequest('یکی از کالاها یافت نشد');
        return item.retailPrice;
    }
    // SKU-based lookup: resolve to the item via the legacy SKU bridge.
    if (line.sku) {
        const skuId = await resolveLegacySku(tx, line.sku);
        const skuRows = await tx.select().from(items).where(eq(items.id, skuId)).for('update');
        const item = skuRows[0];
        if (!item) throw badRequest('یکی از کالاها یافت نشد');
        return item.retailPrice;
    }
    throw badRequest('هر خط ایتم باید itemId یا sku داشته باشد');
}

/** Lists sales orders with optional filtering. Excludes soft-deleted by default. */
export async function listSalesOrders(filters: SalesOrderFilters = {}): Promise<SalesOrder[]> {
    const conditions = [eq(salesOrders.isDeleted, false)];
    if (filters.status) conditions.push(eq(salesOrders.status, filters.status as SalesOrderStatus));
    if (filters.channelId) conditions.push(eq(salesOrders.channelId, filters.channelId));
    if (filters.sellerId) conditions.push(eq(salesOrders.sellerId, filters.sellerId));
    if (filters.customerId) conditions.push(eq(salesOrders.customerId, filters.customerId));
    if (filters.code) conditions.push(like(salesOrders.code, `%${filters.code}%`));
    if (filters.dateFrom) conditions.push(gte(salesOrders.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) conditions.push(lte(salesOrders.createdAt, new Date(filters.dateTo)));

    const rows = await db
        .select()
        .from(salesOrders)
        .where(and(...conditions))
        .orderBy(desc(salesOrders.createdAt));

    const result: SalesOrder[] = [];
    for (const row of rows) {
        const lineRows = await db
            .select()
            .from(salesOrderLines)
            .where(eq(salesOrderLines.salesOrderId, row.id));
        result.push({ ...toSalesOrderDto(row), lines: lineRows.map(toSalesOrderLineDto) });
    }
    return result;
}

/** Fetches a single sales order with its lines. */
export async function getSalesOrder(id: string): Promise<SalesOrder> {
    const rows = await db
        .select()
        .from(salesOrders)
        .where(and(eq(salesOrders.id, id), eq(salesOrders.isDeleted, false)))
        .limit(1);
    if (!rows[0]) throw notFound('سفارش فروش یافت نشد');

    const lineRows = await db
        .select()
        .from(salesOrderLines)
        .where(eq(salesOrderLines.salesOrderId, rows[0].id));

    const order = toSalesOrderDto(rows[0]);
    order.lines = lineRows.map(toSalesOrderLineDto);
    return order;
}

/**
 * Transitions an order to a new status. Validates the transition against the
 * lifecycle matrix and performs the appropriate stock movement:
 *   confirmed → SALE out of shop pool (retail orders)
 *   returned / cancelled-after-confirmed → RETURN_IN to shop pool
 * Payment status is NOT changed here — that's the payment service's job.
 */
export async function transitionSalesOrderStatus(
    id: string,
    newStatus: SalesOrderStatus,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
    trackingCode?: string,
): Promise<SalesOrder> {
    return db.transaction(async (tx) => {
        const rows = await tx
            .select()
            .from(salesOrders)
            .where(and(eq(salesOrders.id, id), eq(salesOrders.isDeleted, false)))
            .for('update');
        const order = rows[0];
        if (!order) throw notFound('سفارش فروش یافت نشد');

        const currentStatus = order.status as SalesOrderStatus;
        if (!canTransition(currentStatus, newStatus)) {
            throw badRequest(`انتقال وضعیت از «${currentStatus}» به «${newStatus}» معتبر نیست`);
        }

        // Load lines + items for stock integration.
        const lineRows = await tx
            .select()
            .from(salesOrderLines)
            .where(eq(salesOrderLines.salesOrderId, id));

        const shouldStockOut = newStatus === 'confirmed';
        const shouldReturnStock =
            (newStatus === 'returned' || newStatus === 'cancelled') &&
            (currentStatus === 'confirmed' ||
             currentStatus === 'paid' ||
             currentStatus === 'picking' ||
             currentStatus === 'packed' ||
             currentStatus === 'shipped' ||
             currentStatus === 'delivered');

        if (shouldStockOut || shouldReturnStock) {
            const moves: {
                skuId: string;
                locationId: string;
                movementType: 'SALE' | 'RETURN_IN';
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
                    // Retail/website orders draw from the shop pool; seller
                    // orders draw from the seller's custody location.
                    locationId: shopLocationId(),
                    movementType: shouldStockOut ? 'SALE' : 'RETURN_IN',
                    quantityDelta: shouldStockOut ? -line.quantity : line.quantity,
                    referenceType: 'sales-order',
                    referenceId: id,
                    reason: shouldStockOut
                        ? `سفارش ${order.code ?? id.slice(0, 8)}`
                        : `برگشت/لغو سفارش ${order.code ?? id.slice(0, 8)}`,
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

        const patch: Record<string, unknown> = {
            status: newStatus,
            updatedAt: new Date(),
        };
        if (newStatus === 'confirmed') patch.confirmedAt = new Date();
        if (newStatus === 'paid') patch.paidAt = new Date();
        if (newStatus === 'shipped' && trackingCode) patch.trackingCode = trackingCode;
        if (newStatus === 'shipped') patch.shippedAt = new Date();
        if (newStatus === 'delivered') patch.deliveredAt = new Date();
        if (newStatus === 'cancelled') patch.cancelledAt = new Date();

        await tx.update(salesOrders).set(patch).where(eq(salesOrders.id, id));

        const updated = (
            await tx.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1)
        )[0];
        if (!updated) throw notFound('سفارش فروش یافت نشد');

        await recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'update',
            entityType: 'sales-order',
            entityId: id.slice(0, 64),
            before: { status: currentStatus },
            after: { status: newStatus, ...(trackingCode ? { trackingCode } : {}) },
            details: `وضعیت سفارش ${updated.code ?? id.slice(0, 8)} از «${currentStatus}» به «${newStatus}» تغییر کرد`,
            ...(meta.ip ? { ip: meta.ip } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            tx,
        });

        const allLines = await tx
            .select()
            .from(salesOrderLines)
            .where(eq(salesOrderLines.salesOrderId, id));

        return { ...toSalesOrderDto(updated), lines: allLines.map(toSalesOrderLineDto) };
    });
}

// ===========================================================================
// Sales Channels (read-only management) — seeded via migration, but exposed
// for the console UI to browse.
// ===========================================================================

/** Lists all sales channels ordered by sortOrder. */
export async function listSalesChannels(): Promise<SalesChannelRow[]> {
    return db
        .select()
        .from(salesChannels)
        .orderBy(salesChannels.sortOrder, salesChannels.name);
}

/** Fetches a single sales channel by id. */
export async function getSalesChannel(id: string): Promise<SalesChannelRow> {
    const rows = await db
        .select()
        .from(salesChannels)
        .where(eq(salesChannels.id, id))
        .limit(1);
    if (!rows[0]) throw notFound('کانال فروش یافت نشد');
    return rows[0];
}

// ===========================================================================
// Customers
// ===========================================================================

/** Lists all active (non-deleted) customers ordered by name. */
export async function listCustomers(): Promise<CustomerRow[]> {
    return db
        .select()
        .from(customers)
        .where(eq(customers.isDeleted, false))
        .orderBy(customers.name);
}

/** Fetches a single customer by id. */
export async function getCustomer(id: string): Promise<CustomerRow> {
    const rows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.isDeleted, false)))
        .limit(1);
    if (!rows[0]) throw notFound('مشتری یافت نشد');
    return rows[0];
}

export interface CustomerInput {
    code?: string;
    name: string;
    phone?: string;
    email?: string;
    province?: string;
    city?: string;
    address?: string;
    postalCode?: string;
    creditLimit?: number;
    isActive?: boolean;
    tags?: string[];
    notes?: string;
    acquisitionChannelId?: string;
}

/** Creates a new customer record. */
export async function createCustomer(
    input: CustomerInput,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<CustomerRow> {
    const code = input.code ?? nextCode('CUST', []);
    const id = uuid();
    const row: typeof customers.$inferInsert = {
        id,
        code,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        province: input.province ?? null,
        city: input.city ?? null,
        address: input.address ?? null,
        postalCode: input.postalCode ?? null,
        creditLimit: input.creditLimit ?? 0,
        isActive: input.isActive ?? true,
        tags: input.tags ?? null,
        notes: input.notes ?? null,
        acquisitionChannelId: input.acquisitionChannelId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
    };

    await db.insert(customers).values(row);

    await recordAudit({
        actor: await entityActor(db, actorId),
        action: 'create',
        entityType: 'customer',
        entityId: id.slice(0, 64),
        after: { code, name: input.name },
        details: `مشتری ${code} - ${input.name} ایجاد شد`,
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });

    return row as CustomerRow;
}

/** Updates an existing customer. */
export async function updateCustomer(
    id: string,
    input: Partial<CustomerInput>,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<CustomerRow> {
    const existing = await getCustomer(id);
    const updated: Partial<typeof customers.$inferInsert> = {
        name: input.name ?? existing.name,
        phone: input.phone ?? existing.phone,
        email: input.email ?? existing.email,
        province: input.province ?? existing.province,
        city: input.city ?? existing.city,
        address: input.address ?? existing.address,
        postalCode: input.postalCode ?? existing.postalCode,
        creditLimit: input.creditLimit ?? existing.creditLimit,
        isActive: input.isActive ?? existing.isActive,
        tags: input.tags ?? existing.tags,
        notes: input.notes ?? existing.notes,
        acquisitionChannelId: input.acquisitionChannelId ?? existing.acquisitionChannelId,
        updatedAt: new Date(),
    };

    await db.update(customers).set(updated).where(eq(customers.id, id));

    await recordAudit({
        actor: await entityActor(db, actorId),
        action: 'update',
        entityType: 'customer',
        entityId: id.slice(0, 64),
        before: { name: existing.name },
        after: { name: updated.name },
        details: `مشتری ${existing.code ?? existing.id} به‌روزرسانی شد`,
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });

    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!rows[0]) throw notFound('مشتری یافت نشد');
    return rows[0];
}
