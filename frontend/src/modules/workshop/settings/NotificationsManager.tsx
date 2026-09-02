import React, { useEffect, useState } from 'react';
import {
  Send,
  MessageSquare,
  BellRing,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { NotificationSettings, NotificationSettingsResponse } from '@/types';
import { notificationsApi, getApiErrorMessage } from '@/lib/api';
import { PasswordInput } from '@/components/ui/password-input';
import { Switch } from '@/components/ui/switch';

/**
 * Workshop notifications settings tab (اطلاع‌رسانی): outbound Telegram bot +
 * Melipayamak SMS panel. Credentials are stored in the notification_settings
 * row (with .env as fallback) and are editable here — masked by PasswordInput
 * with a reveal toggle. Values save on blur; switches and toggles save
 * immediately (optimistic patch). The admin route returns real values.
 */

/**
 * One masked credential row. Local draft keeps typing responsive; commit
 * (save) fires on blur, matching the existing patch-on-blur flow.
 */
const MaskedField: React.FC<{
  label: string;
  hint: string;
  value: string;
  onCommit: (next: string) => void;
  placeholder: string;
}> = ({ label, hint, value, onCommit, placeholder }) => {
  const [draft, setDraft] = React.useState(value);
  const dirty = draft !== value;
  return (
    <div>
      <label className="block text-xs font-bold mb-1 text-stone-800 dark:text-stone-200">
        {label}
        {dirty && <Loader2 className="inline w-3 h-3 ms-1.5 animate-spin text-[#CEAE80]" />}
      </label>
      <PasswordInput
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (dirty) onCommit(draft.trim());
        }}
        placeholder={placeholder}
        className="glass-input text-xs sm:text-sm font-mono"
      />
      <p className="mt-1 text-[10px] text-stone-500 dark:text-gray-400">{hint}</p>
    </div>
  );
};

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
      // The test send refreshes the cached bot @username server-side.
      const fresh = await notificationsApi.get();
      setSettings(fresh);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ارسال پیام تلگرام ناموفق بود'));
    } finally {
      setTestingTelegram(false);
    }
  };

  const testSms = async (phone: string) => {
    setTestingSms(true);
    try {
      const result = await notificationsApi.testSms(phone);
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
    hint: string,
  ) => (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span>
        <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">{label}</span>
        <span className="block text-[10px] text-stone-500 dark:text-gray-400">{hint}</span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-checked:bg-[#CEAE80]"
      />
    </label>
  );

  const setSmsPhones = (phones: string[]) => {
    if (!settings) return;
    setSettings({ ...settings, sms: { ...settings.sms, recipientPhones: phones } });
  };

  const commitSmsPhones = (phones: string[]) => {
    if (!settings) return;
    patch({ sms: { ...settings.sms, recipientPhones: phones } });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Telegram card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-[#CEAE80]" />
            <span>اطلاع‌رسانی تلگرام</span>
          </h4>
          <div className="flex items-center gap-2">
            {settings.botUsername && (
              <a
                href={`https://t.me/${settings.botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[10px] font-black hover:bg-sky-500/25 transition-colors"
                dir="ltr"
              >
                <ExternalLink className="w-3 h-3" />
                @{settings.botUsername}
              </a>
            )}
            {configBadge(settings.telegramConfigured, 'اتصال برقرار', 'توکن تنظیم نشده')}
          </div>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {toggleRow(
            settings.telegram.enabled,
            (v) => patch({ telegram: { ...settings.telegram, enabled: v } }),
            'فعال‌سازی کانال تلگرام',
            'با روشن کردن این گزینه، پیام‌های اطلاع‌رسانی به چت تلگرام کارگاه ارسال می‌شود',
          )}
          {toggleRow(
            settings.telegram.notifyNewOrder,
            (v) => patch({ telegram: { ...settings.telegram, notifyNewOrder: v } }),
            'اطلاع‌رسانی سفارش جدید فروشگاه',
            'با ثبت هر سفارش جدید در سایت فروشگاه، پیام فوری به تلگرام ارسال می‌شود',
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <MaskedField
            label="توکن ربات تلگرام"
            hint="از @BotFather دریافت می‌شود؛ خالی بماند از فایل تنظیمات سرور خوانده می‌شود"
            value={settings.telegram.botToken}
            onCommit={(next) => patch({ telegram: { ...settings.telegram, botToken: next } })}
            placeholder="123456:ABC-DEF…"
          />
          <MaskedField
            label="شناسه چت (Chat ID)"
            hint="چت یا گروهی که پیام‌ها به آن ارسال می‌شود؛ خالی بماند از سرور خوانده می‌شود"
            value={settings.telegram.chatId}
            onCommit={(next) => patch({ telegram: { ...settings.telegram, chatId: next } })}
            placeholder="196677256"
          />
          <MaskedField
            label="آدرس پروکسی (اختیاری)"
            hint="تلگرام در ایران فیلتر است؛ درخواست‌های سرور از طریق این پروکسی HTTP(S) ارسال می‌شود"
            value={settings.telegram.proxyUrl}
            onCommit={(next) => patch({ telegram: { ...settings.telegram, proxyUrl: next } })}
            placeholder="http://user:pass@proxy:8080"
          />
        </div>

        {settings.botUsername && (
          <p className="text-[10px] text-stone-500 dark:text-gray-400">
            برای دریافت پیام‌ها ابتدا ربات را از طریق دکمه بالا باز کرده و روی <span dir="ltr">/start</span> بزنید.
          </p>
        )}

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
            'با روشن کردن این گزینه، پیام‌های اطلاع‌رسانی به شماره‌های زیر ارسال می‌شود',
          )}
          {toggleRow(
            settings.sms.notifyNewOrder,
            (v) => patch({ sms: { ...settings.sms, notifyNewOrder: v } }),
            'اطلاع‌رسانی سفارش جدید فروشگاه',
            'با ثبت هر سفارش جدید در سایت فروشگاه، پیامک فوری به شماره‌های زیر ارسال می‌شود',
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <MaskedField
            label="کلید API ملی‌پیامک"
            hint="از پنل کنسول ملی‌پیامک دریافت می‌شود؛ خالی بماند از فایل تنظیمات سرور خوانده می‌شود"
            value={settings.sms.apiKey}
            onCommit={(next) => patch({ sms: { ...settings.sms, apiKey: next } })}
            placeholder="b39f966b-…"
          />
          <MaskedField
            label="شماره خط ارسال"
            hint="خط فرستنده پیامک، مثل 9015867713؛ خالی بماند از فایل تنظیمات سرور خوانده می‌شود"
            value={settings.sms.fromNumber}
            onCommit={(next) => patch({ sms: { ...settings.sms, fromNumber: next } })}
            placeholder="9015867713"
          />
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold mb-1 text-stone-800 dark:text-stone-200">
            شماره موبایل دریافت‌کنندگان
          </label>
          <div className="space-y-2">
            {settings.sms.recipientPhones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <PasswordInput
                  value={phone}
                  onChange={(e) => {
                    const next = [...settings.sms.recipientPhones];
                    next[index] = e.target.value.replace(/[^\d]/g, '');
                    setSmsPhones(next);
                  }}
                  onBlur={() => {
                    const trimmed = settings.sms.recipientPhones[index];
                    if (trimmed && !/^09\d{9}$/.test(trimmed)) {
                      toast.error('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد');
                      return;
                    }
                    // Drop empty draft rows before committing — the server
                    // schema rejects '' entries and would fail the whole save.
                    commitSmsPhones(settings.sms.recipientPhones.filter((p) => p !== ''));
                  }}
                  placeholder="09xxxxxxxxx"
                  inputMode="numeric"
                  className="glass-input text-xs sm:text-sm font-mono flex-1"
                />
                <button
                  type="button"
                  onClick={() => commitSmsPhones(settings.sms.recipientPhones.filter((_, i) => i !== index))}
                  disabled={testingSms}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                  aria-label="حذف شماره"
                  title="حذف شماره"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => testSms(phone)}
                  disabled={testingSms || !/^09\d{9}$/.test(phone) || !settings.smsConfigured}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black shadow-md transition-all active:scale-95 shrink-0"
                  title="ارسال پیامک آزمایشی به این شماره"
                >
                  {testingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  تست
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSmsPhones([...settings.sms.recipientPhones, ''])}
            disabled={settings.sms.recipientPhones.length >= 20}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CEAE80]/50 text-[#CEAE80] hover:bg-[#CEAE80]/10 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-black transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            افزودن شماره
          </button>
          <p className="mt-1 text-[10px] text-stone-500 dark:text-gray-400">
            پیام‌های اطلاع‌رسانی به همه این شماره‌ها ارسال می‌شود (حداکثر ۲۰ شماره)
          </p>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CEAE80]" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        )}
        تغییرات به‌صورت خودکار ذخیره می‌شوند؛ مقادیر مخفی‌شده با دکمه چشم قابل نمایش هستند و فقط مدیر سامانه به آن‌ها دسترسی دارد.
      </p>
    </div>
  );
};
