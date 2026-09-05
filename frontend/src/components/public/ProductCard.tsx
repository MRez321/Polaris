import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicCatalogItem } from '@/types';
import { formatToman } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  item: PublicCatalogItem;
}

/**
 * Marketing product card for the public storefront — image-forward with a
 * gold accent, hover lift/zoom and availability badge. Links to the product
 * page; items without variants can be added to the cart directly.
 */
export const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
  const image = item.imageUrl || item.images?.[0];
  const { add, openCart } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();

  const favorite = isFavorite(item.id);
  const hasVariants = item.sizes.length > 0 || item.colors.length > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.inStock) return;
    if (hasVariants) {
      navigate(`/product/${item.id}`);
      return;
    }
    add({
      itemId: item.id,
      code: item.code,
      name: item.name,
      price: item.retailPrice,
      quantity: 1,
      imageUrl: image,
    });
    toast.success(`«${item.name}» به سبد خرید اضافه شد`);
    openCart();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(item.id);
  };

  return (
    <article className="group relative rounded-2xl overflow-hidden bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm hover:shadow-2xl hover:shadow-brand/10 hover:border-brand/50 hover:-translate-y-1 transition-all duration-300">
      {/* Product image */}
      <Link to={`/product/${item.id}`} className="block relative aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-white/5">
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
      </Link>

      {/* Favorite toggle */}
      <button
        type="button"
        onClick={handleFavorite}
        className={cn(
          'absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90',
          favorite
            ? 'bg-brand text-brand-on shadow-md shadow-brand/40'
            : 'bg-black/40 text-white hover:bg-black/60'
        )}
        aria-label={favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        aria-pressed={favorite}
      >
        <Heart className={cn('w-4 h-4', favorite && 'fill-current')} />
      </button>

      {/* Details */}
      <div className="p-4 sm:p-5 space-y-2.5">
        {item.categoryLabel && (
          <p className="text-[10px] sm:text-[11px] font-black tracking-wider text-brand-ink">
            {item.categoryLabel}
          </p>
        )}

        <Link to={`/product/${item.id}`} className="block">
          <h3 className="font-bold text-sm sm:text-base leading-6 text-stone-900 dark:text-white line-clamp-1 group-hover:text-brand-ink dark:group-hover:text-brand transition-colors">
            {item.name}
          </h3>
        </Link>

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

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-stone-200 dark:border-white/10">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">قیمت مصرف‌کننده</span>
            <span className="text-sm sm:text-base font-black text-brand-ink">
              {formatToman(item.retailPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!item.inStock}
            className={cn(
              'shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-black transition-all active:scale-95',
              item.inStock
                ? 'bg-brand hover:bg-brand-hover text-brand-on shadow-md shadow-brand/25'
                : 'bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-stone-500 cursor-not-allowed'
            )}
            aria-label={hasVariants ? `مشاهده و انتخاب ${item.name}` : `افزودن ${item.name} به سبد خرید`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {hasVariants ? 'انتخاب' : 'خرید'}
          </button>
        </div>
      </div>
    </article>
  );
};
