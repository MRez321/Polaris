import React, { useEffect } from 'react';
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  X,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { NetworkStatus } from '../../hooks/useNetworkStatus';
import { toPersianDigits } from '../../utils/persian';

interface ConnectionGuardianProps {
  networkStatus: NetworkStatus;
}

export const ConnectionGuardian: React.FC<ConnectionGuardianProps> = ({ networkStatus }) => {
  const {
    isFullyConnected,
    isOnline,
    isChecking,
    latency,
    wasOffline,
    clearWasOffline,
    checkConnection,
  } = networkStatus;

  // Auto-dismiss reconnected toast after 4.5 seconds
  useEffect(() => {
    if (wasOffline) {
      const timer = setTimeout(() => {
        clearWasOffline();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, clearWasOffline]);

  return (
    <div className="z-50 pointer-events-none" dir="rtl">
      {/* 1. Offline / Disconnected Persistent Banner */}
      {!isFullyConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-auto bg-rose-950/80 backdrop-blur-xl text-white border-b-2 border-rose-500/80 shadow-2xl transition-all duration-300 animate-in slide-in-from-top">
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 ring-2 ring-rose-500/40 animate-pulse mt-0.5 sm:mt-0 shadow-inner">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-rose-300 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {!isOnline ? 'دستگاه در وضعیت آفلاین است' : 'قطع ارتباط با سرور کارگاه'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10px] font-bold border border-rose-500/30 glass-badge">
                    ثبت اطلاعات متوقف شد
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed font-medium">
                  برای جلوگیری از عدم ثبت اسناد مالی و مغایرت انبار، لطفاً تا برقراری مجدد اتصال از ثبت بار جدید، دریافت وجه یا ویرایش حساب‌ها خودداری فرمایید.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
              <button
                onClick={() => checkConnection()}
                disabled={isChecking}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'در حال بررسی...' : 'بررسی مجدد اتصال'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reconnection Success Toast */}
      {wasOffline && isFullyConnected && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 pointer-events-auto max-w-md glass-panel border border-emerald-500/40 shadow-2xl rounded-2xl p-4 text-stone-900 dark:text-white animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  اتصال به سرور برقرار گردید
                </h4>
                <button
                  onClick={clearWasOffline}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed">
                هم‌اکنون تمامی اطلاعات به‌روزرسانی شده و می‌توانید با امنیت کامل فاکتورها، حواله‌های امانی و دریافت‌ها را ثبت نمایید.
              </p>
              {latency && (
                <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400/90 font-mono font-bold">
                  پینگ سرور: {toPersianDigits(latency)} میلی‌ثانیه
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
