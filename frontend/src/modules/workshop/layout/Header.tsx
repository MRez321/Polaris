import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors,
  Plus,
  Moon,
  Sun,
  Bell,
  Receipt,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useTheme } from '@/context/ThemeContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useNetwork } from '@/context/NetworkContext';
import { useData } from '@/modules/workshop/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
  const navigate = useNavigate();  const { isDarkMode, toggleTheme } = useTheme();
  const { openQuickHandover, openQuickPayment } = useUI();
  const networkStatus = useNetwork();
  const { consignments } = useData();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isFullyConnected = networkStatus.isFullyConnected;
  const latency = networkStatus.latency;

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200 dark:border-white/5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => navigate('/workshop')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#CEAE80] text-black flex items-center justify-center shadow-lg font-black shrink-0 ring-2 ring-[#CEAE80]/30 transition-transform active:scale-95">
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
        </div>

        {/* Live Network & Date Status Display in Nav */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Real-time Connection Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isFullyConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400 animate-pulse'
            }`}
            title={
              isFullyConnected
                ? `اتصال به سرور کارگاه پایدار است ${latency ? `(${toPersianDigits(latency)}ms)` : ''}`
                : 'قطع ارتباط با سرور - از ثبت اسناد مالی خودداری فرمایید'
            }
          >
            {isFullyConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>متصل و آنلاین</span>
                {latency && (
                  <span className="text-[10px] font-mono opacity-80 mr-1 hidden xl:inline">
                    {toPersianDigits(latency)}ms
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>آفلاین / قطع ارتباط</span>
              </>
            )}
          </div>

        </div>

        {/* Quick Actions & Utility controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Quick Payment Button */}
          <button
            onClick={() => openQuickPayment()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl glass-card hover:border-[#CEAE80] text-stone-900 dark:text-stone-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="ثبت وجه دریافتی با تسویه زنجیره‌ای فاکتورها"
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="hidden sm:inline">وجه‌های دریافتی</span>
          </button>

          {/* Quick Handover Button */}
          <button
            onClick={() => openQuickHandover()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
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
            className="p-2.5 rounded-xl glass-card hover:border-[#CEAE80] transition-all text-stone-800 dark:text-gray-200 shadow-sm"
            title={isDarkMode ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-[#CEAE80]" />
            ) : (
              <Moon className="w-4 h-4 text-stone-800" />
            )}
          </button>

          {/* Auth: login button when signed out, user chip + logout when signed in */}
          {user ? (
            <>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl glass-card shadow-sm"
                title={user.email}
              >
                <div className="w-7 h-7 rounded-full bg-[#CEAE80] text-black flex items-center justify-center text-xs font-black shrink-0 ring-1 ring-[#CEAE80]/30">
                  {user.name.trim().charAt(0)}
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs font-black text-stone-900 dark:text-white max-w-[7rem] truncate">
                    {user.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#CEAE80]/15 border border-[#CEAE80]/30 text-[#A67C38] dark:text-[#CEAE80] text-[10px] font-black">
                    {isAdmin ? 'مدیر' : 'کاربر'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-xl glass-card hover:border-rose-400 text-stone-800 dark:text-gray-200 hover:text-rose-500 dark:hover:text-rose-400 transition-all shadow-sm"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl glass-card hover:border-[#CEAE80] text-stone-900 dark:text-stone-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="ورود به حساب کاربری"
            >
              <LogIn className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80]" />
              <span className="hidden sm:inline">ورود</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
