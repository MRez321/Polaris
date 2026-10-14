import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  User,
  Calendar,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesOrder, SalesOrderStatus } from '@/types';
import { getApiErrorMessage, salesOrdersApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار تأیید',
  confirmed: 'تأیید شده',
  paid: 'پرداخت شده',
  picking: 'در حال بسته‌بندی',
  packed: 'بسته‌بندی شده',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شد',
  returned: 'برگشت شده',
  refunded: 'بازپرداخت شده',
  cancelled: 'لغو شده',
};

const STATUS_COLOR: Record<SalesOrderStatus, string> = {
  draft: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  picking: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  packed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  refunded: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const TYPE_LABELS: Record<SalesOrder['orderType'], string> = {
  retail: 'خرده‌فروشی',
  wholesale: 'عمده‌فروشی',
  consignment: 'سفارش امانی',
  manual: 'دستی',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  partial: 'پرداخت جزئی',
  paid: 'کامل',
  refunded: 'بازپرداخت شده',
  voided: 'لغو شده',
};

/** Admin sales order management: unified orders across all channels. */
export const SalesOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sales.manage');

  const FILTERS: { id: string; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'pending', label: 'در انتظار' },
    { id: 'confirmed', label: 'تأیید شده' },
    { id: 'paid', label: 'پرداخت شده' },
    { id: 'picking', label: 'بسته‌بندی' },
    { id: 'shipped', label: 'ارسال شده' },
    { id: 'delivered', label: 'تحویل' },
    { id: 'cancelled', label: 'لغو شده' },
  ];

  const load = useCallback(async () => {
    try {
      const data = await salesOrdersApi.list();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (order: SalesOrder, nextStatus: SalesOrderStatus) => {
    if (!canManage) return;
    setUpdatingId(order.id);
    try {
      const updated = await salesOrdersApi.transitionStatus(order.id, nextStatus);
      setOrders((prev) =>
        (prev ?? []).map((o) => (o.id === order.id ? updated : o)),
      );
      toast.success(`سفارش ${updated.code} به وضعیت ${STATUS_LABELS[nextStatus]} انتقال یافت`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const availableTransitions = (status: SalesOrderStatus): SalesOrderStatus[] => {
    const map: Record<SalesOrderStatus, SalesOrderStatus[]> = {
      draft: ['pending'],
      pending: ['confirmed', 'cancelled'],
      confirmed: ['paid', 'picking', 'cancelled'],
      paid: ['picking', 'cancelled'],
      picking: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned', 'cancelled'],
      delivered: ['returned'],
      returned: ['refunded'],
      refunded: [],
      cancelled: [],
    };
    return map[status] ?? [];
  };

  const sorted = useMemo(() => {
    if (!orders) return [];
    let result = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }
    return result;
  }, [orders, statusFilter]);

  if (!orders) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">سفارشات فروش</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
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
          <ShoppingBag className="w-5 h-5 text-stone-500" />
          <h1 className="text-xl font-bold">سفارشات فروش</h1>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-stone-400 shrink-0" />
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>سفارشی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((order) => (
            <div
              key={order.id}
              className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === order.id ? null : order.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10">
                      <ShoppingBag className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <div className="font-medium">{order.code}</div>
                      <div className="text-sm text-stone-500 dark:text-stone-400">
                        {TYPE_LABELS[order.orderType]}{' • '}
                        کانال: <span className="font-medium">{order.channelName ?? order.channelCode ?? order.channelId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_COLOR[order.status])}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    {order.paymentStatus && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300">
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    )}
                    {expandedId === order.id ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    <span>{order.lines?.length ?? 0} کالا</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{order.customerName ?? 'مشتری ناشناس'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="font-medium text-lg">
                    {toPersianDigits(order.totalAmount.toLocaleString('fa-IR'))} تومان
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-stone-500">باقی‌مانده:</span>
                    <span className="font-medium">
                      {toPersianDigits(order.remainingAmount.toLocaleString('fa-IR'))} تومان
                    </span>
                  </div>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-stone-200 dark:border-stone-700 p-4 bg-stone-50 dark:bg-stone-800/50">
                  {/* Lines */}
                  {order.lines && order.lines.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2 text-stone-700 dark:text-stone-300">
                        کالاها
                      </h3>
                      <div className="space-y-2">
                        {order.lines.map((line) => (
                          <div
                            key={line.id}
                            className="flex justify-between items-center py-1.5 text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {line.itemName ?? line.sku ?? 'کالای ناشناس'}
                              </span>
                              {line.size && <span className="text-stone-500"> / {line.size}</span>}
                              {line.color && <span className="text-stone-500"> / {line.color}</span>}
                            </div>
                            <div className="text-left">
                              <span>{toPersianDigits(line.quantity)}</span>
                              <span className="mx-1">×</span>
                              <span>
                                {toPersianDigits(line.unitPrice.toLocaleString('fa-IR'))}
                              </span>
                              <span className="mx-1">=</span>
                              <span className="font-medium">
                                {toPersianDigits(line.lineTotal.toLocaleString('fa-IR'))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status transitions */}
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {availableTransitions(order.status).map((next) => (
                        <button
                          key={next}
                          onClick={() => handleStatusChange(order, next)}
                          disabled={updatingId === order.id}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                            'border-stone-300 dark:border-stone-600',
                            'hover:bg-stone-100 dark:hover:bg-stone-800',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                          )}
                        >
                          {updatingId === order.id && (
                            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                          )}
                          {STATUS_LABELS[next]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesOrdersPage;
