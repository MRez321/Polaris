import React, { useEffect, useState } from 'react';
import { Send, MessageSquare, BellRing, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { NotificationSettings, NotificationSettingsResponse } from '@/types';
import { notificationsApi, getApiErrorMessage } from '@/lib/api';

/**
 * Workshop notifications settings tab (اطلاع‌رسانی): outbound Telegram bot +
 * Melipayamak SMS panel. Secrets live in backend .env; this surface only
 * learns whether they are configured (badge) and edits the user-facing
 * switches, recipients, and test-sends.
 */
export const NotificationsManager: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const data = await notificationsApi.get();
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) toast.error(getApiErrorMessage(err, 'خطا در دریافت تنظیمات اطلاع‌رسانی'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = async (update: Partial<NotificationSettings>) => {
    if (!settings) return;
    // Optimistic UI; server returns the merged settings + env badges.
    const previous = settings;
    const optimistic: NotificationSettingsResponse = { ...settings, ...update };
    setSettings(optimistic);
    setIsSaving(true);
    try {
      const saved = await notificationsApi.update(update);
      setSettings(saved);
    } catch (err) {
      setSettings(previous);
      toast.error(getApiErrorMessage(err, 'ذخیره تنظیمات اطلاع‌رسانی ناموفق بود'));
    } finally {
      setIsSaving(false);
    }
  };

  const testTelegram = async () => {
    setTestingTelegram(true);
    try {
      const result = await notificationsApi.testTelegram();
      toast.success(result.message ?? 'پیام آزمایشی تلگرام ارسال شد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ارسال پیام تلگرام ناموفق بود'));
    } finally {
      setTestingTelegram(false);
    }
  };

  const testSms = async () => {
    if (!settings) return;
    if (!settings.sms.recipientPhone) {
      toast.error('ابتدا شماره موبایل دریافت‌کننده را وارد کنید');
      return;
    }
    setTestingSms(true);
    try {
      const result = await notificationsApi.testSms(settings.sms.recipientPhone);
      toast.success(result.message ?? 'پیامک آزمایشی ارسال شد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ارسال پیامک ناموفق بود'));
    } finally {
      setTestingSms(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="glass-panel p-10 rounded-2xl flex items-center justify-center shadow-xl">
        <Loader2 className="w-6 h-6 animate-spin text-[#CEAE80]" />
        <span className="ms-2 text-xs font-bold text-stone-500">در حال دریافت تنظیمات…</span>
      </div>
    );
  }

  const configBadge = (configured: boolean, configuredText: string, missingText: string) =>
    configured ? (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
        <ShieldCheck className="w-3 h-3" />
        {configuredText}
      </span>
    ) : (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black">
        <ShieldAlert className="w-3 h-3" />
        {missingText}
      </span>
    );

  const toggleRow = (
    checked: boolean,
    onChange: (value: boolean) => void,
    label: string,
    hint: string
  ) => (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span>
        <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">{label}</span>
        <span className="block text-[10px] text-stone-500 dark:text-gray-400">{hint}</span>
      </span>
      {/* Switch */}
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked
            ? 'bg-[#CEAE80] border-[#CEAE80]'
            : 'bg-stone-200 dark:bg-white/10 border-stone-300 dark:border-white/10'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`pointer-events-none absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all ${
            checked ? 'start-[1.375rem]' : 'start-0.5'
          }`}
        />
      </span>
    </label>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Telegram card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-[#CEAE80]" />
            <span>اطلاع‌رسانی تلگرام</span>
          </h4>
          {configBadge(settings.telegramConfigured, 'اتصال برقرار', 'توکن تنظیم نشده')}
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {toggleRow(
            settings.telegram.enabled,
            (v) => patch({ telegram: { ...settings.telegram, enabled: v } }),
            'فعال‌سازی کانال تلگرام',
            'با روشن کردن این گزینه، پیام‌های اطلاع‌رسانی به چت تلگرام کارگاه ارسال می‌شود'
          )}
          {toggleRow(
            settings.telegram.notifyNewOrder,
            (v) => patch({ telegram: { ...settings.telegram, notifyNewOrder: v } }),
            'اطلاع‌رسانی سفارش جدید فروشگاه',
            'با ثبت هر سفارش جدید در سایت فروشگاه، پیام فوری به تلگرام ارسال می‌شود'
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={testTelegram}
            disabled={testingTelegram || !settings.telegramConfigured}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black shadow-md transition-all active:scale-95"
          >
            {testingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            ارسال پیام آزمایشی
          </button>
        </div>
      </div>

      {/* Melipayamak SMS card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#CEAE80]" />
            <span>اطلاع‌رسانی پیامکی (ملی‌پیامک)</span>
          </h4>
          {configBadge(settings.smsConfigured, 'اتصال برقرار', 'کلید API تنظیم نشده')}
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {toggleRow(
            settings.sms.enabled,
            (v) => patch({ sms: { ...settings.sms, enabled: v } }),
            'فعال‌سازی کانال پیامک',
            'با روشن کردن این گزینه، پیام‌های اطلاع‌رسانی به شماره مدیر ارسال می‌شود'
          )}
          {toggleRow(
            settings.sms.notifyNewOrder,
            (v) => patch({ sms: { ...settings.sms, notifyNewOrder: v } }),
            'اطلاع‌رسانی سفارش جدید فروشگاه',
            'با ثبت هر سفارش جدید در سایت فروشگاه، پیامک فوری به شماره زیر ارسال می‌شود'
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold mb-1 text-stone-800 dark:text-stone-200">
              شماره موبایل دریافت‌کننده
            </label>
            <input
              type="tel"
              dir="ltr"
              inputMode="numeric"
              placeholder="09xxxxxxxxx"
              value={settings.sms.recipientPhone}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sms: { ...settings.sms, recipientPhone: e.target.value.replace(/[^\d]/g, '') },
                })
              }
              onBlur={() => patch({ sms: settings.sms })}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none"
            />
            <p className="mt-1 text-[10px] text-stone-500 dark:text-gray-400">
              پیام‌های اطلاع‌رسانی به این شماره ارسال می‌شود
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={testSms}
            disabled={testingSms || !settings.smsConfigured || !settings.sms.recipientPhone}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black shadow-md transition-all active:scale-95"
          >
            {testingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            ارسال پیامک آزمایشی
          </button>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CEAE80]" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        )}
        تغییرات به‌صورت خودکار ذخیره می‌شوند؛ توکن‌ها و کلیدهای اتصال فقط در فایل تنظیمات سرور نگهداری می‌شوند.
      </p>
    </div>
  );
};
