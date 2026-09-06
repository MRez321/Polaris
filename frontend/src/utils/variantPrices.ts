// Per-variant price resolution for items with size/color overrides.
import type { GarmentItem } from '@/types';

export type PriceField = 'costPrice' | 'consignmentPrice' | 'retailPrice';

/**
 * Resolve the effective price of a variant: size override wins over color
 * override, color override wins over the item's base price. Undefined
 * override fields fall through to the next layer (per-field, not per-record).
 */
export function resolveVariantPrice(
  item: Pick<GarmentItem, 'variantPrices' | PriceField>,
  field: PriceField,
  size?: string | null,
  color?: string | null,
): number {
  const variants = item.variantPrices;
  const sizeOverride = size ? variants?.sizes?.[size]?.[field] : undefined;
  if (sizeOverride !== undefined) return sizeOverride;
  const colorOverride = color ? variants?.colors?.[color]?.[field] : undefined;
  if (colorOverride !== undefined) return colorOverride;
  return item[field];
}

/** True when any size/color carries at least one price override. */
export function hasVariantPrices(item: Pick<GarmentItem, 'variantPrices'>): boolean {
  const records = [
    ...Object.values(item.variantPrices?.sizes ?? {}),
    ...Object.values(item.variantPrices?.colors ?? {}),
  ];
  return records.some((r) => r !== undefined && Object.keys(r).length > 0);
}
