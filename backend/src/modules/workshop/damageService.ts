/**
 * Damage/returns tracking service. Damaged goods arrive from any source —
 * street sellers, end customers, provider loads, or in-process damage — and
 * are tracked until repaired ('fixed', quantity back in warehouse stock),
 * discarded ('disposed'), or soft-deleted.
 */
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../config/drizzle.js';
import { damageRecords, items } from '../../schema/index.js';
import { badRequest, notFound } from '../../core/utils/apiError.js';
import { nextCode } from '../../core/utils/code.js';
import { emitDataChanged } from '../../core/services/socketService.js';

export type DamageSource = 'seller' | 'customer' | 'provider' | 'process';
export type DamageStatus = 'damaged' | 'fixed' | 'disposed';

export async function listDamageRecords(includeDeleted = false) {
    const rows = includeDeleted
        ? await db.select().from(damageRecords).orderBy(desc(damageRecords.reportedAt))
        : await db
              .select()
              .from(damageRecords)
              .where(eq(damageRecords.isDeleted, false))
              .orderBy(desc(damageRecords.reportedAt));
    return rows;
}

export async function createDamageRecord(data: {
    itemId: string;
    source: DamageSource;
    quantity: number;
    sourceName?: string;
    selectedSize?: string;
    selectedColor?: string;
    damageReason?: string;
    currentLocation?: string;
    reportedBy?: string;
    notes?: string;
}) {
    if (!data.itemId) throw badRequest('کالا برای ثبت خرابی الزامی است');

    const [item] = await db.select().from(items).where(eq(items.id, data.itemId));
    if (!item) throw badRequest('کالای انتخاب‌شده یافت نشد');

    const existing = await db.select({ code: damageRecords.code }).from(damageRecords);
    const id = uuid();
    await db.insert(damageRecords).values({
        id,
        code: nextCode('DMG', existing.map((c) => c.code)),
        itemId: data.itemId,
        itemName: item.name,
        itemCode: item.code,
        source: data.source,
        sourceName: data.sourceName ?? '',
        quantity: data.quantity,
        ...(data.selectedSize !== undefined ? { selectedSize: data.selectedSize } : {}),
        ...(data.selectedColor !== undefined ? { selectedColor: data.selectedColor } : {}),
        status: 'damaged',
        ...(data.damageReason !== undefined ? { damageReason: data.damageReason } : {}),
        currentLocation: data.currentLocation ?? '',
        reportedBy: data.reportedBy ?? '',
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
    const [created] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    emitDataChanged('damage', 'create');
    return created!;
}

export async function updateDamageRecord(
    id: string,
    data: {
        source?: DamageSource;
        sourceName?: string;
        quantity?: number;
        damageReason?: string;
        currentLocation?: string;
        status?: DamageStatus;
        notes?: string;
    },
) {
    const [existing] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    if (!existing || existing.isDeleted) throw notFound('رکورد خرابی یافت نشد');

    // A fixed record can only be edited while still unfixed.
    if (existing.status === 'fixed' && data.status && data.status !== 'fixed') {
        throw badRequest('رکورد ترمیم‌شده قابل ویرایش نیست');
    }

    await db
        .update(damageRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(damageRecords.id, id));
    const [updated] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    emitDataChanged('damage', 'update');
    return updated!;
}

/**
 * Marks a damage record as repaired and returns the quantity to warehouse
 * stock (items.stockQuantity). Runs in a transaction so the record and the
 * stock bump can never diverge.
 */
export async function fixDamageRecord(id: string, fixedBy?: string) {
    const updated = await db.transaction(async (tx) => {
        const rows = await tx
            .select()
            .from(damageRecords)
            .where(and(eq(damageRecords.id, id), eq(damageRecords.isDeleted, false)))
            .for('update');
        const record = rows[0];
        if (!record) throw notFound('رکورد خرابی یافت نشد');
        if (record.status !== 'damaged') {
            throw badRequest('این رکورد قبلاً ترمیم یا حذف شده است');
        }

        await tx
            .update(damageRecords)
            .set({ status: 'fixed', fixedAt: new Date(), fixedBy: fixedBy ?? '', updatedAt: new Date() })
            .where(eq(damageRecords.id, id));

        const itemRows = await tx.select().from(items).where(eq(items.id, record.itemId)).for('update');
        const item = itemRows[0];
        if (item) {
            await tx
                .update(items)
                .set({ stockQuantity: item.stockQuantity + record.quantity, updatedAt: new Date() })
                .where(eq(items.id, item.id));
        }
        return (await tx.select().from(damageRecords).where(eq(damageRecords.id, id)))[0]!;
    });

    emitDataChanged('damage', 'update');
    emitDataChanged('item', 'update');
    return updated;
}

/**
 * Marks a damage record as disposed (written off). The damaged units are
 * discarded and do NOT re-enter stock.
 */
export async function disposeDamageRecord(id: string) {
    const [existing] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    if (!existing || existing.isDeleted) throw notFound('رکورد خرابی یافت نشد');
    if (existing.status !== 'damaged') {
        throw badRequest('این رکورد قبلاً ترمیم یا حذف شده است');
    }
    await db
        .update(damageRecords)
        .set({ status: 'disposed', updatedAt: new Date() })
        .where(eq(damageRecords.id, id));
    const [updated] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    emitDataChanged('damage', 'update');
    return updated!;
}

export async function softDeleteDamageRecord(id: string) {
    const [existing] = await db.select().from(damageRecords).where(eq(damageRecords.id, id));
    if (!existing) throw notFound('رکورد خرابی یافت نشد');
    await db
        .update(damageRecords)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(damageRecords.id, id));
    emitDataChanged('damage', 'delete');
    return existing;
}
