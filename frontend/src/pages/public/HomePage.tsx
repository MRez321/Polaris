import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Gem,
  Hand,
  Ruler,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { PublicCatalogItem } from '@/types';
import { publicApi } from '@/lib/api';
import { Reveal } from '@/components/public/Reveal';
import { SectionHeading } from '@/components/public/SectionHeading';
import { ProductCard } from '@/components/public/ProductCard';
import heroPhoto from '@/assets/p1.png';
import craftPhoto from '@/assets/p2.png';

const SERVICE_TEASERS = [
  {
    icon: Ruler,
    title: 'دوخت شخصی',
    description: 'کت و شلوار، پیراهن و پوشاک سفارشی با اندازه‌گیری دقیق و پرو اختصاصی.',
  },
  {
    icon: Scissors,
    title: 'تغییر سایز و پرو',
    description: 'تنگ و گشاد کردن، کوتاه کردن و اصلاح برش لباس‌های آماده و قدیمی.',
  },
  {
    icon: Sparkles,
    title: 'تعمیرات و رفو',
    description: 'مرمت پارگی، تعویض زیپ و آستر و زنده‌سازی لباس‌های ارزشمند.',
  },
];

const CRAFT_FEATURES = [
  { icon: Gem, title: 'پارچه‌های منتخب', description: 'فاستونی، کتان و کرپ از تأمین‌کنندگان معتبر' },
  { icon: Hand, title: 'دوخت ظریف', description: 'اتمام دستی جزئیات توسط خیاطان باتجربه' },
  { icon: Timer, title: 'تحویل به‌موقع', description: 'زمان‌بندی شفاف از اندازه‌گیری تا تحویل' },
  { icon: ShieldCheck, title: 'ضمانت اصلاح', description: 'پس از تحویل، اصلاح رایگان تا رضایت کامل' },
];

