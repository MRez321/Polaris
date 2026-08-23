import type { Request, Response } from 'express';

import * as svc from '../services/inventoryService.js';
import type { TrashEntityType } from '../services/inventoryService.js';
import {
    toItemDto,
    toSellerDto,
    toStaffDto,
    toExpenseDto,
    toConsignmentDto,
} from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest } from '../utils/apiError.js';

const TRASH_TYPES: readonly TrashEntityType[] = ['item', 'seller', 'staff', 'expense', 'consignment'];

function parseType(raw: string | undefined): TrashEntityType {
    if (!raw || !TRASH_TYPES.includes(raw as TrashEntityType)) {
        throw badRequest('نوع موجودیت نامعتبر است');
    }
    return raw as TrashEntityType;
}

const ENTITY_BY_TYPE: Record<TrashEntityType, 'item' | 'seller' | 'staff' | 'cost' | 'consignment'> = {
    item: 'item',
    seller: 'seller',
    staff: 'staff',
    expense: 'cost',
    consignment: 'consignment',
};

export async function listTrash(_req: Request, res: Response): Promise<void> {
    const t = await svc.listTrash();
    res.json({
        items: t.deletedItems.map((r) => toItemDto(r)),
        sellers: t.deletedSellers.map(toSellerDto),
        staff: t.deletedStaff.map(toStaffDto),
        expenses: t.deletedExpenses.map(toExpenseDto),
        consignments: t.deletedConsignments.map(toConsignmentDto),
    });
}

export async function restoreEntity(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = req.params.id;
    if (!id) throw badRequest('شناسه مورد الزامی است');
    const restored = await svc.restoreEntity(type, id);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `مورد حذف‌شده (${type}) بازیابی شد`);
    res.json({ message: 'مورد با موفقیت بازیابی شد', restored });
}

export async function editAndRestore(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = req.params.id;
    if (!id) throw badRequest('شناسه مورد الزامی است');
    const patch = (req.body ?? {}) as Record<string, unknown>;
    const restored = await svc.restoreEntity(type, id, patch);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `مورد حذف‌شده (${type}) ویرایش و بازیابی شد`);
    res.json({ message: 'مورد ویرایش و بازیابی شد', restored });
}

export async function permanentDelete(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = req.params.id;
    if (!id) throw badRequest('شناسه مورد الزامی است');
    await svc.permanentDeleteEntity(type, id);
    logAudit(req.auth ?? null, 'delete', ENTITY_BY_TYPE[type], `مورد (${type}) برای همیشه حذف شد`);
    res.json({ message: 'مورد برای همیشه حذف شد' });
}
