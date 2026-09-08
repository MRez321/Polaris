/**
 * Workshop analytics endpoints. Aggregates sales across both channels:
 *  - sellers (street) : ConsignmentItemLine.soldQuantity on active consignments
 *  - shop (online)    : OrderItemLine.quantity on non-cancelled orders
 * Returns per-item / per-variant / per-seller rankings plus channel totals.
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../../../config/drizzle.js';
import { consignments, orders, items } from '../../../schema/index.js';

interface VariantStat {
    size?: string;
    color?: string;
    quantity: number;
}

interface ChannelStat {
    totalSold: number;
    revenue: number;
    byVariant: VariantStat[];
}

interface ItemStat {
    itemId: string;
    itemName: string;
    itemCode: string;
    sellerSold: number;
    shopSold: number;
    totalSold: number;
    revenue: number;
    byVariant: VariantStat[];
}

interface SellerStat {
    sellerId: string;
    sellerName: string;
    totalSold: number;
    revenue: number;
}

interface AnalyticsResult {
    totalSold: number;
    totalRevenue: number;
    sellerChannel: ChannelStat;
    shopChannel: ChannelStat;
    topItems: ItemStat[];
    topSellers: SellerStat[];
}
// Variant aggregation key; '|' when no size/color is known.
const variantKey = (size: string | undefined, color: string | undefined) => `${size ?? ''}|${color ?? ''}`;

export async function getAnalytics(_req: Request, res: Response): Promise<void> {
    const [activeConsignments, allOrders, allItems] = await Promise.all([
        db.select().from(consignments).where(eq(consignments.isDeleted, false)),
        db.select().from(orders),
        db.select().from(items).where(eq(items.isDeleted, false)),
    ]);
    const itemName = new Map(allItems.map((i) => [i.id, i]));

    const itemStats = new Map<string, ItemStat>();
    const itemVariants = new Map<string, Map<string, VariantStat>>();
    const channelVariants = {
        seller: new Map<string, VariantStat>(),
        shop: new Map<string, VariantStat>(),
    };
    const sellerStats = new Map<string, SellerStat>();
    const sellerChannel: ChannelStat = { totalSold: 0, revenue: 0, byVariant: [] };
    const shopChannel: ChannelStat = { totalSold: 0, revenue: 0, byVariant: [] };

    const itemStat = (itemId: string): ItemStat | undefined => {
        const item = itemName.get(itemId);
        if (!item) return undefined;
        let stat = itemStats.get(itemId);
        if (!stat) {
            stat = {
                itemId,
                itemName: item.name,
                itemCode: item.code,
                sellerSold: 0,
                shopSold: 0,
                totalSold: 0,
                revenue: 0,
                byVariant: [],
            };
            itemStats.set(itemId, stat);
        }
        return stat;
    };

    /** Record one sold-line against an item, a channel, and (optionally) a seller. */
    const record = (
        channel: 'seller' | 'shop',
        itemId: string,
        qty: number,
        unitPrice: number,
        size: string | undefined,
        color: string | undefined,
        seller?: SellerStat,
    ) => {
        const stat = itemStat(itemId);
        if (stat) {
            stat.totalSold += qty;
            stat.revenue += qty * unitPrice;
            if (channel === 'seller') stat.sellerSold += qty;
            else stat.shopSold += qty;

            const key = variantKey(size, color);
            if (key !== '|') {
                let variants = itemVariants.get(itemId);
                if (!variants) {
                    variants = new Map();
                    itemVariants.set(itemId, variants);
                }
                const existing = variants.get(key);
                if (existing) existing.quantity += qty;
                else
                    variants.set(key, {
                        ...(size ? { size } : {}),
                        ...(color ? { color } : {}),
                        quantity: qty,
                    });
            }
        }

        const chan = channel === 'seller' ? sellerChannel : shopChannel;
        chan.totalSold += qty;
        chan.revenue += qty * unitPrice;
        if (seller) {
            seller.totalSold += qty;
            seller.revenue += qty * unitPrice;
        }

        const key = variantKey(size, color);
        if (key !== '|') {
            const chanVariants = channelVariants[channel];
            const existing = chanVariants.get(key);
            if (existing) existing.quantity += qty;
            else chanVariants.set(key, { ...(size ? { size } : {}), ...(color ? { color } : {}), quantity: qty });
        }
    };

    // ---- Seller channel: sold quantities per consignment line ----
    for (const c of activeConsignments) {
        let seller = sellerStats.get(c.sellerId);
        if (!seller) {
            seller = { sellerId: c.sellerId, sellerName: c.sellerName, totalSold: 0, revenue: 0 };
            sellerStats.set(c.sellerId, seller);
        }
        for (const line of c.items) {
            const sold = line.soldQuantity ?? 0;
            if (sold > 0) record('seller', line.itemId, sold, line.unitPrice ?? 0, line.selectedSize, line.selectedColor, seller);
        }
    }

    // ---- Shop channel: order lines (non-cancelled) ----
    for (const o of allOrders) {
        if (o.status === 'cancelled') continue;
        for (const line of o.items) {
            const qty = line.quantity ?? 0;
            if (qty > 0) record('shop', line.itemId, qty, line.price ?? 0, line.size, line.color);
        }
    }

    const byVariantQuantity = (a: VariantStat, b: VariantStat) => b.quantity - a.quantity;
    const byTotalSold = (a: ItemStat, b: ItemStat) => b.totalSold - a.totalSold;
    const bySellerSold = (a: SellerStat, b: SellerStat) => b.totalSold - a.totalSold;
    sellerChannel.byVariant = [...channelVariants.seller.values()].sort(byVariantQuantity);
    shopChannel.byVariant = [...channelVariants.shop.values()].sort(byVariantQuantity);
    for (const [itemId, variants] of itemVariants) {
        const stat = itemStats.get(itemId);
        if (stat) stat.byVariant = [...variants.values()].sort(byVariantQuantity);
    }

    const result: AnalyticsResult = {
        totalSold: sellerChannel.totalSold + shopChannel.totalSold,
        totalRevenue: sellerChannel.revenue + shopChannel.revenue,
        sellerChannel,
        shopChannel,
        topItems: [...itemStats.values()].sort(byTotalSold),
        topSellers: [...sellerStats.values()].sort(bySellerSold),
    };
    res.json(result);
}
