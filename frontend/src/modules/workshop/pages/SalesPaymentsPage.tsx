import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  CreditCard,
  Search,
  ShoppingBag,
  Users,
  Banknote,
  Smartphone,
  Building,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesPayment, SalesPaymentMethod } from '@/types';
import { getApiErrorMessage, salesPaymentsApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';

const PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  cash: 'نقدی',
  card_transfer: 'کارت به کارت',
  bank_transfer: 'واریز بانکی',
  pos: 'کارت‌خوان',
  cheque: 'چک',
};

const PAYMENT_METHOD_ICONS: Record<SalesPaymentMethod, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  card_transfer: <CreditCard className="w-3.5 h-3.5" />,
  bank_transfer: <Building className="w-3.5 h-3.5" />,
  pos: <Smartphone className="w-3.5 h-3.5" />,
  cheque: <CreditCard className="w-3.5 h-3.5" />,
};

const PAYMENT_STATUS_LABELS = {
  pending: 'در انتظار',
  completed: 'تکمیل شده',
  failed: 'ناموفق',
  refunded: 'بازپرداخت شده',
} as const;

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

/** Admin sales payments management: customer payments + seller settlements. */
export const SalesPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<SalesPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const FILTERS: { id: string; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'completed', label: 'موفق' },
    { id: 'pending', label: 'در انتظار' },
    { id: 'failed', label: 'ناموفق' },
    { id: 'refunded', label: 'بازپرداخت' },
  ];

  const load = useCallback(async () => {
    try {
      const data = await salesPaymentsApi.list();
      setPayments(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useCallback(() => {
    if (!payments) return [];
    let result = payments;
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(
      (p) =>
        (p.code ?? '').toLowerCase().includes(term) ||
        (p.orderId ?? '').toLowerCase().includes(term) ||
        (p.sellerSaleId ?? '').toLowerCase().includes(term) ||
        (p.customerId ?? '').toLowerCase().includes(term),
    );
  }, [payments, searchTerm, statusFilter]);

  const list = filtered();
  const totalAmount = list.reduce((sum, p) => sum + p.amount, 0);
  const completedCount = list.filter((p) => p.status === 'completed').length;
  const pendingCount = list.filter((p) => p.status === 'pending').length;
  const pendingAmount = list.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  if (!payments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">پرداخت‌های فروش</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                <th className="text-right py-2.5 px-3">کد</th>
                <th className="text-right py-2.5 px-3">مبنا</th>
                <th className="text-right py-2.5 px-3">مبلغ</th>
                <th className="text-right py-2.5 px-3">روش</th>
                <th className="text-center py-2.5 px-3">وضعیت</th>
                <th className="text-right py-2.5 px-3">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-stone-200 dark:border-stone-700">
                  <td className="py-2.5 px-3" colSpan={6}>
                    <div className="h-4 rounded bg-stone-100 dark:bg-stone-700 animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button onClick={load} className="mr-2 underline">
          <RefreshCw className="w-4 h-4 inline" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-stone-500" />
          <h1 className="text-xl font-bold">پرداخت‌های فروش</h1>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 bg-white dark:bg-stone-900">
          <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">کل پرداخت‌ها</div>
          <div className="text-xl font-bold">
            {toPersianDigits(totalAmount.toLocaleString('fa-IR'))} تومان
          </div>
        </div>
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 bg-white dark:bg-stone-900">
          <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">پرداخت موفق</div>
          <div className="text-xl font-bold text-green-600">
            {toPersianDigits(completedCount.toString())}
          </div>
        </div>
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 bg-white dark:bg-stone-900">
          <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">در انتظار</div>
          <div className="text-xl font-bold text-amber-600">
            {toPersianDigits(pendingCount.toString())}
          </div>
        </div>
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 bg-white dark:bg-stone-900">
          <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">مبلغ معوق</div>
          <div className="text-xl font-bold text-amber-600">
            {toPersianDigits(pendingAmount.toLocaleString('fa-IR'))} تومان
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="جستجو در پرداخت‌ها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-stone-400 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                statusFilter === f.id
                  ? 'bg-brand text-brand-on shadow'
                  : 'text-stone-600 dark:text-stone-400 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>پرداختی یافت نشد</p>
        </div>
      ) : (
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">کد</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">مرجع</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">مبلغ</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">روش</th>
                <th className="text-center py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">وضعیت</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/30"
                >
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {toPersianDigits(p.code)}
                  </td>
                  <td className="py-2.5 px-3">
                    {p.orderId ? (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                        سفارش فروش
                      </span>
                    ) : p.sellerSaleId ? (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        تسویه فروشنده
                      </span>
                    ) : p.customerId ? (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        مشتری
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-medium">
                    {toPersianDigits(p.amount.toLocaleString('fa-IR'))} تومان
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1">
                      {PAYMENT_METHOD_ICONS[p.paymentMethod]}
                      {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        PAYMENT_STATUS_COLOR[p.status] ??
                          'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
                      )}
                    >
                      {PAYMENT_STATUS_LABELS[p.status as keyof typeof PAYMENT_STATUS_LABELS] ?? p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {new Date(p.paymentDate).toLocaleDateString('fa-IR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesPaymentsPage;
