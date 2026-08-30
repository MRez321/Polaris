import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../../../services/ordersService.js';
import { logAudit } from '../../../core/services/auditService.js';
import { pathParam } from '../../../core/utils/apiError.js';

const statusSchema = z.enum(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']);

/** Admin: every order, newest first. */
export async function listAllOrders(_req: Request, res: Response): Promise<void> {
    res.json(await svc.listAllOrders());
}

/** Admin: move an order between statuses (restocks on cancel). */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش');
    const body = z.object({ status: statusSchema }).parse(req.body);
    const order = await svc.updateOrderStatus(id, body.status);
    logAudit(req.auth ?? null, 'update', 'settings', `وضعیت سفارش ${order.code} به «${order.status}» تغییر کرد`, req.ip);
    res.json(order);
}
