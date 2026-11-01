/**
 * Overdue-debt alert for the dashboard.
 *
 * Rows are ordered oldest deadline first, so the longest-delayed invoice is the
 * one a manager sees first. More than `PAGE_SIZE` invoices page instead of
 * stretching the widget, and each row can extend its deadline by 1/2/3 days —
 * the preset resolves the alert without touching the debt itself.
 */
import React from 'react';
import { AlertTriangle, CalendarPlus, Clock, Loader2, PhoneCall } from 'lucide-react';
import type { Consignment, Seller } from '@/types';
import { formatToman, getDaysDifference, toJalaliDate, toPersianDigits } from '@/utils/persian';
import { Pagination } from '@/components/common/Pagination';

const PAGE_SIZE = 6;
const EXTEND_PRESETS = [1, 2, 3] as const;

interface OverdueAlertBannerProps {
  overdueConsignments: Consignment[];
  sellers: Seller[];
  onRecordPaymentForSeller: (sellerId: string) => void;
  /** Persists the extension; the caller refreshes dashboard data on success. */
  onExtendDueDate?: (consignmentId: string, days: number) => Promise<void> | void;
}

export const OverdueAlertBanner: React.FC<OverdueAlertBannerProps> = ({
  overdueConsignments = [],
  sellers = [],
  onRecordPaymentForSeller,
  onExtendDueDate,
}) => {
  const [page, setPage] = React.useState(1);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [extendingId, setExtendingId] = React.useState<string | null>(null);

  const sorted = React.useMemo(
    () =>
      [...overdueConsignments].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ),
    [overdueConsignments]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (sorted.length === 0) return null;

  const totalOverdue = sorted.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  const extend = async (consignmentId: string, days: number) => {
    if (!onExtendDueDate) return;
    setOpenMenuId(null);
    setExtendingId(consignmentId);
    try {
      await onExtendDueDate(consignmentId, days);
    } finally {
      setExtendingId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 p-4 sm:p-5 text-stone-900 dark:text-stone-100 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rose-300 dark:border-rose-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-rose-900 dark:text-rose-300">
              هشدار سررسید تسویه {toPersianDigits(sorted.length)} فاکتور امانی
            </h4>
            <p className="text-xs text-rose-800/80 dark:text-rose-400/80">
              مجموع طلب‌های سررسید گذشته:{' '}
              <span className="font-bold text-rose-900 dark:text-rose-200">
                {formatToman(totalOverdue)}
              </span>{' '}
              • مرتب‌شده از قدیمی‌ترین سررسید
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {pageRows.map((c) => {
          const seller = sellers.find((s) => s.id === c.sellerId);
          const daysOverdue = Math.abs(getDaysDifference(c.dueDate));
          const isExtending = extendingId === c.id;
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-[#141416] p-3.5 rounded-xl border border-rose-200 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                    {c.sellerName}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-800 dark:text-rose-300 font-mono border border-rose-500/20">
                    {c.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-stone-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-red-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {toPersianDigits(daysOverdue)} روز تاخیر
                  </span>
                  <span>سررسید: {toJalaliDate(c.dueDate)}</span>
                  <span>
                    مانده:{' '}
                    <span className="text-stone-800 dark:text-stone-200 font-bold">
                      {formatToman(c.remainingAmount)}
                    </span>
                  </span>
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
                {onExtendDueDate && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                      disabled={isExtending}
                      className="p-2 rounded-lg bg-stone-100 dark:bg-[#1E1E22] text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white border border-stone-200 dark:border-white/5 transition-colors disabled:opacity-50"
                      title="تمدید سررسید"
                      aria-expanded={openMenuId === c.id}
                    >
                      {isExtending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CalendarPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </button>
                    {openMenuId === c.id && (
                      <div className="absolute z-20 top-full end-0 mt-1 w-28 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1E1E22] shadow-xl p-1">
                        <p className="px-2 py-1 text-[10px] font-bold text-stone-500 dark:text-gray-400">
                          تمدید سررسید
                        </p>
                        {EXTEND_PRESETS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => void extend(c.id, days)}
                            className="w-full text-start px-2 py-1.5 rounded-lg text-[11px] font-bold text-stone-700 dark:text-gray-200 hover:bg-brand/10 hover:text-brand transition-colors"
                          >
                            {toPersianDigits(days)} روز
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRecordPaymentForSeller(c.sellerId)}
                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-brand-on text-xs font-black transition-colors shadow-sm active:scale-95"
                >
                  تسویه فوری
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length > PAGE_SIZE && (
        <Pagination
          currentPage={safePage}
          totalItems={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};
