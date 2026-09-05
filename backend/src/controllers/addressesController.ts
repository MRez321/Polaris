import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/addressesService.js';

const addressSchema = z.object({
    label: z.string().max(64, 'عنوان آدرس حداکثر ۶۴ نویسه است').optional().default(''),
    receiverName: z.string().min(1, 'نام گیرنده الزامی است'),
    phone: z
        .string()
        .regex(/^0\d{10}$/, 'شماره تماس باید ۱۱ رقم و با ۰ شروع شود')
        .transform((v) => v.trim()),
    province: z.string().min(1, 'استان را انتخاب کنید'),
    city: z.string().min(1, 'شهر را وارد کنید'),
    postalCode: z
        .string()
        .regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد')
        .optional()
        .default(''),
    address: z.string().min(5, 'نشانی کامل را وارد کنید'),
    isDefault: z.boolean().optional().default(false),
});

/** Authenticated user: list own address book. */
export async function listMyAddresses(req: Request, res: Response): Promise<void> {
    res.json(await svc.listAddresses(req.auth!.user.id));
}

/** Authenticated user: add an address. */
export async function createAddress(req: Request, res: Response): Promise<void> {
    const data = addressSchema.parse(req.body);
    const created = await svc.createAddress(req.auth!.user.id, {
        label: data.label.trim(),
        receiverName: data.receiverName.trim(),
        phone: data.phone,
        province: data.province.trim(),
        city: data.city.trim(),
        postalCode: data.postalCode.trim(),
        address: data.address.trim(),
        isDefault: data.isDefault,
    });
    res.status(201).json(created);
}

/** Authenticated user: edit one of own addresses. */
export async function updateAddress(req: Request, res: Response): Promise<void> {
    const data = addressSchema.parse(req.body);
    const updated = await svc.updateAddress(req.auth!.user.id, String(req.params.id), {
        label: data.label.trim(),
        receiverName: data.receiverName.trim(),
        phone: data.phone,
        province: data.province.trim(),
        city: data.city.trim(),
        postalCode: data.postalCode.trim(),
        address: data.address.trim(),
        isDefault: data.isDefault,
    });
    res.json(updated);
}

/** Authenticated user: remove one of own addresses. */
export async function deleteAddress(req: Request, res: Response): Promise<void> {
    await svc.deleteAddress(req.auth!.user.id, String(req.params.id));
    res.status(204).end();
}
