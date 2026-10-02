import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../inventoryService.js';
import { toItemDto } from '../../../models/mappers.js';
import { recordAudit } from '../../../core/services/auditService.js';
import { requestUserAgent } from '../../../core/utils/requestMeta.js';
import { pathParam } from '../../../core/utils/apiError.js';
import { clientIdSchema } from '../../../schema/clientId.js';

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
    description: z.string().optional(),
    variantPrices: z
        .object({
            sizes: z.record(
                z.string(),
                z.object({
                    costPrice: z.number().min(0).optional(),
                    consignmentPrice: z.number().min(0).optional(),
                    retailPrice: z.number().min(0).optional(),
                }),
            ).optional(),
            colors: z.record(
                z.string(),
                z.object({
                    costPrice: z.number().min(0).optional(),
                    consignmentPrice: z.number().min(0).optional(),
                    retailPrice: z.number().min(0).optional(),
                }),
            ).optional(),
        })
        .optional(),
    // Purchase price in USD, stored with 2 decimals (e.g. 3.24).
    purchasePriceUsd: z.number().min(0).optional(),
    // Workshop unit-cost breakdown in toman (fabric/sewing/accessories/transport/packaging).
    costBreakdown: z
        .object({
            fabric: z.number().min(0),
            sewing: z.number().min(0),
            accessories: z.number().min(0),
            transport: z.number().min(0),
            packaging: z.number().min(0),
        })
        .optional(),
    // 'ready' = sellable; 'pending_production' = order waiting to be made.
    productionStatus: z.enum(['ready', 'pending_production']).optional(),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
});

// P0-B items 11/13: stock is ledger-owned (never writable via updateItem) and
// the made-to-order production flow is retired — wall both off the update DTO.
const updateItemSchema = itemSchema
    .omit({ stockQuantity: true, productionStatus: true })
    .partial();

const createItemSchema = itemSchema.extend({ id: clientIdSchema.optional() });

async function categoryLabelFor(categoryId: string): Promise<string | undefined> {
    const categories = await svc.listCategories();
    return categories.find((c) => c.id === categoryId)?.label;
}

export async function listItems(_req: Request, res: Response): Promise<void> {
    const [rows, categories] = await Promise.all([svc.listItems(), svc.listCategories()]);
    const labelMap = new Map(categories.map((c) => [c.id, c.label]));
    res.json(rows.map((r) => toItemDto(r, labelMap.get(r.category))));
}

export async function createItem(req: Request, res: Response): Promise<void> {
    const data = createItemSchema.parse(req.body);
    const row = await svc.createItem(data, req.auth?.user.id);
    recordAudit({
        actor: req.auth ?? null,
        action: 'create',
        entityType: 'item',
        entityId: row.id,
        details: `کالای «${row.name}» با کد ${row.code} ایجاد شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.status(201).json(toItemDto(row, await categoryLabelFor(row.category)));
}

export async function updateItem(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کالا');
    const data = updateItemSchema.parse(req.body);
    const row = await svc.updateItem(id, data, req.auth?.user.id, {
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });
    recordAudit({
        actor: req.auth ?? null,
        action: 'update',
        entityType: 'item',
        entityId: row.id,
        details: `کالای «${row.name}» ویرایش شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json(toItemDto(row, await categoryLabelFor(row.category)));
}

// --- Production readiness — retired in P0-B (item 13). Kept as a route so
// old clients receive an explicit 410 instead of a 404 from the router. ---

export async function markItemReady(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کالا');
    await svc.markItemReady(id);
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کالا');
    const row = await svc.softDeleteItem(id);
    recordAudit({
        actor: req.auth ?? null,
        action: 'delete',
        entityType: 'item',
        entityId: row.id,
        details: `کالای «${row.name}» با کد ${row.code} به سطل بازیافت منتقل شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json({ message: 'کالا به سطل بازیافت منتقل شد' });
}

// --- Shop channel allocation ---

export async function setShopAllocation(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کالا');
    const { websiteQuantity } = z
        .object({ websiteQuantity: z.number().int().min(0) })
        .parse(req.body);
    const row = await svc.setShopAllocation(id, websiteQuantity, req.auth?.user.id);
    recordAudit({
        actor: req.auth ?? null,
        action: 'update',
        entityType: 'item',
        entityId: row.id,
        details: `تخصیص فروشگاه آنلاین کالای «${row.name}» به ${websiteQuantity} عدد تنظیم شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json(toItemDto(row, await categoryLabelFor(row.category)));
}

// --- Categories ---

export async function listCategories(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listCategories();
    res.json(rows.map((r) => ({ id: r.id, label: r.label })));
}

export async function createCategory(req: Request, res: Response): Promise<void> {
    const body = z.object({ label: z.string().min(1) }).parse(req.body);
    const created = await svc.createCategory(body.label);
    recordAudit({
        actor: req.auth ?? null,
        action: 'create',
        entityType: 'settings',
        entityId: created.id,
        details: `دسته‌بندی «${created.label}» اضافه شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.status(201).json(created);
}
