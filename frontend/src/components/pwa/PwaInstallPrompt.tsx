import React, { useState, useEffect } from 'react';
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
  const [, setShowIOSGuide] = useState<boolean>(false);

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed & opened from home screen)
    let isStandalone = false;
    try {
      isStandalone =
        Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
        (window.navigator as any)?.standalone === true ||
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
          setTimeout(() => {
            setIsOpen(true);
          }, 2500);
        }
      }
    };

    // 4. Listen for successful installation event
    const handleAppInstalled = () => {
      console.log('[PWA] Application was successfully installed.');
      setIsInstalled(true);
      setIsOpen(false);
      localStorage.setItem('pwa_is_installed', 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not dismissed and not installed, show after delay
    if (isIosDevice && !isStandalone && !storedInstalled) {
      const neverShow = localStorage.getItem('pwa_never_show') === 'true';
      const dismissedUntil = localStorage.getItem('pwa_dismissed_until');
      if (!neverShow && (!dismissedUntil || Date.now() > Number(dismissedUntil))) {
        setTimeout(() => {
          setIsOpen(true);
        }, 3500);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle force open from header/settings
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback for browsers without beforeinstallprompt
      setNoticeMessage('برای نصب وب‌اپلیکیشن روی این مرورگر، لطفاً از آیکون نصب در نوار آدرس یا منوی سه‌نقطه مرورگر، گزینه «Install App» یا «Add to Home screen» را انتخاب نمایید.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsInstalled(true);
        localStorage.setItem('pwa_is_installed', 'true');
        setIsOpen(false);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
    }
  };

  const handleDismissLater = () => {
    // Postpone for 2 days
    const twoDaysFromNow = Date.now() + 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa_dismissed_until', String(twoDaysFromNow));
    setIsOpen(false);
    if (onCloseForceOpen) onCloseForceOpen();
  };

  const handleNeverShowAgain = () => {
    localStorage.setItem('pwa_never_show', 'true');
    setIsOpen(false);
    if (onCloseForceOpen) onCloseForceOpen();
  };

  // If already installed or not open, don't render popup
  if (isInstalled && !forceOpen) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-lg glass-modal text-stone-900 dark:text-stone-100 rounded-3xl border border-[#CEAE80]/50 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Background ambient glow inside glass modal */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#CEAE80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismissLater}
          className="absolute top-4 left-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1c] via-[#121212] to-[#0a0a0a] border-2 border-[#CEAE80]/70 p-2 flex items-center justify-center shadow-xl ring-4 ring-[#CEAE80]/20 shrink-0">
            <img
              src="/icons/icon.svg"
              alt="لوگوی پولاریس استایل"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                نصب نسخه وب‌اپلیکیشن (PWA)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#CEAE80]/20 text-amber-800 dark:text-[#CEAE80] text-[10px] font-black border border-[#CEAE80]/40 glass-badge">
                رایگان و سریع
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-[#CEAE80] font-bold mt-0.5">
              سامانه جامع کارگاه و امانات پولاریس استایل
            </p>
          </div>
        </div>

        {/* Feature Benefits List */}
        <div className="space-y-2.5 pt-1 relative z-10">
          <div className="p-3 rounded-2xl glass-card flex items-start gap-3 text-xs text-stone-700 dark:text-stone-300">
            <Zap className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80] shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-900 dark:text-white font-bold block">دسترسی سریع و تمام‌صفحه:</strong>
              اجرای مستقیم از صفحه اصلی گوشی یا دسکتاپ بدون نیاز به باز کردن مرورگر و آدرس اینترنتی.
            </div>
          </div>

          <div className="p-3 rounded-2xl glass-card flex items-start gap-3 text-xs text-stone-700 dark:text-stone-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-900 dark:text-white font-bold block">پایش هوشمند اتصال و امنیت اسناد مالی:</strong>
              بررسی پیوسته ارتباط با سرور کارگاه برای جلوگیری از مفقودی تراکنش‌ها و ثبت امن دریافت‌ها و فاکتورها.
            </div>
          </div>

          <div className="p-3 rounded-2xl glass-card flex items-start gap-3 text-xs text-stone-700 dark:text-stone-300">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-900 dark:text-white font-bold block">پایداری عملکرد در محیط بازار:</strong>
              بارگذاری فوق‌العاده پرسرعت و بهینه‌سازی شده برای کار با گوشی در راسته بازار و کارگاه.
            </div>
          </div>
        </div>

        {/* iOS Step by step visual guide */}
        {isIOS && (
          <div className="p-4 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/30 space-y-2 text-xs text-stone-800 dark:text-stone-200 relative z-10 glass-card">
            <div className="flex items-center gap-2 font-black text-amber-800 dark:text-[#CEAE80]">
              <Smartphone className="w-4 h-4" />
              <span>راهنمای نصب روی آیفون و آیپد (Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-stone-600 dark:text-stone-300 pr-1">
              <li>
                در نوار پایین یا بالای مرورگر Safari، روی دکمه{' '}
                <strong className="text-stone-900 dark:text-white inline-flex items-center gap-1 mx-1">
                  <Share2 className="w-3.5 h-3.5 text-[#A67C38] dark:text-[#CEAE80]" /> Share
                </strong>{' '}
                بزنید.
              </li>
              <li>
                از منوی باز شده گزینه{' '}
                <strong className="text-stone-900 dark:text-white inline-flex items-center gap-1 mx-1">
                  <PlusSquare className="w-3.5 h-3.5 text-[#A67C38] dark:text-[#CEAE80]" /> Add to Home Screen
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
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#CEAE80] to-[#B59363] hover:from-[#DFBF91] hover:to-[#C6A474] text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#CEAE80]/20 transition-all active:scale-98"
          >
            <Download className="w-4 h-4 text-black" />
            <span>{isIOS ? 'مشاهده مجدد راهنمای نصب در آیفون' : 'نصب اپلیکیشن روی دستگاه'}</span>
          </button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleDismissLater}
              className="flex-1 py-2 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium transition-colors"
            >
              بعداً یادآوری کن
            </button>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <button
              onClick={handleNeverShowAgain}
              className="flex-1 py-2 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium transition-colors"
            >
              قبلاً نصب کرده‌ام / دیگر نمایش نده
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
