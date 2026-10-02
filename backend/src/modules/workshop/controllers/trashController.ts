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
import { recordAudit } from '../../../core/services/auditService.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';
import { badRequest, pathParam } from '../../../core/utils/apiError.js';

const TRASH_TYPES: readonly TrashEntityType[] = ['item', 'seller', 'staff', 'expense', 'consignment'];

function parseType(raw: string | string[] | undefined): TrashEntityType {
    if (typeof raw !== 'string' || !TRASH_TYPES.includes(raw as TrashEntityType)) {
        throw badRequest('نوع موجودیت نامعتبر است');
    }
    return raw as TrashEntityType;
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
    // P0-B item 27: the service layer emits the 'restore' audit row with
    // before/after snapshots inside its transaction; the controller only
    // forwards request metadata.
    const restored = await svc.restoreEntity(type, id, undefined, req.auth?.user.id, {
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json({ message: 'مورد با موفقیت بازیابی شد', restored });
}

export async function editAndRestore(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const patch = (req.body ?? {}) as Record<string, unknown>;
    const restored = await svc.restoreEntity(type, id, patch, req.auth?.user.id, {
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json({ message: 'مورد ویرایش و بازیابی شد', restored });
}

export async function permanentDelete(req: Request, res: Response): Promise<void> {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const result = await svc.permanentDeleteEntity(type, id, req.auth?.user.id, {
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });
    // Archived rows were already audited (action 'archive' with before/after)
    // by the service inside its transaction; only true hard-deletes need the
    // controller's 'delete' row.
    if (!result.archived) {
        recordAudit({
            actor: req.auth ?? null,
            action: 'delete',
            entityType: svc.TRASH_ENTITY_TYPE[type],
            entityId: id,
            details: `${svc.entityDisplayName(type, result.row)} برای همیشه حذف شد`,
            ip: req.ip,
            userAgent: requestUserAgent(req),
        });
    }

    res.json({
        message: result.archived
            ? 'این مورد فقط بایگانی میشود؛ رکورد مالی آن حفظ شده است'
            : 'مورد برای همیشه حذف شد',
    });
}
