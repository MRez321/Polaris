import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  ShoppingBag,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SellerSale, SellerSaleStatus } from '@/types';
import { getApiErrorMessage, sellerSalesApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const STATUS_LABELS: Record<SellerSaleStatus, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ارسال شده',
  confirmed: 'تأیید شده',
  settled: 'تسویه شده',
  cancelled: 'لغو شده',
};

const STATUS_COLOR: Record<SellerSaleStatus, string> = {
  draft: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  settled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

/** Admin seller sales management: street seller sales, commissions, settlements. */
export const SellerSalesPage: React.FC = () => {
  const [sales, setSales] = useState<SellerSale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seller-sales.manage');

  const FILTERS: { id: string; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'draft', label: 'پیش‌نویس' },
    { id: 'submitted', label: 'ارسال شده' },
    { id: 'confirmed', label: 'تأیید شده' },
    { id: 'settled', label: 'تسویه شده' },
    { id: 'cancelled', label: 'لغو شده' },
  ];

  const load = useCallback(async () => {
    try {
      const data = await sellerSalesApi.list();
      setSales(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (sale: SellerSale, nextStatus: SellerSaleStatus) => {
    if (!canManage) return;
    setUpdatingId(sale.id);
    try {
      const updated = await sellerSalesApi.transitionStatus(sale.id, nextStatus);
      setSales((prev) =>
        (prev ?? []).map((s) => (s.id === sale.id ? updated : s)),
      );
      toast.success(`فروش ${updated.code} به وضعیت ${STATUS_LABELS[nextStatus]} انتقال یافت`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const availableTransitions = (status: SellerSaleStatus): SellerSaleStatus[] => {
    const map: Record<SellerSaleStatus, SellerSaleStatus[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['confirmed', 'cancelled'],
      confirmed: ['settled', 'cancelled'],
      settled: [],
      cancelled: [],
    };
    return map[status] ?? [];
  };

  const sorted = useMemo(() => {
    if (!sales) return [];
    let result = [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [sales, statusFilter]);

  const totalSettlement = useMemo(
    () => (sales ?? []).filter((s) => s.status === 'confirmed').reduce((sum, s) => sum + s.netSettlementAmount, 0),
    [sales],
  );

  const pendingSettlement = useMemo(
    () => (sales ?? []).filter((s) => s.status === 'confirmed').reduce((sum, s) => sum + s.remainingSettlement, 0),
    [sales],
  );

  if (!sales) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">فروش فروشندگان</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          <div className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
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
          <h1 className="text-xl font-bold">فروش فروشندگان</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-stone-600 dark:text-stone-400">
            <span>کل تسویه معوق:</span>
            <span className="font-bold mr-1">
              {toPersianDigits(totalSettlement.toLocaleString('fa-IR'))} تومان
            </span>
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            <span>باقی‌مانده تسویه:</span>
            <span className="font-bold mr-1 text-brand">
              {toPersianDigits(pendingSettlement.toLocaleString('fa-IR'))} تومان
            </span>
          </div>
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
          <p>فروشی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((sale) => (
            <div
              key={sale.id}
              className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === sale.id ? null : sale.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10">
                      <ShoppingBag className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <div className="font-medium">{sale.code}</div>
                      <div className="text-sm text-stone-500 dark:text-stone-400">
                        فروشنده: <span className="font-medium">{sale.sellerName ?? sale.sellerId}</span>
                        {' • '}
                        کانال: <span className="font-medium">{sale.channelCode ?? sale.channelId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_COLOR[sale.status])}>
                      {STATUS_LABELS[sale.status]}
                    </span>
                    {expandedId === sale.id ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{sale.lines?.length ?? 0} کالا</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(sale.saleDate).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-stone-500">جمع کل:</span>
                    <span className="font-medium ml-1">
                      {toPersianDigits(sale.subtotal.toLocaleString('fa-IR'))} تومان
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">کمسـؤالیت فروشنده:</span>
                    <span className="font-medium ml-1">
                      {toPersianDigits(sale.commissionAmount.toLocaleString('fa-IR'))} تومان
                    </span>
                  </div>
                </div>
              </div>

              {expandedId === sale.id && (
                <div className="border-t border-stone-200 dark:border-stone-700 p-4 bg-stone-50 dark:bg-stone-800/50">
                  {/* Commission breakdown */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2 text-stone-700 dark:text-stone-300">
                      جزئیات تسویه حساب
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">مبلغ خالص تسویه:</span>
                        <span className="font-medium">
                          {toPersianDigits(sale.netSettlementAmount.toLocaleString('fa-IR'))} تومان
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">مبنای تسویه شده:</span>
                        <span className="font-medium">
                          {toPersianDigits(sale.settledAmount.toLocaleString('fa-IR'))} تومان
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">باقی‌مانده تسویه:</span>
                        <span className="font-medium text-brand">
                          {toPersianDigits(sale.remainingSettlement.toLocaleString('fa-IR'))} تومان
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lines */}
                  {sale.lines && sale.lines.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2 text-stone-700 dark:text-stone-300">کالاها</h3>
                      <div className="space-y-1.5">
                        {sale.lines.map((line) => (
                          <div
                            key={line.id}
                            className="flex justify-between items-center py-1 text-sm"
                          >
                            <span className="font-medium">
                              {line.itemCode ?? 'بدون کد'}
                            </span>
                            <span>
                              {toPersianDigits(line.quantity)} ×{' '}
                              {toPersianDigits(line.unitPrice.toLocaleString('fa-IR'))} ={' '}
                              <span className="font-medium">
                                {toPersianDigits(line.lineTotal.toLocaleString('fa-IR'))}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status transitions */}
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {availableTransitions(sale.status).map((next) => (
                        <button
                          key={next}
                          onClick={() => handleStatusChange(sale, next)}
                          disabled={updatingId === sale.id}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                            'border-stone-300 dark:border-stone-600',
                            'hover:bg-stone-100 dark:hover:bg-stone-800',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                          )}
                        >
                          {updatingId === sale.id && (
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

export default SellerSalesPage;
