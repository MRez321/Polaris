import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { companySettings, owners } from '../schema/index.js';
import type { CompanyBranding, Owner } from '../types/index.js';

const SETTINGS_ROW_ID = 'company';

export const DEFAULT_COMPANY: CompanyBranding = {
    name: '',
    slogan: '',
    website: '',
    instagram: '',
    telegram: '',
    address: '',
    postalCode: '',
    phone: '',
    emergencyPhone: '',
    registrationNumber: '',
    brandName: '',
    tagline: '',
    workshopAddress: '',
    workshopPhone: '',
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
