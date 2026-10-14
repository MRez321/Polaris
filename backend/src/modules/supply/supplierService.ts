import { v4 as uuid } from 'uuid';
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';

import { db } from '../../config/drizzle.js';
import {
    auditLogs,
    financialTransactions,
    purchaseItems,
    purchaseReceipts,
    purchases,
    skus,
    supplierPrices,
    suppliers,
} from '../../schema/index.js';
import { badRequest, notFound } from '../../core/utils/apiError.js';
import { entityActor, recordAudit } from '../../core/services/auditService.js';
// ---------------------------------------------------------------------------
// Supplier service (P0-C): suppliers + append-only price history.
// isActive is a soft toggle; rows are never deleted here (trash owns that).
// ---------------------------------------------------------------------------

export interface SupplierListParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sort?: 'name' | 'code' | 'createdAt';
    dir?: 'asc' | 'desc';
}

export interface SupplierInput {
    code?: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    cooperationTerms?: string;
    paymentTerms?: string;
    paymentDueDays?: number;
    minOrderAmount?: number;
    note?: string;
}

export interface SupplierPriceInput {
    skuId: string;
    unit?: string;
    purchasePrice: number;
    currency?: string;
    effectiveDate?: Date;
    minQuantity?: number;
    notes?: string;
}

const SUPPLIER_SORT_COLUMNS = {
    name: suppliers.name,
    code: suppliers.code,
    createdAt: suppliers.createdAt,
} as const;
type SupplierSortColumn = (typeof SUPPLIER_SORT_COLUMNS)[keyof typeof SUPPLIER_SORT_COLUMNS];
const SUPPLIER_SORT: Record<string, SupplierSortColumn> = SUPPLIER_SORT_COLUMNS;

