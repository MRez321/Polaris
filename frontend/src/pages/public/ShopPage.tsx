import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { PublicCatalogItem } from '@/types';
import { getApiErrorMessage, publicApi } from '@/lib/api';
import { formatGrouped, parseGrouped, toPersianDigits } from '@/utils/persian';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/public/Reveal';
import { ProductCard } from '@/components/public/ProductCard';
import { cn } from '@/lib/utils';

type SortOrder = 'default' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'default', label: 'مرتب‌سازی پیش‌فرض' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
];

/**
 * Public storefront collection: grid of retail items from /api/public/items
 * with category, price and search filters. Anonymous access — no admin data.
 */
export const ShopPage: React.FC = () => {
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<SortOrder>('default');
  const [searchParams] = useSearchParams();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([publicApi.items(), publicApi.categories()])
      .then(([itemsRes, categoriesRes]) => {
        setItems(itemsRes);
        setCategories(categoriesRes);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link support: /shop?category=<id> preselects a category chip.
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice === '' ? null : parseGrouped(minPrice);
    const max = maxPrice === '' ? null : parseGrouped(maxPrice);

    const result = items.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) {
        return false;
      }
      if (min !== null && item.retailPrice < min) return false;
      if (max !== null && item.retailPrice > max) return false;
      return true;
    });

    if (sort === 'price_asc') result.sort((a, b) => a.retailPrice - b.retailPrice);
    if (sort === 'price_desc') result.sort((a, b) => b.retailPrice - a.retailPrice);
    return result;
  }, [items, activeCategory, query, minPrice, maxPrice, sort]);

  const hasFilters =
    activeCategory !== 'all' || query.trim() !== '' || minPrice !== '' || maxPrice !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page header */}
      <Reveal className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#CEAE80]/40 bg-[#CEAE80]/10 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black tracking-wide">
          <PackageSearch className="w-3.5 h-3.5" />
          فروشگاه پولاریس
        </span>
        <h1 className="mt-5 text-2xl sm:text-4xl font-black text-stone-900 dark:text-white">
          کالکشن پوشاک <span className="text-[#A67C38] dark:text-[#CEAE80]">آماده تحویل</span>
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
          همه محصولات آماده تحویل‌اند؛ قیمت‌ها برای مصرف‌کننده نهایی است.
        </p>
      </Reveal>

      {/* Category chips */}
      {categories.length > 0 && (
        <Reveal className="flex flex-wrap items-center justify-center gap-2 mb-6" delay={0.08}>
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-black border transition-all active:scale-95',
              activeCategory === 'all'
                ? 'bg-[#CEAE80] text-black border-[#CEAE80] shadow-md shadow-[#CEAE80]/25'
                : 'bg-white dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:border-[#CEAE80]/50'
            )}
          >
            همه محصولات
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-black border transition-all active:scale-95',
                activeCategory === cat.id
                  ? 'bg-[#CEAE80] text-black border-[#CEAE80] shadow-md shadow-[#CEAE80]/25'
                  : 'bg-white dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:border-[#CEAE80]/50'
              )}
            >
              {cat.label}
            </button>
          ))}
        </Reveal>
      )}

      {/* Search / price / sort toolbar */}
      <Reveal delay={0.12}>
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm mb-8">
          <div className="flex items-center gap-2 text-xs font-black text-stone-500 dark:text-stone-400 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80]" />
            فیلتر و جست‌وجو
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-stone-400 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جست‌وجوی نام محصول یا کد…"
                className="h-11 pr-9 rounded-xl text-sm"
                aria-label="جست‌وجوی محصول"
              />
            </div>

            {/* Price range */}
            <div className="flex items-center gap-2">
              <Input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => minPrice !== '' && setMinPrice(formatGrouped(parseGrouped(minPrice)))}
                inputMode="numeric"
                placeholder="حداقل قیمت"
                className="h-11 rounded-xl text-sm"
                aria-label="حداقل قیمت به تومان"
              />
              <span className="text-stone-400 text-xs font-bold shrink-0">تا</span>
              <Input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => maxPrice !== '' && setMaxPrice(formatGrouped(parseGrouped(maxPrice)))}
                inputMode="numeric"
                placeholder="حداکثر قیمت"
                className="h-11 rounded-xl text-sm"
                aria-label="حداکثر قیمت به تومان"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-1.5 rounded-xl border border-stone-200 dark:border-white/10 p-1 bg-stone-50 dark:bg-white/5">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    'flex-1 px-1 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all',
                    sort === option.value
                      ? 'bg-[#CEAE80] text-black shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active-filter summary */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
              {loading ? 'در حال بارگذاری…' : (
                <>
                  {toPersianDigits(filtered.length)} محصول
                  {hasFilters && ' مطابق فیلترها'}
                </>
              )}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setQuery('');
                  setMinPrice('');
                  setMaxPrice('');
                  setSort('default');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-black text-rose-500 hover:text-rose-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                حذف فیلترها
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* States: loading / error / empty / grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-stone-200/70 dark:border-white/8 bg-white dark:bg-[#16161a]">
              <div className="aspect-[3/4] animate-pulse bg-stone-200/70 dark:bg-white/5" />
              <div className="p-4 space-y-2.5">
                <div className="h-2.5 w-1/3 rounded-full animate-pulse bg-stone-200/80 dark:bg-white/10" />
                <div className="h-3.5 w-3/4 rounded-full animate-pulse bg-stone-200/80 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded-full animate-pulse bg-stone-200/80 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center space-y-4">
          <p className="text-sm font-black text-stone-700 dark:text-stone-300">{error}</p>
          <Button onClick={load} className="h-11 px-6 rounded-xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black">
            <RefreshCw className="w-4 h-4" />
            تلاش دوباره
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-[#CEAE80]/12 border border-[#CEAE80]/25 flex items-center justify-center">
            <PackageSearch className="w-8 h-8 text-[#A67C38] dark:text-[#CEAE80]" />
          </span>
          <p className="text-sm font-black text-stone-700 dark:text-stone-300">محصولی با این فیلترها پیدا نشد</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">فیلترها را تغییر دهید یا حذف کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i % 8, 4) * 0.06}>
              <ProductCard item={item} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
