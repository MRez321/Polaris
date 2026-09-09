import { and, desc, eq, lt, ne, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { consignments, items, workshopNotifications } from '../../../schema/index.js';
import type { WorkshopNotification } from '../../../types/index.js';
import { notFound } from '../../../core/utils/apiError.js';

// ---------------------------------------------------------------------------
// In-app notification feed (workshop header bell).
//
// Two sources merge into one chronologically sorted list:
//  1. Stored event rows written at business touch points (payment recorded,
//     handover created, stock transitions, settings change, login).
//  2. Derived notifications computed live on every read (overdue
//     consignments, near-due consignments, low/zero stock, pending
//     deliveries). Their "read" state persists as marker rows
//     (entityType='derived_marker', entityId='overdue:HND-0007' style) so a
//     state can be dismissed until it actually clears.

export type DerivedNotification = {
    key: string;
    type: WorkshopNotification['type'];
    title: string;
    body?: string;
    link?: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
};

const DAY_MS = 24 * 3600 * 1000;
/** Stored events older than this are purged on every read. */
const RETENTION_DAYS = 30;

/** Live-state notifications, computed fresh on every read. */
async function loadDerived(): Promise<DerivedNotification[]> {
    const [activeConsignments, activeItems] = await Promise.all([
        db.select().from(consignments).where(eq(consignments.isDeleted, false)),
        db.select().from(items).where(eq(items.isDeleted, false)),
    ]);

    const now = Date.now();
    const derived: DerivedNotification[] = [];
    const base = { entityType: 'derived', createdAt: new Date(now) };

    for (const c of activeConsignments) {
        const code = c.code;
        const dueMs = c.dueDate.getTime();
        // Pending deliveries carry no running countdown, so they can never
        // be overdue; the countdown starts at delivery.
        if (c.deliveryStatus === 'delivered' && c.status !== 'settled') {
            if (dueMs < now) {
                derived.push({
                    ...base,
                    key: `overdue:${c.id}`,
                    type: 'critical',
                    title: `فاکتور ${code} سررسید گذشته`,
                    body: `بدهی باقیمانده واگذاری ${code} برای ${c.sellerName} سررسید گذشته است`,
                    link: '/workshop/consignments',
                    entityId: `overdue:${c.id}`,
                });
            } else if (dueMs - now <= 3 * DAY_MS) {
                derived.push({
                    ...base,
                    key: `due-soon:${c.id}`,
                    type: 'need_action',
                    title: `فاکتور ${code} نزدیک سررسید`,
                    body: `سررسید واگذاری ${code} برای ${c.sellerName} نزدیک است`,
                    link: '/workshop/consignments',
                    entityId: `due-soon:${c.id}`,
                });
            }
        }
        if (c.deliveryStatus === 'pending') {
            derived.push({
                ...base,
                key: `pending-delivery:${c.id}`,
                type: 'need_action',
                title: `حواله ${code} در انتظار تحویل`,
                body: `بار واگذاری ${code} به ${c.sellerName} باید تحویل شود`,
                link: '/workshop/consignments',
                entityId: `pending-delivery:${c.id}`,
            });
        }
    }

    for (const i of activeItems) {
        if (i.stockQuantity === 0) {
            derived.push({
                ...base,
                key: `stock-zero:${i.id}`,
                type: 'critical',
                title: `موجودی ${i.name} صفر است`,
                body: `موجودی کالای «${i.name}» (${i.code}) به صفر رسیده است`,
                link: '/workshop/inventory',
                entityId: `stock-zero:${i.id}`,
            });
        } else if (i.stockQuantity <= i.minStockThreshold) {
            derived.push({
                ...base,
                key: `stock-low:${i.id}`,
                type: 'need_action',
                title: `موجودی ${i.name} کم است`,
                body: `موجودی کالای «${i.name}» (${i.code}) به ${i.stockQuantity} رسیده است`,
                link: '/workshop/inventory',
                entityId: `stock-low:${i.id}`,
            });
        }
    }

    return derived;
}

function toDto(row: typeof workshopNotifications.$inferSelect): WorkshopNotification {
    return {
        id: row.id,
        type: (row.type as WorkshopNotification['type']) ?? undefined,
        title: row.title ?? '',
        body: row.body ?? undefined,
        entityType: row.entityType,
        entityId: row.entityId,
        link: row.link ?? undefined,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
    };
}

export async function listNotifications(): Promise<{ notifications: WorkshopNotification[]; unreadCount: number }> {
    // Housekeeping: purge stored events older than the retention window.
    // Derived notifications are computed fresh each read and never stored.
    await db
        .delete(workshopNotifications)
        .where(
            and(
                ne(workshopNotifications.entityType, 'derived_marker'),
                lt(workshopNotifications.createdAt, new Date(Date.now() - RETENTION_DAYS * DAY_MS)),
            ),
        );

    const [storedRows, derived] = await Promise.all([
        db.select().from(workshopNotifications).orderBy(desc(workshopNotifications.createdAt)),
        loadDerived(),
    ]);
    const markers = new Set(storedRows.filter((r) => r.entityType === 'derived_marker').map((r) => r.entityId));

    const stored = storedRows.filter((r) => r.entityType !== 'derived_marker').map(toDto);
    const derivedDtos: WorkshopNotification[] = derived.map((d) => ({
        id: `derived:${d.key}`,
        type: d.type,
        title: d.title,
        body: d.body,
        entityType: 'derived',
        entityId: d.key,
        link: d.link,
        createdAt: d.createdAt.toISOString(),
        // A marker row with readAt set means this live state was dismissed.
        readAt: markers.has(d.key) ? new Date().toISOString() : null,
    }));

    const notifications = [...stored, ...derivedDtos].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const unreadCount = notifications.filter((n) => !n.readAt).length;
    return { notifications, unreadCount };
}

export async function markNotificationRead(id: string): Promise<void> {
    // Derived ids carry the state key after the 'derived:' prefix.
    if (id.startsWith('derived:')) {
        await db
            .insert(workshopNotifications)
            .values({ id: uuid(), entityType: 'derived_marker', entityId: id.slice('derived:'.length) })
            .onDuplicateKeyUpdate({ set: { entityId: id.slice('derived:'.length) } });
        return;
    }
    const rows = await db.select().from(workshopNotifications).where(eq(workshopNotifications.id, id));
    const row = rows[0];
    if (!row) throw notFound('اعلان یافت نشد');
    if (row.readAt) return;
    await db
        .update(workshopNotifications)
        .set({ readAt: new Date() })
        .where(eq(workshopNotifications.id, id));
}

export async function markAllNotificationsRead(): Promise<void> {
    const now = new Date();
    // Mark every stored event read…
    await db
        .update(workshopNotifications)
        .set({ readAt: now })
        .where(
            and(
                ne(workshopNotifications.entityType, 'derived_marker'),
                sql`${workshopNotifications.readAt} IS NULL`,
            ),
        );
    // …and every currently-live derived state.
    const derived = await loadDerived();
    if (derived.length > 0) {
        await db
            .insert(workshopNotifications)
            .values(derived.map((d) => ({ id: uuid(), entityType: 'derived_marker', entityId: d.key })))
            .onDuplicateKeyUpdate({ set: { entityType: 'derived_marker' } });
    }
}

export interface RecordEventInput {
    type: 'critical' | 'need_action' | 'notification' | 'system';
    title: string;
    body?: string;
    entityType: string;
    entityId: string;
    link?: string;
}

/**
 * Fire-and-forget event write for business touch points. Mirrors logAudit:
 * failures are logged, never thrown — the feed must not break operations.
 */
export function recordWorkshopEvent(input: RecordEventInput): void {
    void db
        .insert(workshopNotifications)
        .values({
            id: uuid(),
            type: input.type,
            title: input.title,
            ...(input.body !== undefined ? { body: input.body } : {}),
            entityType: input.entityType,
            entityId: input.entityId,
            ...(input.link !== undefined ? { link: input.link } : {}),
        })
        .catch((err: unknown) => {
            console.error('⚠️ Failed to write workshop notification event:', err);
        });
}
