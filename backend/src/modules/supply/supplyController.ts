import type { Request, Response } from 'express';
import { z } from 'zod';

import * as supplierSvc from './supplierService.js';
import * as purchaseSvc from './purchaseService.js';
import { badRequest, pathParam } from '../../core/utils/apiError.js';
import { requestUserAgent } from '../../core/utils/requestMeta.js';
import { toSupplierDto } from '../../models/mappers.js';
// Zod schemas mirror the service interfaces but are enforced at the API
// boundary (spec: Zod at every boundary, error shape { error: string }).
// Actor id comes from the authenticated session (req.auth), populated by
// attachSession behind requireAuth + requireRole('admin') on the parent mount.

const actor = (req: Request): string | undefined => req.auth?.user.id;

/** Shared request meta for audit logging. */
const requestMeta = (req: Request): { ip?: string; userAgent?: string } => ({
    ip: req.ip,
    userAgent: requestUserAgent(req),
});

const supplierSchema = z.object({
    code: z.string().optional(),
    name: z.string().optional(), // Legacy field
    shopName: z.string().min(1, 'نام فروشگاه تأمین‌کننده الزامی است'),
    contactPersons: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'نام شخص تماس الزامی است'),
        phone: z.string().optional(),
    })).optional(),
    phones: z.array(z.string()).optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    categories: z.array(z.string()).optional(),
    cooperationTerms: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentDueDays: z.number().int().nonnegative().optional(),
    minOrderAmount: z.number().nonnegative().optional(),
    note: z.string().optional(),
    isActive: z.boolean().optional(),
});

const priceSchema = z.object({
    skuId: z.string().min(1, 'کالا (SKU) الزامی است'),
    unit: z.string().optional(),
    purchasePrice: z.number().nonnegative('قیمت خرید باید صفر یا بیشتر باشد'),
    currency: z.string().optional(),
    effectiveDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
    minQuantity: z.number().int().positive().optional(),
    notes: z.string().optional(),
});

const listSuppliersSchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    city: z.string().optional(),
    category: z.string().optional(),
    sort: z.enum(['name', 'shopName', 'code', 'createdAt']).optional(),
    dir: z.enum(['asc', 'desc']).optional(),
});

// --- Suppliers ---

export async function listSuppliers(req: Request, res: Response): Promise<void> {
    const params = listSuppliersSchema.parse(req.query);
    const result = await supplierSvc.listSuppliers({
        ...params,
        isActive: params.isActive === undefined ? undefined : params.isActive === 'true',
    });
    res.json({ rows: result.rows.map(toSupplierDto), total: result.total });
}

export async function getSupplier(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const supplier = await supplierSvc.getSupplier(id);
    res.json(toSupplierDto(supplier));
}

export async function getSupplierDetail(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const detail = await supplierSvc.getSupplierDetail(id);
    const dto = toSupplierDto(detail.profile);
    res.json({ ...dto, suppliedSkus: detail.suppliedSkus, latestPrices: detail.latestPrices, priceHistory: detail.priceHistory, purchaseHistory: detail.purchaseHistory, openOrders: detail.openOrders, receipts: detail.receipts, payableBalance: detail.payableBalance, auditTrail: detail.audit });
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
    const input = supplierSchema.parse(req.body);
    const row = await supplierSvc.createSupplier(input, requestMeta(req), actor(req));
    res.status(201).json(toSupplierDto(row));
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const input = supplierSchema.partial().parse(req.body);
    const row = await supplierSvc.updateSupplier(id, input, requestMeta(req), actor(req));
    res.json(toSupplierDto(row));
}

export async function activateSupplier(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const row = await supplierSvc.setSupplierActive(id, true, requestMeta(req), actor(req));
    res.json(toSupplierDto(row));
}

export async function deactivateSupplier(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const row = await supplierSvc.setSupplierActive(id, false, requestMeta(req), actor(req));
    res.json(toSupplierDto(row));
}

export async function listSupplierPrices(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const prices = await supplierSvc.listSupplierPrices(id, req.query.skuId as string | undefined);
    res.json(prices);
}

export async function addSupplierPrice(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تأمین‌کننده');
    const input = priceSchema.parse(req.body);
    const row = await supplierSvc.appendSupplierPrice(id, input, requestMeta(req), actor(req));
    res.status(201).json(row);
}

// --- Purchase requests ---

const requestSchema = z.object({
    supplierId: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(
        z.object({
            skuId: z.string().min(1, 'شناسه کالا (SKU) الزامی است'),
            quantity: z.number().int().positive('مقدار باید مثبت باشد'),
            unit: z.string().optional(),
            notes: z.string().optional(),
        }),
    ),
});

const listRequestsSchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.string().optional(),
    supplierId: z.string().optional(),
});

export async function listRequests(req: Request, res: Response): Promise<void> {
    const params = listRequestsSchema.parse(req.query);
    const result = await purchaseSvc.listRequests(params);
    res.json(result);
}

export async function getRequest(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه درخواست خرید');
    const row = await purchaseSvc.getRequest(id);
    res.json(row);
}

export async function createRequest(req: Request, res: Response): Promise<void> {
    const input = requestSchema.parse(req.body);
    const row = await purchaseSvc.createRequest(input, actor(req));
    res.status(201).json(row);
}

export async function updateRequest(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه درخواست خرید');
    const input = requestSchema.partial().parse(req.body);
    const row = await purchaseSvc.updateRequest(id, {
        supplierId: input.supplierId ?? null,
        notes: input.notes,
        items: input.items ?? [],
    });
    res.json(row);
}

