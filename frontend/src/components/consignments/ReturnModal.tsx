import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import type { Consignment, ConsignmentItemLine } from '../../types';
import { formatToman, toPersianDigits } from '../../utils/persian';
import { SelectMenu, SelectBadge, SelectOptionContent } from '../ui/select-menu';
import type { ReturnLinePayload, ReturnPayload } from '../../lib/api';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment | null;
  onSubmitReturn: (data: ReturnPayload) => void;
}

interface LineReturnState {
  qty: number;
  condition: 'healthy' | 'damaged';
  reason: string;
}

const EMPTY_LINE_STATE: LineReturnState = { qty: 0, condition: 'healthy', reason: '' };

/** هر ردیف فاکتور یک واریانت مستقل است: itemId + سایز + رنگ */
const lineKeyOf = (item: ConsignmentItemLine): string =>
  `${item.itemId}::${item.selectedSize ?? ''}::${item.selectedColor ?? ''}`;

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  consignment,
  onSubmitReturn,
}) => {
  // --- Hooks first (rules-of-hooks): early return happens AFTER all hooks ---
  const [lineStates, setLineStates] = useState<Record<string, LineReturnState>>({});
  const [generalNotes, setGeneralNotes] = useState('');

  // پاک‌سازی فرم هنگام بستن مودال یا تغییر فاکتور
  useEffect(() => {
    if (!isOpen) {
      setLineStates({});
      setGeneralNotes('');
    }
  }, [isOpen]);

  useEffect(() => {
    setLineStates({});
    setGeneralNotes('');
  }, [consignment?.id]);

  if (!isOpen || !consignment) return null;

  // فقط ردیف‌هایی که مانده قابل مرجوع دارند
  const returnableLines = consignment.items
    .map((item) => ({
      item,
      key: lineKeyOf(item),
      remaining: item.quantity - (item.returnedQuantity || 0),
    }))
    .filter((line) => line.remaining > 0);

  const updateLine = (key: string, patch: Partial<LineReturnState>) => {
    setLineStates((prev) => ({
      ...prev,
      [key]: { ...EMPTY_LINE_STATE, ...prev[key], ...patch },
    }));
  };

  const getLineQty = (key: string, remaining: number): number =>
    Math.min(lineStates[key]?.qty ?? 0, remaining);

  const handleQtyChange = (key: string, maxQty: number, value: string) => {
    const num = Math.min(maxQty, Math.max(0, Number(value) || 0));
    updateLine(key, { qty: num });
  };

  let totalReturnCount = 0;
  let totalReturnAmount = 0;
  returnableLines.forEach(({ item, key, remaining }) => {
    const qty = getLineQty(key, remaining);
    totalReturnCount += qty;
    totalReturnAmount += qty * item.unitPrice;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedReturns: ReturnLinePayload[] = [];
    returnableLines.forEach(({ item, key, remaining }) => {
      const state = lineStates[key];
      const qty = Math.min(state?.qty ?? 0, remaining);
      if (qty > 0) {
        formattedReturns.push({
          itemId: item.itemId,
          quantity: qty,
          condition: state?.condition ?? 'healthy',
          reason: state?.reason?.trim() || 'مرجوعی کالای فروش نرفته',
          selectedSize: item.selectedSize || undefined,
          selectedColor: item.selectedColor || undefined,
        });
      }
    });

    if (formattedReturns.length === 0) {
      alert('لطفاً تعداد مرجوعی را برای حداقل یک قلم کالا مشخص فرمایید');
      return;
    }

    onSubmitReturn({
      consignmentId: consignment.id,
      returnItems: formattedReturns,
      notes: generalNotes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ثبت مرجوعی کالا - فاکتور امانی ${consignment.code}`}
      subtitle={`فروشنده: ${consignment.sellerName} • کسر خودکار از مانده بدهی و بازگشت به انبار`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/10 text-xs flex flex-wrap justify-between gap-2">
          <span className="text-stone-500 dark:text-gray-400">ارزش اولیه فاکتور: {formatToman(consignment.totalAmount)}</span>
          <span className="font-bold text-amber-800 dark:text-[#CEAE80] font-mono">
            مانده بدهی فعلی: {formatToman(consignment.remainingAmount)}
          </span>
        </div>

        {/* Lines list */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-stone-900 dark:text-white">
            اقلام موجود در این فاکتور امانی:
          </p>

          {returnableLines.length === 0 && (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#1A1A1E] text-center text-xs text-stone-500 dark:text-gray-400">
              همه اقلام این فاکتور قبلاً برگشت خورده است.
            </div>
          )}

          {returnableLines.map(({ item, key, remaining }) => {
            const currentReturnQty = getLineQty(key, remaining);
            const lineState = lineStates[key];

            return (
              <div
                key={key}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#1A1A1E] space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white break-words">
                      {item.itemName}
                    </h5>
                    {(item.selectedSize || item.selectedColor) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.selectedSize && (
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-white/10 text-[10px] font-bold text-stone-600 dark:text-gray-300">
                            سایز: {toPersianDigits(item.selectedSize)}
                          </span>
                        )}
                        {item.selectedColor && (
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-white/10 text-[10px] font-bold text-stone-600 dark:text-gray-300">
                            رنگ: {item.selectedColor}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] text-stone-500 dark:text-gray-400 block mt-1">
                      تحویل شده: {toPersianDigits(item.quantity)} عدد | برگشتی قبلی:{' '}
                      {toPersianDigits(item.returnedQuantity || 0)} عدد | قابل مرجوع:{' '}
                      <span className="font-bold text-amber-800 dark:text-[#CEAE80]">
                        {toPersianDigits(remaining)} عدد
                      </span>
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-[#CEAE80] whitespace-nowrap">
                    {formatToman(item.unitPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200 dark:border-white/5">
                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">
                      تعداد مرجوعی فعلی
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={currentReturnQty || ''}
                      onChange={(e) => handleQtyChange(key, remaining, e.target.value)}
                      placeholder="۰"
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono font-bold outline-none focus:border-[#CEAE80]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">وضعیت کالا</label>
                    <SelectMenu
                      value={lineState?.condition ?? 'healthy'}
                      onChange={(v) => updateLine(key, { condition: v as 'healthy' | 'damaged' })}
                      options={[
                        {
                          value: 'healthy',
                          label: (
                            <SelectOptionContent
                              primary="سالم"
                              badges={<SelectBadge tone="green">برگشت به انبار</SelectBadge>}
                            />
                          ),
                          triggerLabel: 'سالم (برگشت به انبار)',
                        },
                        {
                          value: 'damaged',
                          label: (
                            <SelectOptionContent
                              primary="معیوب"
                              badges={<SelectBadge tone="red">ضایعاتی</SelectBadge>}
                            />
                          ),
                          triggerLabel: 'معیوب / ضایعاتی',
                        },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">علت مرجوعی</label>
                    <input
                      type="text"
                      value={lineState?.reason ?? ''}
                      onChange={(e) => updateLine(key, { reason: e.target.value })}
                      placeholder="عدم فروش / سایز نامناسب"
                      className="w-full px-2 py-1.5 rounded-lg glass-input text-xs outline-none focus:border-[#CEAE80]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Return Summary */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-green-300 font-bold">
          <span>مجموع اقلام مرجوعی: {toPersianDigits(totalReturnCount)} عدد</span>
          <span className="font-black font-mono text-emerald-700 dark:text-green-300">
            مبلغ کسر شونده از بدهی: {formatToman(totalReturnAmount)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
            توضیحات نهایی رسید مرجوعی
          </label>
          <input
            type="text"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="مثلاً: تحویل گرفته شده توسط حسابدار در کارگاه"
            className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 text-sm font-bold transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={totalReturnCount === 0}
            className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-50 text-black font-black text-sm shadow-md transition-all active:scale-95"
          >
            ثبت مرجوعی و اصلاح حساب
          </button>
        </div>
      </form>
    </Modal>
  );
};
