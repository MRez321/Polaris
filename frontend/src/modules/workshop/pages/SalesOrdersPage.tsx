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

const TYPE_LABELS: Record<SalesOrder['orderType'], string> = {
  retail: 'خرده‌فروشی',
  wholesale: 'عمده‌فروشی',
  consignment: 'سفارش امانی',
  manual: 'دستی',
};

/** Admin sales order management: unified orders across all channels. */
export const SalesOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sales.manage');

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
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders]);

  if (!orders) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
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
          disabled={!orders}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
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
                        کانال: <span className="font-medium">{order.channelName ?? order.channelId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 text-xs font-medium rounded-full',
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : order.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : order.status === 'shipped'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
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
