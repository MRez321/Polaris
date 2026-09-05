import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { items, orders } from '../schema/index.js';
import type { Order, OrderItemLine, OrderPaymentMethod, OrderStatus } from '../types/index.js';
import { badRequest, notFound } from '../core/utils/apiError.js';
import { nextCode } from '../core/utils/code.js';

export const ORDER_STATUSES: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
];

export function toOrderDto(row: typeof orders.$inferSelect): Order {
    return {
        id: row.id,
        code: row.code,
        userId: row.userId,
        customerName: row.customerName,
        phone: row.phone,
        city: row.city,
        province: row.province,
        postalCode: row.postalCode,
        trackingCode: row.trackingCode ?? '',
        deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
        address: row.address,
        note: row.note ?? '',
        paymentMethod: row.paymentMethod as OrderPaymentMethod,
        status: row.status as OrderStatus,
        total: row.total,
        items: row.items,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export interface OrderLineInput {
    itemId: string;
    quantity: number;
    size?: string;
    color?: string;
}

export interface OrderInput {
    userId: string;
    customerName: string;
    phone: string;
    province: string;
    city: string;
    postalCode: string;
    address: string;
    note?: string;
    paymentMethod: OrderPaymentMethod;
    lines: OrderLineInput[];
}

/**
 * Places an order. Prices/total are computed from the items table — the
 * client never dictates money values. Stock is checked and decremented
 * inside a single transaction with row locks.
 */
export async function createOrder(input: OrderInput) {
    if (!input.lines.length) throw badRequest('سبد خرید خالی است');

    return db.transaction(async (tx) => {
        const lines: OrderItemLine[] = [];
        let total = 0;

        for (const line of input.lines) {
            if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
                throw badRequest('تعداد کالا باید عدد صحیح و بزرگ‌تر از صفر باشد');
            }
            const rows = await tx
                .select()
                .from(items)
                .where(eq(items.id, line.itemId))
                .for('update');
            const item = rows[0];
            if (!item || item.isDeleted) throw badRequest('یکی از کالاهای سبد خرید دیگر در دسترس نیست');
            // Website orders draw from the dedicated shop pool, never from
            // the free warehouse stock that handovers use.
            if (item.websiteQuantity < line.quantity) {
                throw badRequest(`موجودی «${item.name}» کافی نیست (حداکثر ${item.websiteQuantity} عدد)`);
            }

            await tx
                .update(items)
                .set({ websiteQuantity: item.websiteQuantity - line.quantity, updatedAt: new Date() })
                .where(eq(items.id, item.id));

            const price = item.retailPrice;
            total += price * line.quantity;
            lines.push({
                itemId: item.id,
                code: item.code,
                name: item.name,
                price,
                quantity: line.quantity,
                size: line.size,
                color: line.color,
                imageUrl: item.imageUrl ?? item.images[0],
            });
        }

        const codes = await tx.select({ code: orders.code }).from(orders);
        const id = uuid();
        const code = nextCode('ORD', codes.map((c) => c.code));
        const row: typeof orders.$inferInsert = {
            id,
            code,
            userId: input.userId,
            customerName: input.customerName,
            phone: input.phone,
            city: input.city,
            province: input.province,
            postalCode: input.postalCode,
            address: input.address,
            note: input.note ?? '',
            paymentMethod: input.paymentMethod,
            status: 'pending',
            total,
            items: lines,
        };
        await tx.insert(orders).values(row);


        const created = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
        return toOrderDto(created[0]!);
    });
}

export async function listMyOrders(userId: string) {
    const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));
    return rows.map(toOrderDto);
}

/** One of the user's own orders for the tracking timeline (404 on foreign ids). */
export async function getMyOrder(userId: string, id: string): Promise<Order> {
    const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.userId, userId)))
        .limit(1);
    if (!rows[0]) throw notFound('سفارش یافت نشد');
    return toOrderDto(rows[0]);
}

export async function listAllOrders() {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(toOrderDto);
}

export async function getOrderById(id: string) {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!rows[0]) throw notFound('سفارش یافت نشد');
    return rows[0];
}

/**
 * Admin status transition. Cancelling an order restores its stock; moving a
 * cancelled order back to any active state decrements stock again. Marking
 * shipped may attach a tracking code; marking delivered stamps deliveredAt.
 */
export async function updateOrderStatus(id: string, status: OrderStatus, trackingCode?: string) {
    if (!ORDER_STATUSES.includes(status)) throw badRequest('وضعیت سفارش معتبر نیست');

    return db.transaction(async (tx) => {
        const rows = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
        const order = rows[0];
        if (!order) throw notFound('سفارش یافت نشد');
        if (order.status === status) return toOrderDto(order);

        const restock = order.status !== 'cancelled' && status === 'cancelled' ? 1 : 0;
        const destock = order.status === 'cancelled' && status !== 'cancelled' ? -1 : 0;
        const direction = restock || destock;

        if (direction !== 0) {
            for (const line of order.items) {
                const itemRows = await tx
                    .select()
                    .from(items)
                    .where(eq(items.id, line.itemId))
                    .for('update');
                const item = itemRows[0];
                if (!item || item.isDeleted) continue;
                // Website orders own the shop pool; cancel restores to it and
                // un-cancel takes from it again (clamped at zero like before).
                const next = Math.max(0, item.websiteQuantity + direction * line.quantity);
                await tx
                    .update(items)
                    .set({ websiteQuantity: next, updatedAt: new Date() })
                    .where(eq(items.id, item.id));
            }
        }

        const patch: { status: OrderStatus; updatedAt: Date; trackingCode?: string; deliveredAt?: Date | null } = {
            status,
            updatedAt: new Date(),
        };
        if (status === 'shipped' && trackingCode !== undefined && trackingCode.trim() !== '') {
            patch.trackingCode = trackingCode.trim();
        }
        if (status === 'delivered') {
            patch.deliveredAt = new Date();
        } else if ((order.status as string) === 'delivered') {
            // Re-opening a delivered order clears the stale stamp.
            patch.deliveredAt = null;
        }
        await tx.update(orders).set(patch).where(eq(orders.id, id));
        const updated = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
        return toOrderDto(updated[0]!);
    });
}
