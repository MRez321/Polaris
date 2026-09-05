import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Store, ShoppingCart, Newspaper, PhoneCall } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toPersianDigits } from '@/utils/persian';
import { cn } from '@/lib/utils';

/**
 * Public site mobile bottom navigation — mirrors the workshop MobileNav
 * rhythm: five slots with a lifted gold cart FAB in the center.
 * md:hidden; the desktop header nav covers >= md breakpoints.
 */
export const PublicMobileNav: React.FC = () => {
  const { count, openCart } = useCart();

  const routeClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors w-full',
      isActive
        ? 'text-brand-ink bg-brand/12 dark:bg-brand/10 border border-brand/25 dark:border-brand/20'
        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
    );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F8F7F4]/85 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-brand/25 dark:border-white/5 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl"
      aria-label="منوی موبایل"
    >
      <div className="grid grid-cols-5 items-center justify-items-center h-14 max-w-md mx-auto">
        {/* خانه */}
        <NavLink to="/" end className={routeClass}>
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold whitespace-nowrap">خانه</span>
        </NavLink>

        {/* فروشگاه */}
        <NavLink to="/shop" className={routeClass}>
          <Store className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold whitespace-nowrap">فروشگاه</span>
        </NavLink>

        {/* سبد خرید — center lifted FAB, opens the cart drawer */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center -translate-y-3.5"
          aria-label={`سبد خرید${count > 0 ? `، ${toPersianDigits(count)} کالا` : ''}`}
        >
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-deep to-brand text-white flex items-center justify-center shadow-lg shadow-brand-deep/40 ring-4 ring-[#F8F7F4] dark:ring-[#0A0A0A] transition-transform active:scale-95">
            <ShoppingCart className="w-5 h-5 text-white" />
            {count > 0 && (
              <span className="absolute -top-1 -left-1 min-w-4.5 h-4.5 px-1 rounded-full bg-brand text-brand-on text-[10px] font-black flex items-center justify-center shadow-md">
                {toPersianDigits(count)}
              </span>
            )}
          </span>
          <span className="text-[10px] whitespace-nowrap font-black text-brand-ink mt-0.5">
            سبد خرید
          </span>
        </button>

        {/* وبلاگ */}
        <NavLink to="/blog" className={routeClass}>
          <Newspaper className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold whitespace-nowrap">وبلاگ</span>
        </NavLink>

        {/* تماس با ما */}
        <NavLink to="/contact" className={routeClass}>
          <PhoneCall className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-bold whitespace-nowrap">تماس با ما</span>
        </NavLink>
      </div>
    </nav>
  );
};
