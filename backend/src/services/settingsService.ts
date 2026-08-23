import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { companySettings, owners } from '../schema/index.js';
import type { CompanyBranding, Owner } from '../types/index.js';

const SETTINGS_ROW_ID = 'company';

export const DEFAULT_COMPANY: CompanyBranding = {
    name: 'کارگاه دوزندگی و تولیدی پولاریس استایل',
    slogan: 'تولیدکننده تخصصی پوشاک زمستانه، پالتو و کاپشن‌های راسته بازار',
    website: 'https://polaris-style.ir',
    instagram: '@polaris_style_clothing',
    telegram: 't.me/polaris_style',
    address: 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸',
    postalCode: '۱۱۹۳۶۴۸۲۹۱',
    phone: '02155667788',
    emergencyPhone: '09121112233',
    registrationNumber: '۵۸۹۴۲۱',
    brandName: 'پولاریس استایل',
    tagline: 'تولیدکننده تخصصی پوشاک زمستانه',
    workshopAddress: 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸',
    workshopPhone: '02155667788',
    owners: [],
};

export async function getCompany(): Promise<CompanyBranding> {
    const rows = await db.select().from(companySettings).where(eq(companySettings.id, SETTINGS_ROW_ID));
    const row = rows[0];
    const stored = (row?.data ?? {}) as Partial<CompanyBranding>;
    const ownerRows = await db.select().from(owners);
    const ownerRow = ownerRows[0];
    const ownerList = (ownerRow?.data ?? []).filter((o) => !o.isDeleted) as Owner[];
    return { ...DEFAULT_COMPANY, ...stored, owners: ownerList };
}

export async function updateCompany(patch: Partial<CompanyBranding>): Promise<CompanyBranding> {
    const current = await getCompany();
    // `owners` is managed through /api/owners; ignore it here.
    const { owners: _ignored, ...fields } = patch;
    const merged: CompanyBranding = { ...current, ...fields, owners: current.owners };
    const existing = await db.select({ id: companySettings.id }).from(companySettings).where(eq(companySettings.id, SETTINGS_ROW_ID));
    if (existing[0]) {
        await db
            .update(companySettings)
            .set({ data: merged as unknown as Record<string, unknown>, updatedAt: new Date() })
            .where(eq(companySettings.id, SETTINGS_ROW_ID));
    } else {
        await db.insert(companySettings).values({
            id: SETTINGS_ROW_ID,
            data: merged as unknown as Record<string, unknown>,
        });
    }
    return merged;
}

export async function getOwners(): Promise<Owner[]> {
    const rows = await db.select().from(owners);
    const row = rows[0];
    return (row?.data ?? []) as Owner[];
}

export async function setOwners(list: Owner[]): Promise<Owner[]> {
    const existing = await db.select({ id: owners.id }).from(owners);
    const row = existing[0];
    if (row) {
        await db.update(owners).set({ data: list, updatedAt: new Date() }).where(eq(owners.id, row.id));
    } else {
        await db.insert(owners).values({ id: uuid(), data: list });
    }
    return list;
}
