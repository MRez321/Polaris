import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Gem,
  Layers,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { PublicCatalogItem } from '@/types';
import { publicApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { toPersianDigits } from '@/utils/persian';
import { Reveal } from '@/components/public/Reveal';
import { SectionHeading } from '@/components/public/SectionHeading';
import { ProductCard } from '@/components/public/ProductCard';
import { SafeImage } from '@/components/common/SafeImage';
import heroPhoto from '@/assets/hero-shop.jpg';
import showroomPhoto from '@/assets/racks.jpg';
import ctaPhoto from '@/assets/mannequin.jpg';

const TRUST_CHIPS = [
  { icon: Shirt, label: 'تنوع سایز و رنگ' },
  { icon: Gem, label: 'کیفیت منتخب' },
  { icon: PhoneCall, label: 'مشاوره خرید رایگان' },
];

const CATEGORY_ICONS = [Shirt, ShoppingBag, Tag, Layers, Sparkles, Gem];

const SHOP_FEATURES = [
  { icon: Layers, title: 'کالکشن به‌روز', description: 'مدل‌های جدید به‌صورت مداوم به فروشگاه اضافه می‌شوند' },
  { icon: ShieldCheck, title: 'خرید مطمئن', description: 'تضمین سلامت کالا و شفافیت قیمت برای مصرف‌کننده' },
  { icon: MapPin, title: 'خرید حضوری', description: 'در فروشگاه پولاریس، جنس را از نزدیک ببینید و انتخاب کنید' },
  { icon: Tag, title: 'قیمت منصفانه', description: 'قیمت‌گذاری مستقیم، بدون واسطه و مناسب بازار' },
];

export const HomePage: React.FC = () => {
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);

  usePageMeta(
    'فروشگاه پوشاک پولاریس استایل | خرید کت، پیراهن و شلوار آماده',
    'فروشگاه پوشاک آماده پولاریس استایل: کت، پالتو، پیراهن، شلوار و مانتو با تنوع سایز و رنگ، کیفیت منتخب و مشاوره خرید رایگان.',
    '/'
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([publicApi.items(), publicApi.categories()])
      .then(([itemsRes, categoriesRes]) => {
        if (cancelled) return;
        setItems(itemsRes);
        setCategories(categoriesRes);
      })
      .catch(() => {
        /* Landing works without the API; catalog sections simply stay hidden. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // In-stock items with a photo, reused by the marquee and the showcase grid.
  const visualItems = useMemo(
    () => items.filter((i) => i.inStock && (i.imageUrl || (i.images && i.images.length > 0))),
    [items]
  );
  const featured = useMemo(
    () => (visualItems.length > 0 ? visualItems.slice(0, 8) : items.slice(0, 8)),
    [visualItems, items]
  );
  const marqueeItems = useMemo(() => visualItems.slice(0, 12), [visualItems]);

  const categoryCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.inStock) continue;
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    return counts;
  }, [items]);

  return (
    <div>
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(to left, rgba(206,174,128,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(206,174,128,0.08) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
          aria-hidden
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Copy */}
            <div className="text-center lg:text-right order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#CEAE80]/40 bg-[#CEAE80]/10 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black tracking-wide">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  فروشگاه پوشاک پولاریس
                </span>
              </motion.div>

              <motion.h1
                className="mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-black leading-[1.35] sm:leading-[1.35] text-stone-900 dark:text-white"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                از انتخاب تا تحویل،
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#CEAE80] via-[#b99a6c] to-[#A67C38]">
                  پوشاکی که اندازهٔ شماست
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 text-sm sm:text-base leading-8 text-stone-600 dark:text-stone-400 max-w-xl mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                پولاریس استایل فروشگاه <strong className="text-stone-800 dark:text-stone-200">پوشاک آماده</strong> است:
                کت، پیراهن، شلوار و پوشاک منتخب با سایزها و رنگ‌های متنوع. حضوری انتخاب کنید یا قبل از خرید،
                تلفنی مشاوره بگیرید.
              </motion.p>

              {/* CTAs: shop first, categories second */}
              <motion.div
                className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                <Link
                  to="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-lg shadow-[#CEAE80]/30 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  خرید از فروشگاه
                </Link>
                <a
                  href="#categories"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl border-2 border-[#CEAE80]/50 hover:border-[#CEAE80] bg-white/50 dark:bg-white/5 text-stone-800 dark:text-stone-100 text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Layers className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                  دسته‌بندی محصولات
                </a>
              </motion.div>

              {/* Trust chips */}
              <motion.div
                className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 max-w-md mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                {TRUST_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <span key={chip.label} className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-[#CEAE80]/15 border border-[#CEAE80]/25 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80]" />
                      </span>
                      <span className="text-[11px] sm:text-xs font-black text-stone-600 dark:text-stone-300">
                        {chip.label}
                      </span>
                    </span>
                  );
                })}
              </motion.div>
            </div>

            {/* Visual */}
            <motion.div
              className="relative order-1 lg:order-2 mx-auto w-full max-w-md lg:max-w-none"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <div className="relative rounded-[2rem] overflow-hidden border border-[#CEAE80]/30 shadow-2xl shadow-[#CEAE80]/15">
                <img
                  src={heroPhoto}
                  alt="فروشگاه پوشاک پولاریس"
                  fetchPriority="high"
                  className="w-full h-72 sm:h-96 lg:h-[30rem] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between gap-3">
                  <p className="text-white text-xs sm:text-sm font-black drop-shadow">استایل روز، انتخاب آسان</p>
                  <span className="px-3 py-1 rounded-full bg-[#CEAE80] text-black text-[10px] font-black">کالکشن جدید</span>
                </div>
              </div>

              {/* Floating badge card */}
              <motion.div
                className="absolute -bottom-5 -left-2 sm:left-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#CEAE80]/35 shadow-xl shadow-black/10"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="w-10 h-10 rounded-xl bg-[#CEAE80]/15 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#A67C38] dark:text-[#CEAE80]" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-black text-stone-900 dark:text-white">خرید مطمئن</p>
                  <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400">مشاوره رایگان قبل از خرید</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====================== PRODUCT MARQUEE STRIP ====================== */}
      {marqueeItems.length >= 4 && (
        <section className="relative border-y border-[#CEAE80]/20 bg-white/60 dark:bg-white/[0.02] py-6 overflow-hidden" dir="ltr">
          <div
            className="flex w-max gap-4 px-4 animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none"
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                to="/shop"
                tabIndex={i >= marqueeItems.length ? -1 : undefined}
                aria-hidden={i >= marqueeItems.length ? true : undefined}
                className="group relative shrink-0 w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border border-[#CEAE80]/25 shadow-sm hover:border-[#CEAE80]/60 transition-colors"
              >
                <SafeImage
                  src={item.imageUrl || item.images?.[0]}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  fallbackClassName="text-4xl"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6">
                  <p className="text-white text-[10px] font-black leading-4 truncate">{item.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ======================= IN-PERSON / ONLINE SPLIT ======================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <Reveal>
            <Link
              to="/contact"
              className="group relative block h-64 sm:h-72 rounded-3xl overflow-hidden border border-[#CEAE80]/25 shadow-lg"
            >
              <img
                src={showroomPhoto}
                alt="رگال‌های پوشاک در فروشگاه پولاریس"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/45 to-black/15" />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <span className="text-[#CEAE80] text-xs font-black tracking-widest mb-2">خرید حضوری</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">از نزدیک ببینید و انتخاب کنید</h3>
                <p className="mt-2 text-xs sm:text-sm text-white/80 leading-6 max-w-sm">
                  در فروشگاه پولاریس جنس را از نزدیک ببینید، مقایسه کنید و همان روز با خود ببرید.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[#CEAE80] text-xs font-black group-hover:gap-3 transition-all">
                  مسیر و شماره تماس
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.12}>
            <Link
              to="/shop"
              className="group relative block h-64 sm:h-72 rounded-3xl overflow-hidden border border-[#CEAE80]/25 bg-gradient-to-bl from-[#CEAE80]/25 via-[#CEAE80]/10 to-transparent shadow-lg"
            >
              <div className="absolute -top-16 -left-16 w-56 h-56 bg-[#CEAE80]/25 rounded-full blur-3xl group-hover:bg-[#CEAE80]/35 transition-colors" aria-hidden />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <span className="w-14 h-14 rounded-2xl bg-[#CEAE80] flex items-center justify-center shadow-lg shadow-[#CEAE80]/30 mb-4 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-7 h-7 text-black" />
                </span>
                <span className="text-[#A67C38] dark:text-[#CEAE80] text-xs font-black tracking-widest mb-2">فروشگاه پولاریس</span>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">مشاهده کالکشن آماده</h3>
                <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-6 max-w-sm">
                  فهرست کامل محصولات با قیمت، سایز و رنگ‌بندی؛ همیشه به‌روز و آماده تحویل.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black group-hover:gap-3 transition-all">
                  رفتن به فروشگاه
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* =========================== CATEGORIES =========================== */}
      {categories.length > 0 && (
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-24">
          <SectionHeading
            eyebrow="دسته‌بندی‌ها"
            title="بر اساس سلیقه‌تان بگردید"
            subtitle="هر دسته را باز کنید تا محصولات آماده تحویل همان بخش را ببینید."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {categories.slice(0, 8).map((cat, i) => {
              const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
              const count = categoryCount.get(cat.id) || 0;
              return (
                <Reveal key={cat.id} delay={i * 0.06}>
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat.id)}`}
                    className="group flex items-center gap-3.5 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm hover:shadow-xl hover:shadow-[#CEAE80]/10 hover:border-[#CEAE80]/45 hover:-translate-y-1 transition-all duration-300"
                  >
                    <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/25 flex items-center justify-center shrink-0 group-hover:bg-[#CEAE80] transition-colors">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#A67C38] dark:text-[#CEAE80] group-hover:text-black transition-colors" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm sm:text-base font-black text-stone-900 dark:text-white truncate">
                        {cat.label}
                      </span>
                      <span className="block mt-0.5 text-[10px] sm:text-[11px] font-bold text-stone-500 dark:text-stone-400">
                        {count > 0 ? `${toPersianDigits(count)} محصول آماده` : 'مشاهده محصولات'}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ======================= FEATURED PRODUCTS ======================= */}
      {featured.length > 0 && (
        <section className="bg-stone-100/60 dark:bg-white/[0.025] border-y border-stone-200/60 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading
              eyebrow="فروشگاه"
              title="منتخب محصولات پولاریس"
              subtitle="چند نمونه از محصولات آماده تحویل؛ فهرست کامل را در فروشگاه ببینید."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {featured.map((item, i) => (
                <Reveal key={item.id} delay={i * 0.08}>
                  <ProductCard item={item} />
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-10 text-center" delay={0.15}>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl border-2 border-[#CEAE80]/50 hover:border-[#CEAE80] text-stone-800 dark:text-stone-100 text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95"
              >
                مشاهده همه محصولات
                <ArrowLeft className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80]" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ========================== WHY POLARIS ========================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <SectionHeading
          eyebrow="چرا پولاریس؟"
          title="خریدی راحت و مطمئن"
          subtitle="از تنوع محصولات تا مشاوره قبل از خرید، همه‌چیز برای یک انتخاب درست."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {SHOP_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div className="h-full p-5 sm:p-6 rounded-3xl border border-[#CEAE80]/20 bg-gradient-to-b from-[#CEAE80]/8 to-transparent text-center">
                  <span className="mx-auto w-12 h-12 rounded-2xl bg-[#CEAE80]/15 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#A67C38] dark:text-[#CEAE80]" />
                  </span>
                  <h3 className="mt-4 text-sm sm:text-base font-black text-stone-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-[11px] sm:text-xs leading-6 text-stone-600 dark:text-stone-400">{feature.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============================ CTA BAND ============================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#CEAE80]/35 px-6 py-12 sm:px-12 sm:py-16 text-center">
            <img
              src={ctaPhoto}
              alt="ویترین فروشگاه پولاریس"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute -top-24 right-1/3 w-72 h-72 bg-[#CEAE80]/25 rounded-full blur-3xl" aria-hidden />
            <h2 className="relative text-xl sm:text-3xl font-black text-white leading-snug">
              کالکشن جدید پولاریس رسید؛ مدل بعدی کمدتان این‌جاست
            </h2>
            <p className="relative mt-4 text-xs sm:text-sm text-white/75">
              پاسخ‌گویی شنبه تا پنجشنبه، ۹ صبح تا ۹ شب
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-lg shadow-[#CEAE80]/30 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                خرید از فروشگاه
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl border-2 border-white/40 hover:border-white text-white text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default HomePage;
