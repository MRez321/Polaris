import { v4 as uuid, v5 as uuidV5 } from 'uuid';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { db as Db } from '../../config/drizzle.js';
import { entityActor, recordAudit } from './auditService.js';
import {
    inventoryLedger,
    items,
    locations,
    productVariants,
    products,
    skuLocations,
    skus,
} from '../../schema/index.js';
import type { InventoryMovementType } from '../../schema/index.js';

// ---------------------------------------------------------------------------
// Inventory ledger service (P0-B item 12) — the single write seam for stock.
// Appends movement rows + maintains the sku_locations cache in the caller's
// transaction. The ONLY code allowed to write items.stockQuantity /
// items.websiteQuantity (legacy display caches) lives here.
// ---------------------------------------------------------------------------

export type DbTx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

export interface MovementInput {
    skuId: string;
    locationId: string;
    movementType: InventoryMovementType;
    quantityDelta: number; // signed; sign validated against type
    referenceType: string;
    referenceId: string;
    reason?: string;
    unitCost?: number;
    actorId?: string;
}

const POSITIVE_TYPES: readonly InventoryMovementType[] = [
    'PURCHASE_RECEIPT',
    'RETURN_IN',
    'TRANSFER_IN',
    'ADJUSTMENT_IN',
];

function assertSign(move: MovementInput): void {
    const positive = POSITIVE_TYPES.includes(move.movementType);
    if (positive && move.quantityDelta <= 0) {
        throw new Error(`ledger: ${move.movementType} requires positive delta`);
    }
    if (!positive && move.quantityDelta >= 0) {
        throw new Error(`ledger: ${move.movementType} requires negative delta`);
    }
}

/**
 * Appends movement rows + updates the sku_locations cache, all inside the
 * caller-supplied transaction. sku_locations rows are locked FOR UPDATE so
 * concurrent handovers/orders can never over-allocate (same guard the legacy
 * row-lock flow had).
 */
export async function recordMovements(tx: DbTx, moves: MovementInput[]): Promise<void> {
    if (moves.length === 0) return;
    for (const move of moves) assertSign(move);

    // Aggregate per-(sku, location) net deltas so multiple movements of the
    // same key in one batch apply as one cache write.
    const aggregates: { skuId: string; locationId: string; delta: number }[] = [];
    for (const move of moves) {
        const key = `${move.skuId}|${move.locationId}`;
        let bucket = aggregates.find((a) => a.skuId === move.skuId && a.locationId === move.locationId);
        if (!bucket) {
            bucket = { skuId: move.skuId, locationId: move.locationId, delta: 0 };
            aggregates.push(bucket);
        }
        bucket.delta += move.quantityDelta;
    }

    await tx.insert(inventoryLedger).values(
        moves.map((m) => ({
            id: uuid(),
            skuId: m.skuId,
            locationId: m.locationId,
            movementType: m.movementType,
            quantityDelta: m.quantityDelta,
            ...(m.unitCost !== undefined ? { unitCost: m.unitCost } : {}),
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            ...(m.reason !== undefined ? { reason: m.reason } : {}),
            ...(m.actorId !== undefined ? { actorId: m.actorId } : {}),
        })),
    );

    for (const { skuId, locationId, delta } of aggregates) {
        // Lock the existing cache row (if any) so concurrent writers serialize.
        const locked = await tx
            .select({ quantity: skuLocations.quantity })
            .from(skuLocations)
            .where(and(eq(skuLocations.skuId, skuId), eq(skuLocations.locationId, locationId)))
            .for('update');
        const current = locked[0]?.quantity;

        if (current === undefined) {
            if (delta < 0) {
                throw new Error(`ledger: negative cache for ${skuId}@${locationId} without existing row`);
            }
            if (delta > 0) {
                await tx
                    .insert(skuLocations)
                    .values({ skuId, locationId, quantity: delta })
                    .onDuplicateKeyUpdate({ set: { quantity: sql`${skuLocations.quantity} + ${delta}` } });
            }
            continue;
        }

        const next = current + delta;
        if (next < 0) {
            throw new Error(`ledger: cache underflow for ${skuId}@${locationId} (${current} + ${delta})`);
        }
        await tx
            .update(skuLocations)
            .set({ quantity: next })
            .where(and(eq(skuLocations.skuId, skuId), eq(skuLocations.locationId, locationId)));
    }

    // P0-B item 27: the ledger write itself is audited, on the caller's tx so
    // the row commits/rolls back with the stock movement. One row per batch —
    // the individual movements are already append-only history.
    const lead = moves[0]!;
    recordAudit({
        actor: await entityActor(tx, lead.actorId),
        action: 'update',
        entityType: 'inventory-ledger',
        entityId: lead.referenceId.slice(0, 64),
        metadata: {
            movementCount: moves.length,
            movements: moves.map((m) => ({
                movementType: m.movementType,
                quantityDelta: m.quantityDelta,
                skuId: m.skuId,
                locationId: m.locationId,
                referenceType: m.referenceType,
            })),
        },
        details: `ثبت ${moves.length} حرکت موجودی برای ${lead.referenceType} ${lead.referenceId}`,
        tx,
    });
}

