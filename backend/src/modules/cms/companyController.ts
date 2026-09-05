import type { Request, Response } from 'express';
import { z } from 'zod';

import { getCompany, updateCompany } from './services/settingsService.js';
import { logAudit } from '../../core/services/auditService.js';

const hexColor = z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .refine((s) => /^#[0-9a-f]{6}$/.test(s), { message: 'رنگ باید به قالب #rrggbb باشد' });

const themeSchema = z
    .object({
        defaultMode: z.enum(['dark', 'light']),
        palette: z.discriminatedUnion('type', [
            z.object({ type: z.literal('default') }),
            z.object({ type: z.literal('custom'), primary: hexColor }),
        ]),
    })
    .strict();

const companySchema = z.object({
    name: z.string().optional(),
    slogan: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    telegram: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    emergencyPhone: z.string().optional(),
    registrationNumber: z.string().optional(),
    logoUrl: z.string().optional(),
    logoText: z.string().optional(),
    brandName: z.string().optional(),
    tagline: z.string().optional(),
    workshopAddress: z.string().optional(),
    workshopPhone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    establishedYear: z.string().optional(),
    theme: themeSchema.optional(),
});

export async function getCompanyBranding(_req: Request, res: Response): Promise<void> {
    res.json(await getCompany());
}

export async function updateCompanyBranding(req: Request, res: Response): Promise<void> {
    const patch = companySchema.parse(req.body);
    const updated = await updateCompany(patch);
    logAudit(req.auth ?? null, 'update', 'settings', 'اطلاعات برند و کارگاه به‌روزرسانی شد', req.ip);
    res.json(updated);
}
