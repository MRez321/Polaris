import React from 'react';
import { MapPin, TrendingUp } from 'lucide-react';
import type { Seller } from '@/types';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
interface TopSellersCardProps {
  sellers: Seller[];
  onSelectSeller: (seller: Seller) => void;
  onRecordPayment: (sellerId: string) => void;
}

export const TopSellersCard: React.FC<TopSellersCardProps> = ({
  sellers = [],
  onSelectSeller,
  onRecordPayment,
}) => {
  // Sort sellers by total paid (best performance)
  const sortedSellers = [...(sellers || [])].sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0));

  return (
    <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center text-brand">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-brand font-black">فروشندگان برتر و راسته بساط‌ها</span>
          </h4>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            رتبه‌بندی بر اساس بیشترین حجم تسویه نقدی و فروش میدانی
          </p>
        </div>
      </div>

        {sellers.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 dark:text-gray-400">
            داده‌ای برای نمایش وجود ندارد
          </div>
        ) : (
      <div className="space-y-3">
        {sortedSellers.slice(0, 5).map((seller, index) => {
          const debtPercentage = Math.min(
            100,
            Math.round(((seller.currentDebt || 0) / (seller.creditLimit || 1)) * 100)
          );

          return (
            <div
              key={seller.id}
              className="p-3.5 rounded-xl glass-card hover:border-brand/40 transition-all group overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Seller Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                      index === 0
                        ? 'bg-brand text-brand-on ring-2 ring-brand/30 font-black'
                        : index === 1
                        ? 'bg-stone-300 dark:bg-[#252525] text-stone-800 dark:text-stone-200 border border-black/10 dark:border-white/10'
                        : 'bg-stone-200 dark:bg-[#1E1E1E] text-stone-600 dark:text-gray-400'
                    }`}
                  >
                    {toPersianDigits(index + 1)}
                  </div>

                  {/* Avatar thumbnail */}
                  <SafeImage
                    src={seller.avatarUrl}
                    alt={seller.name}
                    className="w-9 h-9 rounded-full object-cover border border-brand/40 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => onSelectSeller(seller)}
                        className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white hover:text-brand transition-colors text-right truncate max-w-[140px] sm:max-w-[200px]"
                      >
                        {seller.name}
                      </button>
                      <span className="text-[10px] text-stone-400 font-mono">({seller.code})</span>
                      {seller.currentDebt === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                          تسویه کامل
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{seller.streetLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Amount Paid Box - Guaranteed to stay inside box */}
                <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center shrink-0 bg-stone-100 dark:bg-black/40 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 min-w-[120px]">
                  <span className="text-[10px] text-stone-500 dark:text-gray-400 sm:order-2">کل تسویه‌ها:</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[120px] text-left sm:order-1" dir="ltr">
                    {formatToman(seller.totalPaid || 0)}
                  </span>
                </div>
              </div>

              {/* Debt progress & action bar */}
              <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <span className="text-stone-500 dark:text-gray-400 text-[10px] whitespace-nowrap">بدهی جاری:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 text-[11px] font-mono whitespace-nowrap" dir="ltr">
                    {formatToman(seller.currentDebt || 0)}
                  </span>
                  <div className="flex-1 max-w-[100px] bg-stone-200 dark:bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        debtPercentage > 85
                          ? 'bg-rose-500'
                          : debtPercentage > 50
                          ? 'bg-amber-500'
                          : 'bg-brand'
                      }`}
                      style={{ width: `${debtPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {toPersianDigits(debtPercentage)}٪
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectSeller(seller)}
                    className="px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-[11px] font-medium transition-colors"
                  >
                    پروفایل
                  </button>
                  <button
                    onClick={() => onRecordPayment(seller.id)}
                    className="px-3 py-1 rounded-lg bg-brand/20 hover:bg-brand text-brand hover:text-brand-on border border-brand/40 text-[11px] font-black transition-all active:scale-95 shadow-sm"
                  >
                    دریافت وجه
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
        )}
    </div>
  );
};
