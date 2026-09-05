import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicCatalogItem } from '@/types';
import { getApiErrorMessage, publicApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { cn } from '@/lib/utils';

/**
 * Public product detail page: gallery, variant selection (size/color),
 * quantity and add-to-cart. Data comes from the same marketing-safe catalog
 * endpoint as the shop grid — no stock counts or cost data.
 */
export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  const { add, openCart } = useCart();
  const { isFavorite, toggle } = useFavorites();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    publicApi
      .items()
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  // Reset variant state when navigating between products.
  useEffect(() => {
    setActiveImage(0);
    setSize(undefined);
    setColor(undefined);
    setQuantity(1);
  }, [id]);

  usePageMeta(
    item ? item.name : 'محصول',
    item ? `خرید ${item.name} با قیمت مصرف‌کننده از فروشگاه پولاریس استایل` : 'صفحه محصول فروشگاه پولاریس استایل',
    item ? `/product/${item.id}` : '/'
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <Skeleton className="aspect-[3/4] rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
          <EmptyMedia variant="icon">
            {error ? <RefreshCw /> : <ShoppingBag />}
          </EmptyMedia>
          <EmptyTitle>{error ? 'خطا در بارگذاری' : 'محصول پیدا نشد'}</EmptyTitle>
          <EmptyDescription>
            {error ?? 'این محصول دیگر در فروشگاه موجود نیست یا نشانی اشتباه است.'}
          </EmptyDescription>
          <EmptyContent>
            <div className="flex gap-2 justify-center">
              {error && (
                <Button variant="outline" onClick={load}>
                  تلاش دوباره
                </Button>
              )}
              <Button render={<Link to="/shop" />}>بازگشت به فروشگاه</Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const images = item.images?.length ? item.images : item.imageUrl ? [item.imageUrl] : [];
  const favorite = isFavorite(item.id);
  const needsSize = item.sizes.length > 0;
  const needsColor = item.colors.length > 0;
  const selectionComplete = (!needsSize || !!size) && (!needsColor || !!color);

  const handleAdd = () => {
    if (!item.inStock || !selectionComplete) return;
    add({
      itemId: item.id,
      code: item.code,
      name: item.name,
      price: item.retailPrice,
      quantity,
      size,
      color,
      imageUrl: images[0],
    });
    toast.success(`«${item.name}» به سبد خرید اضافه شد`);
    openCart();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6 sm:mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/" />}>خانه</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/shop" />}>فروشگاه</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{item.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-white/8 shadow-sm">
            <SafeImage
              src={images[activeImage]}
              alt={item.name}
              className="w-full h-full object-cover"
              fallbackClassName="text-7xl"
            />
            {!item.inStock && (
              <div className="absolute inset-0 bg-white/55 dark:bg-black/55 backdrop-blur-[2px] flex items-center justify-center">
                <span className="px-5 py-2 rounded-full bg-stone-900/85 text-white text-sm font-black">
                  ناموجود
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all',
                    i === activeImage
                      ? 'border-brand shadow-md shadow-brand/20'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                  aria-label={`تصویر ${toPersianDigits(i + 1)}`}
                >
                  <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="space-y-2">
            {item.categoryLabel && (
              <p className="text-xs font-black tracking-wider text-brand-ink">
                {item.categoryLabel}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight">
              {item.name}
            </h1>
            <p className="text-xs font-bold text-stone-400 dark:text-stone-500" dir="ltr">
              {item.code}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-black text-brand-ink">
              {formatToman(item.retailPrice)}
            </span>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-90',
                favorite
                  ? 'bg-brand border-brand text-brand-on shadow-md shadow-brand/30'
                  : 'border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-300 hover:border-brand/50 hover:text-brand-ink'
              )}
              aria-label={favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
              aria-pressed={favorite}
            >
              <Heart className={cn('w-4.5 h-4.5', favorite && 'fill-current')} />
            </button>
          </div>

          {item.fabric && (
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              <span className="font-black text-stone-900 dark:text-white">پارچه: </span>
              {item.fabric}
            </p>
          )}

          {/* Size selection */}
          {needsSize && (
            <div className="space-y-2">
              <p className="text-sm font-black text-stone-900 dark:text-white">
                سایز{' '}
                {size && (
                  <span className="text-brand-ink">— {size}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={cn(
                      'min-w-11 h-10 px-3 rounded-xl border text-sm font-bold transition-all active:scale-95',
                      size === s
                        ? 'bg-brand border-brand text-brand-on shadow-md shadow-brand/25'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:border-brand/60'
                    )}
                    aria-pressed={size === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {needsColor && (
            <div className="space-y-2">
              <p className="text-sm font-black text-stone-900 dark:text-white">
                رنگ{' '}
                {color && (
                  <span className="text-brand-ink">— {color}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-10 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95',
                      color === c
                        ? 'bg-brand border-brand text-brand-on shadow-md shadow-brand/25'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:border-brand/60'
                    )}
                    aria-pressed={color === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex items-center rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden w-fit">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="w-10 h-12 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
                aria-label="افزایش تعداد"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-base font-black text-stone-900 dark:text-white">
                {toPersianDigits(quantity)}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-12 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
                aria-label="کاهش تعداد"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!item.inStock || !selectionComplete}
              className={cn(
                'flex-1 h-12 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-[0.98]',
                item.inStock && selectionComplete
                  ? 'bg-brand hover:bg-brand-hover text-brand-on shadow-lg shadow-brand/25'
                  : 'bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-stone-500 cursor-not-allowed'
              )}
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              {!item.inStock
                ? 'ناموجود'
                : !selectionComplete
                  ? 'ابتدا سایز و رنگ را انتخاب کنید'
                  : 'افزودن به سبد خرید'}
            </button>
          </div>

          {/* Trust notes */}
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <div className="rounded-2xl bg-stone-50 dark:bg-white/4 border border-stone-200/60 dark:border-white/8 p-3.5 text-xs leading-6 text-stone-600 dark:text-stone-300">
              <span className="block font-black text-stone-900 dark:text-white">پرداخت در محل</span>
              امکان تسویه هنگام تحویل سفارش
            </div>
            <div className="rounded-2xl bg-stone-50 dark:bg-white/4 border border-stone-200/60 dark:border-white/8 p-3.5 text-xs leading-6 text-stone-600 dark:text-stone-300">
              <span className="block font-black text-stone-900 dark:text-white">دوخت کارگاهی</span>
              تولید مستقیم کارگاه پولاریس با کنترل کیفیت
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
