import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Palette, RotateCcw, Save, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

import { companyApi, getApiErrorMessage } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { ImagePicker } from '@/components/common/ImagePicker';
import {
  derivePalette,
  isValidPrimaryColor,
  normalizePrimaryColor,
} from '@/lib/theme/derivePalette';
import type { CompanyTheme } from '@/types';

/** Form state: editable theme + brand identity fields. */
interface ThemeFormState {
  defaultMode: 'dark' | 'light';
  /** Empty string = default palette; otherwise '#rrggbb'. */
  primary: string;
  logoUrl: string;
  brandName: string;
  tagline: string;
}

const FALLBACK_FORM: ThemeFormState = {
  defaultMode: 'dark',
  primary: '',
  logoUrl: '',
  brandName: 'پولاریس استایل',
  tagline: 'فروشگاه پوشاک',
};

/** Hardcoded Gold — reset target. Matches derivePalette DEFAULT_DERIVED. */
const GOLD_PRIMARY = '#ceae80';

/**
 * Theme settings page: site-wide palette, default visitor mode, and public
 * brand identity (logo / name / tagline). Admin only; saves through the
 * merge-patch `/api/company` endpoint.
 */
export const ThemeSettingsPage: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const { theme: liveTheme } = useBrand();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ThemeFormState>(FALLBACK_FORM);

  usePageMeta(
    'تنظیمات ظاهری',
    'مدیریت پالت رنگی، حالت پیش‌فرض و هویت بصری سایت.',
    '/controlpanel/theme'
  );

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const c = await companyApi.get();
        if (cancelled) return;
        setForm({
          defaultMode: c.theme?.defaultMode === 'light' ? 'light' : 'dark',
          primary:
            c.theme?.palette.type === 'custom'
              ? c.theme.palette.primary
              : '',
          logoUrl: c.logoUrl ?? '',
          brandName: c.brandName ?? '',
          tagline: c.tagline ?? '',
        });
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در بارگذاری تنظیمات ظاهری'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  /** Live roles preview — only meaningful when a custom color is chosen. */
  const derived = useMemo(() => {
    const p = form.primary.trim();
    if (!p || !isValidPrimaryColor(p)) return null;
    return derivePalette(normalizePrimaryColor(p));
  }, [form.primary]);

  const isCustom = isValidPrimaryColor(form.primary.trim());
  const previewPrimary = isCustom ? normalizePrimaryColor(form.primary.trim()) : GOLD_PRIMARY;

  if (isLoading) return null;
  if (!user || !isAdmin)
    return (
      <Navigate
        to={user ? '/controlpanel/blog' : '/login?next=%2Fcontrolpanel%2Ftheme'}
        replace
      />
    );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = form.primary.trim();
    const theme: CompanyTheme = isValidPrimaryColor(p)
      ? { defaultMode: form.defaultMode, palette: { type: 'custom', primary: normalizePrimaryColor(p) } }
      : { defaultMode: form.defaultMode, palette: { type: 'default' } };
    try {
      setSaving(true);
      const updated = await companyApi.update({
        theme,
        logoUrl: form.logoUrl.trim(),
        brandName: form.brandName.trim(),
        tagline: form.tagline.trim(),
      });
      setForm({
        defaultMode: updated.theme?.defaultMode === 'light' ? 'light' : 'dark',
        primary: updated.theme?.palette.type === 'custom' ? updated.theme.palette.primary : '',
        logoUrl: updated.logoUrl ?? '',
        brandName: updated.brandName ?? '',
        tagline: updated.tagline ?? '',
      });
      toast.success('تنظیمات ظاهری با موفقیت ذخیره گردید');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در ذخیره تنظیمات ظاهری'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm((prev) => ({
      ...prev,
      defaultMode: 'dark',
      primary: '',
    }));
    toast.info('پالت پیش‌فرض (طلایی) بازنشانی شد — برای اعمال، ذخیره کنید');
  };

  const setPrimary = (value: string): void => {
    setForm((prev) => ({ ...prev, primary: value }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* ── پالت رنگی ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Palette className="w-4.5 h-4.5 text-brand-ink" />
          <h2 className="text-sm font-black text-stone-900 dark:text-white">پالت رنگی</h2>
        </header>

        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={previewPrimary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-12 h-12 rounded-xl cursor-pointer border border-stone-300 dark:border-white/20 bg-transparent"
              aria-label="انتخاب رنگ اصلی"
            />
            <div className="flex flex-col gap-1">
              <Input
                value={form.primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#CEAE80"
                dir="ltr"
                className="w-32 font-mono"
                aria-label="کد رنگ اصلی"
              />
              <p className="text-[10px] text-stone-500">
                کد رنگ به‌صورت hex انگلیسی وارد شود
              </p>
            </div>
          </div>

          <Field className="space-y-1.5">
            <FieldLabel>رنگ اصلی سایت</FieldLabel>
            <FieldDescription>
              یک رنگ دلخواه انتخاب کنید؛ تمام رنگ‌های اکشن، دکمه‌ها، حاشیه‌ها و
              طیف‌های سایت به‌صورت خودکار از آن ساخته می‌شوند. خالی بماند تا
              پالت طلایی پیش‌فرض استفاده شود.
            </FieldDescription>
            {form.primary.trim() !== '' && !isCustom && (
              <p className="text-[11px] font-bold text-rose-600">
                کد رنگ معتبر نیست — قالب صحیح: ‎#RRGGBB
              </p>
            )}
          </Field>
        </div>

        {/* Derived role swatches */}
        {derived && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
              نقش‌های رنگی مشتق‌شده (تاریک / روشن)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(
                [
                  ['--brand', 'اصلی', derived.light.brand, derived.dark.brand],
                  ['--brand-ink', 'متن', derived.light.brandInk, derived.dark.brandInk],
                  ['--brand-hover', 'هاور', derived.light.brandHover, derived.dark.brandHover],
                  ['--brand-deep', 'عمیق', derived.light.brandDeep, derived.dark.brandDeep],
                  ['--brand-on', 'روی', derived.light.brandOn, derived.dark.brandOn],
                  ['--brand-faint', 'محو', derived.light.brandFaint, derived.dark.brandFaint],
                ] as const
              ).map(([token, label, lightHex, darkHex]) => (
                <div
                  key={token}
                  className="rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden"
                >
                  <div className="h-8 flex">
                    <div className="flex-1" style={{ background: lightHex }} />
                    <div className="flex-1" style={{ background: darkHex }} />
                  </div>
                  <p className="text-[9px] font-bold text-stone-500 dark:text-stone-400 text-center py-1" dir="ltr">
                    {token}
                  </p>
                  <p className="text-[10px] font-black text-stone-700 dark:text-stone-300 text-center pb-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live preview strip — mini nav pill, primary button, glass card, input */}
        <div
          className="rounded-2xl p-4 space-y-3 border border-stone-200 dark:border-white/10"
          style={{ ['--brand' as string]: previewPrimary }}
        >
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
            پیش‌نمایش زنده (پیش از ذخیره، سایت اصلی تغییر نمی‌کند)
          </p>
          <div
            className="rounded-2xl p-4 space-y-3"
            style={
              {
                '--brand': previewPrimary,
                '--brand-hover': derived ? derived.light.brandHover : undefined,
                '--brand-on': derived ? derived.light.brandOn : undefined,
                '--brand-ink': derived ? derived.light.brandInk : previewPrimary,
                '--brand-deep': derived ? derived.light.brandDeep : undefined,
                '--brand-faint': derived ? derived.light.brandFaint : undefined,
              } as React.CSSProperties
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* nav pill */}
              <span className="px-4 py-2 rounded-full bg-brand text-brand-on text-xs font-black shadow-md">
                خانه
              </span>
              {/* primary button */}
              <span className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on text-xs font-bold transition-colors">
                افزودن به سبد
              </span>
              {/* ghost accent chip */}
              <span className="px-3 py-1.5 rounded-lg bg-brand/15 text-brand-ink text-[11px] font-bold border border-brand/30">
                برچسب طلایی
              </span>
            </div>
            {/* input replica */}
            <div className="rounded-xl border border-brand/30 bg-white dark:bg-white/5 px-3 py-2 text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>جست‌وجو در فروشگاه…</span>
              <span className="text-brand-ink">↵</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── حالت پیش‌فرض نمایش ───────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-2">
          {form.defaultMode === 'dark' ? (
            <Moon className="w-4.5 h-4.5 text-brand-ink" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-brand-ink" />
          )}
          <h2 className="text-sm font-black text-stone-900 dark:text-white">حالت پیش‌فرض نمایش</h2>
        </header>
        <Field className="space-y-1.5">
          <FieldLabel>بازدیدکننده بدون انتخاب، سایت را در چه حالتی ببیند؟</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['dark', 'تاریک', Moon],
                ['light', 'روشن', Sun],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, defaultMode: value }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  form.defaultMode === value
                    ? 'bg-brand text-brand-on border-brand font-black shadow-md'
                    : 'text-stone-600 dark:text-stone-300 border-stone-300 dark:border-white/15 hover:border-brand/50'
                }`}
                aria-pressed={form.defaultMode === value}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <FieldDescription>
            اگر کاربر خودش حالت تاریک/روشن را عوض کرده باشد، انتخاب او مقدم است.
          </FieldDescription>
        </Field>
      </section>

      {/* ── هویت بصری ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Palette className="w-4.5 h-4.5 text-brand-ink" />
          <h2 className="text-sm font-black text-stone-900 dark:text-white">هویت بصری</h2>
        </header>

        <Field className="space-y-1.5">
          <FieldLabel>لوگوی سایت</FieldLabel>
          <FieldDescription>
            لوگو در هدر و فوتر سایت عمومی نمایش داده می‌شود. اگر انتخاب نشود، لوگوی پیش‌فرض باقی می‌ماند.
          </FieldDescription>
          <ImagePicker
            values={form.logoUrl ? [form.logoUrl] : []}
            onChange={(urls) => setForm((prev) => ({ ...prev, logoUrl: urls[0] ?? '' }))}
            category="logo"
            addLabel="انتخاب لوگو"
            primaryLabel="لوگوی اصلی"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field className="space-y-1.5">
            <FieldLabel htmlFor="brand-name">نام برند</FieldLabel>
            <Input
              id="brand-name"
              value={form.brandName}
              onChange={(e) => setForm((prev) => ({ ...prev, brandName: e.target.value }))}
              placeholder="پولاریس استایل"
            />
            <FieldDescription>نامی که در هدر سایت کنار لوگو دیده می‌شود.</FieldDescription>
          </Field>
          <Field className="space-y-1.5">
            <FieldLabel htmlFor="brand-tagline">شعار برند</FieldLabel>
            <Input
              id="brand-tagline"
              value={form.tagline}
              onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="فروشگاه پوشاک"
            />
            <FieldDescription>زیرنویس کوتاه زیر نام برند در هدر سایت.</FieldDescription>
          </Field>
        </div>

        {/* Public header live replica */}
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-[#F8F7F4] dark:bg-[#0A0A0A] px-4 py-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-brand/35 bg-white dark:bg-[#16161a] shadow-md">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="لوگو" className="w-full h-full object-cover" />
            ) : null}
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-base font-black text-stone-900 dark:text-white truncate">
              {form.brandName || 'پولاریس استایل'}
            </span>
            <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-wide truncate">
              {form.tagline || 'فروشگاه پوشاک'}
            </span>
          </span>
        </div>
      </section>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || loading} className="min-w-32">
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={saving || loading}
        >
          <RotateCcw className="w-4 h-4" />
          بازنشانی پالت
        </Button>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 flex-1 min-w-40">
          حالت فعال فعلی سایت: {liveTheme.palette.type === 'custom' ? 'رنگ سفارشی' : 'طلایی پیش‌فرض'}
        </p>
      </div>
    </form>
  );
};

export default ThemeSettingsPage;
