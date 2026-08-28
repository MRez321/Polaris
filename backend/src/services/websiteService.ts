import { eq } from 'drizzle-orm';

import { db } from '../config/drizzle.js';
import { websiteSettings } from '../schema/index.js';
import type { WebsiteSettings } from '../types/index.js';

const SETTINGS_ROW_ID = 'website';

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
    enabled: false,
    siteTitle: '',
    description: '',
    showPrices: true,
    showOutOfStock: true,
};

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
    const rows = await db.select().from(websiteSettings).where(eq(websiteSettings.id, SETTINGS_ROW_ID));
    const stored = (rows[0]?.data ?? {}) as Partial<WebsiteSettings>;
    return { ...DEFAULT_WEBSITE_SETTINGS, ...stored };
}

export async function updateWebsiteSettings(patch: Partial<WebsiteSettings>): Promise<WebsiteSettings> {
    const merged: WebsiteSettings = { ...(await getWebsiteSettings()), ...patch };
    const existing = await db
        .select({ id: websiteSettings.id })
        .from(websiteSettings)
        .where(eq(websiteSettings.id, SETTINGS_ROW_ID));
    if (existing[0]) {
        await db
            .update(websiteSettings)
            .set({ data: merged as unknown as Record<string, unknown>, updatedAt: new Date() })
            .where(eq(websiteSettings.id, SETTINGS_ROW_ID));
    } else {
        await db.insert(websiteSettings).values({
            id: SETTINGS_ROW_ID,
            data: merged as unknown as Record<string, unknown>,
        });
    }
    return merged;
}
