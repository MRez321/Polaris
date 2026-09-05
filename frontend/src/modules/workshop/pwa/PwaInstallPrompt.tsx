import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  X,
  Smartphone,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallPromptProps {
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
  forceOpen = false,
  onCloseForceOpen,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Track delayed-open timer ids so a pending auto-open can always be cancelled
  const delayedOpenTimersRef = useRef<number[]>([]);
  const clearDelayedOpenTimers = () => {
    delayedOpenTimersRef.current.forEach((id) => window.clearTimeout(id));
    delayedOpenTimersRef.current = [];
  };

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed & opened from home screen)
    let isStandalone = false;
    try {
      const nav: unknown = window.navigator;
      isStandalone =
        Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
        (typeof nav === 'object' && nav !== null && 'standalone' in nav && nav.standalone === true) ||
        Boolean(document.referrer && document.referrer.includes('android-app://'));
    } catch {
      isStandalone = false;
    }

    let storedInstalled = false;
    try {
      storedInstalled = localStorage.getItem('pwa_is_installed') === 'true';
    } catch {
      storedInstalled = false;
    }

    if (isStandalone || storedInstalled) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS / iPadOS
    const userAgent = (window.navigator?.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for Chrome / Android / Desktop PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed previously
      const dismissedUntil = localStorage.getItem('pwa_dismissed_until');
      const neverShow = localStorage.getItem('pwa_never_show') === 'true';

      if (!neverShow) {
        if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
          // Delay popup slightly for smooth initial app loading
          delayedOpenTimersRef.current.push(
            window.setTimeout(() => setIsOpen(true), 2500)
          );
        }
      }
    };

    // 4. Listen for successful installation event
    const handleAppInstalled = () => {
      console.log('[PWA] Application was successfully installed.');
      setIsInstalled(true);
      setIsOpen(false);
      delayedOpenTimersRef.current.forEach((id) => window.clearTimeout(id));
      delayedOpenTimersRef.current = [];
      try {
        localStorage.setItem('pwa_is_installed', 'true');
      } catch {
        /* storage unavailable */
      }
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not dismissed and not installed, show after delay
    if (isIosDevice && !isStandalone && !storedInstalled) {
      const neverShow = localStorage.getItem('pwa_never_show') === 'true';
      const dismissedUntil = localStorage.getItem('pwa_dismissed_until');
      if (!neverShow && (!dismissedUntil || Date.now() > Number(dismissedUntil))) {
        delayedOpenTimersRef.current.push(
          window.setTimeout(() => setIsOpen(true), 3500)
        );
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delayedOpenTimersRef.current.forEach((id) => window.clearTimeout(id));
      delayedOpenTimersRef.current = [];
    };
  }, []);

  // Handle force open from header/settings
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers without beforeinstallprompt — iOS Safari never
      // fires it, but iOS users already see the step-by-step guide inline.
      setNoticeMessage('برای نصب وب‌اپلیکیشن روی این مرورگر، لطفاً از آیکون نصب در نوار آدرس یا منوی سه‌نقطه مرورگر، گزینه «Install App» یا «Add to Home screen» را انتخاب نمایید.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsInstalled(true);
        setIsOpen(false);
        try {
          localStorage.setItem('pwa_is_installed', 'true');
        } catch {
          /* storage unavailable */
        }
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
    }
  };

  // Single close path for the X button, backdrop click and «بعداً یادآوری کن».
  // Closes first so a storage failure can never leave the banner stuck open,
  // then postpones the next automatic reminder for 2 days.
  const handleClose = () => {
    setIsOpen(false);
    onCloseForceOpen?.();
    clearDelayedOpenTimers();
    try {
      localStorage.setItem('pwa_dismissed_until', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
    } catch {
      /* storage unavailable — banner simply stays closed for this session */
    }
  };

  const handleNeverShowAgain = () => {
    setIsOpen(false);
    onCloseForceOpen?.();
    clearDelayedOpenTimers();
    try {
      localStorage.setItem('pwa_never_show', 'true');
    } catch {
      /* storage unavailable — banner simply stays closed for this session */
    }
  };

  // If already installed or not open, don't render popup
  if (isInstalled && !forceOpen) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg glass-modal text-stone-900 dark:text-stone-100 rounded-3xl border border-brand/50 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Background ambient glow inside glass modal */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-deep/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1c] via-[#121212] to-[#0a0a0a] border-2 border-brand/70 p-2 flex items-center justify-center shadow-xl ring-4 ring-brand/20 shrink-0">
            <img
              src="/icons/icon.svg"
              alt="لوگوی پولاریس استایل"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
              نصب نسخه وب‌اپلیکیشن
            </h3>
            <p className="text-xs text-brand-ink dark:text-brand font-bold mt-0.5">
              سامانه جامع کارگاه و امانات پولاریس استایل را مثل یک اپلیکیشن روی دستگاه خود داشته باشید.
            </p>
          </div>
        </div>

        {/* Feature Benefits List */}
        <div className="space-y-2.5 pt-1 relative z-10">
          <div className="p-3 rounded-2xl glass-card flex items-center gap-3 text-xs text-stone-700 dark:text-stone-300">
            <Zap className="w-4 h-4 text-brand-ink shrink-0" />
            <span>دسترسی سریع و تمام‌صفحه بدون باز کردن مرورگر</span>
          </div>

          <div className="p-3 rounded-2xl glass-card flex items-center gap-3 text-xs text-stone-700 dark:text-stone-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>پایش هوشمند اتصال؛ تراکنش‌ها حتی با قطعی اینترنت گم نمی‌شوند</span>
          </div>

          <div className="p-3 rounded-2xl glass-card flex items-center gap-3 text-xs text-stone-700 dark:text-stone-300">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>سرعت بالا و بهینه برای گوشی در بازار و کارگاه</span>
          </div>
        </div>

        {/* iOS Step by step visual guide */}
        {isIOS && (
          <div className="p-4 rounded-2xl bg-brand/15 border border-brand/30 space-y-2 text-xs text-stone-800 dark:text-stone-200 relative z-10 glass-card">
            <div className="flex items-center gap-2 font-black text-brand-ink dark:text-brand">
              <Smartphone className="w-4 h-4" />
              <span>راهنمای نصب روی آیفون و آیپد (Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-stone-600 dark:text-stone-300 pr-1">
              <li>
                در نوار پایین یا بالای مرورگر Safari، روی دکمه{' '}
                <strong className="text-stone-900 dark:text-white inline-flex items-center gap-1 mx-1">
                  <Share2 className="w-3.5 h-3.5 text-brand-ink" /> Share
                </strong>{' '}
                بزنید.
              </li>
              <li>
                از منوی باز شده گزینه{' '}
                <strong className="text-stone-900 dark:text-white inline-flex items-center gap-1 mx-1">
                  <PlusSquare className="w-3.5 h-3.5 text-brand-ink" /> Add to Home Screen
                </strong>{' '}
                (افزودن به صفحه اصلی) را انتخاب کنید.
              </li>
              <li>در گوشه بالا روی <strong>Add</strong> بزنید تا آیکون به صفحه گوشی شما اضافه شود.</li>
            </ol>
          </div>
        )}

        {/* Notice Message */}
        {noticeMessage && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed relative z-10 animate-in fade-in">
            {noticeMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 relative z-10">
          <button
            onClick={handleInstallClick}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand to-brand-hover hover:from-brand/85 hover:to-brand-hover/85 text-brand-on font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-brand/20 transition-all active:scale-98"
          >
            <Download className="w-4 h-4 text-brand-on" />
            <span>نصب اپلیکیشن روی دستگاه</span>
          </button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleClose}
              className="py-2 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium transition-colors"
            >
              بعداً یادآوری کن
            </button>
            <button
              onClick={handleNeverShowAgain}
              className="py-2 text-[10px] text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium transition-colors"
            >
              دیگر نمایش نده
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
