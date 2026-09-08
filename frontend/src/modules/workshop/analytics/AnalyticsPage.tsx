import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Store,
  Users,
  Loader2,
  RefreshCw,
  Link2,
  Save,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AnalyticsResult } from '@/lib/api';
import { analyticsApi, companyApi, getApiErrorMessage } from '@/lib/api';
import { toPersianDigits, formatToman } from '@/utils/persian';

/**
 * Workshop analytics: cross-channel sales rankings (shop orders vs seller
 * consignments) plus the Google Analytics connection setting stored in
 * company_settings.data.analyticsSettings.
 */
export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gaId, setGaId] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [savingGa, setSavingGa] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [analytics, company] = await Promise.all([analyticsApi.get(), companyApi.get()]);
      setData(analytics);
      setGaId(company.analyticsSettings?.gaMeasurementId ?? '');
      setWebsiteUrl(company.analyticsSettings?.websiteUrl ?? '');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'بارگذاری تحلیل‌ها ناموفق بود'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveGa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGa(true);
    try {
      await companyApi.update({
        analyticsSettings: {
          gaMeasurementId: gaId.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
        },
      });
      toast.success('تنظیمات تحلیل وب‌سایت ذخیره شد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ذخیره تنظیمات ناموفق بود'));
    } finally {
      setSavingGa(false);
    }
  };

  // Only sellers with actual sales — the API returns all 29 with zeros.
  const activeSellers = useMemo(
    () => (data?.topSellers ?? []).filter((s) => s.totalSold > 0).sort((a, b) => b.totalSold - a.totalSold),
    [data]
  );

  const topItems = useMemo(
    () => (data?.topItems ?? []).filter((i) => i.totalSold > 0).sort((a, b) => b.totalSold - a.totalSold).slice(0, 10),
    [data]
  );

  const maxSellerSold = activeSellers[0]?.totalSold ?? 1;
  const maxItemSold = topItems[0]?.totalSold ?? 1;

  const variantTotal = (variants: { quantity: number }[]) =>
    variants.reduce((s, v) => s + v.quantity, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-stone-900 dark:text-white">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <BarChart3 className="w-5 h-5 text-brand-ink" />
            تحلیل فروش و پرفروش‌ها
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            مقایسه فروش فروشگاه آنلاین و کانال دست‌فروش‌ها بر اساس داده‌های واقعی
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-4 py-2.5 rounded-xl glass-input hover:border-brand font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          به‌روزرسانی
        </button>
      </div>

      {/* Channel summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-2xl space-y-1 border-r-4 border-r-emerald-500/60">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            فروش فروشگاه آنلاین:
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {toPersianDigits(data?.shopChannel.totalSold ?? 0)}
          </p>
          <p className="text-[10px] text-stone-400 font-mono" dir="ltr">
            {formatToman(data?.shopChannel.revenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1 border-r-4 border-r-sky-500/60">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            فروش دست‌فروش‌ها:
          </span>
          <p className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono" dir="ltr">
            {toPersianDigits(data?.sellerChannel.totalSold ?? 0)}
          </p>
          <p className="text-[10px] text-stone-400 font-mono" dir="ltr">
            {formatToman(data?.sellerChannel.revenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1 border-r-4 border-r-brand/60">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            مجموع فروش:
          </span>
          <p className="text-xl font-black text-brand-ink dark:text-brand font-mono" dir="ltr">
            {toPersianDigits(data?.totalSold ?? 0)}
          </p>
          <p className="text-[10px] text-stone-400 font-mono" dir="ltr">
            {formatToman(data?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1 border-r-4 border-r-violet-500/60">
          <span className="text-[11px] text-stone-500">پرفروش‌ترین کالا:</span>
          <p className="text-sm font-black leading-5">{topItems[0]?.itemName ?? '—'}</p>
          <p className="text-[10px] text-stone-400 font-mono" dir="ltr">
            {topItems[0] ? `${toPersianDigits(topItems[0].totalSold)} عدد` : '—'}
          </p>
        </div>
      </div>

      {/* Top items */}
      <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xl">
        <h3 className="font-black text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-ink" />
          پرفروش‌ترین کالاها (مجموع دو کانال)
        </h3>
        {topItems.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center">فروشی ثبت نشده است</p>
        ) : (
          <div className="space-y-3">
            {topItems.map((item, idx) => {
              const pct = Math.round((item.totalSold / maxItemSold) * 100);
              const sellerPct = item.totalSold ? Math.round((item.sellerSold / item.totalSold) * 100) : 0;
              return (
                <div key={item.itemId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                        {toPersianDigits(idx + 1)}
                      </span>
                      <span className="font-bold truncate">{item.itemName}</span>
                      <span className="text-[10px] font-mono text-stone-400">{item.itemCode}</span>
                    </span>
                    <span className="font-mono shrink-0" dir="ltr">
                      {toPersianDigits(item.totalSold)} عدد • {formatToman(item.revenue)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex" dir="ltr">
                    <div
                      className="h-full bg-emerald-500/80"
                      style={{ width: `${(pct * (100 - sellerPct)) / 100}%` }}
                      title={`فروشگاه: ${item.shopSold}`}
                    />
                    <div
                      className="h-full bg-sky-500/80"
                      style={{ width: `${(pct * sellerPct) / 100}%` }}
                      title={`دست‌فروش: ${item.sellerSold}`}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      فروشگاه: {toPersianDigits(item.shopSold)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500/80" />
                      دست‌فروش: {toPersianDigits(item.sellerSold)}
                    </span>
                    {variantTotal(item.byVariant) > 0 && (
                      <span>
                        سایز/رنگ پرفروش:{' '}
                        {item.byVariant
                          .slice()
                          .sort((a, b) => b.quantity - a.quantity)
                          .slice(0, 2)
                          .map((v) => `${v.size ?? ''}${v.size && v.color ? '/' : ''}${v.color ?? ''} (${toPersianDigits(v.quantity)})`)
                          .join('، ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Best sellers by channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xl">
          <h3 className="font-black text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-ink" />
            بهترین دست‌فروش‌ها (کانال امانی)
          </h3>
          {activeSellers.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">فروشی توسط دست‌فروش‌ها ثبت نشده است</p>
          ) : (
            <div className="space-y-3">
              {activeSellers.map((s, idx) => (
                <div key={s.sellerId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-black">
                        {toPersianDigits(idx + 1)}
                      </span>
                      <span className="font-bold">{s.sellerName}</span>
                    </span>
                    <span className="font-mono" dir="ltr">
                      {toPersianDigits(s.totalSold)} عدد • {formatToman(s.revenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500/80"
                      style={{ width: `${Math.max(4, Math.round((s.totalSold / maxSellerSold) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Size/color split by channel */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xl">
          <h3 className="font-black text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-ink" />
            پرفروش‌ترین سایزها و رنگ‌ها (فروشگاه)
          </h3>
          {(data?.shopChannel.byVariant ?? []).length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">داده‌ای موجود نیست</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(data?.shopChannel.byVariant ?? [])
                .slice()
                .sort((a, b) => b.quantity - a.quantity)
                .map((v, i) => (
                  <span
                    key={`${v.size ?? ''}-${v.color ?? ''}-${i}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20"
                  >
                    {v.size && `سایز ${v.size}`}
                    {v.size && v.color ? ' • ' : ''}
                    {v.color && `رنگ ${v.color}`}
                    {' — '}
                    <span className="font-mono">{toPersianDigits(v.quantity)}</span>
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* GA connection settings */}
      <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-black text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand-ink" />
            اتصال تحلیل وب‌سایت (Google Analytics)
          </h3>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-brand hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {websiteUrl}
            </a>
          )}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-5">
          شناسه اندازه‌گیری گوگل آنالیتیکس (مثل G-XXXXXXX یا UA-XXXXXXX) را وارد کنید تا در همه صفحات
          وب‌سایت عمومی فعال شود. آمار بازدید واقعی پس از اتصال، در پنل گوگل آنالیتیکس شما نمایش داده می‌شود.
        </p>
        <form onSubmit={handleSaveGa} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold mb-1">شناسه اندازه‌گیری (Measurement ID)</label>
            <input
              type="text"
              value={gaId}
              onChange={(e) => setGaId(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">آدرس وب‌سایت (اختیاری)</label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://polarisstyle.ir"
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={savingGa}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingGa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره تنظیمات
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnalyticsPage;
