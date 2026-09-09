import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../inventoryService.js';
import { toConsignmentDto, toReturnDto } from '../../../models/mappers.js';
import { logAudit } from '../../../core/services/auditService.js';
import { badRequest, pathParam } from '../../../core/utils/apiError.js';
import { recordWorkshopEvent } from '../services/notificationsService.js';

const handoverSchema = z.object({
    sellerId: z.string().min(1),
    dueDate: z.string().min(1),
    deliveryDate: z.string().min(1).optional(),
    notes: z.string().optional(),
    itemsList: z
        .array(
            z.object({
                itemId: z.string().min(1),
                quantity: z.number().int().positive(),
                unitPrice: z.number().min(0),
                selectedSize: z.string().optional(),
                selectedColor: z.string().optional(),
            }),
        )
        .min(1),
});

const returnSchema = z.object({
    consignmentId: z.string().min(1),
    returnItems: z
        .array(
            z.object({
                itemId: z.string().min(1),
                quantity: z.number().int().positive(),
                condition: z.enum(['healthy', 'damaged']),
                reason: z.string().optional(),
                selectedSize: z.string().optional(),
                selectedColor: z.string().optional(),
            }),
        )
        .min(1),
    notes: z.string().optional(),
});

export async function listConsignments(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listConsignments();
    res.json(rows.map(toConsignmentDto));
}

export async function listReturns(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listReturns();
    res.json(rows.map(toReturnDto));
}

export async function createConsignment(req: Request, res: Response): Promise<void> {
    const data = handoverSchema.parse(req.body);
    const actor = req.auth?.user.name ?? 'سیستم';
    const row = await svc.createHandover(data, actor);
    logAudit(req.auth ?? null, 'create', 'consignment', `واگذاری ${row.code} برای ${row.sellerName} به مبلغ ${row.totalAmount} ثبت شد`, req.ip);
    recordWorkshopEvent({
        type: 'notification',
        title: row.deliveryStatus === 'pending' ? 'حواله در انتظار تحویل ثبت شد' : 'واگذاری انجام شد',
        body: `واگذاری ${row.code} برای ${row.sellerName} به مبلغ ${row.totalAmount.toLocaleString('fa-IR')} ثبت شد`,
        entityType: 'consignment',
        entityId: row.id,
        link: '/workshop/consignments',
    });
    res.status(201).json(toConsignmentDto(row));
}

export async function deliverConsignment(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه واگذاری');
    const actor = req.auth?.user.name ?? 'سیستم';
    const row = await svc.markDelivered(id, actor);
    logAudit(req.auth ?? null, 'update', 'consignment', `واگذاری ${row.code} به ${row.sellerName} تحویل داده شد`, req.ip);
    recordWorkshopEvent({
        type: 'notification',
        title: 'واگذاری انجام شد',
        body: `حواله ${row.code} به ${row.sellerName} تحویل داده شد و بدهی ثبت گردید`,
        entityType: 'consignment',
        entityId: row.id,
        link: '/workshop/consignments',
    });
    res.json(toConsignmentDto(row));
}


export async function deleteConsignment(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه واگذاری');
    const row = await svc.softDeleteConsignment(id);
    logAudit(
        req.auth ?? null,
        'delete',
        'consignment',
        `واگذاری ${row.code} برای ${row.sellerName} به مبلغ ${row.totalAmount} به سطل بازیافت منتقل شد`,
        req.ip,
    );
    res.json({ message: 'واگذاری به سطل بازیافت منتقل شد' });
}

export async function submitReturn(req: Request, res: Response): Promise<void> {
    const data = returnSchema.parse(req.body);
    const actor = req.auth?.user.name ?? 'سیستم';
    const { returnRecord, updatedConsignment } = await svc.submitReturn(data, actor);
    logAudit(
        req.auth ?? null,
        'create',
        'return',
        `مرجوعی واگذاری ${updatedConsignment.code} به ارزش ${returnRecord.totalReturnAmount} ثبت شد`,
        req.ip,
    );
    res.status(201).json({
        message: 'مرجوعی با موفقیت ثبت شد',
        returnRecord: toReturnDto(returnRecord),
        updatedConsignment: toConsignmentDto(updatedConsignment),
    });
}
