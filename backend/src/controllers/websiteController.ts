import type { Request, Response } from 'express';
import { z } from 'zod';

import { getWebsiteSettings, updateWebsiteSettings } from '../services/websiteService.js';
import { logAudit } from '../services/auditService.js';

const websiteSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    siteTitle: z.string().optional(),
    description: z.string().optional(),
    showPrices: z.boolean().optional(),
    showOutOfStock: z.boolean().optional(),
});

export async function getWebsite(_req: Request, res: Response): Promise<void> {
    res.json(await getWebsiteSettings());
}

export async function updateWebsite(req: Request, res: Response): Promise<void> {
    const patch = websiteSettingsSchema.parse(req.body);
    const updated = await updateWebsiteSettings(patch);
    logAudit(req.auth ?? null, 'update', 'settings', 'تنظیمات وب‌سایت عمومی به‌روزرسانی شد', req.ip);
    res.json(updated);
}
