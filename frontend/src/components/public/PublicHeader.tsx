import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Moon,
  ShoppingBag,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useBrand } from '@/context/BrandContext';
import { useCart } from '@/context/CartContext';
import { UserMenu } from '@/components/common/UserMenu';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/utils/persian';
import logoUrl from '@/assets/logo.png';

const NAV_LINKS = [
  { to: '/', label: 'خانه', end: true },
  { to: '/shop', label: 'فروشگاه' },
  { to: '/blog', label: 'وبلاگ' },
  { to: '/contact', label: 'تماس با ما' },
];

/**
 * Public marketing header — sticky, glassy, gold-accented.
 * Fully independent from the admin Header component. Hosts the cart trigger
 * and the shared role-aware user menu; navigation on mobile is handled by
 * the bottom nav (PublicMobileNav), so there is no hamburger here.
 */

export const PublicHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { company } = useBrand();
  const { count, openCart } = useCart();
  const brandName = company?.brandName?.trim() || 'پولاریس استایل';
  const tagline = company?.tagline?.trim() || 'فروشگاه پوشاک';
  const headerLogo = company?.logoUrl?.trim() || logoUrl;
  // Two-tone split keeps the last word gold-accented for any brand name.
  const nameWords = brandName.split(' ');
  const nameLast = nameWords.pop() ?? brandName;
  const nameFirst = nameWords.join(' ');


  // Add a shadow once the page scrolls behind the sticky bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-300',
        'bg-[#F8F7F4]/85 dark:bg-[#0A0A0A]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#F8F7F4]/70 dark:supports-[backdrop-filter]:bg-[#0A0A0A]/65',
        scrolled
          ? 'border-brand/25 shadow-lg shadow-black/5 dark:shadow-black/30'
          : 'border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-[4.5rem] flex items-center justify-between gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group" aria-label={brandName}>
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden ring-2 ring-brand/35 group-hover:ring-brand/70 transition-all shadow-md bg-white dark:bg-[#16161a]">
              <img src={headerLogo} alt={`لوگوی ${brandName}`} className="w-full h-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                {nameFirst} <span className="text-brand-ink">{nameLast}</span>
              </span>
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-wide">
                {tagline}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="منوی اصلی">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'relative px-3.5 py-2 rounded-xl text-sm font-bold transition-colors',
                    isActive
                      ? 'text-brand-ink bg-brand/12 dark:bg-brand/10'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 border border-transparent hover:border-brand/30 transition-all active:scale-95"
              title={isDarkMode ? 'حالت روشن' : 'حالت تیره'}
              aria-label={isDarkMode ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Cart */}
            <button
              type="button"
              onClick={openCart}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 border border-transparent hover:border-brand/30 transition-all active:scale-95"
              aria-label={`سبد خرید${count > 0 ? `، ${toPersianDigits(count)} کالا` : ''}`}
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              {count > 0 && (
                <span className="absolute -top-1 -left-1 min-w-4.5 h-4.5 px-1 rounded-full bg-brand-deep text-white text-[10px] font-black flex items-center justify-center shadow-md">
                  {toPersianDigits(count)}
                </span>
              )}
            </button>

            {/* Auth: shared role-aware user menu (login chip when signed out) */}
            <UserMenu loginTo="/" />
          </div>
        </div>
      </div>
    </header>
  );
};
