import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useBrand } from '@/context/BrandContext';
import { toPersianDigits } from '@/utils/persian';
import logoUrl from '@/assets/logo.png';

const QUICK_LINKS = [
  { to: '/', label: 'خانه' },
  { to: '/shop', label: 'فروشگاه پوشاک' },
  { to: '/blog', label: 'وبلاگ' },
  { to: '/contact', label: 'تماس با ما' },
];

/** Fallback shop links shown until the public categories endpoint answers. */
const FALLBACK_SHOP_LINKS: { to: string; label: string }[] = [];

/** Current Jalali year, e.g. «۱۴۰۵» — used in the copyright line. */
const jalaliYear = toPersianDigits(
  new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(new Date())
);

/**
 * Public marketing footer — brand, quick links, services and live contact
 * info pulled from the shared BrandContext (same fetch as the header).
 * Independent from the admin layout; no admin data or actions are exposed here.
 */
export const PublicFooter: React.FC = () => {
  const { company } = useBrand();
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .categories()
      .then((categoriesData) => {
        if (cancelled) return;
        setCategories(categoriesData);
      })
      .catch(() => {
        /* Footer falls back to brand defaults when the API is unreachable. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const phone = company?.phone?.trim();
  const address = company?.address?.trim();
  const instagram = company?.instagram?.trim();
  const telegram = company?.telegram?.trim();
  const brandName = company?.brandName?.trim() || 'پولاریس استایل';
  const brandLogo = company?.logoUrl?.trim() || logoUrl;

  return (
    <footer className="relative mt-auto border-t border-brand/20 bg-white dark:bg-[#0D0D10]">
      {/* Gold hairline glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-brand/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 max-sm:text-center max-sm:[&>*]:flex max-sm:[&>*]:flex-col max-sm:[&>*]:items-center">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-brand/35 bg-white dark:bg-[#16161a] shadow-md">
                <img src={brandLogo} alt={`لوگوی ${brandName}`} className="w-full h-full object-cover" />
              </span>
              <div className="leading-tight">
                <p className="text-base font-black text-stone-900 dark:text-white">
                  {brandName}
                </p>
                <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                  {company?.slogan?.trim() || 'فروشگاه پوشاک آماده'}
                </p>
              </div>
            </div>
            <p className="text-xs leading-6 text-stone-600 dark:text-stone-400">
              {company?.tagline?.trim() ||
                'پوشاک آماده با کیفیت منتخب؛ سایزها و رنگ‌های متنوع برای هر سلیقه، آماده تحویل.'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {instagram && (
                <a
                  href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="اینستاگرام پولاریس استایل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-brand-ink hover:border-brand/50 transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                </a>
              )}
              {telegram && (
                <a
                  href={telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="تلگرام پولاریس استایل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-brand-ink hover:border-brand/50 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  aria-label="تماس تلفنی با پولاریس استایل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-brand-ink hover:border-brand/50 transition-all active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand" />
              دسترسی سریع
            </h3>
            <ul className="space-y-2.5 max-sm:mx-auto max-sm:w-fit">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-brand-ink transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/login"
                  className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-brand-ink transition-colors"
                >
                  ورود به حساب کاربری
                </Link>
              </li>
            </ul>
          </div>

          {/* Shop categories */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand" />
              فروشگاه
            </h3>
            <ul className="space-y-2.5 max-sm:mx-auto max-sm:w-fit">
              <li>
                <Link
                  to="/shop"
                  className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-brand-ink transition-colors"
                >
                  همه محصولات
                </Link>
              </li>
              {(categories.length > 0
                ? categories.slice(0, 5).map((cat) => ({
                    to: `/shop?category=${encodeURIComponent(cat.id)}`,
                    label: cat.label,
                  }))
                : FALLBACK_SHOP_LINKS
              ).map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-brand-ink transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand" />
              اطلاعات تماس
            </h3>
            <ul className="space-y-3.5 text-xs font-bold text-stone-600 dark:text-stone-400 max-sm:mx-auto max-sm:w-fit">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand-ink" />
                <span className="leading-6">
                  {address || 'آدرس فروشگاه در صفحه تماس با ما'}
                </span>
              </li>
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-brand-ink" />
                  <a href={`tel:${phone}`} dir="ltr" className="hover:text-brand-ink transition-colors">
                    {toPersianDigits(phone)}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-brand-ink" />
                <span className="leading-6">شنبه تا پنجشنبه، ۹ صبح تا ۹ شب</span>
              </li>
            </ul>

            {/* Enamad (electronic trust badge) placeholder — replaced with
                the real script tag once the license is issued. */}
            <a
              href="#"
              aria-label="نماد اعتماد الکترونیکی"
              title="نماد اعتماد الکترونیکی"
              onClick={(e) => e.preventDefault()}
              className="mt-5 inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-dashed border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-white/4 text-center"
            >
              <span className="text-[10px] font-bold leading-5 text-stone-400 dark:text-stone-500 px-2">
                جای نماد اعتماد
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-200/70 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-500 text-center sm:text-right">
            © {jalaliYear} پولاریس استایل — تمامی حقوق محفوظ است.
          </p>
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-500">
            طراحی و توسعه:{' '}<a href="https://MRez.dev" target="_blank" rel="noopener noreferrer" className="text-brand-ink font-black hover:underline underline-offset-4">MRez</a>
          </p>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 dark:text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-ink" />
            کیفیت منتخب، تحویل به‌موقع
          </p>
        </div>
      </div>
    </footer>
  );
};
