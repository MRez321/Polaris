import React, { useEffect, useState } from 'react';
import {
  WifiOff,
  RefreshCw,
  X,
  ShieldAlert,
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
    wasOffline,
    clearWasOffline,
    checkConnection,
  } = networkStatus;

  // Green success glow: shown for 5 seconds after reconnecting, then gone.
  const [showSuccessGlow, setShowSuccessGlow] = useState(false);

  // Dismissable popup: user can close it; it re-appears on the next disconnect.
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    if (wasOffline && isFullyConnected) {
      setShowSuccessGlow(true);
      const timer = setTimeout(() => {
        setShowSuccessGlow(false);
        clearWasOffline();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isFullyConnected, clearWasOffline]);

  // Bring the popup back whenever the connection drops again.
  useEffect(() => {
    if (!isFullyConnected) {
      setPopupDismissed(false);
    }
  }, [isFullyConnected]);

  const disconnected = !isFullyConnected;

  return (
    <div className="z-50 pointer-events-none" dir="rtl">
      {/* 1. Pulsing screen-edge glow: red while disconnected, green 5s after reconnect */}
      {disconnected ? (
        <div className="fixed inset-0 z-[60] pointer-events-none guardian-border-red" aria-hidden="true" />
      ) : showSuccessGlow ? (
        <div className="fixed inset-0 z-[60] pointer-events-none guardian-border-green" aria-hidden="true" />
      ) : null}

      {/* 2. Disconnected: dismissable centered popup (auto-retry every 10s) */}
      {disconnected && !popupDismissed && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="pointer-events-auto w-full max-w-md glass-modal rounded-2xl p-5 text-white shadow-2xl border-2 border-rose-500/60 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 ring-2 ring-rose-500/40 animate-pulse shadow-inner">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    {!isOnline ? 'دستگاه در وضعیت آفلاین است' : 'قطع ارتباط با سرور کارگاه'}
                  </h4>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10px] font-bold border border-rose-500/30">
                    ثبت اطلاعات متوقف شد
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPopupDismissed(true)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="بستن هشدار قطع اتصال"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-300 mt-3 leading-relaxed font-medium">
              برای جلوگیری از عدم ثبت اسناد مالی و مغایرت انبار، لطفاً تا برقراری مجدد اتصال از ثبت بار جدید، دریافت وجه یا ویرایش حساب‌ها خودداری فرمایید.
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[10px] text-stone-400 font-medium leading-relaxed">
                تلاش خودکار برای اتصال مجدد هر {toPersianDigits(10)} ثانیه…
              </span>
              <button
                onClick={() => checkConnection()}
                disabled={isChecking}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'در حال بررسی...' : 'بررسی مجدد اتصال'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
