import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Consignment } from '../../types';
import { formatToman, toPersianDigits } from '../../utils/persian';
import { SelectMenu, SelectBadge, SelectOptionContent } from '../ui/select-menu';
interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment | null;
  onSubmitReturn: (data: {
    consignmentId: string;
    returnItems: {
      itemId: string;
      quantity: number;
      condition: 'healthy' | 'damaged';
      reason?: string;
    }[];
    notes?: string;
  }) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  consignment,
  onSubmitReturn,
}) => {
  if (!consignment) return null;

  // Track return quantity and condition per line
  const [returnQuantities, setReturnQuantities] = useState<{ [itemId: string]: number }>({});
  const [returnConditions, setReturnConditions] = useState<{ [itemId: string]: 'healthy' | 'damaged' }>({});
  const [returnReasons, setReturnReasons] = useState<{ [itemId: string]: string }>({});
  const [generalNotes, setGeneralNotes] = useState('');

  const handleQtyChange = (itemId: string, maxQty: number, value: string) => {
    const num = Math.min(maxQty, Math.max(0, Number(value) || 0));
    setReturnQuantities((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleConditionChange = (itemId: string, condition: 'healthy' | 'damaged') => {
    setReturnConditions((prev) => ({ ...prev, [itemId]: condition }));
  };

  let totalReturnAmount = 0;
  let totalReturnCount = 0;

  consignment.items.forEach((item) => {
    const qty = returnQuantities[item.itemId] || 0;
    totalReturnCount += qty;
    totalReturnAmount += qty * item.unitPrice;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedReturns: {
      itemId: string;
      quantity: number;
      condition: 'healthy' | 'damaged';
      reason?: string;
    }[] = [];

    consignment.items.forEach((item) => {
      const qty = returnQuantities[item.itemId] || 0;
      if (qty > 0) {
        formattedReturns.push({
          itemId: item.itemId,
          quantity: qty,
          condition: returnConditions[item.itemId] || 'healthy',
          reason: returnReasons[item.itemId] || 'مرجوعی کالای فروش نرفته',
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
      notes: generalNotes,
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
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/10 text-xs flex justify-between">
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

          {consignment.items.map((item) => {
            const availableToReturn = item.quantity - (item.returnedQuantity || 0);
            const currentReturnQty = returnQuantities[item.itemId] || 0;

            return (
              <div
                key={item.itemId}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#1A1A1E] space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                      {item.itemName}
                    </h5>
                    <span className="text-[11px] text-stone-500 dark:text-gray-400">
                      تحویل شده: {toPersianDigits(item.quantity)} عدد | برگشتی قبلی:{' '}
                      {toPersianDigits(item.returnedQuantity || 0)} عدد | قابل مرجوع:{' '}
                      <span className="font-bold text-amber-800 dark:text-[#CEAE80]">
                        {toPersianDigits(availableToReturn)} عدد
                      </span>
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-[#CEAE80]">
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
                      max={availableToReturn}
                      value={currentReturnQty || ''}
                      onChange={(e) =>
                        handleQtyChange(item.itemId, availableToReturn, e.target.value)
                      }
                      placeholder="۰"
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono font-bold outline-none focus:border-[#CEAE80]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">وضعیت کالا</label>
                    <SelectMenu
                      value={returnConditions[item.itemId] || 'healthy'}
                      onChange={(v) => handleConditionChange(item.itemId, v as 'healthy' | 'damaged')}
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
                      value={returnReasons[item.itemId] || ''}
                      onChange={(e) =>
                        setReturnReasons((prev) => ({
                          ...prev,
                          [item.itemId]: e.target.value,
                        }))
                      }
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
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-green-300 font-bold">
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
