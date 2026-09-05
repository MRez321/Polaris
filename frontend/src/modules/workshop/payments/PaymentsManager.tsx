import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Eye,
} from 'lucide-react';
import type { PaymentRecord, Seller, Consignment } from '@/types';
import type { PaymentPayload, ReturnPayload } from '@/lib/api';
import { formatToman, toPersianDigits, toJalaliDate } from '@/utils/persian';
import { NewPaymentModal } from './NewPaymentModal';

interface PaymentsManagerProps {
  payments: PaymentRecord[];
  sellers: Seller[];
  consignments: Consignment[];
  onSubmitPayment: (data: PaymentPayload) => void;
  onSubmitReturn: (data: ReturnPayload) => void;
  preSelectedSellerId?: string;
}

export const PaymentsManager: React.FC<PaymentsManagerProps> = ({
  payments = [],
  sellers = [],
  consignments = [],
  onSubmitPayment,
  onSubmitReturn,
  preSelectedSellerId,
}) => {
  const safePayments = payments || [];
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setSelectedPaymentDetail] = useState<PaymentRecord | null>(null);

  const filteredPayments = safePayments.filter((p) => {
    const matchesSearch =
      (p.sellerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalPaymentsAmount = safePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقدی حضوری';
      case 'pos':
        return 'دستگاه کارت‌خوان';
      case 'bank_transfer':
        return 'انتقال بانکی/پایا';
      default:
        return 'کارت بانکی';
    }
  };

  return (
    <div className="space-y-6 text-stone-900 dark:text-white">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-stone-200 dark:border-brand/20 shadow-md">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" />
            <span className="text-brand-ink dark:text-brand font-black">دفتر دریافت‌ها و تسویه حساب‌ها</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            مجموع کل وجوه وصولی ثبت شده:{' '}
            <span className="font-black text-emerald-600 dark:text-green-400 font-mono">
              {formatToman(totalPaymentsAmount)}
            </span>{' '}
            • وجوه دریافتی مستقیماً به ترتیب تاریخ فاکتورها اعمال و تسویه می‌شوند.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت دریافت وجه و تسویه</span>
        </button>
      </div>

      {/* Search & Method Filter */}
      <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی رسید، نام فروشنده یا شماره پیگیری..."
            className="w-full pl-4 pr-9 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setMethodFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              methodFilter === 'all'
                ? 'bg-brand text-brand-on shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            همه روش‌ها ({toPersianDigits(payments.length)})
          </button>
          <button
            onClick={() => setMethodFilter('cash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              methodFilter === 'cash'
                ? 'bg-brand text-brand-on shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            نقدی حضوری
          </button>
          <button
            onClick={() => setMethodFilter('pos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              methodFilter === 'pos'
                ? 'bg-brand text-brand-on shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            کارت‌خوان (POS)
          </button>
          <button
            onClick={() => setMethodFilter('bank_transfer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              methodFilter === 'bank_transfer'
                ? 'bg-brand text-brand-on shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            پایا / انتقال بانکی
          </button>
        </div>
      </div>

      {/* Payments List */}
      <div className="glass-panel rounded-2xl border border-stone-200 dark:border-white/5 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs table-stacked">
            <thead className="bg-stone-100 dark:bg-[#1A1A1E] text-stone-700 dark:text-gray-300 font-bold border-b border-stone-200 dark:border-white/10">
              <tr>
                <th className="p-3.5">شماره رسید</th>
                <th className="p-3.5">فروشنده</th>
                <th className="p-3.5">مبلغ دریافتی</th>
                <th className="p-3.5">روش پرداخت</th>
                <th className="p-3.5">تاریخ ثبت</th>
                <th className="p-3.5">تسویه فاکتورها</th>
                <th className="p-3.5">ثبت‌کننده</th>
                <th className="p-3.5 text-center">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-white/5">
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td data-label="شماره رسید" className="p-3.5 font-mono font-black text-brand-ink dark:text-brand">
                    {p.code}
                  </td>
                  <td data-label="فروشنده" className="p-3.5 font-bold text-stone-900 dark:text-white">
                    {p.sellerName}
                  </td>
                  <td data-label="مبلغ دریافتی" className="p-3.5 font-black text-emerald-600 dark:text-green-400 font-mono text-sm">
                    +{formatToman(p.amount)}
                  </td>
                  <td data-label="روش پرداخت" className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-[#1A1A1E] text-stone-700 dark:text-gray-300 border border-stone-200 dark:border-white/5 font-medium">
                      {getMethodLabel(p.paymentMethod)}
                    </span>
                    {p.trackingNumber && (
                      <span className="block text-[10px] text-stone-500 dark:text-gray-400 font-mono mt-0.5">
                        {p.trackingNumber}
                      </span>
                    )}
                  </td>
                  <td data-label="تاریخ ثبت" className="p-3.5 text-stone-500 dark:text-gray-400">{toJalaliDate(p.date)}</td>
                  <td data-label="تسویه فاکتورها" className="p-3.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {p.allocations && p.allocations.length > 0 ? (
                        p.allocations.map((a, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-brand/10 text-brand-ink dark:text-brand font-mono text-[10px] border border-brand/30 font-bold"
                          >
                            {a.consignmentCode}: {formatToman(a.allocatedAmount)}
                          </span>
                        ))
                      ) : (
                        <span className="text-stone-400 dark:text-gray-500 text-[11px]">بدون تخصیص</span>
                      )}
                    </div>
                  </td>
                  <td data-label="ثبت‌کننده" className="p-3.5 text-stone-500 dark:text-gray-400 font-medium">{p.recordedBy}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedPaymentDetail(p)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sellers={sellers}
        consignments={consignments}
        preSelectedSellerId={preSelectedSellerId}
        onSubmitPayment={onSubmitPayment}
        onSubmitReturn={onSubmitReturn}
      />
    </div>
  );
};
