/**
 * P0-D: Sales Payments controller.
 *
 * Routes:
 *   GET  /sales-payments   → listSalesPayments
 *   POST /sales-payments   → createSalesPayment
 */
import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/salesPaymentService.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';

const createSalesPaymentSchema = z
    .object({
        orderId: z.string().uuid().optional(),
        sellerSaleId: z.string().uuid().optional(),
        customerId: z.string().uuid().optional(),
        sellerId: z.string().uuid().optional(),
        amount: z.number().positive('مبلغ باید بزرگتر از صفر باشد'),
        paymentMethod: z
            .enum(['cash', 'card_transfer', 'bank_transfer', 'pos', 'cheque'])
            .default('cash'),
        paymentDate: z.string().datetime({ offset: true }).optional(),
        trackingNumber: z.string().max(255).optional(),
        note: z.string().optional(),
    })
    .refine((v) => !!v.orderId !== !!v.sellerSaleId, {
        message: 'لطفاً یک سفارش یا فروش فروشنده مشخص کنید (نه هر دو، نه هیچ‌کدام)',
    });

/** Admin: list sales payments with optional filters. */
export async function listSalesPayments(req: Request, res: Response): Promise<void> {
    const f = z
        .object({
            orderId: z.string().uuid().optional(),
            sellerSaleId: z.string().uuid().optional(),
            status: z.string().optional(),
            paymentMethod: z.string().optional(),
        })
        .strict()
        .parse(req.query);
    res.json(await svc.listSalesPayments(f));
}

/** Admin: record a payment against an order or seller settlement. */
export async function createSalesPayment(req: Request, res: Response): Promise<void> {
    const data = createSalesPaymentSchema.parse(req.body);
    const payment = await svc.createSalesPayment(
        data,
        { ip: req.ip, userAgent: requestUserAgent(req) },
        req.auth?.user.id,
    );
    res.status(201).json(payment);
}
