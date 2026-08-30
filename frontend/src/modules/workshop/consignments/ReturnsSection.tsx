import React, { useMemo, useState } from 'react';
import { AlertTriangle, PackageOpen, PlusCircle, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SelectBadge, SelectMenu, SelectOptionContent } from '@/components/ui/select-menu';
import type { Consignment, ConsignmentReturn, Seller } from '@/types';
import { formatToman, toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import type { ReturnPayload } from '@/lib/api';
import { ReturnModal } from './ReturnModal';

interface ReturnsSectionProps {
  returns: ConsignmentReturn[];
  consignments: Consignment[];
  sellers: Seller[];
  onSubmitReturn: (data: ReturnPayload) => void | Promise<void>;
}

/** فاکتور واجد شرایط مرجوعی: تسویه‌نشده و دارای حداقل یک ردیف با مانده برگشت */
const isReturnable = (c: Consignment): boolean =>
  !c.isDeleted && c.status !== 'settled' && c.items.some((it) => it.quantity - (it.returnedQuantity || 0) > 0);

const STATUS_LABELS: Record<Consignment['status'], string> = {
  active: 'فعال',
  partially_settled: 'تسویه جزئی',
  settled: 'تسویه شده',
  overdue: 'معوق',
};

export const ReturnsSection: React.FC<ReturnsSectionProps> = ({
  returns = [],
  consignments = [],
  sellers = [],
  onSubmitReturn,
}) => {
  const safeReturns = returns || [];
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState('');
  const [returnTarget, setReturnTarget] = useState<Consignment | null>(null);

  // فاکتورهای قابل مرجوع، جدیدترین اول
  const eligibleConsignments = useMemo(
    () =>
      (consignments || [])
        .filter(isReturnable)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [consignments]
  );

  // خلاصه وضعیت
  const totalReturnedAmount = useMemo(
    () => safeReturns.reduce((sum, r) => sum + (r.totalReturnAmount || 0), 0),
    [safeReturns]
  );
  const damagedItemsCount = useMemo(
    () =>
      safeReturns.reduce(
        (sum, r) => sum + r.items.filter((it) => it.condition === 'damaged').reduce((s, it) => s + it.quantity, 0),
        0
      ),
    [safeReturns]
  );

  const resolveSellerName = (r: ConsignmentReturn): string =>
    r.sellerName || sellers.find((s) => s.id === r.sellerId)?.name || 'نامشخص';

  const openPicker = () => {
    setPickerValue('');
    setIsPickerOpen(true);
  };

  const handleConfirmPick = () => {
    const chosen = eligibleConsignments.find((c) => c.id === pickerValue);
    if (!chosen) return;
    setIsPickerOpen(false);
    setReturnTarget(chosen);
  };

  return (
    <div className="space-y-4">
      {/* Header + action */}
      <div className="glass-panel p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-sm">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
              مرکز مدیریت مرجوعی‌های امانی
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-gray-400 hidden sm:block">
              سابقه کامل کالاهای برگشتی، ارزش کسرشده از بدهی و ثبت مرجوعی جدید
            </p>
          </div>
        </div>
        <button
          onClick={openPicker}
          disabled={eligibleConsignments.length === 0}
          title={
            eligibleConsignments.length === 0
              ? 'هیچ فاکتور امانی فعالی با مانده قابل مرجوع وجود ندارد'
              : undefined
          }
          className="px-3.5 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          ثبت مرجوعی جدید
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="glass-panel p-3 rounded-xl flex items-center justify-between shadow-sm border border-black/5 dark:border-white/10">
          <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400">تعداد رسید مرجوعی</span>
          <span className="text-sm font-black font-mono text-stone-900 dark:text-white">
            {toPersianDigits(safeReturns.length)}
          </span>
        </div>
        <div className="glass-panel p-3 rounded-xl flex items-center justify-between shadow-sm border border-emerald-500/20">
          <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400">مجموع ارزش مرجوعی</span>
          <span className="text-sm font-black font-mono text-emerald-700 dark:text-green-300">
            {formatToman(totalReturnedAmount)}
          </span>
        </div>
        <div className="glass-panel p-3 rounded-xl flex items-center justify-between shadow-sm border border-rose-500/20">
          <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400">اقلام معیوب برگشتی</span>
          <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {toPersianDigits(damagedItemsCount)} عدد
          </span>
        </div>
      </div>

      {/* History list */}
      {safeReturns.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-dashed border-stone-300 dark:border-white/10">
          <PackageOpen className="w-8 h-8 mx-auto text-stone-400 dark:text-gray-600" />
          <p className="text-xs font-bold text-stone-500 dark:text-gray-400">
            هنوز هیچ مرجوعی‌ای ثبت نشده است
          </p>
          <p className="text-[11px] text-stone-400 dark:text-gray-500">
            برای ثبت اولین مرجوعی از دکمه «ثبت مرجوعی جدید» استفاده کنید
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...safeReturns]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((r) => (
              <div
                key={r.id}
                className="glass-panel p-3.5 rounded-xl space-y-2.5 shadow-sm border border-black/5 dark:border-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-stone-200/80 dark:bg-white/10 text-[10px] font-mono font-bold text-stone-700 dark:text-gray-200">
                        {r.consignmentCode}
                      </span>
                      <h4 className="text-xs font-black text-stone-900 dark:text-white truncate">
                        فروشنده: {resolveSellerName(r)}
                      </h4>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-gray-400 mt-1">
                      تاریخ ثبت: {toJalaliDateTime(r.date)} • توسط: {r.processedBy || '—'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-700 dark:text-green-300 whitespace-nowrap">
                    {formatToman(r.totalReturnAmount)}
                  </span>
                </div>

                {/* Items summary */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200 dark:border-white/5">
                  {r.items.map((it, idx) => (
                    <span
                      key={`${it.itemId}-${idx}`}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${
                        it.condition === 'damaged'
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-green-300 border border-emerald-200 dark:border-emerald-500/20'
                      }`}
                    >
                      {it.itemName} × {toPersianDigits(it.quantity)}
                      <span className="opacity-70">{it.condition === 'damaged' ? '(معیوب)' : '(سالم)'}</span>
                    </span>
                  ))}
                </div>

                {r.items.some((it) => it.reason) && (
                  <p className="text-[10px] text-stone-500 dark:text-gray-400 leading-relaxed">
                    {r.items
                      .map((it) => it.reason)
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Consignment picker */}
      <Modal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="انتخاب فاکتور برای ثبت مرجوعی"
        subtitle={`فقط فاکتورهای تسویه‌نشده با مانده قابل برگشت (${toPersianDigits(eligibleConsignments.length)} مورد)`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-stone-900 dark:text-white">
          {eligibleConsignments.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-4">
              در حال حاضر هیچ فاکتور امانی قابل مرجوعی وجود ندارد.
            </p>
          ) : (
            <>
              <SelectMenu
                value={pickerValue}
                onChange={(v) => setPickerValue(v)}
                placeholder="فاکتور امانی را انتخاب کنید…"
                options={eligibleConsignments.map((c) => {
                  const availablePieces = c.items.reduce(
                    (s, it) => s + Math.max(0, it.quantity - (it.returnedQuantity || 0)),
                    0
                  );
                  return {
                    value: c.id,
                    label: (
                      <SelectOptionContent
                        primary={`${c.code} — ${c.sellerName}`}
                        badges={
                          <>
                            <SelectBadge tone="gold">{availablePieces} قلم مانده</SelectBadge>
                            <SelectBadge tone="blue">{STATUS_LABELS[c.status]}</SelectBadge>
                          </>
                        }
                        subtitle={`واگذاری: ${toJalaliDateTime(c.date)}`}
                      />
                    ),
                    triggerLabel: `${c.code} — ${c.sellerName}`,
                  };
                })}
              />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 text-sm font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPick}
                  disabled={!pickerValue}
                  className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-50 text-black font-black text-sm shadow-md transition-all active:scale-95"
                >
                  ادامه و ثبت اقلام
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Return modal for the chosen consignment */}
      <ReturnModal
        isOpen={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        consignment={returnTarget}
        onSubmitReturn={onSubmitReturn}
      />
    </div>
  );
};
