/**
 * P0-D: Sales Order controller.
 *
 * Routes:
 *   GET  /sales-orders             → listSalesOrders
 *   POST /sales-orders             → createSalesOrder
 *   GET  /sales-orders/:id         → getSalesOrder
 *   PUT  /sales-orders/:id/status  → transitionOrderStatus
 */
import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/salesService.js';
import { pathParam } from '../../../core/utils/apiError.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';

const salesOrderLineSchema = z.object({
    itemId: z.string().uuid().optional(),
    sku: z.string().optional(),
    quantity: z.number().int().positive(),
    size: z.string().optional(),
    color: z.string().optional(),
    discountAmount: z.number().nonnegative().optional(),
});

const createSalesOrderSchema = z.object({
    orderType: z.enum(['retail', 'wholesale', 'consignment', 'manual']).default('retail'),
    channelId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    customerName: z.string().max(255).optional(),
    customerPhone: z.string().max(32).optional(),
    customerAddress: z.string().optional(),
    lines: z.array(salesOrderLineSchema).min(1, 'حداقل یک کالا را انتخاب کنید'),
    shippingAmount: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    note: z.string().optional(),
    utmSource: z.string().max(128).optional(),
    utmMedium: z.string().max(128).optional(),
    utmCampaign: z.string().max(128).optional(),
});

const listSalesOrdersSchema = z.object({
    status: z.string().optional(),
    channelId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    code: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});
const transitionStatusSchema = z.object({
    status: z.enum([
        'draft',
        'pending',
        'confirmed',
        'paid',
        'picking',
        'packed',
        'shipped',
        'delivered',
        'returned',
        'refunded',
        'cancelled',
    ]),
    trackingCode: z.string().trim().max(128).optional(),
});

/** Admin: list sales orders with optional filters. */
export async function listSalesOrders(req: Request, res: Response): Promise<void> {
    const f = listSalesOrdersSchema.strict().parse(req.query);
    res.json(await svc.listSalesOrders(f));
}

/** Admin: create a sales order in draft status. */
export async function createSalesOrder(req: Request, res: Response): Promise<void> {
    const data = createSalesOrderSchema.parse(req.body);
    const order = await svc.createSalesOrder(data, { ip: req.ip, userAgent: requestUserAgent(req) }, req.auth?.user.id);
    res.status(201).json(order);
}

/** Admin: fetch a single sales order with its lines. */
export async function getSalesOrder(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش');
    res.json(await svc.getSalesOrder(id));
}

/** Admin: transition an order to a new lifecycle status. */
export async function transitionOrderStatus(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش');
    const body = transitionStatusSchema.parse(req.body);
    const order = await svc.transitionSalesOrderStatus(
        id,
        body.status,
        { ip: req.ip, userAgent: requestUserAgent(req) },
        req.auth?.user.id,
        body.trackingCode,
    );
    res.json(order);
}
