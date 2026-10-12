/**
 * P0-D: Customer controller.
 *
 * Routes (mounted in router.ts at /api/workshop):
 *   GET  /customers          → listCustomers
 *   GET  /customers/:id      → getCustomer
 *   POST /customers          → createCustomer
 *   PUT  /customers/:id      → updateCustomer
 */
import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/salesService.js';
import { toCustomerDto } from '../../../models/mappers.js';
import { pathParam } from '../../../core/utils/apiError.js';
import { recordAudit } from '../../../core/services/auditService.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';

const customerSchema = z.object({
    id: z.string().optional(),
    code: z.string().max(32).optional(),
    name: z.string().min(1, 'نام مشتری الزامی است').max(255),
    phone: z.string().max(32).optional(),
    email: z.string().email('ایمیل نامعتبر').optional(),
    province: z.string().max(64).optional(),
    city: z.string().max(128).optional(),
    address: z.string().max(512).optional(),
    postalCode: z.string().max(16).optional(),
    creditLimit: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    acquisitionChannelId: z.string().uuid().optional(),
});

/** Admin: list all active (non-deleted) customers. */
export async function listCustomers(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listCustomers();
    res.json(rows.map(toCustomerDto));
}

/** Admin: fetch a single customer with computed stats. */
export async function getCustomer(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مشتری');
    const row = await svc.getCustomer(id);
    res.json(toCustomerDto(row));
}

/** Admin: create a new customer. */
export async function createCustomer(req: Request, res: Response): Promise<void> {
    const data = customerSchema.parse(req.body);
    const row = await svc.createCustomer(data, { ip: req.ip, userAgent: requestUserAgent(req) }, req.auth?.user.id);
    res.status(201).json(toCustomerDto(row));
}

/** Admin: update an existing customer. */
export async function updateCustomer(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مشتری');
    const data = customerSchema.partial().parse(req.body);
    const row = await svc.updateCustomer(id, data, { ip: req.ip, userAgent: requestUserAgent(req) }, req.auth?.user.id);
    res.json(toCustomerDto(row));
}
