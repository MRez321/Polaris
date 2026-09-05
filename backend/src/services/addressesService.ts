import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { userAddresses } from '../schema/index.js';
import type { UserAddress } from '../types/index.js';
import { badRequest, notFound } from '../core/utils/apiError.js';

export interface AddressInput {
    label: string;
    receiverName: string;
    phone: string;
    province: string;
    city: string;
    postalCode: string;
    address: string;
    isDefault: boolean;
}

function toDto(row: typeof userAddresses.$inferSelect): UserAddress {
    return {
        id: row.id,
        userId: row.userId,
        label: row.label,
        receiverName: row.receiverName,
        phone: row.phone,
        province: row.province,
        city: row.city,
        postalCode: row.postalCode,
        address: row.address,
        isDefault: row.isDefault,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/** All addresses of one user; the default (if any) sorts first. */
export async function listAddresses(userId: string): Promise<UserAddress[]> {
    const rows = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(desc(userAddresses.isDefault), asc(userAddresses.createdAt));
    return rows.map(toDto);
}

/** Creates an address. If marked default, clears the previous default in the same transaction. */
export async function createAddress(userId: string, input: AddressInput): Promise<UserAddress> {
    return db.transaction(async (tx) => {
        if (input.isDefault) {
            await tx
                .update(userAddresses)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(eq(userAddresses.userId, userId));
        }
        // First address of a user automatically becomes the default so
        // checkout prefill has something to work with.
        const existing = await tx
            .select({ id: userAddresses.id })
            .from(userAddresses)
            .where(eq(userAddresses.userId, userId))
            .limit(1);
        const isDefault = input.isDefault || existing.length === 0;

        const id = uuid();
        await tx.insert(userAddresses).values({
            id,
            userId,
            label: input.label,
            receiverName: input.receiverName,
            phone: input.phone,
            province: input.province,
            city: input.city,
            postalCode: input.postalCode,
            address: input.address,
            isDefault,
        });
        const created = await tx.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1);
        return toDto(created[0]!);
    });
}

/** Updates one of the user's own addresses (ownership enforced by userId in the where clause). */
export async function updateAddress(userId: string, id: string, input: AddressInput): Promise<UserAddress> {
    return db.transaction(async (tx) => {
        const rows = await tx
            .select()
            .from(userAddresses)
            .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
            .for('update');
        if (!rows[0]) throw notFound('آدرس یافت نشد');

        if (input.isDefault) {
            await tx
                .update(userAddresses)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(and(eq(userAddresses.userId, userId), ne(userAddresses.id, id)));
        }

        await tx
            .update(userAddresses)
            .set({
                label: input.label,
                receiverName: input.receiverName,
                phone: input.phone,
                province: input.province,
                city: input.city,
                postalCode: input.postalCode,
                address: input.address,
                isDefault: input.isDefault,
                updatedAt: new Date(),
            })
            .where(eq(userAddresses.id, id));
        const updated = await tx.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1);
        return toDto(updated[0]!);
    });
}

/** Deletes one of the user's own addresses. */
export async function deleteAddress(userId: string, id: string): Promise<void> {
    const rows = await db
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
        .limit(1);
    if (!rows[0]) throw notFound('آدرس یافت نشد');
    const target = rows[0];
    await db.delete(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
    // Deleting the default must not leave the account default-less: promote
    // the newest remaining address so checkout always has a prefill.
    const remaining = await db
        .select({ id: userAddresses.id, isDefault: userAddresses.isDefault })
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(desc(userAddresses.createdAt));
    if (remaining.length > 0 && !remaining.some((r) => r.isDefault)) {
        await db
            .update(userAddresses)
            .set({ isDefault: true })
            .where(eq(userAddresses.id, remaining[0]!.id));
    }
}

/** Guards against empty rows not seen by zod min() on optional fields. */
export function assertAddressInput(input: AddressInput): void {
    if (!input.receiverName.trim()) throw badRequest('نام گیرنده الزامی است');
    if (!input.address.trim() || input.address.trim().length < 5) throw badRequest('نشانی کامل را وارد کنید');
}
