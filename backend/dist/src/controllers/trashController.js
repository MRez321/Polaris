import * as svc from '../services/inventoryService.js';
import { toItemDto, toSellerDto, toStaffDto, toExpenseDto, toConsignmentDto, } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest, pathParam } from '../utils/apiError.js';
const TRASH_TYPES = ['item', 'seller', 'staff', 'expense', 'consignment'];
function parseType(raw) {
    if (typeof raw !== 'string' || !TRASH_TYPES.includes(raw)) {
        throw badRequest('نوع موجودیت نامعتبر است');
    }
    return raw;
}
const ENTITY_BY_TYPE = {
    item: 'item',
    seller: 'seller',
    staff: 'staff',
    expense: 'cost',
    consignment: 'consignment',
};
export async function listTrash(_req, res) {
    const t = await svc.listTrash();
    res.json({
        items: t.deletedItems.map((r) => toItemDto(r)),
        sellers: t.deletedSellers.map(toSellerDto),
        staff: t.deletedStaff.map(toStaffDto),
        expenses: t.deletedExpenses.map(toExpenseDto),
        consignments: t.deletedConsignments.map(toConsignmentDto),
    });
}
export async function restoreEntity(req, res) {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const restored = await svc.restoreEntity(type, id);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `مورد حذف‌شده (${type}) بازیابی شد`);
    res.json({ message: 'مورد با موفقیت بازیابی شد', restored });
}
export async function editAndRestore(req, res) {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    const patch = (req.body ?? {});
    const restored = await svc.restoreEntity(type, id, patch);
    logAudit(req.auth ?? null, 'update', ENTITY_BY_TYPE[type], `مورد حذف‌شده (${type}) ویرایش و بازیابی شد`);
    res.json({ message: 'مورد ویرایش و بازیابی شد', restored });
}
export async function permanentDelete(req, res) {
    const type = parseType(req.params.type);
    const id = pathParam(req, 'id', 'شناسه مورد');
    await svc.permanentDeleteEntity(type, id);
    logAudit(req.auth ?? null, 'delete', ENTITY_BY_TYPE[type], `مورد (${type}) برای همیشه حذف شد`);
    res.json({ message: 'مورد برای همیشه حذف شد' });
}
//# sourceMappingURL=trashController.js.map