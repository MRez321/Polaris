/**
 * P0-D: Sales Payment service.
 *
 * Payments target exactly one of: a sales order (customer payment) or a seller
 * sale (settlement). The service enforces the exactly-one-target rule, computes
 * remaining amounts server-side, and updates payment status. All financial
 * totals are validated against the order/sale's remaining amount.
 */
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { salesPayments, salesOrders, sellerSales } from '../../../schema/index.js';
import type { SalesPayment } from '../../../types/index.js';
import { badRequest, notFound, conflict } from '../../../core/utils/apiError.js';
import { nextCode } from '../../../core/utils/code.js';
import { entityActor, recordAudit } from '../../../core/services/auditService.js';
import { toSalesPaymentDto } from '../../../models/mappers.js';

export interface SalesPaymentInput {
    orderId?: string;
    sellerSaleId?: string;
    customerId?: string;
    sellerId?: string;
    amount: number;
    paymentMethod: string;
    paymentDate?: string;
    trackingNumber?: string;
    note?: string;
}

/**
 * Creates a sales payment. Validates that exactly one target (orderId OR
 * sellerSaleId) is provided. For order payments, updates paidAmount /
 * remainingAmount / paymentStatus / paidAt on the sales order. For seller
 * settlements, updates settledAmount / remainingSettlement / status.
 */
export async function createSalesPayment(
    input: SalesPaymentInput,
    meta: { ip?: string; userAgent?: string },
    actorId?: string,
): Promise<SalesPayment> {
    const hasOrder = !!input.orderId;
    const hasSellerSale = !!input.sellerSaleId;

    if (hasOrder && hasSellerSale) throw badRequest('پرداخت نمی‌تواند همزمان به سفارش و فروش فروشنده اختصاص یابد');
    if (!hasOrder && !hasSellerSale) throw badRequest('لطفاً یک سفارش یا فروش فروشنده مشخص کنید');
    if (input.amount <= 0) throw badRequest('مبلغ پرداخت باید بزرگتر از صفر باشد');

    return db.transaction(async (tx) => {
        const codes = await tx.select({ code: salesPayments.code }).from(salesPayments);
        const id = uuid();
        const code = nextCode('PYM', codes.map((c) => c.code ?? ''));

        let paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'completed';
        let targetEntityType = 'sales-order';

        if (input.orderId) {
            // Order payment: update order's paidAmount / remainingAmount / status.
            const orderRows = await tx
                .select()
                .from(salesOrders)
                .where(and(eq(salesOrders.id, input.orderId), eq(salesOrders.isDeleted, false)))
                .for('update');
            const order = orderRows[0];
            if (!order) throw notFound('سفارش فروش یافت نشد');

            const remainingBefore = order.remainingAmount;
            if (input.amount > remainingBefore) {
                throw conflict(`مبلع پرداخت (${input.amount}) از مانده باقیمانده سفارش (${remainingBefore}) بیشتر است`);
            }

            const newPaidAmount = order.paidAmount + input.amount;
            const newRemaining = Math.max(0, order.remainingAmount - input.amount);
            let newPaymentStatus = 'partial';
            if (newRemaining === 0) newPaymentStatus = 'paid';
            else if (newPaidAmount === 0) newPaymentStatus = 'pending';

            await tx
                .update(salesOrders)
                .set({
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemaining,
                    paymentStatus: newPaymentStatus,
                    paidAt: newRemaining === 0 ? new Date() : order.paidAt,
                    updatedAt: new Date(),
                })
                .where(eq(salesOrders.id, input.orderId));

            paymentStatus = 'completed';
            targetEntityType = 'sales-order';
        } else if (input.sellerSaleId) {
            // Seller settlement: update seller sale's settledAmount / remaining.
            const saleRows = await tx
                .select()
                .from(sellerSales)
                .where(and(eq(sellerSales.id, input.sellerSaleId), eq(sellerSales.isDeleted, false)))
                .for('update');
            const sale = saleRows[0];
            if (!sale) throw notFound('فروش فروشنده یافت نشد');

            if (sale.status !== 'confirmed') {
                throw conflict('تنها فروش‌های تأیید‌شده قابل تسویه هستند');
            }

            const remaining = sale.remainingSettlement;
            if (input.amount > remaining) {
                throw conflict(`مبلع تسویه (${input.amount}) از مانده باقیمانده (${remaining}) بیشتر است`);
            }

            const newSettled = sale.settledAmount + input.amount;
            const newRemaining = Math.max(0, sale.remainingSettlement - input.amount);
            const newStatus =
                newRemaining === 0
                    ? 'settled'
                    : newSettled > 0
                      ? 'confirmed'
                      : 'confirmed';

            await tx
                .update(sellerSales)
                .set({
                    settledAmount: newSettled,
                    remainingSettlement: newRemaining,
                    status: newStatus as typeof sellerSales.$inferSelect['status'],
                    updatedAt: new Date(),
                })
                .where(eq(sellerSales.id, input.sellerSaleId));

            paymentStatus = 'completed';
            targetEntityType = 'seller-sale';
        }

        const paymentRow: typeof salesPayments.$inferInsert = {
            id,
            code,
            orderId: input.orderId ?? null,
            sellerSaleId: input.sellerSaleId ?? null,
            customerId: input.customerId ?? null,
            sellerId: input.sellerId ?? null,
            amount: input.amount,
            paymentMethod: input.paymentMethod ?? 'cash',
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
            trackingNumber: input.trackingNumber ?? null,
            status: paymentStatus,
            note: input.note ?? null,
            createdBy: actorId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
        };

        await tx.insert(salesPayments).values(paymentRow);

        recordAudit({
            actor: await entityActor(tx, actorId),
            action: 'create',
            entityType: targetEntityType === 'seller-sale' ? 'seller-sale-payment' : 'sales-order-payment',
            entityId: id.slice(0, 64),
            after: {
                code,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
                ...(input.orderId ? { orderId: input.orderId } : {}),
                ...(input.sellerSaleId ? { sellerSaleId: input.sellerSaleId } : {}),
            },
            details: `پرداخت ${code} (${input.amount.toLocaleString('fa-IR')} تومان) ثبت شد`,
            ...(meta.ip ? { ip: meta.ip } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            tx,
        });

        const row = (
            await tx.select().from(salesPayments).where(eq(salesPayments.id, id)).limit(1)
        )[0];
        if (!row) throw notFound('پرداخت یافت نشد');
        return toSalesPaymentDto(row);
    });
}

/** Lists sales payments with optional filtering. */
export async function listSalesPayments(filters: {
    orderId?: string;
    sellerSaleId?: string;
    status?: string;
    paymentMethod?: string;
} = {}): Promise<SalesPayment[]> {
    const conditions = [eq(salesPayments.isDeleted, false)];
    if (filters.orderId) conditions.push(eq(salesPayments.orderId, filters.orderId));
    if (filters.sellerSaleId) conditions.push(eq(salesPayments.sellerSaleId, filters.sellerSaleId));
    if (filters.status) conditions.push(eq(salesPayments.status, filters.status));
    if (filters.paymentMethod) conditions.push(eq(salesPayments.paymentMethod, filters.paymentMethod));

    const rows = await db
        .select()
        .from(salesPayments)
        .where(and(...conditions))
        .orderBy(desc(salesPayments.paymentDate));

    return rows.map(toSalesPaymentDto);
}
