import React from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors,
  Plus,
  Moon,
  Sun,
  Bell,
  Receipt,
  Menu,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useTheme } from '@/context/ThemeContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { UserMenu } from '@/components/common/UserMenu';
import { useBrand } from '@/context/BrandContext';
import { SideMenu } from './SideMenu';
import { NotificationsPanel } from './NotificationsPanel';
import { notificationsApi } from '@/lib/api';

export const Header: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { openQuickHandover, openQuickPayment } = useUI();
  const { company } = useBrand();
  const [sideMenuOpen, setSideMenuOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Unread badge mirrors the notifications feed; refreshed with data cycle.
  const refreshUnread = React.useCallback(async () => {
    try {
      const feed = await notificationsApi.listFeed();
      setUnreadCount(feed.unreadCount);
    } catch {
      // badge stays at last value
    }
  }, []);
  React.useEffect(() => {
    void refreshUnread();
    const t = setInterval(() => void refreshUnread(), 60_000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200 dark:border-white/5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Hamburger FIRST in DOM — rightmost in RTL; opens the workshop side menu */}
        <button
          type="button"
          onClick={() => setSideMenuOpen(true)}
          className="md:hidden p-2.5 rounded-xl glass-card hover:border-brand text-stone-800 dark:text-gray-200 transition-all active:scale-95 shadow-sm shrink-0"
          aria-label="باز کردن منوی کارگاه"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo & Name — links to the public storefront, from company_settings */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer select-none min-w-0"
          title="بازگشت به سایت فروشگاه"
        >
          <div className="w-10 h-10 rounded-xl bg-brand text-brand-on flex items-center justify-center shadow-lg font-black shrink-0 ring-2 ring-brand/30 transition-transform active:scale-95 overflow-hidden">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.brandName || 'لوگو'} className="w-full h-full object-cover" />
            ) : (
              <Scissors className="w-5 h-5 -rotate-45 text-black" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white truncate">
              {company?.brandName || company?.name || 'پولاریس استایل'}
            </h1>
            <p className="text-[11px] text-stone-600 dark:text-gray-400 hidden sm:block font-medium">
              سیستم مدیریت کارگاه
            </p>
          </div>
        </Link>

        {/* Quick Actions & Utility controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Payment Button (desktop; mobile uses the bottom nav) */}
          <button
            onClick={() => openQuickPayment()}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl glass-card hover:border-brand text-stone-900 dark:text-stone-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="ثبت وجه دریافتی با تسویه زنجیره‌ای فاکتورها"
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="hidden sm:inline">وجه‌های دریافتی</span>
          </button>

          {/* Quick Handover Button (desktop; mobile uses the bottom nav) */}
          <button
            onClick={() => openQuickHandover()}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            title="تحویل بار جدید"
          >
            <Plus className="w-4 h-4 text-black" />
            <span className="hidden sm:inline">تحویل بار جدید</span>
          </button>

          {/* Notification center bell — always visible, opens the panel */}
          <button
            onClick={() => setBellOpen(true)}
            className="relative p-2 rounded-xl text-stone-700 dark:text-gray-300 glass-card hover:border-brand transition-colors"
            title="مرکز اعلان‌ها"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black">
                {toPersianDigits(unreadCount)}
              </span>
            )}
          </button>

          {/* Day / Night Theme Switcher */}
          <button
            onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
            className="p-2.5 rounded-xl glass-card hover:border-brand transition-all text-stone-800 dark:text-gray-200 shadow-sm"
            title={isDarkMode ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-brand" />
            ) : (
              <Moon className="w-4 h-4 text-stone-800" />
            )}
          </button>

          {/* Auth: shared role-aware user menu (login chip when signed out) */}
          <UserMenu className="glass-card" />

        </div>
      </div>

      <SideMenu open={sideMenuOpen} onOpenChange={setSideMenuOpen} />
      <NotificationsPanel open={bellOpen} onOpenChange={(o) => { setBellOpen(o); if (!o) void refreshUnread(); }} />
    </header>
  );
};
