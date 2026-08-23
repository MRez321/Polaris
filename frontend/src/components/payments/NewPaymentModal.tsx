import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Seller, Consignment } from '../../types';
import { formatToman, toPersianDigits, toJalaliDate } from '../../utils/persian';
import { calculateFIFOAllocation } from '../../utils/fifo';
import { CheckCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: Seller[];
  consignments: Consignment[];
  preSelectedSellerId?: string;
  onSubmitPayment: (data: {
    sellerId: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'pos';
    trackingNumber?: string;
    notes?: string;
  }) => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  sellers,
  consignments,
  preSelectedSellerId,
  onSubmitPayment,
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState(
    preSelectedSellerId || (sellers.length > 0 ? sellers[0].id : '')
  );
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'pos'>('cash');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (preSelectedSellerId) {
      setSelectedSellerId(preSelectedSellerId);
    }
  }, [preSelectedSellerId]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);
  const sellerConsignments = consignments.filter((c) => c.sellerId === selectedSellerId);

  // Real-time FIFO simulation preview
  const numAmount = Number(amount) || 0;
  const fifoPreview = calculateFIFOAllocation(sellerConsignments, numAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) {
      alert('لطفاً فروشنده را انتخاب نمایید');
      return;
    }
    if (numAmount <= 0) {
      alert('مبلغ پرداختی باید بیشتر از صفر باشد');
      return;
    }

    onSubmitPayment({
      sellerId: selectedSellerId,
      amount: numAmount,
      paymentMethod,
      trackingNumber: trackingNumber.trim(),
      notes: notes.trim(),
    });

    // Joyful celebration if a big debt is settled
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#CEAE80', '#10B981', '#B59363'],
      });
    } catch {
      // ignore
    }

    onClose();
    setAmount('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت دریافت وجه و تسویه"
      subtitle="مبلغ دریافتی مستقیماً به فاکتورهای امانی تسویه نشده فروشنده به ترتیب تاریخ اختصاص می‌یابد."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Seller & Amount row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl glass-card border border-stone-200 dark:border-white/10">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
              فروشنده / پرداخت‌کننده *
            </label>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none font-medium"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white">
                  {s.name} — کل مانده بدهی: {formatToman(s.currentDebt)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-800 dark:text-[#CEAE80] mb-1 flex items-center justify-between">
              <span>مبلغ دریافتی (تومان) *</span>
              {selectedSeller && selectedSeller.currentDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(selectedSeller.currentDebt))}
                  className="text-[11px] text-amber-800 dark:text-[#CEAE80] font-bold hover:underline"
                >
                  تسویه کل مانده ({formatToman(selectedSeller.currentDebt)})
                </button>
              )}
            </label>
            <input
              type="number"
              required
              min="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثلاً: ۵,۰۰۰,۰۰۰"
              className="w-full px-3 py-2 rounded-xl glass-input border-2 border-[#CEAE80] text-sm font-bold font-mono outline-none text-stone-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
              روش دریافت وجه
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none focus:border-[#CEAE80]"
            >
              <option value="cash" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white">وجه نقد (دریافت حضوری سر بساط)</option>
              <option value="pos" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white">دستگاه کارت‌خوان سیار (POS)</option>
              <option value="bank_transfer" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white">انتقال بانکی / پایا / کارت به کارت</option>
              <option value="card" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white">کارت بانکی</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
              شماره پیگیری / شماره ارجاع فیش
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="کد ارجاع رسید یا شماره تراکنش"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none focus:border-[#CEAE80]"
            />
          </div>
        </div>

        {/* Real-time Dynamic Allocation Timeline Preview */}
        <div className="p-4 rounded-2xl glass-card border border-stone-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#CEAE80]" />
              <span className="text-amber-800 dark:text-[#CEAE80] font-black">پیش‌نمایش زنده تخصیص و تسویه فاکتورها</span>
            </h4>
            <span className="text-[11px] text-stone-500 dark:text-gray-400 font-mono">
              تعداد فاکتورهای مشمول: {toPersianDigits(fifoPreview.allocations.length)}
            </span>
          </div>

          {fifoPreview.allocations.length > 0 ? (
            <div className="space-y-2">
              {fifoPreview.allocations.map((alloc, index) => (
                <div
                  key={alloc.consignmentId}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-[#141416] border border-stone-200 dark:border-white/5 flex items-center justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-[#CEAE80] flex items-center justify-center font-black text-[10px] border border-amber-500/30">
                      {toPersianDigits(index + 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-white font-mono">
                          فاکتور {alloc.consignmentCode}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-gray-400">
                          (تاریخ: {toJalaliDate(alloc.consignmentDate)})
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 dark:text-gray-400">
                        بدهی قبل: {formatToman(alloc.remainingDebtBefore)} ➔ مانده بعد:{' '}
                        <span className="font-black text-rose-600 dark:text-[#CEAE80]">
                          {formatToman(alloc.remainingDebtAfter)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="font-black text-emerald-600 dark:text-green-400 font-mono block text-xs sm:text-sm">
                      +{formatToman(alloc.allocatedAmount)}
                    </span>
                    {alloc.isFullySettled ? (
                      <span className="text-[10px] text-emerald-600 dark:text-green-400 font-bold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> تسویه کامل
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">تسویه جزیی</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-stone-50 dark:bg-[#141416] rounded-xl border border-dashed border-stone-300 dark:border-white/10">
              <p className="text-xs text-stone-500 dark:text-gray-400">
                مبلغی وارد فرمایید تا فاکتورهای امانی به ترتیب تاریخ تسویه شوند.
              </p>
            </div>
          )}

          {fifoPreview.unallocatedAmount > 0 && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300 font-medium">
              مبلغ {formatToman(fifoPreview.unallocatedAmount)} بیش از کل بدهی فعلی فروشنده است و
              به‌عنوان بستانکاری در حساب ثبت می‌شود.
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
            یادداشت دریافت
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلاً: تسویه نقدی بساط شب عید یا پنج‌شنبه بازار"
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
            disabled={numAmount <= 0}
            className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-50 text-black font-black text-sm shadow-md transition-all active:scale-95"
          >
            تایید دریافت و تسویه فاکتورها
          </button>
        </div>
      </form>
    </Modal>
  );
};
