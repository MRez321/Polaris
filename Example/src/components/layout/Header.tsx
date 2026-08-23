import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Plus,
  Moon,
  Sun,
  Bell,
  Receipt,
  Calendar,
  Wifi,
  WifiOff,
  Download,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { NetworkStatus } from '../../hooks/useNetworkStatus';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onNewHandover: () => void;
  onNewPayment: () => void;
  overdueCount: number;
  networkStatus?: NetworkStatus;
  onOpenPwaInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  onNewHandover,
  onNewPayment,
  overdueCount,
  networkStatus,
  onOpenPwaInstall,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  const isFullyConnected = networkStatus ? networkStatus.isFullyConnected : true;
  const isChecking = networkStatus ? networkStatus.isChecking : false;
  const latency = networkStatus?.latency;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };

      try {
        const persianDate = new Intl.DateTimeFormat('fa-IR', dateOptions).format(now);
        const persianTime = new Intl.DateTimeFormat('fa-IR', timeOptions).format(now);
        setCurrentDateTime(`${persianDate} • ساعت ${persianTime}`);
      } catch {
        setCurrentDateTime(now.toLocaleTimeString('fa-IR'));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200 dark:border-white/5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#CEAE80] text-black flex items-center justify-center shadow-lg font-black shrink-0 ring-2 ring-[#CEAE80]/30 transition-transform active:scale-95">
            <Scissors className="w-5 h-5 -rotate-45 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                پولاریس استایل
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-[#CEAE80]/20 text-amber-900 dark:text-[#CEAE80] font-black border border-amber-600/30 dark:border-[#CEAE80]/40">
                سیستم مدیریت کارگاه
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-gray-400 hidden sm:block font-medium">
              سامانه حسابداری امانی و انبارگردانی راسته بازار پوشاک
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

          {/* Date & Time */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 text-xs text-stone-800 dark:text-stone-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#A67C38] dark:text-[#CEAE80]" />
            <span>{currentDateTime || 'در حال بارگذاری زمان...'}</span>
          </div>
        </div>

        {/* Quick Actions & Utility controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          {onOpenPwaInstall && (
            <button
              onClick={onOpenPwaInstall}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl glass-card hover:border-[#CEAE80] text-amber-700 dark:text-[#CEAE80] text-xs font-black transition-all active:scale-95 shadow-sm"
              title="نصب نسخه وب‌اپلیکیشن (PWA) روی گوشی یا دسکتاپ"
            >
              <Download className="w-4 h-4 text-amber-600 dark:text-[#CEAE80]" />
              <span className="hidden md:inline">نصب اپ</span>
            </button>
          )}

          {/* Quick Payment Button */}
          <button
            onClick={onNewPayment}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl glass-card hover:border-[#CEAE80] text-stone-900 dark:text-stone-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="ثبت وجه دریافتی با تسویه زنجیره‌ای فاکتورها"
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="hidden sm:inline">وجه‌های دریافتی</span>
          </button>

          {/* Quick Handover Button */}
          <button
            onClick={onNewHandover}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>تحویل بار جدید</span>
          </button>

          {/* Overdue alert indicator button */}
          {overdueCount > 0 && (
            <button
              onClick={() => setActiveTab('consignments')}
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
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="p-2.5 rounded-xl glass-card hover:border-[#CEAE80] transition-all text-stone-800 dark:text-gray-200 shadow-sm"
            title={isDarkMode ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-[#CEAE80]" />
            ) : (
              <Moon className="w-4 h-4 text-stone-800" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