function genCode(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
        .toString(36)
        .toUpperCase()
        .padStart(2, '0')}`;
}

export async function listSuppliers(params: SupplierListParams): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
    const conds = [isNull(suppliers.deletedAt)];
    if (params.isActive !== undefined) conds.push(eq(suppliers.isActive, params.isActive));
    if (params.search) {
        const q = `%${params.search}%`;
        conds.push(or(like(suppliers.name, q), like(suppliers.code, q), like(suppliers.phone, q))!);
    }
    const where = and(...conds);
    const sortCol = SUPPLIER_SORT[params.sort ?? 'createdAt'] ?? suppliers.createdAt;
    const order = params.dir === 'asc' ? asc(sortCol) : desc(sortCol);
    const [rows, totalRows] = await Promise.all([
        db.select().from(suppliers).where(where).orderBy(order).limit(limit).offset((page - 1) * limit),
        db.select({ n: sql<number>`COUNT(*)` }).from(suppliers).where(where),
    ]);
    const total = Number(totalRows[0]?.n ?? 0);
    return { rows, total };
}

export async function getSupplier(id: string) {
    const rows = await db.select().from(suppliers).where(and(eq(suppliers.id, id), isNull(suppliers.deletedAt)));
    const row = rows[0];
    if (!row) throw notFound('تأمین‌کننده یافت نشد');
    return row;
}

export async function createSupplier(input: SupplierInput, meta: { ip?: string; userAgent?: string }, actorId?: string) {
    if (!input.name || input.name.trim().length === 0) throw badRequest('نام تأمین‌کننده الزامی است');
    if (input.code) {
        const dup = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, input.code));
        if (dup.length > 0) throw badRequest('کد تأمین‌کننده تکراری است');
    }
    const id = uuid();
    const now = new Date();
    const row = {
        id,
        code: input.code ?? genCode('SUP'),
        name: input.name.trim(),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.cooperationTerms !== undefined ? { cooperationTerms: input.cooperationTerms } : {}),
        ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
        ...(input.paymentDueDays !== undefined ? { paymentDueDays: input.paymentDueDays } : {}),
        ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(suppliers).values(row);
    const after = (await db.select().from(suppliers).where(eq(suppliers.id, id)))[0]!;
    recordAudit({
        actor: await entityActor(db, actorId),
        action: 'create',
        entityType: 'supplier',
        entityId: id,
        before: null,
        after,
        details: `تأمین‌کننده ${input.name} ایجاد شد`,
        metadata: { code: row.code, name: input.name },
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    return after;

}
export async function updateSupplier(id: string, input: Partial<SupplierInput>, meta: { ip?: string; userAgent?: string }, actorId?: string) {
    const existing = await getSupplier(id);
    const before = { ...existing };
    if (input.code && input.code !== existing.code) {
        const dup = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, input.code));
        if (dup.length > 0) throw badRequest('کد تأمین‌کننده تکراری است');
    }
    if (input.name !== undefined && input.name.trim().length === 0) throw badRequest('نام تأمین‌کننده نمی‌تواند خالی باشد');
    await db
        .update(suppliers)
        .set({
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.email !== undefined ? { email: input.email } : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.cooperationTerms !== undefined ? { cooperationTerms: input.cooperationTerms } : {}),
            ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
            ...(input.paymentDueDays !== undefined ? { paymentDueDays: input.paymentDueDays } : {}),
            ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id));
    const after = await getSupplier(id);
    recordAudit({
        actor: await entityActor(db, actorId),
        action: 'update',
        entityType: 'supplier',
        entityId: id,
        before,
        after,
        details: 'تأمین‌کننده ویرایش شد',
        metadata: input,
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    return after;
}


export async function setSupplierActive(id: string, active: boolean, meta: { ip?: string; userAgent?: string }, actorId?: string) {
    const before = await getSupplier(id);
    await db.update(suppliers).set({ isActive: active, updatedAt: new Date() }).where(eq(suppliers.id, id));
    const after = await getSupplier(id);
    recordAudit({
        actor: await entityActor(db, actorId),
        action: active ? 'activate' : 'deactivate',
        entityType: 'supplier',
        entityId: id,
        before,
        after,
        details: `تأمین‌کننده ${active ? 'فعال' : 'غیرفععال'} شد`,
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    return after;
}


/** Append-only: a price change inserts a new row, never updates in place. */
export async function appendSupplierPrice(supplierId: string, input: SupplierPriceInput, meta: { ip?: string; userAgent?: string }, actorId?: string) {
    await getSupplier(supplierId);
    if (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0) {
        throw badRequest('قیمت خراب باید صفر یا بیشتر باشد');
    }
    const skuRows = await db.select({ id: skus.id }).from(skus).where(eq(skus.id, input.skuId));
    if (skuRows.length === 0) throw badRequest('کالا (SKU) یافت نشد');
    const id = uuid();
    const now = new Date();
    await db.insert(supplierPrices).values({
        id,
        supplierId,
        skuId: input.skuId,
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        purchasePrice: input.purchasePrice,
        currency: input.currency ?? 'IRT',
        effectiveDate: input.effectiveDate ?? now,
        ...(input.minQuantity !== undefined ? { minQuantity: input.minQuantity } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        createdAt: now,
        updatedAt: now,
    });
    const after = (await db.select().from(supplierPrices).where(eq(supplierPrices.id, id)))[0]!;
    recordAudit({
        actor: await entityActor(db, actorId),
        action: 'create',
        entityType: 'supplier-price',
        entityId: id,
        before: null,
        after,
        details: `قیمت خرید ${Number(input.purchasePrice).toLocaleString('fa-IR')} برای SKU ${input.skuId} ثبت شد`,
        metadata: { supplierId, skuId: input.skuId, purchasePrice: input.purchasePrice },
        ...(meta.ip ? { ip: meta.ip } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    return after;
}


export async function listSupplierPrices(supplierId: string, skuId?: string) {
    await getSupplier(supplierId);
    const conds = [eq(supplierPrices.supplierId, supplierId)];
    if (skuId) conds.push(eq(supplierPrices.skuId, skuId));
    return db
        .select()
        .from(supplierPrices)
        .where(and(...conds))
        .orderBy(desc(supplierPrices.effectiveDate));
}

/** Detail: profile + supplied SKUs + latest prices + history + open orders + receipts + payable + audit excerpt. */
export async function getSupplierDetail(id: string) {
    const profile = await getSupplier(id);

    const priceRows = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.supplierId, id))
        .orderBy(desc(supplierPrices.effectiveDate));
    const latestBySku: Record<string, (typeof priceRows)[number]> = {};
    for (const p of priceRows) {
        if (latestBySku[p.skuId] === undefined) latestBySku[p.skuId] = p;
    }
    const latestPrices = Object.values(latestBySku);

    const orderRows = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.supplierId, id), isNull(purchases.deletedAt)))
        .orderBy(desc(purchases.createdAt));
    const OPEN_ORDER_STATUS: Record<string, true> = { draft: true, ordered: true, confirmed: true, partially_received: true };
    const openOrders = orderRows.filter((o) => OPEN_ORDER_STATUS[o.status] === true);

    const receiptRows = orderRows.length
        ? await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.supplierId, id)).orderBy(desc(purchaseReceipts.receivedDate)).limit(50)
        : [];

    const purchaseIds = orderRows.map((o) => o.id);
    let itemSkuIds: string[] = [];
    if (purchaseIds.length > 0) {
        const skuRows = await db
            .select({ skuId: purchaseItems.skuId })
            .from(purchaseItems)
            .where(inArray(purchaseItems.purchaseId, purchaseIds));
        const seenSku: Record<string, true> = {};
        for (const r of skuRows) {
            seenSku[r.skuId] = true;
        }
        itemSkuIds = Object.keys(seenSku);
    }
    let suppliedSkus: (typeof skus.$inferSelect)[] = [];
    if (itemSkuIds.length > 0) {
        suppliedSkus = await db.select().from(skus).where(inArray(skus.id, itemSkuIds));
    }

    const payableRows = await db
        .select({ amount: financialTransactions.amount, direction: financialTransactions.direction, txnType: financialTransactions.txnType })
        .from(financialTransactions)
        .where(and(eq(financialTransactions.counterpartyType, 'supplier'), eq(financialTransactions.counterpartyId, id)));
    const payableBalance =
        payableRows
            .filter((r) => r.txnType === 'PAYABLE')
            .reduce((s, r) => s + r.direction * Number(r.amount), 0) -
        payableRows.filter((r) => r.txnType === 'PAYMENT').reduce((s, r) => s + Number(r.amount), 0);

    const auditRows = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.entityType, 'supplier'), eq(auditLogs.entityId, id)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);

    return {
        profile,
        suppliedSkus,
        latestPrices,
        priceHistory: priceRows.slice(0, 50),
        purchaseHistory: orderRows.slice(0, 50),
        openOrders,
        receipts: receiptRows,
        payableBalance,
        audit: auditRows,
    };
}
