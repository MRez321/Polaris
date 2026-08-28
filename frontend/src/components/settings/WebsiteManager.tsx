import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Globe,
  Loader2,
  Newspaper,
  RefreshCw,
  Save,
  ShoppingBag,
} from 'lucide-react';

import { getApiErrorMessage, websiteApi } from '../../lib/api';

type WebsiteTab = 'general' | 'products' | 'blog';

/**
 * Settings tab for the public marketing website.
 *
 * Scaffolding state: general site settings (title, description, visibility
 * toggles) are live and persisted. The «products» and «blog» sections are
 * structural placeholders for the future storefront/blog features — the
 * anonymous catalog API (/api/public/*) they will build on already exists.
 */
export const WebsiteManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WebsiteTab>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // General settings form state
  const [enabled, setEnabled] = useState(false);
  const [siteTitle, setSiteTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  const load = async () => {
    try {
      setIsLoading(true);
      const s = await websiteApi.get();
      setEnabled(s.enabled);
      setSiteTitle(s.siteTitle);
      setDescription(s.description);
      setShowPrices(s.showPrices);
      setShowOutOfStock(s.showOutOfStock);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در بارگذاری تنظیمات وب‌سایت'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl border border-[#CEAE80]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80] shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
              <span>وب‌سایت عمومی و ویترین اینترنتی</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  enabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-stone-500/15 text-stone-500 dark:text-gray-400 border-stone-500/30'
                }`}
              >
                {enabled ? 'منتشر شده' : 'غیرفعال'}
              </span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              مدیریت نمای عمومی برند: تنظیمات سایت، محصولات نمایشی و وبلاگ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-xl glass-card hover:border-[#CEAE80] text-xs font-bold flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>به‌روزرسانی</span>
        </button>
      </div>

      {/* Sub navigation */}
      <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-[#CEAE80] text-black shadow-sm'
              : 'text-stone-500 hover:text-white'
          }`}
        >
          تنظیمات عمومی
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-[#CEAE80] text-black shadow-sm'
              : 'text-stone-500 hover:text-white'
          }`}
        >
          محصولات سایت
        </button>

        <button
          onClick={() => setActiveTab('blog')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === 'blog'
              ? 'bg-[#CEAE80] text-black shadow-sm'
              : 'text-stone-500 hover:text-white'
          }`}
        >
          وبلاگ و اخبار
        </button>
      </div>

      {isLoading ? (
        <div className="p-10 flex items-center justify-center text-stone-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>در حال بارگذاری تنظیمات وب‌سایت…</span>
        </div>
      ) : (
        <>
          {/* ================= GENERAL SETTINGS ================= */}
          {activeTab === 'general' && (
            <form
              onSubmit={handleSave}
              className="glass-panel p-6 rounded-2xl space-y-5 shadow-xl border border-stone-200 dark:border-white/10 animate-in fade-in duration-200"
            >
              {/* Publish toggle */}
              <label className="flex items-start justify-between gap-4 p-4 rounded-xl glass-card cursor-pointer">
                <div>
                  <span className="text-sm font-black text-stone-900 dark:text-white block">
                    انتشار وب‌سایت عمومی
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    با فعال‌سازی، ویترین عمومی برند برای بازدیدکنندگان اینترنتی قابل نمایش خواهد بود.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#CEAE80] rounded cursor-pointer mt-1 shrink-0"
                />
              </label>

              <div>
                <label className="block text-xs font-bold mb-1">عنوان وب‌سایت</label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="مثلاً: پوشاک پولاریس — تولیدی و پخش عمده"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">توضیحات و معرفی سایت</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="متن معرفی برند که در صفحه اصلی وب‌سایت عمومی نمایش داده می‌شود…"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none resize-none"
                />
              </div>

              {/* Visibility toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start justify-between gap-3 p-4 rounded-xl glass-card cursor-pointer">
                  <div>
                    <span className="text-xs font-black text-stone-900 dark:text-white block">
                      نمایش قیمت محصولات
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1">
                      در صورت غیرفعال بودن، قیمت‌ها در ویترین عمومی مخفی می‌مانند.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                    className="w-4 h-4 accent-[#CEAE80] rounded cursor-pointer mt-0.5 shrink-0"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-4 rounded-xl glass-card cursor-pointer">
                  <div>
                    <span className="text-xs font-black text-stone-900 dark:text-white block">
                      نمایش کالاهای ناموجود
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1">
                      نمایش محصولات اتمام‌شده با برچسب «ناموجود» در ویترین عمومی.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={(e) => setShowOutOfStock(e.target.checked)}
                    className="w-4 h-4 accent-[#CEAE80] rounded cursor-pointer mt-0.5 shrink-0"
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-[11px] text-stone-400 leading-5">
                نکته: اطلاعات هویتی برند (نام، نشانی، تلفن، اینستاگرام و تلگرام) در تب
                «مشخصات برند» مدیریت می‌شود و به‌صورت خودکار در وب‌سایت عمومی به نمایش درمی‌آید.
              </div>

              <div className="flex justify-end pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'در حال ذخیره…' : 'ذخیره تنظیمات وب‌سایت'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= PRODUCTS (SCAFFOLD) ================= */}
          {activeTab === 'products' && (
            <div className="glass-panel p-8 rounded-2xl shadow-xl border border-stone-200 dark:border-white/10 animate-in fade-in duration-200">
              <div className="max-w-md mx-auto text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80] mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-stone-900 dark:text-white flex items-center justify-center gap-2">
                    <span>مدیریت محصولات وب‌سایت</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                      به‌زودی
                    </span>
                  </h5>
                  <p className="text-xs text-stone-500 dark:text-gray-400 leading-6 mt-2">
                    در این بخش امکان انتخاب محصولات از انبار برای نمایش در ویترین عمومی،
                    تعیین محصولات ویژه و چیدمان آن‌ها فراهم خواهد شد. زیرساخت فنی آن
                    (API عمومی کاتالوگ) هم‌اکنون آماده است.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-[11px] text-stone-400 leading-5 text-right">
                  امکانات برنامه‌ریزی‌شده:
                  <ul className="list-disc list-inside space-y-1 mt-1.5">
                    <li>انتخاب کالا از فهرست موجودی برای انتشار روی سایت</li>
                    <li>معرفی محصولات ویژه و پرفروش در صفحه اصلی</li>
                    <li>پنهان‌سازی قیمت یا موجودی برای بازدیدکنندگان</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ================= BLOG (SCAFFOLD) ================= */}
          {activeTab === 'blog' && (
            <div className="glass-panel p-8 rounded-2xl shadow-xl border border-stone-200 dark:border-white/10 animate-in fade-in duration-200">
              <div className="max-w-md mx-auto text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80] mx-auto">
                  <Newspaper className="w-7 h-7" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-stone-900 dark:text-white flex items-center justify-center gap-2">
                    <span>وبلاگ و اخبار کارگاه</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                      به‌زودی
                    </span>
                  </h5>
                  <p className="text-xs text-stone-500 dark:text-gray-400 leading-6 mt-2">
                    انتشار مطلب، اخبار و داستان‌های برند روی وب‌سایت عمومی در نسخه‌های
                    آینده فعال می‌شود. ساختار این بخش از هم‌اکنون برای توسعه پیش‌رو
                    آماده شده است.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-[11px] text-stone-400 leading-5 text-right">
                  امکانات برنامه‌ریزی‌شده:
                  <ul className="list-disc list-inside space-y-1 mt-1.5">
                    <li>نوشته و انتشار مطالب با تصویر و دسته‌بندی</li>
                    <li>پیش‌نویس، زمان‌بندی انتشار و بایگانی مطالب</li>
                    <li>نمایش آخرین مطالب در صفحه اصلی وب‌سایت</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
