import type { Request, Response } from 'express';
import { z } from 'zod';

import { getWebsiteSettings, updateWebsiteSettings } from './services/websiteService.js';
import { recordAudit } from '../../core/services/auditService.js';
import { requestUserAgent } from '../../core/utils/requestMeta.js';

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
    recordAudit({
        actor: req.auth ?? null,
        action: 'update',
        entityType: 'settings',
        details: 'تنظیمات وب‌سایت عمومی به‌روزرسانی شد',
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });

    res.json(updated);
}
