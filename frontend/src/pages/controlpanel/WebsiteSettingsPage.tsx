import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage, websiteApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * General settings of the public website (admin only). Moved out of the
 * workshop settings panel so /app stays strictly about the workshop.
 */
export const WebsiteSettingsPage: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [siteTitle, setSiteTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  usePageMeta(
    'تنظیمات وب‌سایت',
    'مدیریت تنظیمات ویترین عمومی پولاریس استایل.',
    '/controlpanel/website'
  );

  const load = async () => {
    try {
      setLoading(true);
      const s = await websiteApi.get();
      setEnabled(s.enabled);
      setSiteTitle(s.siteTitle);
      setDescription(s.description);
      setShowPrices(s.showPrices);
      setShowOutOfStock(s.showOutOfStock);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در بارگذاری تنظیمات وب‌سایت'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (isLoading) return null;
  // Authors have no business here — send them to the blog section.
  if (!user || !isAdmin) return <Navigate to={user ? '/controlpanel/blog' : '/login?next=%2Fcontrolpanel%2Fwebsite'} replace />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await websiteApi.update({
        enabled,
        siteTitle: siteTitle.trim(),
        description: description.trim(),
        showPrices,
        showOutOfStock,
      });
      setEnabled(updated.enabled);
      setSiteTitle(updated.siteTitle);
      setDescription(updated.description);
      setShowPrices(updated.showPrices);
      setShowOutOfStock(updated.showOutOfStock);
      toast.success('تنظیمات وب‌سایت با موفقیت ذخیره گردید');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در ذخیره تنظیمات وب‌سایت'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            تنظیمات وب‌سایت عمومی
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-bold border',
                enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-stone-500/15 text-stone-500 dark:text-stone-400 border-stone-500/30'
              )}
            >
              {enabled ? 'منتشر شده' : 'غیرفعال'}
            </span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            نمای عمومی برند و رفتار ویترین اینترنتی را کنترل کنید.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          به‌روزرسانی
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-5"
        >
          {/* Publish toggle */}
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-stone-200 dark:border-white/10 cursor-pointer hover:border-brand/50 transition-colors">
            <div>
              <span className="text-sm font-black text-stone-900 dark:text-white block">
                انتشار وب‌سایت عمومی
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1 leading-5">
                با فعال‌سازی، ویترین عمومی برند برای بازدیدکنندگان اینترنتی قابل نمایش خواهد بود.
              </span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand rounded cursor-pointer mt-1 shrink-0"
            />
          </label>

          <Field>
            <FieldLabel htmlFor="ws-title">عنوان وب‌سایت</FieldLabel>
            <Input
              id="ws-title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="مثلاً: پوشاک پولاریس — تولیدی و پخش عمده"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ws-description">توضیحات و معرفی سایت</FieldLabel>
            <Textarea
              id="ws-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="متن معرفی برند که در صفحه اصلی وب‌سایت عمومی نمایش داده می‌شود…"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-stone-200 dark:border-white/10 cursor-pointer hover:border-brand/50 transition-colors">
              <div className="flex gap-2.5">
                {showPrices ? (
                  <Tags className="w-4 h-4 text-brand-ink shrink-0 mt-0.5" />
                ) : (
                  <EyeOff className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="text-xs font-black text-stone-900 dark:text-white block">
                    نمایش قیمت محصولات
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1 leading-5">
                    در صورت غیرفعال بودن، قیمت‌ها در ویترین عمومی مخفی می‌مانند.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
                className="w-4 h-4 accent-brand rounded cursor-pointer mt-0.5 shrink-0"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-stone-200 dark:border-white/10 cursor-pointer hover:border-brand/50 transition-colors">
              <div className="flex gap-2.5">
                <Eye className="w-4 h-4 text-brand-ink shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-stone-900 dark:text-white block">
                    نمایش کالاهای ناموجود
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1 leading-5">
                    نمایش محصولات اتمام‌شده با برچسب «ناموجود» در ویترین عمومی.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showOutOfStock}
                onChange={(e) => setShowOutOfStock(e.target.checked)}
                className="w-4 h-4 accent-brand rounded cursor-pointer mt-0.5 shrink-0"
              />
            </label>
          </div>

          <Field>
            <FieldDescription>
              اطلاعات هویتی برند (نام، نشانی، تلفن، اینستاگرام و تلگرام) در پنل کارگاه،
              بخش «تنظیمات → مشخصات برند» مدیریت می‌شود و به‌صورت خودکار در وب‌سایت
              عمومی به نمایش درمی‌آید.
            </FieldDescription>
          </Field>

          <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-white/10">
            <Button
              type="submit"
              loading={saving}
              className="bg-brand hover:bg-brand-hover text-brand-on font-black"
            >
              ذخیره تنظیمات وب‌سایت
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default WebsiteSettingsPage;
