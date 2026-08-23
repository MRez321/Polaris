import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  ArrowLeftRight,
  Receipt,
  RotateCcw,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Seller, Consignment, PaymentRecord, ConsignmentReturn } from '../../types';
import { formatToman, toJalaliDate, toPersianDigits } from '../../utils/persian';
import { Badge } from '../common/Badge';

interface SellerProfileDrawerProps {
  seller: Seller | null;
  consignments: Consignment[];
  payments: PaymentRecord[];
  returns: ConsignmentReturn[];
  onClose: () => void;
  onNewHandover: (seller: Seller) => void;
  onNewPayment: (seller: Seller) => void;
  onSelectConsignment: (c: Consignment) => void;
  onEditSeller?: (seller: Seller) => void;
}

export const SellerProfileDrawer: React.FC<SellerProfileDrawerProps> = ({
  seller,
  consignments,
  payments,
  returns,
  onClose,
  onNewHandover,
  onNewPayment,
  onSelectConsignment,
  onEditSeller,
}) => {
  if (!seller) return null;

  const [activeTab, setActiveTab] = useState<'consignments' | 'payments' | 'returns'>('consignments');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAllBanks, setShowAllBanks] = useState(false);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/\s|-/g, ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sellerConsignments = consignments
    .filter((c) => c.sellerId === seller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sellerPayments = payments
    .filter((p) => p.sellerId === seller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sellerReturns = returns
    .filter((r) => r.sellerId === seller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const creditAvailable = Math.max(0, seller.creditLimit - seller.currentDebt);
  const creditUsagePct = Math.min(100, Math.round((seller.currentDebt / (seller.creditLimit || 1)) * 100));

  const getGuaranteeLabel = (type: string) => {
    switch (type) {
      case 'promissory_note':
        return 'سفته بانکی';
      case 'cheque':
        return 'چک صیادی';
      case 'trusted_guarantor':
        return 'ضمانت معتمد محل';
      default:
        return 'کارت ملی هوشمند';
    }
  };

  const bankAccountsList = seller.bankAccounts || [];
  const visibleBanks = showAllBanks ? bankAccountsList : bankAccountsList.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-[#141416] border-r border-stone-200 dark:border-white/10 text-stone-900 dark:text-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#1A1A1E] flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-[#1E1E22] text-amber-800 dark:text-[#CEAE80] flex items-center justify-center font-bold text-lg border border-amber-500/30 dark:border-[#CEAE80]/40 shadow-sm">
                {seller.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-stone-900 dark:text-white">
                    {seller.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-stone-200 dark:bg-[#1E1E22] font-mono text-stone-700 dark:text-gray-300 border border-stone-300 dark:border-white/5">
                    {seller.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-gray-400 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <a href={`tel:${seller.phone}`} className="hover:underline font-mono text-amber-800 dark:text-[#CEAE80] font-bold" dir="ltr">
                      {seller.phone}
                    </a>
                  </span>
                  {(seller.additionalPhones || []).map((aph, aIdx) => (
                    <span key={aIdx} className="flex items-center gap-1 font-mono text-[11px] text-stone-400">
                      <span>•</span>
                      <a href={`tel:${aph}`} className="hover:underline" dir="ltr">
                        {aph}
                      </a>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onEditSeller && (
                <button
                  onClick={() => onEditSeller(seller)}
                  className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-bold"
                  title="ویرایش اطلاعات فروشنده"
                >
                  <Edit2 className="w-4 h-4 text-[#CEAE80]" />
                  <span className="hidden sm:inline">ویرایش پرونده</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Location & Guarantee Summary */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/5 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#CEAE80] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-500 dark:text-gray-400">محل بساط: </span>
                  <span className="text-stone-900 dark:text-white font-medium">{seller.streetLocation}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-stone-200 dark:border-white/5">
                <Shield className="w-4 h-4 text-[#CEAE80] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-500 dark:text-gray-400">
                    ضمانت ({getGuaranteeLabel(seller.guaranteeType)}):{' '}
                  </span>
                  <span className="text-stone-900 dark:text-white">
                    مبلغ {formatToman(seller.guaranteeAmount)} — {seller.guaranteeDetails || 'بدون جزئیات ثبت شده'}
                  </span>
                </div>
              </div>

              {seller.notes && (
                <div className="pt-2 border-t border-stone-200 dark:border-white/5 text-stone-500 dark:text-gray-400 italic">
                  «{seller.notes}»
                </div>
              )}
            </div>

            {/* Bank Accounts Section with Full Box Copy & Expand/Collapse */}
            {bankAccountsList.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#CEAE80]" />
                    حساب‌های بانکی و تسویه فروشنده ({toPersianDigits(bankAccountsList.length)} حساب)
                  </span>
                  <span className="text-[10px] text-stone-400">کلیک روی هر کادر برای کپی</span>
                </div>

                <div className="space-y-2">
                  {visibleBanks.map((acc, bIdx) => {
                    const cKey = `drawer-card-${bIdx}`;
                    const sKey = `drawer-sheba-${bIdx}`;
                    const isCardCopied = copiedKey === cKey;
                    const isShebaCopied = copiedKey === sKey;

                    return (
                      <div
                        key={bIdx}
                        className="p-3 rounded-xl bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 space-y-2 hover:border-[#CEAE80]/40 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#CEAE80]">{acc.bankName || 'بانک'}</span>
                          {acc.accountHolder && (
                            <span className="text-stone-400 text-[11px]">به نام: {acc.accountHolder}</span>
                          )}
                        </div>

                        {acc.cardNumber && (
                          <div
                            onClick={(e) => handleCopy(acc.cardNumber, cKey, e)}
                            className="p-2 rounded-lg bg-stone-100 dark:bg-black/40 hover:bg-[#CEAE80]/15 dark:hover:bg-[#CEAE80]/15 border border-stone-200/60 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all group"
                            title="کلیک روی کل کادر برای کپی شماره کارت"
                          >
                            <div className="flex items-center gap-2 font-mono text-stone-900 dark:text-white" dir="ltr">
                              <CreditCard className="w-3.5 h-3.5 text-[#CEAE80]" />
                              <span className="font-black tracking-wider">{acc.cardNumber}</span>
                            </div>
                            <span className="text-[10px] text-[#CEAE80] font-bold flex items-center gap-1">
                              {isCardCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">کپی شد</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                  <span>کپی کارت</span>
                                </>
                              )}
                            </span>
                          </div>
                        )}

                        {acc.shebaNumber && (
                          <div
                            onClick={(e) => handleCopy(acc.shebaNumber, sKey, e)}
                            className="p-2 rounded-lg bg-stone-100 dark:bg-black/40 hover:bg-[#CEAE80]/15 dark:hover:bg-[#CEAE80]/15 border border-stone-200/60 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all group"
                            title="کلیک روی کل کادر برای کپی شماره شبا"
                          >
                            <div className="flex items-center gap-2 font-mono text-stone-700 dark:text-stone-300 text-[11px]" dir="ltr">
                              <span className="text-[10px] text-stone-400 font-sans">شبا:</span>
                              <span className="truncate max-w-[200px] sm:max-w-xs">{acc.shebaNumber}</span>
                            </div>
                            <span className="text-[10px] text-[#CEAE80] font-bold flex items-center gap-1">
                              {isShebaCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">کپی شد</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                  <span>کپی شبا</span>
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {bankAccountsList.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllBanks(!showAllBanks)}
                    className="w-full py-1.5 text-center text-xs text-[#CEAE80] hover:underline font-bold flex items-center justify-center gap-1"
                  >
                    {showAllBanks ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>نمایش کمتر</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>نمایش همه ({toPersianDigits(bankAccountsList.length)} حساب)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Financial Ledger Gauge */}
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-[#1A1A1E] text-stone-900 dark:text-white border border-stone-200 dark:border-[#CEAE80]/30 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-stone-600 dark:text-gray-300 font-bold">وضعیت حساب و سقف امانت</span>
                <Badge variant={seller.currentDebt === 0 ? 'success' : 'gold'} size="sm">
                  {seller.currentDebt === 0 ? 'تسویه کامل' : `${toPersianDigits(creditUsagePct)}٪ پر شده`}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2.5 bg-white dark:bg-[#141416] rounded-xl border border-stone-200 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-gray-400 block">مانده بدهی جاری</span>
                  <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-[#CEAE80] font-mono">
                    {formatToman(seller.currentDebt)}
                  </span>
                </div>
                <div className="border-x border-stone-200 dark:border-white/10">
                  <span className="text-[10px] text-stone-500 dark:text-gray-400 block">سقف مجاز امانت</span>
                  <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-gray-200 font-mono">
                    {formatToman(seller.creditLimit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-gray-400 block">اعتبار امانت آزاد</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-green-400 font-mono">
                    {formatToman(creditAvailable)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 w-full bg-stone-200 dark:bg-[#141416] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    creditUsagePct > 90
                      ? 'bg-rose-500'
                      : creditUsagePct > 60
                      ? 'bg-amber-500'
                      : 'bg-[#CEAE80]'
                  }`}
                  style={{ width: `${creditUsagePct}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 dark:text-gray-400">
                <span>کل کالای تحویل شده: {formatToman(seller.totalHandoversValue)}</span>
                <span>کل واریزی‌ها: {formatToman(seller.totalPaid)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onNewHandover(seller)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#1E1E22] dark:hover:bg-[#252525] text-stone-900 dark:text-white border border-stone-300 dark:border-white/5 font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#CEAE80]" />
                <span>واگذاری امانی جدید</span>
              </button>

              <button
                onClick={() => onNewPayment(seller)}
                className="flex-1 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Receipt className="w-4 h-4" />
                <span>ثبت دریافت وجه و تسویه</span>
              </button>
            </div>

            {/* History Tabs */}
            <div>
              <div className="flex border-b border-stone-200 dark:border-white/10 mb-4">
                <button
                  onClick={() => setActiveTab('consignments')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'consignments'
                      ? 'border-[#CEAE80] text-amber-800 dark:text-[#CEAE80]'
                      : 'border-transparent text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  فاکتورهای امانی ({toPersianDigits(sellerConsignments.length)})
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'payments'
                      ? 'border-[#CEAE80] text-amber-800 dark:text-[#CEAE80]'
                      : 'border-transparent text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  رسیدهای دریافت ({toPersianDigits(sellerPayments.length)})
                </button>
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'returns'
                      ? 'border-[#CEAE80] text-amber-800 dark:text-[#CEAE80]'
                      : 'border-transparent text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  مرجوعی‌ها ({toPersianDigits(sellerReturns.length)})
                </button>
              </div>

              {/* Tab 1: Consignments */}
              {activeTab === 'consignments' && (
                <div className="space-y-3">
                  {sellerConsignments.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectConsignment(c)}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-white/5 hover:border-[#CEAE80]/50 bg-stone-50 dark:bg-[#1A1A1E] cursor-pointer transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                          {c.code}
                        </span>
                        <Badge
                          variant={
                            c.remainingAmount === 0
                              ? 'success'
                              : c.status === 'overdue'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {c.remainingAmount === 0
                            ? 'تسویه شده'
                            : c.status === 'overdue'
                            ? 'سررسید گذشته'
                            : 'جاری'}
                        </Badge>
                      </div>

                      <div className="text-xs text-stone-500 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>تاریخ واگذاری: {toJalaliDate(c.date)}</span>
                          <span>موعد تسویه: {toJalaliDate(c.dueDate)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-stone-200 dark:border-white/5">
                          <span>مبلغ کل: {formatToman(c.totalAmount)}</span>
                          <span className="font-bold text-stone-900 dark:text-white font-mono">
                            مانده: {formatToman(c.remainingAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sellerConsignments.length === 0 && (
                    <p className="text-center py-6 text-xs text-stone-400">
                      هنوز هیچ فاکتور امانی برای این فروشنده ثبت نشده است.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {sellerPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-[#1A1A1E] space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                            {p.code}
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-gray-400">{toJalaliDate(p.date)}</span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-green-400 font-mono text-xs sm:text-sm">
                          +{formatToman(p.amount)}
                        </span>
                      </div>

                      {p.allocations && p.allocations.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 dark:border-white/5 text-[11px] space-y-1">
                          <span className="text-stone-500 dark:text-gray-400 block">تسویه شده برای فاکتورهای:</span>
                          {p.allocations.map((a, idx) => (
                            <div key={idx} className="flex justify-between text-stone-700 dark:text-gray-300">
                              <span>فاکتور {a.consignmentCode}:</span>
                              <span className="font-mono text-amber-800 dark:text-[#CEAE80] font-bold">{formatToman(a.allocatedAmount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {sellerPayments.length === 0 && (
                    <p className="text-center py-6 text-xs text-stone-400">
                      هنوز هیچ دریافتی از این فروشنده ثبت نشده است.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Returns */}
              {activeTab === 'returns' && (
                <div className="space-y-3">
                  {sellerReturns.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-[#1A1A1E] space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                          مرجوعی فاکتور {r.consignmentCode}
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-red-400 font-mono">
                          {formatToman(r.totalReturnAmount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-gray-400">
                        {toJalaliDate(r.date)} • ثبت شده توسط: {r.processedBy}
                      </div>
                    </div>
                  ))}
                  {sellerReturns.length === 0 && (
                    <p className="text-center py-6 text-xs text-stone-400">
                      هیچ برگشت کالایی برای این فروشنده ثبت نشده است.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