export const HomePage: React.FC = () => {
  const [featured, setFeatured] = useState<PublicCatalogItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .items()
      .then((items) => {
        if (cancelled) return;
        // Prefer in-stock items with a photo for the showcase strip.
        const showcase = items
          .filter((i) => i.inStock && (i.imageUrl || (i.images && i.images.length > 0)))
          .slice(0, 4);
        setFeatured(showcase.length > 0 ? showcase : items.slice(0, 4));
      })
      .catch(() => {
        /* Showcase is progressive enhancement; hero works without the API. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
                  <Scissors className="w-3.5 h-3.5 -rotate-45" />
                  کارگاه دوزندگی و پوشاک پولاریس
                </span>
              </motion.div>

              <motion.h1
                className="mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-black leading-[1.35] sm:leading-[1.35] text-stone-900 dark:text-white"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                از اندازه‌گیری تا تحویل،
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#CEAE80] via-[#b99a6c] to-[#A67C38]">
                  دوخته‌شده برای شما
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 text-sm sm:text-base leading-8 text-stone-600 dark:text-stone-400 max-w-xl mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                پولاریس استایل دو روی یک سکه دارد: <strong className="text-stone-800 dark:text-stone-200">دوخت شخصی</strong> با
                دقت خیاطی سنتی، و <strong className="text-stone-800 dark:text-stone-200">فروشگاه پوشاک آماده</strong> با کیفیت
                همان کارگاه. هر کدام را که بخواهید، با یک استاندارد تحویل می‌گیرید.
              </motion.p>

              {/* Dual CTAs: tailoring + retail */}
              <motion.div
                className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                <Link
                  to="/services"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-lg shadow-[#CEAE80]/30 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Ruler className="w-4.5 h-4.5" />
                  سفارش دوخت شخصی
                </Link>
                <Link
                  to="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl border-2 border-[#CEAE80]/50 hover:border-[#CEAE80] bg-white/50 dark:bg-white/5 text-stone-800 dark:text-stone-100 text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <ShoppingBag className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                  مشاهده فروشگاه
                </Link>
              </motion.div>

              {/* Trust strip */}
              <motion.div
                className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                {[
                  { value: '+۱۰', label: 'سال تجربه دوخت' },
                  { value: '+۲۰۰۰', label: 'سفارش تحویل‌شده' },
                  { value: '۹۸٪', label: 'رضایت مشتری' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center lg:text-right">
                    <p className="text-xl sm:text-2xl font-black text-[#A67C38] dark:text-[#CEAE80]">{stat.value}</p>
                    <p className="mt-1 text-[10px] sm:text-[11px] font-bold text-stone-500 dark:text-stone-400">{stat.label}</p>
                  </div>
                ))}
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
                  alt="نمونه دوخت پولاریس استایل"
                  className="w-full h-72 sm:h-96 lg:h-[30rem] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between gap-3">
                  <p className="text-white text-xs sm:text-sm font-black drop-shadow">ظرافت در هر بخیه</p>
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
                  <Scissors className="w-5 h-5 text-[#A67C38] dark:text-[#CEAE80] -rotate-45" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-black text-stone-900 dark:text-white">دوخت اختصاصی</p>
                  <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400">با پرو و اصلاح رایگان</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== TAILORING / RETAIL SPLIT ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <Reveal>
            <Link
              to="/services"
              className="group relative block h-64 sm:h-72 rounded-3xl overflow-hidden border border-[#CEAE80]/25 shadow-lg"
            >
              <img
                src={craftPhoto}
                alt="دوخت شخصی در کارگاه پولاریس"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/45 to-black/15" />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <span className="text-[#CEAE80] text-xs font-black tracking-widest mb-2">خدمات کارگاه</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">دوخت شخصی و سفارشی</h3>
                <p className="mt-2 text-xs sm:text-sm text-white/80 leading-6 max-w-sm">
                  از مشاوره و اندازه‌گیری تا پرو نهایی؛ لباسی که دقیقاً برای تن شما دوخته شده است.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[#CEAE80] text-xs font-black group-hover:gap-3 transition-all">
                  مشاهده خدمات
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
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">خرید از کالکشن آماده</h3>
                <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-6 max-w-sm">
                  کت، پیراهن، شلوار و پوشاک منتخب با کیفیت دوخت کارگاه، آماده ارسال و تحویل فوری.
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

      {/* ========================= SERVICES TEASER ========================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <SectionHeading
          eyebrow="خدمات دوخت"
          title="هنر خیاطی، در سه پرده"
          subtitle="هر سفارش از مشاوره شروع می‌شود و با رضایت کامل شما تمام می‌شود."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICE_TEASERS.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.title} delay={i * 0.1}>
                <Link
                  to="/services"
                  className="group block h-full p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm hover:shadow-xl hover:shadow-[#CEAE80]/10 hover:border-[#CEAE80]/45 hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="w-12 h-12 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/25 flex items-center justify-center group-hover:bg-[#CEAE80] transition-colors">
                    <Icon className="w-6 h-6 text-[#A67C38] dark:text-[#CEAE80] group-hover:text-black transition-colors" />
                  </span>
                  <h3 className="mt-5 text-base sm:text-lg font-black text-stone-900 dark:text-white">{service.title}</h3>
                  <p className="mt-2.5 text-xs sm:text-sm leading-7 text-stone-600 dark:text-stone-400">{service.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black text-[#A67C38] dark:text-[#CEAE80] group-hover:gap-3 transition-all">
                    جزئیات بیشتر
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ======================= FEATURED PRODUCTS ======================= */}
      {featured.length > 0 && (
        <section className="bg-stone-100/60 dark:bg-white/[0.025] border-y border-stone-200/60 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading
              eyebrow="فروشگاه"
              title="منتخب کالکشن پولاریس"
              subtitle="چند نمونه از محصولات آماده تحویل؛ بقیه را در فروشگاه ببینید."
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

      {/* ========================== CRAFT / WHY US ========================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <SectionHeading
          eyebrow="چرا پولاریس؟"
          title="کیفیت، اتفاقی نیست"
          subtitle="از انتخاب پارچه تا پس از تحویل، همه‌چیز حول یک اصل می‌چرخد: لباس باید اندازه و بادوام باشد."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {CRAFT_FEATURES.map((feature, i) => {
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
          <div className="relative overflow-hidden rounded-[2rem] border border-[#CEAE80]/35 bg-gradient-to-l from-[#CEAE80]/25 via-[#CEAE80]/12 to-transparent px-6 py-12 sm:px-12 sm:py-16 text-center">
            <div className="absolute -top-24 right-1/3 w-72 h-72 bg-[#CEAE80]/25 rounded-full blur-3xl" aria-hidden />
            <h2 className="relative text-xl sm:text-3xl font-black text-stone-900 dark:text-white leading-snug">
              برای مشاوره رایگان اندازه‌گیری و انتخاب پارچه، همین امروز با ما صحبت کنید
            </h2>
            <p className="relative mt-4 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              پاسخ‌گویی شنبه تا پنجشنبه، ۹ صبح تا ۹ شب
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-lg shadow-[#CEAE80]/30 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                تماس با ما
              </Link>
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl border-2 border-[#CEAE80]/50 hover:border-[#CEAE80] text-stone-800 dark:text-stone-100 text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95"
              >
                اول فروشگاه را ببینم
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default HomePage;