export async function moveRequest(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه درخواست خرید');
    const action = req.params.action as 'submit' | 'approve' | 'reject' | 'cancel';
    const row = await purchaseSvc.moveRequest(id, action);

    res.json(row);
}
export async function convertRequest(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه درخواست خرید');
    const row = await purchaseSvc.convertRequest(id, req.auth?.user.id);
    res.status(201).json(row);
}

// --- Purchase orders ---

const orderItemSchema = z.object({
    skuId: z.string().min(1),
    quantity: z.number().int().positive('مقدار باید مثبت باشد'),
    unit: z.string().optional(),
    unitCost: z.number().nonnegative('قیمت واحد باید صفر یا بیشتر باشد'),
});

const orderSchema = z.object({
    supplierId: z.string().min(1, 'تأمین‌کننده الزامی است'),
    requestId: z.string().optional(),
    expectedDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
    paymentTerms: z.string().optional(),
    note: z.string().optional(),
    additionalCosts: z.number().nonnegative('هزینه‌های اضافی باید صفر یا بیشتر باشد').optional(),
    items: z.array(orderItemSchema).min(1, 'سفارش خرید باید حداقل یک قلم داشته باشد'),
});

const listOrdersSchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.string().optional(),
    supplierId: z.string().optional(),
});

export async function listOrders(req: Request, res: Response): Promise<void> {
    const params = listOrdersSchema.parse(req.query);
    const result = await purchaseSvc.listOrders(params);
    res.json(result);
}

export async function createOrder(req: Request, res: Response): Promise<void> {
    const input = orderSchema.parse(req.body);
    const row = await purchaseSvc.createOrder(input, requestMeta(req), actor(req));
    res.status(201).json(row);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش خرید');
    const row = await purchaseSvc.getOrder(id);
    res.json(row);
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش خرید');
    const input = z
        .object({
            expectedDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
            paymentTerms: z.string().optional(),
            note: z.string().optional(),
            additionalCosts: z.number().nonnegative().optional(),
            items: z.array(orderItemSchema).optional(),
        })
        .parse(req.body);
    const row = await purchaseSvc.updateOrder(id, input, requestMeta(req), actor(req));
    res.json(row);
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه سفارش خرید');
    const row = await purchaseSvc.cancelOrder(id, requestMeta(req), actor(req));
    res.json(row);
}

// --- Receipts ---

const receiptItemSchema = z.object({
    purchaseItemId: z.string().min(1, 'شناسه قلم سفارش الزامی است'),
    quantity: z.number().int().positive('مقدار دریافتی باید مثبت باشد'),
    unitCost: z.number().nonnegative().optional(),
});

const receiptSchema = z.object({
    warehouseId: z.string().optional(),
    locationId: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(receiptItemSchema).min(1, 'دریافت کالا باید حداقل یک قلم داشته باشد'),
});

export async function listReceipts(req: Request, res: Response): Promise<void> {
    const purchaseId = pathParam(req, 'id', 'شناسه سفارش خرید');
    const rows = await purchaseSvc.getReceiptsForOrder(purchaseId);
    res.json(rows);
}

export async function getReceipt(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه دریافت کالا');
    const row = await purchaseSvc.getReceipt(id);
    res.json(row);
}

export async function createReceipt(req: Request, res: Response): Promise<void> {
    const purchaseId = pathParam(req, 'id', 'شناسه سفارش خرید');
    const input = receiptSchema.parse(req.body);
    const row = await purchaseSvc.createReceipt(purchaseId, input, requestMeta(req), actor(req));
    res.status(201).json(row);
}

// --- Supply costs ---

const costSchema = z.object({
    costType: z.enum(['shipping', 'packaging', 'loading', 'unloading', 'customs', 'commission', 'other']),
    description: z.string().optional(),
    amount: z.number().nonnegative('مبنای هزینه باید صفر یا بیشتر باشد'),
    currency: z.string().optional(),
    costDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
    partyType: z.string().optional(),
    partyId: z.string().optional(),
    allocationMethod: z.enum(['by_value', 'by_quantity']).optional(),
    notes: z.string().optional(),
});

const patchCostSchema = costSchema.partial();

export async function listCosts(req: Request, res: Response): Promise<void> {
    const purchaseId = pathParam(req, 'id', 'شناسه سفارش خرید');
    const rows = await purchaseSvc.listCosts(purchaseId);
    res.json(rows);
}

export async function addCost(req: Request, res: Response): Promise<void> {
    const purchaseId = pathParam(req, 'id', 'شناسه سفارش خرید');
    const input = costSchema.parse(req.body);
    const row = await purchaseSvc.addSupplyCost(purchaseId, input, requestMeta(req), actor(req));
    res.status(201).json(row);
}

export async function updateCost(req: Request, res: Response): Promise<void> {
    const costId = pathParam(req, 'costId', 'شناسه هزینه');
    const input = patchCostSchema.parse(req.body);
    const row = await purchaseSvc.updateCost(costId, input, requestMeta(req), actor(req));
    res.json(row);
}

export async function deleteCost(req: Request, res: Response): Promise<void> {
    const costId = pathParam(req, 'costId', 'شناسه هزینه');
    const result = await purchaseSvc.deleteCost(costId, requestMeta(req), actor(req));
    res.json(result);
}

export async function getLandedCost(req: Request, res: Response): Promise<void> {
    const purchaseId = pathParam(req, 'id', 'شناسه سفارش خرید');
    const order = await purchaseSvc.getOrder(purchaseId);
    res.json({ purchaseId, landedCost: order.landedCost });
}
