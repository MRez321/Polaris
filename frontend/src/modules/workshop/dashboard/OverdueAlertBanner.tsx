import React from 'react';
import { AlertTriangle, PhoneCall, Clock } from 'lucide-react';
import type { Consignment, Seller } from '@/types';
import { formatToman, toPersianDigits, getDaysDifference } from '@/utils/persian';

interface OverdueAlertBannerProps {
  overdueConsignments: Consignment[];
  sellers: Seller[];
  onSelectConsignment: (consignment: Consignment) => void;
  onRecordPaymentForSeller: (sellerId: string) => void;
}

export const OverdueAlertBanner: React.FC<OverdueAlertBannerProps> = ({
  overdueConsignments = [],
  sellers = [],
  onRecordPaymentForSeller,
}) => {
  const safeOverdues = overdueConsignments || [];
  if (safeOverdues.length === 0) return null;

  const totalOverdue = safeOverdues.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

  return (
    <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 p-4 sm:p-5 text-stone-900 dark:text-stone-100 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-300 dark:border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-amber-900 dark:text-amber-300">
              هشدار سررسید تسویه {toPersianDigits(overdueConsignments.length)} فاکتور امانی
            </h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
              مجموع طلب‌های سررسید گذشته: <span className="font-bold text-amber-900 dark:text-amber-200">{formatToman(totalOverdue)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {overdueConsignments.map((c) => {
          const seller = sellers.find((s) => s.id === c.sellerId);
          const daysOverdue = Math.abs(getDaysDifference(c.dueDate));
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-[#141416] p-3.5 rounded-xl border border-amber-200 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                    {c.sellerName}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono border border-amber-500/20">
                    {c.code}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-red-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {toPersianDigits(daysOverdue)} روز تاخیر
                  </span>
                  <span>مانده: <span className="text-stone-800 dark:text-stone-200 font-bold">{formatToman(c.remainingAmount)}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {seller?.phone && (
                  <a
                    href={`tel:${seller.phone}`}
                    className="p-2 rounded-lg bg-stone-100 dark:bg-[#1E1E22] text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white border border-stone-200 dark:border-white/5 transition-colors"
                    title={`تماس با ${c.sellerName}`}
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </a>
                )}
                <button
                  onClick={() => onRecordPaymentForSeller(c.sellerId)}
                  className="px-3 py-1.5 rounded-lg bg-[#CEAE80] hover:bg-[#B59363] text-black text-xs font-black transition-colors shadow-sm active:scale-95"
                >
                  تسویه فوری
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