// ---------------------------------------------------------------------------
// Legacy bridge (P0-B items 11/12) — deterministic ids + item↔SKU seam.
// Legacy item-level flows post against the PRIMARY sku
// uuid.v5(`sku:${itemId}`, NS) so the invariant
// items.stockQuantity == Σ ledger(رف انبار) holds per item. The backfill
// seeds these EXACT ids; the bridge computes the same ids so it works before
// and without the backfill.
// ---------------------------------------------------------------------------

/** stable namespace for all backfill/bridge deterministic ids */
export const LEGACY_NS = '9f05f020-0000-4000-8000-51524f4d534b';

const skuIdFor = (itemId: string): string => uuidV5(`sku:${itemId}`, LEGACY_NS);
const productIdFor = (itemId: string): string => uuidV5(`product:${itemId}`, LEGACY_NS);
const variantIdFor = (itemId: string): string => uuidV5(`variant:${itemId}`, LEGACY_NS);

export const shelfLocationId = (): string => uuidV5('location:shelf', LEGACY_NS);
export const shopLocationId = (): string => uuidV5('location:shop', LEGACY_NS);
export const sellerCustodyLocationId = (sellerId: string): string => uuidV5(`location:seller:${sellerId}`, LEGACY_NS);
export const workshopWarehouseId = (): string => uuidV5('warehouse:workshop', LEGACY_NS);
export const sellerWarehouseId = (): string => uuidV5('warehouse:sellers', LEGACY_NS);

/**
 * Ensures a location row exists before any ledger write references it
 * (inventory_ledger.location_id and sku_locations.location_id are FKs).
 *
 * The backfill seeds رف انبار / ویترین / per-seller custody locations, but a
 * seller created AFTER the backfill has no custody row — a handover to such a
 * seller would fail the FK. `recordMovements` therefore auto-creates any
 * location the caller hands it, deriving a code/name from the deterministic id
 * when the caller passes none. Idempotent: re-running is a no-op.
 */
export async function ensureLocation(
    tx: DbTx,
    locationId: string,
    meta?: { warehouseId?: string; code?: string; name?: string },
): Promise<void> {
    const existing = await tx.select({ id: locations.id }).from(locations).where(eq(locations.id, locationId)).limit(1);
    if (existing.length > 0) return;

    const warehouseId = meta?.warehouseId ?? workshopWarehouseId();
    // Deterministic, FK-safe defaults derived from the id: unique per location
    // and stable across re-runs (locations_warehouse_code_uk is (warehouse, code)).
    const code = meta?.code ?? `AUTO-${locationId.replace(/-/g, '').slice(0, 16).toUpperCase()}`.slice(0, 32);
    const name = meta?.name ?? `موقعیت خودکار ${locationId.slice(0, 8)}`;
    await tx
        .insert(locations)
        .values({ id: locationId, warehouseId, code, name })
        .onDuplicateKeyUpdate({ set: { name } });
}

/**
 * Legacy items.category values that predate the slug-based category table.
 * The backfill rewrites these; the bridge maps them so on-demand SKU creation
 * cannot violate the products.category_id FK before/without the backfill.
 */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
    'مانتو': 'women_clothing',
};

/**
 * Idempotent: creates products + productVariants + the primary sku for a
 * legacy item inside the caller's transaction. Used by createItem (so every
 * new item has a deterministic sku before its opening stock movement) and by
 * resolveLegacySku for pre-seed items the backfill has not touched yet.
 * Hard-throws only when the items row itself is missing.
 */
