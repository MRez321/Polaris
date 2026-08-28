import React from 'react';
import type { PublicCatalogItem } from '@/types';
import { formatToman } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';

interface ProductCardProps {
  item: PublicCatalogItem;
}

/**
 * Marketing product card for the public storefront — image-forward with a
 * gold accent, hover lift/zoom and availability badge. Deliberately unlike
 * the dashboard's dense inventory rows.
 */
export const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
  const image = item.imageUrl || item.images?.[0];

  return (
    <article className="group relative rounded-2xl overflow-hidden bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm hover:shadow-2xl hover:shadow-[#CEAE80]/10 hover:border-[#CEAE80]/50 hover:-translate-y-1 transition-all duration-300">
      {/* Product image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-white/5">
        <SafeImage
          src={image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          fallbackClassName="text-6xl"
        />

        {!item.inStock && (
          <div className="absolute inset-0 bg-white/55 dark:bg-black/55 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-full bg-stone-900/85 text-white text-xs font-black tracking-wide">
              ناموجود
            </span>
          </div>
        )}

        {item.inStock && item.colors.length > 0 && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[10px] font-bold">
            {item.colors.length} رنگ
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4 sm:p-5 space-y-2.5">
        {item.categoryLabel && (
          <p className="text-[10px] sm:text-[11px] font-black tracking-wider text-[#A67C38] dark:text-[#CEAE80]">
            {item.categoryLabel}
          </p>
        )}

        <h3 className="font-bold text-sm sm:text-base leading-6 text-stone-900 dark:text-white line-clamp-1">
          {item.name}
        </h3>

        {item.fabric && (
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
            پارچه: {item.fabric}
          </p>
        )}

        {item.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.sizes.slice(0, 5).map((size) => (
              <span
                key={size}
                className="min-w-6 px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-white/10 text-center text-[10px] font-bold text-stone-600 dark:text-stone-300"
              >
                {size}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-dashed border-stone-200 dark:border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">قیمت مصرف‌کننده</span>
            <span className="text-sm sm:text-base font-black text-[#A67C38] dark:text-[#CEAE80]">
              {formatToman(item.retailPrice)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500" dir="ltr">
            {item.code}
          </span>
        </div>
      </div>
    </article>
  );
};
