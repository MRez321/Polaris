import { z } from 'zod';
import * as svc from '../services/inventoryService.js';
import { toItemDto } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest, pathParam } from '../utils/apiError.js';
const itemSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().min(1),
    category: z.string().min(1),
    categoryLabel: z.string().optional(),
    costPrice: z.number().min(0).optional(),
    consignmentPrice: z.number().min(0).optional(),
    retailPrice: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    minStockThreshold: z.number().int().min(0).optional(),
    sizes: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    fabric: z.string().optional(),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
});
async function categoryLabelFor(categoryId) {
    const categories = await svc.listCategories();
    return categories.find((c) => c.id === categoryId)?.label;
}
export async function listItems(_req, res) {
    const [rows, categories] = await Promise.all([svc.listItems(), svc.listCategories()]);
    const labelMap = new Map(categories.map((c) => [c.id, c.label]));
    res.json(rows.map((r) => toItemDto(r, labelMap.get(r.category))));
}
export async function createItem(req, res) {
    const data = itemSchema.parse(req.body);
    const row = await svc.createItem(data);
    logAudit(req.auth ?? null, 'create', 'item', `کالای «${row.name}» با کد ${row.code} ایجاد شد`);
    res.status(201).json(toItemDto(row, await categoryLabelFor(row.category)));
}
export async function updateItem(req, res) {
    const id = pathParam(req, 'id', 'شناسه کالا');
    const data = itemSchema.partial().parse(req.body);
    const row = await svc.updateItem(id, data);
    logAudit(req.auth ?? null, 'update', 'item', `کالای «${row.name}» ویرایش شد`);
    res.json(toItemDto(row, await categoryLabelFor(row.category)));
}
export async function deleteItem(req, res) {
    const id = pathParam(req, 'id', 'شناسه کالا');
    await svc.softDeleteItem(id);
    logAudit(req.auth ?? null, 'delete', 'item', 'کالا به سطل بازیافت منتقل شد');
    res.json({ message: 'کالا به سطل بازیافت منتقل شد' });
}
// --- Categories ---
export async function listCategories(_req, res) {
    const rows = await svc.listCategories();
    res.json(rows.map((r) => ({ id: r.id, label: r.label })));
}
export async function createCategory(req, res) {
    const body = z.object({ label: z.string().min(1) }).parse(req.body);
    const created = await svc.createCategory(body.label);
    logAudit(req.auth ?? null, 'create', 'settings', `دسته‌بندی «${created.label}» اضافه شد`);
    res.status(201).json(created);
}
//# sourceMappingURL=itemsController.js.map