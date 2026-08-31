import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/ordersService.js';
import { notifyNewOrder } from '../modules/notifications/services/notificationService.js';
import { logAudit } from '../core/services/auditService.js';

const orderLineSchema = z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().min(1),
    size: z.string().optional(),
    color: z.string().optional(),
});

const createOrderSchema = z.object({
    customerName: z.string().min(1, 'نام و نام خانوادگی الزامی است'),
    phone: z
        .string()
        .regex(/^0\d{10}$/, 'شماره تماس باید ۱۱ رقم و با ۰ شروع شود')
        .transform((v) => v.trim()),
    city: z.string().optional().default(''),
    address: z.string().min(5, 'آدرس کامل را وارد کنید'),
    note: z.string().optional(),
    paymentMethod: z.enum(['cod', 'card_transfer']),
    lines: z.array(orderLineSchema).min(1, 'سبد خرید خالی است'),
});

/** Authenticated customer: place an order from the cart. */
export async function createOrder(req: Request, res: Response): Promise<void> {
    const data = createOrderSchema.parse(req.body);
    const order = await svc.createOrder({
        userId: req.auth!.user.id,
        customerName: data.customerName.trim(),
        phone: data.phone,
        city: data.city.trim(),
        address: data.address.trim(),
        note: data.note?.trim(),
        paymentMethod: data.paymentMethod,
        lines: data.lines,
    });
    notifyNewOrder(order);
    logAudit(req.auth ?? null, 'create', 'settings', `سفارش ${order.code} توسط ${order.customerName} ثبت شد`, req.ip);
    res.status(201).json(order);
}

/** Authenticated customer: own order history for the profile dashboard. */
export async function listMyOrders(req: Request, res: Response): Promise<void> {
    res.json(await svc.listMyOrders(req.auth!.user.id));
}
