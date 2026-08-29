import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus } from '@/types';
import { getApiErrorMessage, ordersApi } from '@/lib/api';
import { formatToman, toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
import { SelectMenu } from '@/components/ui/select-menu';
import { cn } from '@/lib/utils';

const STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  pending: { label: 'در انتظار تایید', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  confirmed: { label: 'تایید شده', badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  preparing: { label: 'در حال آماده‌سازی', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  shipped: { label: 'ارسال شده', badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
  delivered: { label: 'تحویل شده', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  cancelled: { label: 'لغو شده', badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
};

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

const PAYMENT_META: Record<Order['paymentMethod'], { label: string; icon: React.ReactNode }> = {
  cod: { label: 'پرداخت در محل', icon: <Banknote className="w-3.5 h-3.5" /> },
  card_transfer: { label: 'کارت به کارت', icon: <CreditCard className="w-3.5 h-3.5" /> },
};

type StatusFilter = 'all' | OrderStatus;

/**
 * Admin order management: every storefront order with customer details,
 * line items and a status workflow. Cancelling restocks items server-side;
 * un-cancelling reserves them again.
 */
export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setOrders(null);
    ordersApi
      .all()
      .then(setOrders)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (orders ?? []).filter((o) => filter === 'all' || o.status === filter),
    [orders, filter]
  );

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: orders?.length ?? 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders ?? []) base[o.status] += 1;
    return base;
  }, [orders]);

  const handleStatusChange = async (order: Order, next: string) => {
    const status = next as OrderStatus;
    if (status === order.status) return;
    setUpdatingId(order.id);
    try {
      const updated = await ordersApi.updateStatus(order.id, status);
      setOrders((list) => (list ? list.map((o) => (o.id === updated.id ? updated : o)) : list));
      toast.success(`وضعیت سفارش ${order.code} به «${STATUS_META[status].label}» تغییر کرد`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تغییر وضعیت سفارش ناموفق بود'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl border border-[#CEAE80]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80] shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-base text-stone-900 dark:text-white">سفارش‌های فروشگاه</h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              سفارش‌های ثبت‌شده از ویترین عمومی؛ لغو سفارش موجودی انبار را برمی‌گرداند.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={!orders && !error}
          className="px-3.5 py-1.5 rounded-xl glass-card hover:border-[#CEAE80] text-xs font-bold flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', (!orders && !error) && 'animate-spin')} />
          <span>به‌روزرسانی</span>
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {(['all', ...STATUS_ORDER] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
              filter === s
                ? 'bg-[#CEAE80] text-black shadow-sm font-black'
                : 'glass-card text-stone-600 dark:text-gray-300 hover:border-[#CEAE80]/60'
            )}
          >
            <span>{s === 'all' ? 'همه' : STATUS_META[s].label}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 rounded-full font-black',
                filter === s ? 'bg-black/10 text-black' : 'bg-stone-500/15 text-stone-500 dark:text-gray-400'
              )}
            >
              {toPersianDigits(counts[s])}
            </span>
          </button>
        ))}
      </div>

      {/* Body */}
      {error && (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
          <p className="text-sm font-black text-rose-600 dark:text-rose-400">خطا در بارگذاری سفارش‌ها</p>
          <p className="text-xs text-stone-500 dark:text-gray-400">{error}</p>
          <button onClick={load} className="px-4 py-2 rounded-xl glass-card text-xs font-bold hover:border-[#CEAE80]">
            تلاش دوباره
          </button>
        </div>
      )}

      {!orders && !error && (
        <div className="p-10 flex items-center justify-center text-stone-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>در حال بارگذاری سفارش‌ها…</span>
        </div>
      )}

      {orders && filtered.length === 0 && (
        <div className="glass-panel p-10 rounded-2xl text-center space-y-2">
          <ShoppingBag className="w-8 h-8 text-stone-300 dark:text-gray-600 mx-auto" />
          <p className="text-sm font-black text-stone-900 dark:text-white">
            {orders.length === 0 ? 'هنوز سفارشی ثبت نشده است' : 'سفارشی با این وضعیت یافت نشد'}
          </p>
          <p className="text-xs text-stone-500 dark:text-gray-400">
            {orders.length === 0
              ? 'سفارش‌های ثبت‌شده از ویترین عمومی اینجا نمایش داده می‌شوند.'
              : 'فیلتر وضعیت را تغییر دهید.'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((order) => {
          const status = STATUS_META[order.status];
          const payment = PAYMENT_META[order.paymentMethod];
          return (
            <article key={order.id} className="glass-panel rounded-2xl p-5 shadow-xl border border-stone-200 dark:border-white/10 space-y-4">
              {/* Top row: code, date, status control */}
              <header className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-stone-900 dark:text-white" dir="ltr">
                      {order.code}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border', status.badge)}>
                      {status.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 dark:text-gray-500 font-bold block">
                    {toJalaliDateTime(order.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {updatingId === order.id && <Loader2 className="w-4 h-4 animate-spin text-[#CEAE80]" />}
                  <SelectMenu
                    value={order.status}
                    onChange={(v) => void handleStatusChange(order, v)}
                    className="w-44"
                    options={STATUS_ORDER.map((s) => ({
                      value: s,
                      label: (
                        <span className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full', STATUS_META[s].badge.split(' ')[0])} />
                          {STATUS_META[s].label}
                        </span>
                      ),
                    }))}
                  />
                </div>
              </header>

              {/* Customer + shipping info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="glass-card rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-stone-400 dark:text-gray-500 font-bold block">گیرنده</span>
                  <span className="font-black text-stone-900 dark:text-white block truncate">{order.customerName}</span>
                  <span className="flex items-center gap-1 text-stone-600 dark:text-gray-300 font-bold" dir="ltr">
                    <Phone className="w-3 h-3 shrink-0" />
                    {order.phone}
                  </span>
                </div>
                <div className="glass-card rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-stone-400 dark:text-gray-500 font-bold block">مقصد</span>
                  <span className="flex items-start gap-1 text-stone-900 dark:text-white font-black leading-5">
                    <MapPin className="w-3 h-3 shrink-0 mt-1 text-[#A67C38] dark:text-[#CEAE80]" />
                    <span className="truncate">{order.city}</span>
                  </span>
                  <span className="text-stone-500 dark:text-gray-400 block leading-5 line-clamp-2">{order.address}</span>
                </div>
                <div className="glass-card rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-stone-400 dark:text-gray-500 font-bold block">روش پرداخت</span>
                  <span className="flex items-center gap-1.5 font-black text-stone-900 dark:text-white">
                    {payment.icon}
                    {payment.label}
                  </span>
                </div>
                <div className="glass-card rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-stone-400 dark:text-gray-500 font-bold block">مبلغ کل</span>
                  <span className="text-base font-black text-[#A67C38] dark:text-[#CEAE80] block">
                    {formatToman(order.total)}
                  </span>
                </div>
              </div>

              {/* Line items */}
              <div className="rounded-xl border border-dashed border-stone-200 dark:border-white/10 divide-y divide-dashed divide-stone-200 dark:divide-white/10">
                {order.items.map((line, i) => (
                  <div key={`${line.itemId}-${i}`} className="flex items-center gap-3 p-3">
                    <span className="shrink-0 w-10 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-white/5">
                      <SafeImage src={line.imageUrl} alt={line.name} className="w-full h-full object-cover" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-stone-900 dark:text-white truncate">{line.name}</p>
                      <p className="text-[10px] text-stone-500 dark:text-gray-400 font-bold">
                        <span dir="ltr">{line.code}</span>
                        {[line.size && ` · سایز ${line.size}`, line.color && ` · رنگ ${line.color}`].join('')}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-[11px] font-black text-stone-900 dark:text-white">
                        {toPersianDigits(line.quantity)} × {formatToman(line.price)}
                      </p>
                      <p className="text-[10px] text-stone-400 dark:text-gray-500 font-bold">
                        {formatToman(line.price * line.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {order.note && (
                <p className="flex items-start gap-1.5 text-[11px] leading-5 text-stone-500 dark:text-gray-400 bg-black/20 border border-white/5 rounded-xl p-3">
                  <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#CEAE80]" />
                  <span>
                    <span className="font-black">یادداشت مشتری: </span>
                    {order.note}
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;
