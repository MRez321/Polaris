/**
 * Damage/returns tracking endpoints. All routes mounted under /api/workshop
 * behind requireRole('admin').
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { damageRecords } from '../../../schema/index.js';
import * as svc from '../damageService.js';
import { logAudit } from '../../../core/services/auditService.js';
import { pathParam } from '../../../core/utils/apiError.js';

const createDamageSchema = z.object({
    itemId: z.string().min(1),
    source: z.enum(['seller', 'customer', 'provider', 'process']),
    sourceName: z.string().optional(),
    quantity: z.number().int().min(1),
    selectedSize: z.string().optional(),
    selectedColor: z.string().optional(),
    damageReason: z.string().optional(),
    currentLocation: z.string().optional(),
    reportedBy: z.string().optional(),
    notes: z.string().optional(),
});

const updateDamageSchema = z.object({
    source: z.enum(['seller', 'customer', 'provider', 'process']).optional(),
    sourceName: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    selectedSize: z.string().optional(),
    selectedColor: z.string().optional(),
    damageReason: z.string().optional(),
    currentLocation: z.string().optional(),
    notes: z.string().optional(),
});

const fixSchema = z.object({ fixedBy: z.string().optional() });

const iso = (d: Date | string | null | undefined): string =>
    d instanceof Date ? d.toISOString() : (d ?? '');
type DamageRecordRow = typeof damageRecords.$inferSelect;

function toDto(row: DamageRecordRow) {
    return {
        id: row.id,
        code: row.code,
        itemId: row.itemId,
        itemName: row.itemName,
        itemCode: row.itemCode,
        source: row.source,
        sourceName: row.sourceName,
        quantity: row.quantity,
        ...(row.selectedSize !== null && row.selectedSize !== undefined ? { selectedSize: row.selectedSize } : {}),
        ...(row.selectedColor !== null && row.selectedColor !== undefined
            ? { selectedColor: row.selectedColor }
            : {}),
        status: row.status,
        ...(row.damageReason ? { damageReason: row.damageReason } : {}),
        currentLocation: row.currentLocation,
        reportedBy: row.reportedBy,
        reportedAt: iso(row.reportedAt),
        ...(row.fixedAt ? { fixedAt: iso(row.fixedAt) } : {}),
        ...(row.fixedBy ? { fixedBy: row.fixedBy } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export async function listDamageRecords(req: Request, res: Response): Promise<void> {
    const includeDeleted = req.query.includeDeleted === 'true';
    const rows = await svc.listDamageRecords(includeDeleted);
    res.json(rows.map(toDto));
}

export async function createDamageRecord(req: Request, res: Response): Promise<void> {
    const data = createDamageSchema.parse(req.body);
    const row = await svc.createDamageRecord(data);
    logAudit(
        req.auth ?? null,
        'create',
        'damage',
        `خرابی/مرجوعی «${row.itemName}» با کد ${row.code} ثبت شد`,
        req.ip,
    );
    res.status(201).json(toDto(row));
}

export async function updateDamageRecord(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه رکورد خرابی');
    const data = updateDamageSchema.parse(req.body);
    const row = await svc.updateDamageRecord(id, data);
    logAudit(req.auth ?? null, 'update', 'damage', `رکورد خرابی ${row.code} ویرایش شد`, req.ip);
    res.json(toDto(row));
}

export async function fixDamageRecord(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه رکورد خرابی');
    const { fixedBy } = fixSchema.parse(req.body ?? {});
    const row = await svc.fixDamageRecord(id, fixedBy);
    logAudit(
        req.auth ?? null,
        'update',
        'damage',
        `رکورد خرابی «${row.itemName}» با کد ${row.code} ترمیم و به انبار برگشت`,
        req.ip,
    );
    res.json(toDto(row));
}

export async function disposeDamageRecord(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه رکورد خرابی');
    const row = await svc.disposeDamageRecord(id);
    logAudit(
        req.auth ?? null,
        'update',
        'damage',
        `رکورد خرابی «${row.itemName}» با کد ${row.code} اسقاط شد`,
        req.ip,
    );
    res.json(toDto(row));
}

export async function deleteDamageRecord(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه رکورد خرابی');
    const row = await svc.softDeleteDamageRecord(id);
    logAudit(
        req.auth ?? null,
        'delete',
        'damage',
        `رکورد خرابی «${row.itemName}» با کد ${row.code} به سطل بازیافت منتقل شد`,
        req.ip,
    );
    res.json({ message: 'رکورد خرابی به سطل بازیافت منتقل شد' });
}
