import type { Request, Response } from 'express';

import * as svc from '../inventoryService.js';
import type { TrashEntityType } from '../inventoryService.js';
import {
    toItemDto,
    toSellerDto,
    toStaffDto,
    toExpenseDto,
    toConsignmentDto,
} from '../../../models/mappers.js';
import { logAudit } from '../../../core/services/auditService.js';
import { badRequest, pathParam } from '../../../core/utils/apiError.js';

const TRASH_TYPES: readonly TrashEntityType[] = ['item', 'seller', 'staff', 'expense', 'consignment'];

function parseType(raw: string | string[] | undefined): TrashEntityType {
    if (typeof raw !== 'string' || !TRASH_TYPES.includes(raw as TrashEntityType)) {
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

/** Builds the Persian display name of a trashed row (rows arrive as unknown/record shapes). */
function entityDisplayName(type: TrashEntityType, row: unknown): string {
    if (!row || typeof row !== 'object') return 'مورد نامشخص';
    // Rows come from the trash table union; they share name/code/title columns.
    const r = row as Record<string, unknown>;
    switch (type) {
        case 'item':
            return `کالای «${r.name}» با کد ${r.code}`;
        case 'seller':
            return `دست‌فروش «${r.name}» با کد ${r.code}`;
        case 'staff':
            return `پرسنل «${r.name}» با کد ${r.code}`;
        case 'expense':
            return `هزینه «${r.title}»`;
        case 'consignment':
            return `واگذاری ${r.code} برای ${r.sellerName} به مبلغ ${r.totalAmount}`;
        default:
            return 'مورد نامشخص';
    }
}

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
    const id = pathParam(req, 'id', 'شناسه مورد');
    const restored = await svc.restoreEntity(type, id);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `${entityDisplayName(type, restored)} بازیابی شد`, req.ip);
    res.json({ message: 'مورد با موفقیت بازیابی شد', restored });
}

export async function editAndRestore(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const patch = (req.body ?? {}) as Record<string, unknown>;
    const restored = await svc.restoreEntity(type, id, patch);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `${entityDisplayName(type, restored)} ویرایش و بازیابی شد`, req.ip);
    res.json({ message: 'مورد ویرایش و بازیابی شد', restored });
}

export async function permanentDelete(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const deleted = await svc.permanentDeleteEntity(type, id);
    logAudit(req.auth ?? null, 'delete', ENTITY_BY_TYPE[type], `${entityDisplayName(type, deleted)} برای همیشه حذف شد`, req.ip);
    res.json({ message: 'مورد برای همیشه حذف شد' });
}
