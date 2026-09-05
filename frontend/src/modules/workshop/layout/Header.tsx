import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useData } from '@/modules/workshop/context/DataContext';
import { UserMenu } from '@/components/common/UserMenu';
import { SideMenu } from './SideMenu';


export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { openQuickHandover, openQuickPayment } = useUI();
  const { consignments } = useData();
  const [sideMenuOpen, setSideMenuOpen] = React.useState(false);

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200 dark:border-white/5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name — links to the public storefront */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer select-none"
          title="بازگشت به سایت فروشگاه"
        >
          <div className="w-10 h-10 rounded-xl bg-brand text-brand-on flex items-center justify-center shadow-lg font-black shrink-0 ring-2 ring-brand/30 transition-transform active:scale-95">
            <Scissors className="w-5 h-5 -rotate-45 text-black" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
              پولاریس استایل
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

          {/* Overdue alert indicator button */}
          {overdueCount > 0 && (
            <button
              onClick={() => navigate('/workshop/consignments')}
              className="relative p-2 rounded-xl text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
              title={`${toPersianDigits(overdueCount)} فاکتور سررسید گذشته`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                {toPersianDigits(overdueCount)}
              </span>
            </button>
          )}

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

          {/* Hamburger: full workshop side menu (mobile only) */}
          <button
            type="button"
            onClick={() => setSideMenuOpen(true)}
            className="md:hidden p-2 rounded-xl glass-card hover:border-brand text-stone-800 dark:text-gray-200 transition-all active:scale-95 shadow-sm"
            aria-label="باز کردن منوی کارگاه"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SideMenu open={sideMenuOpen} onOpenChange={setSideMenuOpen} />
    </header>
  );
};
