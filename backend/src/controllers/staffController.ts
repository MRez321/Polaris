import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/inventoryService.js';
import { getOwners, setOwners } from '../services/settingsService.js';
import { toStaffDto } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest } from '../utils/apiError.js';

const bankAccountSchema = z.object({
    id: z.string().optional(),
    bankName: z.string(),
    accountNumber: z.string().optional(),
    cardNumber: z.string(),
    shebaNumber: z.string(),
    payaNumber: z.string().optional(),
    accountHolder: z.string().optional(),
});

const activitySchema = z.object({
    id: z.string(),
    date: z.string(),
    title: z.string(),
    type: z.enum(['task', 'handover', 'payment', 'attendance', 'note']),
    description: z.string(),
});

const staffSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().min(1),
    role: z.string().min(1),
    roleTitle: z.string().optional(),
    phones: z.array(z.string()).optional(),
    nationalCode: z.string().optional(),
    hireDate: z.string().optional(),
    salaryType: z.enum(['monthly', 'piecework', 'hourly']).optional(),
    salaryAmount: z.number().min(0).optional(),
    bankAccounts: z.array(bankAccountSchema).optional(),
    avatarUrl: z.string().optional(),
    status: z.enum(['active', 'leave', 'inactive']).optional(),
    notes: z.string().optional(),
    resumeUrl: z.string().optional(),
    resumeAttachmentName: z.string().optional(),
    resumeAttachmentData: z.string().optional(),
    tasksCompletedCount: z.number().int().min(0).optional(),
    activityHistory: z.array(activitySchema).optional(),
});

export async function listStaff(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listStaff();
    res.json(rows.map(toStaffDto));
}

export async function createStaff(req: Request, res: Response): Promise<void> {
    const data = staffSchema.parse(req.body);
    const row = await svc.createStaff(data);
    logAudit(req.auth ?? null, 'create', 'staff', `پرسنل «${row.name}» با کد ${row.code} اضافه شد`);
    res.status(201).json(toStaffDto(row));
}

export async function updateStaff(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    if (!id) throw badRequest('شناسه پرسنل الزامی است');
    const data = staffSchema.partial().parse(req.body);
    const row = await svc.updateStaff(id, data);
    logAudit(req.auth ?? null, 'update', 'staff', `پرسنل «${row.name}» ویرایش شد`);
    res.json(toStaffDto(row));
}

export async function deleteStaff(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    if (!id) throw badRequest('شناسه پرسنل الزامی است');
    await svc.softDeleteStaff(id);
    logAudit(req.auth ?? null, 'delete', 'staff', 'پرسنل به سطل بازیافت منتقل شد');
    res.json({ message: 'پرسنل به سطل بازیافت منتقل شد' });
}

// --- Owners ---

const ownerSchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    sharePercentage: z.number(),
    sharesCount: z.number().optional(),
    nationalCode: z.string(),
    phones: z.array(z.string()),
    email: z.string().optional(),
    bankAccounts: z.array(bankAccountSchema),
    avatarUrl: z.string().optional(),
    bio: z.string().optional(),
    isDeleted: z.boolean().optional(),
    deletedAt: z.string().optional(),
});

export async function listOwners(_req: Request, res: Response): Promise<void> {
    const rows = await getOwners();
    res.json(rows.filter((o) => !o.isDeleted));
}

export async function updateOwners(req: Request, res: Response): Promise<void> {
    const body = z.object({ owners: z.array(ownerSchema) }).parse(req.body);
    const saved = await setOwners(body.owners);
    logAudit(req.auth ?? null, 'update', 'settings', `لیست شرکا به‌روزرسانی شد (${saved.length} نفر)`);
    res.json({ message: 'لیست شرکا ذخیره شد' });
}
