import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import type { Seller, Consignment, ConsignmentItemLine } from '@/types';
import { formatToman, toPersianDigits, toJalaliDate } from '@/utils/persian';
import { calculateFIFOAllocation } from '@/modules/workshop/utils/fifo';
import { CheckCircle, Sparkles, Undo2, ChevronDown, TrendingDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SelectMenu, SelectBadge, SelectOptionContent } from '@/components/ui/select-menu';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import type { ReturnLinePayload, ReturnPayload } from '@/lib/api';

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
  /** ثبت مرجوعی اقلام فروش نرفته همزمان با دریافت وجه (پیش از پرداخت اجرا می‌شود) */
  onSubmitReturn: (data: ReturnPayload) => void | Promise<void>;
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

/** فاکتور قابل مرجوعی: حذف‌نشده، تسویه‌نشده و حداقل یک قلم با مانده مرجوعی */
const isReturnable = (c: Consignment): boolean =>
  !c.isDeleted &&
  c.status !== 'settled' &&
  c.items.some((it) => it.quantity - (it.returnedQuantity || 0) > 0);

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  sellers,
  consignments,
  preSelectedSellerId,
  onSubmitPayment,
  onSubmitReturn,
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState(
    preSelectedSellerId || (sellers.length > 0 ? sellers[0].id : '')
  );
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'pos'>('cash');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  // --- مرجوعی همراه دریافت ---
  const [returnsExpanded, setReturnsExpanded] = useState(false);
  const [lineStates, setLineStates] = useState<Record<string, LineReturnState>>({});

  useEffect(() => {
    if (preSelectedSellerId) {
      setSelectedSellerId(preSelectedSellerId);
    }
  }, [preSelectedSellerId]);

  // پاک‌سازی اقلام مرجوعی هنگام بستن مودال یا تغییر فروشنده
  useEffect(() => {
    if (!isOpen) {
      setLineStates({});
      setReturnsExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setLineStates({});
  }, [selectedSellerId]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);
  const sellerConsignments = consignments.filter((c) => c.sellerId === selectedSellerId);
  const returnableConsignments = sellerConsignments.filter(isReturnable);

  // --- محاسبه اقلام مرجوعی در انتظار ثبت ---
  const updateLine = (key: string, patch: Partial<LineReturnState>) => {
    setLineStates((prev) => ({
      ...prev,
      [key]: { ...EMPTY_LINE_STATE, ...prev[key], ...patch },
    }));
  };

  const getLineQty = (key: string, remaining: number): number =>
    Math.min(lineStates[key]?.qty ?? 0, remaining);

  const handleQtyChange = (key: string, maxQty: number, value: string) => {
    const num = Math.min(maxQty, Math.max(0, Math.floor(Number(value)) || 0));
    updateLine(key, { qty: num });
  };

  // ارزش مرجوعی در انتظار، به تفکیک هر فاکتور
  const pendingReturnValueByConsignment: Record<string, number> = {};
  let totalReturnCount = 0;
  let totalReturnValue = 0;
  let healthyCount = 0;
  let damagedCount = 0;

  returnableConsignments.forEach((c) => {
    let consValue = 0;
    c.items.forEach((item) => {
      const remaining = item.quantity - (item.returnedQuantity || 0);
      if (remaining <= 0) return;
      const key = `${c.id}::${lineKeyOf(item)}`;
      const qty = getLineQty(key, remaining);
      if (qty > 0) {
        const condition = lineStates[key]?.condition ?? 'healthy';
        consValue += qty * item.unitPrice;
        totalReturnCount += qty;
        totalReturnValue += qty * item.unitPrice;
        if (condition === 'healthy') healthyCount += qty;
        else damagedCount += qty;
      }
    });
    if (consValue > 0) pendingReturnValueByConsignment[c.id] = consValue;
  });

  const hasPendingReturns = totalReturnCount > 0;

  // بدهی مؤثر فروشنده پس از کسر مرجوعی‌های در انتظار
  const effectiveDebt = Math.max(0, (selectedSeller?.currentDebt || 0) - totalReturnValue);

  // Real-time FIFO simulation preview — روی مانده‌های تعدیل‌شده با مرجوعی
  const numAmount = amount || 0;
  const adjustedConsignments = hasPendingReturns
    ? sellerConsignments.map((c) =>
        pendingReturnValueByConsignment[c.id]
          ? {
              ...c,
              remainingAmount: Math.max(
                0,
                c.remainingAmount - pendingReturnValueByConsignment[c.id]
              ),
            }
          : c
      )
    : sellerConsignments;
  const fifoPreview = calculateFIFOAllocation(adjustedConsignments, numAmount);
  const debtAfterAll = Math.max(0, effectiveDebt - (numAmount - fifoPreview.unallocatedAmount));

  // اقلام مرجوعی آماده ارسال، به تفکیک فاکتور
  const buildPendingReturns = (): ReturnPayload[] => {
    const payloads: ReturnPayload[] = [];
    returnableConsignments.forEach((c) => {
      const returnItems: ReturnLinePayload[] = [];
      c.items.forEach((item) => {
        const remaining = item.quantity - (item.returnedQuantity || 0);
        if (remaining <= 0) return;
        const key = `${c.id}::${lineKeyOf(item)}`;
        const state = lineStates[key];
        const qty = Math.min(state?.qty ?? 0, remaining);
        if (qty > 0) {
          returnItems.push({
            itemId: item.itemId,
            quantity: qty,
            condition: state?.condition ?? 'healthy',
            reason: state?.reason?.trim() || 'مرجوعی کالای فروش نرفته',
            selectedSize: item.selectedSize || undefined,
            selectedColor: item.selectedColor || undefined,
          });
        }
      });
      if (returnItems.length > 0) {
        payloads.push({
          consignmentId: c.id,
          returnItems,
          notes: notes.trim()
            ? `${notes.trim()} — مرجوعی همراه دریافت وجه`
            : 'مرجوعی همراه دریافت وجه',
        });
      }
    });
    return payloads;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) {
      alert('لطفاً فروشنده را انتخاب نمایید');
      return;
    }
    if (numAmount <= 0) {
      alert('مبلغ دریافتی باید بیشتر از صفر باشد');
      return;
    }

    // ۱) ابتدا مرجوعی‌ها ثبت می‌شوند تا مانده فاکتورها پیش از دریافت وجه اصلاح شود
    const pendingReturns = buildPendingReturns();
    for (const payload of pendingReturns) {
      await onSubmitReturn(payload);
    }

    // ۲) سپس دریافت وجه روی مانده‌های اصلاح‌شده به ترتیب FIFO تخصیص می‌یابد
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
    setAmount(null);
    setLineStates({});
    setReturnsExpanded(false);
  };

  const renderConsignmentReturns = (c: Consignment) => {
    const returnableLines = c.items
      .map((item) => ({
        item,
        key: `${c.id}::${lineKeyOf(item)}`,
        remaining: item.quantity - (item.returnedQuantity || 0),
      }))
      .filter((line) => line.remaining > 0);

    const consReturnValue = pendingReturnValueByConsignment[c.id] || 0;

    return (
      <div
        key={c.id}
        className="p-3 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/10 space-y-2.5"
      >
        {/* Consignment header */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-black text-stone-900 dark:text-white font-mono">فاکتور {c.code}</span>
            <span className="text-stone-500 dark:text-gray-400">(تاریخ: {toJalaliDate(c.date)})</span>
          </div>
          <span className="text-stone-500 dark:text-gray-400 font-mono">
            مانده فاکتور: {formatToman(c.remainingAmount)}
          </span>
        </div>

        {/* Returnable lines */}
        <div className="space-y-2">
          {returnableLines.map(({ item, key, remaining }) => {
            const currentReturnQty = getLineQty(key, remaining);
            const lineState = lineStates[key];

            return (
              <div
                key={key}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-white/5 bg-white/60 dark:bg-black/30 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-stone-900 dark:text-white break-words">
                      {item.itemName}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 mt-1">
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
                      <span className="text-[10px] text-stone-500 dark:text-gray-400">
                        قابل مرجوع: {toPersianDigits(remaining)} عدد
                      </span>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-[#CEAE80] whitespace-nowrap">
                    {formatToman(item.unitPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">
                      تعداد مرجوعی
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      value={currentReturnQty || ''}
                      onChange={(e) => handleQtyChange(key, remaining, e.target.value)}
                      placeholder="۰"
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono font-bold outline-none focus:border-[#CEAE80]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">
                      وضعیت کالا
                    </label>
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
                    <label className="block text-[10px] text-stone-500 dark:text-gray-400 mb-1">
                      علت مرجوعی
                    </label>
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

        {consReturnValue > 0 && (
          <div className="text-[11px] font-bold text-emerald-700 dark:text-green-300 font-mono text-left">
            کسر از مانده این فاکتور: {formatToman(consReturnValue)}
          </div>
        )}
      </div>
    );
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
            <SelectMenu
              value={selectedSellerId}
              onChange={setSelectedSellerId}
              options={sellers.map((s) => ({
                value: s.id,
                label: (
                  <SelectOptionContent
                    primary={s.name}
                    badges={
                      <>
                        <SelectBadge tone="gold">{s.code}</SelectBadge>
                        <SelectBadge tone={(s.currentDebt || 0) > 0 ? 'red' : 'green'}>
                          بدهی: {formatToman(s.currentDebt || 0)}
                        </SelectBadge>
                      </>
                    }
                  />
                ),
                triggerLabel: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold">{s.name}</span>
                    <SelectBadge tone="gold">{s.code}</SelectBadge>
                  </span>
                ),
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-800 dark:text-[#CEAE80] mb-1 flex items-center justify-between">
              <span>مبلغ دریافتی (تومان) *</span>
              {selectedSeller && selectedSeller.currentDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(effectiveDebt)}
                  className="text-[11px] text-amber-800 dark:text-[#CEAE80] font-bold hover:underline"
                >
                  {hasPendingReturns
                    ? `تسویه کل مانده پس از مرجوعی (${formatToman(effectiveDebt)})`
                    : `تسویه کل مانده (${formatToman(selectedSeller.currentDebt)})`}
                </button>
              )}
            </label>
            <FormattedNumberInput
              value={amount}
              onChange={setAmount}
              min={1000}
              suffix="تومان"
              placeholder="مثلاً: ۵,۰۰۰,۰۰۰"
              className="w-full px-3 py-2 rounded-xl glass-input border-2 border-[#CEAE80] text-sm font-bold font-mono outline-none text-stone-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-gray-300 mb-1">
              روش دریافت وجه
            </label>
            <SelectMenu
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'bank_transfer' | 'pos')}
              options={[
                { value: 'cash', label: 'وجه نقد (دریافت حضوری سر بساط)' },
                { value: 'pos', label: 'دستگاه کارت‌خوان سیار (POS)' },
                { value: 'bank_transfer', label: 'انتقال بانکی / پایا / کارت به کارت' },
                { value: 'card', label: 'کارت بانکی' },
              ]}
            />
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

        {/* Returns-alongside-payment section (collapsible) */}
        <div className="rounded-2xl glass-card border border-stone-200 dark:border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setReturnsExpanded((v) => !v)}
            className="w-full p-4 flex items-center justify-between gap-3 text-right transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            aria-expanded={returnsExpanded}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Undo2 className="w-4 h-4 text-[#CEAE80] shrink-0" />
              <span className="text-xs sm:text-sm font-black text-amber-800 dark:text-[#CEAE80] whitespace-nowrap">
                ثبت مرجوعی همراه دریافت (اختیاری)
              </span>
              {hasPendingReturns && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-700 dark:text-green-300 whitespace-nowrap font-mono">
                  {toPersianDigits(totalReturnCount)} عدد • کسر {formatToman(totalReturnValue)}
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                returnsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {returnsExpanded && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-stone-200 dark:border-white/5">
              <p className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
                اقلام فروش‌نرفته این فروشنده را انتخاب کنید؛ مرجوعی‌ها پیش از دریافت وجه ثبت می‌شوند و
                مانده فاکتورها در همان لحظه اصلاح می‌گردد. کالای سالم به انبار برمی‌گردد.
              </p>

              {returnableConsignments.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-white/10 bg-stone-50 dark:bg-[#141416] text-center text-xs text-stone-500 dark:text-gray-400">
                  فاکتور قابل مرجوعی برای این فروشنده وجود ندارد.
                </div>
              ) : (
                <div className="space-y-3">
                  {returnableConsignments.map((c) => renderConsignmentReturns(c))}
                </div>
              )}

              {hasPendingReturns && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-green-300 font-bold">
                  <span>مجموع اقلام مرجوعی: {toPersianDigits(totalReturnCount)} عدد</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {healthyCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-[10px]">
                        سالم: {toPersianDigits(healthyCount)}
                      </span>
                    )}
                    {damagedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-[10px] text-rose-700 dark:text-rose-300">
                        معیوب: {toPersianDigits(damagedCount)}
                      </span>
                    )}
                    <span className="font-black font-mono">
                      کسر شونده از بدهی: {formatToman(totalReturnValue)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Dynamic Allocation Timeline Preview */}
        <div className="p-4 rounded-2xl glass-card border border-stone-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-4 h-4 text-[#CEAE80] shrink-0" />
              <span className="text-amber-800 dark:text-[#CEAE80] font-black">
                پیش‌نمایش زنده تخصیص و تسویه فاکتورها
              </span>
              {hasPendingReturns && (
                <span className="px-2 py-0.5 rounded-full bg-[#CEAE80]/15 border border-[#CEAE80]/30 text-[10px] font-bold text-amber-800 dark:text-[#CEAE80]">
                  با احتساب مرجوعی‌های این فرم
                </span>
              )}
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

          {/* Debt evolution summary */}
          {selectedSeller && (
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#141416] border border-stone-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px]">
              <span className="text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-stone-400" />
                بدهی فعلی:
                <span className="font-bold font-mono text-stone-700 dark:text-gray-200">
                  {formatToman(selectedSeller.currentDebt || 0)}
                </span>
              </span>
              {hasPendingReturns && (
                <span className="text-stone-500 dark:text-gray-400">
                  پس از مرجوعی:{' '}
                  <span className="font-bold font-mono text-emerald-700 dark:text-green-300">
                    {formatToman(effectiveDebt)}
                  </span>
                </span>
              )}
              <span className="text-stone-500 dark:text-gray-400">
                پس از دریافت وجه:{' '}
                <span className="font-black font-mono text-amber-800 dark:text-[#CEAE80]">
                  {formatToman(debtAfterAll)}
                </span>
              </span>
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
            {hasPendingReturns ? 'ثبت مرجوعی و دریافت وجه' : 'تایید دریافت و تسویه فاکتورها'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