export async function ensureLegacySku(tx: DbTx, itemId: string): Promise<string> {
    const itemRows = await tx.select().from(items).where(eq(items.id, itemId));
    const item = itemRows[0];
    if (!item) throw new Error(`ledger: no sku for legacy item ${itemId}`);

    const skuId = skuIdFor(itemId);
    const existing = await tx.select({ id: skus.id }).from(skus).where(eq(skus.id, skuId));
    if (existing.length > 0) return existing[0]!.id;

    const productId = productIdFor(itemId);
    const variantId = variantIdFor(itemId);
    const now = new Date();
    await tx.insert(products).values({
        id: productId,
        name: item.name,
        categoryId: LEGACY_CATEGORY_MAP[item.category] ?? item.category,
        status: 'active',
        createdAt: now,
        updatedAt: now,
    });
    await tx.insert(productVariants).values({
        id: variantId,
        productId,
        attributes: {},
        createdAt: now,
    });
    await tx.insert(skus).values({
        id: skuId,
        productVariantId: variantId,
        // '-P' keeps SKU codes disjoint from legacy item codes (new-model rule).
        code: `${item.code}-P`,
        name: item.name,
        costPrice: item.costPrice ?? 0,
        salePrice: item.retailPrice ?? 0,
        minStockThreshold: item.minStockThreshold ?? 0,
        legacyItemId: itemId,
        createdAt: now,
        updatedAt: now,
    });
    return skuId;
}

/** Resolves the sku a legacy item-level movement must post against. */
export async function resolveLegacySku(tx: DbTx, itemId: string): Promise<string> {
    const primary = await tx.select({ id: skus.id }).from(skus).where(eq(skus.id, skuIdFor(itemId)));
    if (primary.length > 0) return primary[0]!.id;

    // Fallback: any non-deleted sku carrying the legacy id (never arbitrary —
    // the deterministic primary is checked first so variant skus are not picked).
    const viaLegacy = await tx
        .select({ id: skus.id })
        .from(skus)
        .where(and(eq(skus.legacyItemId, itemId), isNull(skus.deletedAt)))
        .limit(1);
    if (viaLegacy.length > 0) return viaLegacy[0]!.id;

    return ensureLegacySku(tx, itemId);
}

/**
 * Builds the standard atomic transfer pair: TRANSFER_OUT (negative) at the
 * source location + TRANSFER_IN (positive) at the destination. Two rows (not
 * one net row) keep per-location cache == Σ ledger exact. `delta` is the
 * positive quantity that moves.
 */
export function transferPair(params: {
    skuId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
    reason?: string;
    unitCost?: number;
    actorId?: string;
}): [MovementInput, MovementInput] {
    if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
        throw new Error('ledger: transfer quantity must be positive');
    }
    const shared = {
        skuId: params.skuId,
        quantityDelta: params.quantity,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        ...(params.reason !== undefined ? { reason: params.reason } : {}),
        ...(params.unitCost !== undefined ? { unitCost: params.unitCost } : {}),
        ...(params.actorId !== undefined ? { actorId: params.actorId } : {}),
    } satisfies Partial<MovementInput> & { quantityDelta: number };
    return [
        { ...shared, locationId: params.fromLocationId, movementType: 'TRANSFER_OUT', quantityDelta: -params.quantity },
        { ...shared, locationId: params.toLocationId, movementType: 'TRANSFER_IN' },
    ];
}

/**
 * Recomputes the legacy stock display caches for an item directly from the
 * ledger — besides the backfill, the ONLY writer of items.stockQuantity /
 * items.websiteQuantity. Call inside the same transaction after
 * recordMovements so cache == Σ ledger by construction.
 */
export async function syncLegacyStockCache(tx: DbTx, itemId: string): Promise<void> {
    const skuIds = (await tx.select({ id: skus.id }).from(skus).where(eq(skus.legacyItemId, itemId))).map((s) => s.id);
    if (skuIds.length === 0) return;

    const rows: { locationId: string; total: number }[] = await tx
        .select({
            locationId: inventoryLedger.locationId,
            total: sql<number>`COALESCE(SUM(${inventoryLedger.quantityDelta}), 0)`,
        })
        .from(inventoryLedger)
        .where(inArray(inventoryLedger.skuId, skuIds))
        .groupBy(inventoryLedger.locationId);

    let shelf = 0;
    let shop = 0;
    for (const r of rows) {
        if (r.locationId === shelfLocationId()) shelf += Number(r.total ?? 0);
        else if (r.locationId === shopLocationId()) shop += Number(r.total ?? 0);
    }

    await tx
        .update(items)
        .set({ stockQuantity: shelf, websiteQuantity: shop, updatedAt: new Date() })
        .where(eq(items.id, itemId));
}
