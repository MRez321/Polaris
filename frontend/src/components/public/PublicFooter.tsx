import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Phone, Scissors, Send, ShieldCheck } from 'lucide-react';
import type { PublicCompanyInfo } from '@/types';
import { publicApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import logoUrl from '@/assets/logo.png';

const QUICK_LINKS = [
  { to: '/', label: 'خانه' },
  { to: '/shop', label: 'فروشگاه پوشاک' },
  { to: '/services', label: 'خدمات دوخت' },
  { to: '/contact', label: 'تماس با ما' },
];

const SERVICE_LINKS = [
  'دوخت شخصی کت و شلوار',
  'تغییر سایز و پرو',
  'تعمیرات و رفو لباس',
  'مشاوره انتخاب پارچه',
];

/** Current Jalali year, e.g. «۱۴۰۵» — used in the copyright line. */
const jalaliYear = toPersianDigits(
  new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(new Date())
);

/**
 * Public marketing footer — brand, quick links, services and live contact
 * info pulled from the public company endpoint. Independent from the admin
 * layout; no admin data or actions are exposed here.
 */
export const PublicFooter: React.FC = () => {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .company()
      .then((data) => {
        if (!cancelled) setCompany(data);
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

  return (
    <footer className="relative mt-auto border-t border-[#CEAE80]/20 bg-white dark:bg-[#0D0D10]">
      {/* Gold hairline glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#CEAE80]/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-[#CEAE80]/35 bg-white dark:bg-[#16161a] shadow-md">
                <img src={logoUrl} alt="لوگوی پولاریس استایل" className="w-full h-full object-cover" />
              </span>
              <div className="leading-tight">
                <p className="text-base font-black text-stone-900 dark:text-white">
                  پولاریس <span className="text-[#A67C38] dark:text-[#CEAE80]">استایل</span>
                </p>
                <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                  {company?.slogan?.trim() || 'دوخت شخصی و پوشاک آماده'}
                </p>
              </div>
            </div>
            <p className="text-xs leading-6 text-stone-600 dark:text-stone-400">
              {company?.tagline?.trim() ||
                'ترکیب هنر خیاطی سنتی با سلیقه روز؛ از دوخت شخصی کت و شلوار تا عرضه پوشاک آماده با کیفیت کارگاه.'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {instagram && (
                <a
                  href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="اینستاگرام پولاریس استایل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-[#A67C38] dark:hover:text-[#CEAE80] hover:border-[#CEAE80]/50 transition-all active:scale-95"
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-[#A67C38] dark:hover:text-[#CEAE80] hover:border-[#CEAE80]/50 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  aria-label="تماس تلفنی با پولاریس استایل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:text-[#A67C38] dark:hover:text-[#CEAE80] hover:border-[#CEAE80]/50 transition-all active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#CEAE80]" />
              دسترسی سریع
            </h3>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/login"
                  className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
                >
                  ورود به حساب کاربری
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#CEAE80]" />
              خدمات کارگاه
            </h3>
            <ul className="space-y-2.5">
              {SERVICE_LINKS.map((label) => (
                <li key={label}>
                  <Link
                    to="/services"
                    className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#CEAE80]" />
              اطلاعات تماس
            </h3>
            <ul className="space-y-3.5 text-xs font-bold text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#A67C38] dark:text-[#CEAE80]" />
                <span className="leading-6">
                  {address || 'آدرس کارگاه در صفحه تماس با ما'}
                </span>
              </li>
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-[#A67C38] dark:text-[#CEAE80]" />
                  <a href={`tel:${phone}`} dir="ltr" className="hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors">
                    {toPersianDigits(phone)}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <Scissors className="w-4 h-4 mt-0.5 shrink-0 text-[#A67C38] dark:text-[#CEAE80]" />
                <span className="leading-6">شنبه تا پنجشنبه، ۹ صبح تا ۹ شب</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-200/70 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-500 text-center sm:text-right">
            © {jalaliYear} پولاریس استایل — تمامی حقوق محفوظ است.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 dark:text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A67C38] dark:text-[#CEAE80]" />
            دوخت با کیفیت، تحویل به‌موقع
          </p>
        </div>
      </div>
    </footer>
  );
};
