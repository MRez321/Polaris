/**
 * P0-D: Seller Sales controller.
 *
 * Routes:
 *   GET  /seller-sales             → listSellerSales
 *   POST /seller-sales             → createSellerSale
 *   GET  /seller-sales/:id         → getSellerSale
 *   PUT  /seller-sales/:id/status  → transitionSellerSaleStatus
 */
import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/sellerSalesService.js';
import { pathParam } from '../../../core/utils/apiError.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';

const sellerSaleLineSchema = z.object({
    itemId: z.string().uuid().optional(),
    itemCode: z.string().optional(),
    quantity: z.number().int().positive(),
    size: z.string().optional(),
    color: z.string().optional(),
});

// itemCode is required when itemId is absent, and vice-versa.
const sellerSaleLineRefined = sellerSaleLineSchema.refine(
    (v) => !!v.itemId || !!v.itemCode,
    { message: 'هر خط باید itemId یا itemCode داشته باشد' },
);

const createSellerSaleSchema = z.object({
    sellerId: z.string().uuid(),
    channelId: z.string().uuid(),
    saleDate: z.string().datetime({ offset: true }).optional(),
    note: z.string().optional(),
    lines: z.array(sellerSaleLineRefined).min(1, 'حداقل یک کالا را انتخاب کنید'),
});

const listSellerSalesSchema = z.object({
    sellerId: z.string().uuid().optional(),
    status: z.string().optional(),
    channelId: z.string().uuid().optional(),
    code: z.string().optional(),
});

const sellerSaleStatusSchema = z.enum(['draft', 'submitted', 'confirmed', 'settled', 'cancelled']);

/** Admin: list seller sales with optional filters. */
export async function listSellerSales(req: Request, res: Response): Promise<void> {
    const f = listSellerSalesSchema.strict().parse(req.query);
    res.json(await svc.listSellerSales(f));
}

/** Admin: create a seller sale in draft status (commission computed server-side). */
export async function createSellerSale(req: Request, res: Response): Promise<void> {
    const data = createSellerSaleSchema.parse(req.body);
    const sale = await svc.createSellerSale(data, { ip: req.ip, userAgent: requestUserAgent(req) }, req.auth?.user.id);
    res.status(201).json(sale);
}

/** Admin: fetch a single seller sale with its lines. */
export async function getSellerSale(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه فروش');
    res.json(await svc.getSellerSale(id));
}

/** Admin: transition a seller sale to a new lifecycle status. */
export async function transitionSellerSaleStatus(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه فروش');
    const body = sellerSaleStatusSchema.parse(req.body);
    const sale = await svc.transitionSellerSaleStatus(
        id,
        body,
        { ip: req.ip, userAgent: requestUserAgent(req) },
        req.auth?.user.id,
    );
    res.json(sale);
}
