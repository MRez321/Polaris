/**
 * ManagerActionCenter — a single surface for actionable workshop alerts,
 * grouped by concern so a manager can scan "what needs doing now" at a glance:
 *  1. سرسیدهای امامی  (consignments with outstanding debt past the due date)
 *  2. کالاهای کم‌موجودی (items at/below their low-stock threshold)
 *  3. سفارش‌های در انتظار (storefront orders not yet delivered)
 *
 * Data is driven entirely by props from DataContext (never fabricated).
 * Content-only: rendered inside a dashboard WidgetShell (which supplies the
 * panel title / collapse chrome); can also be embedded elsewhere.
 */
import React from 'react';
import { CreditCard, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import type { Consignment, GarmentItem, Order, OrderStatus } from '@/types';
import { Badge } from '@/components/common/Badge';
import { formatToman, toJalaliDate, toPersianDigits } from '@/utils/persian';

export interface ManagerActionCenterProps {
  overdueConsignments: Consignment[];
  lowStockItems: GarmentItem[];
  pendingOrders?: Order[];
  /** Latest-first ordering is assumed; if not, sort inside. */
  onSelectConsignment?: (c: Consignment) => void;
  onSelectOrder?: (o: Order) => void;
  onGoToTab?: (tab: string) => void;
}

type AlertGroup = {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  tab: string;
};

const PENDING_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing'];

export const ManagerActionCenter: React.FC<ManagerActionCenterProps> = ({
  overdueConsignments = [],
  lowStockItems = [],
  pendingOrders = [],
  onSelectConsignment,
  onSelectOrder,
  onGoToTab,
}) => {
  const sortedOverdue = React.useMemo(
    () =>
      [...overdueConsignments].sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      ),
    [overdueConsignments]
  );
  const sortedLowStock = React.useMemo(
    () =>
      [...lowStockItems].sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0)),
    [lowStockItems]
  );
  const sortedPending = React.useMemo(
    () =>
      [...pendingOrders]
        .filter((o) => PENDING_ORDER_STATUSES.includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [pendingOrders]
  );

  const groups: AlertGroup[] = [
    { id: 'overdue', title: 'سرسیدهای امانی', icon: <TrendingUp className="w-4 h-4" />, count: sortedOverdue.length, tab: 'consignments' },
    { id: 'lowStock', title: 'کالاهای کم‌موجودی', icon: <Package className="w-4 h-4" />, count: sortedLowStock.length, tab: 'inventory' },
    { id: 'orders', title: 'سفارش‌های در انتظار', icon: <ShoppingBag className="w-4 h-4" />, count: sortedPending.length, tab: 'orders' },
  ];

  const hasAny = groups.some((g) => g.count > 0);

  const handleViewAll = (tab: string) => onGoToTab?.(tab);

  return (
    <div className="space-y-4">
      {!hasAny ? (
        <div className="text-center py-7 text-xs text-stone-500 dark:text-gray-400">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-emerald-500/60" />
          همه چیز آماده است — هیچ اقدام اضطراری ندارید.
        </div>
      ) : (
        groups.map((g) => {
          if (g.count === 0) return null;
          return (
            <div key={g.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {g.icon}
                  <span className="font-black text-sm text-stone-900 dark:text-white">
                    {g.title}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {toPersianDigits(g.count)}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewAll(g.tab)}
                  className="text-[10px] font-bold text-brand hover:text-brand-hover transition-colors"
                >
                  مشاهده همه
                </button>
              </div>

              <div className="space-y-1.5">
                {g.id === 'overdue' &&
                  sortedOverdue.slice(0, 5).map((c) => (
                    <OverdueRow key={c.id} c={c} onSelect={onSelectConsignment} />
                  ))}
                {g.id === 'lowStock' &&
                  sortedLowStock.slice(0, 5).map((item) => (
                    <LowStockRow key={item.id} item={item} />
                  ))}
                {g.id === 'orders' &&
                  sortedPending.slice(0, 5).map((o) => (
                    <OrderRow key={o.id} order={o} onSelect={onSelectOrder} />
                  ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const OverdueRow: React.FC<{ c: Consignment; onSelect?: (c: Consignment) => void }> = ({
  c,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => onSelect?.(c)}
    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl glass-card hover:border-brand/40 text-left transition-all"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
      <div className="min-w-0">
        <p className="font-black text-xs text-stone-900 dark:text-white truncate">
          {c.sellerName}
        </p>
        <p className="text-[10px] text-stone-500 dark:text-gray-400 truncate">
          کد {c.code} • موعد: {toJalaliDate(c.dueDate)}
        </p>
      </div>
    </div>
    <div className="text-left shrink-0">
      <span className="font-black text-xs text-rose-600 dark:text-red-400 font-mono block">
        {formatToman(c.remainingAmount)}
      </span>
      <Badge variant="danger" size="sm">
        سرسید
      </Badge>
    </div>
  </button>
);

const LowStockRow: React.FC<{ item: GarmentItem }> = ({ item }) => (
  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl glass-card">
    <div className="flex items-center gap-2.5 min-w-0">
      <Package className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="min-w-0">
        <p className="font-black text-xs text-stone-900 dark:text-white truncate">
          {item.name}
        </p>
        <p className="text-[10px] text-stone-500 dark:text-gray-400 truncate">
          کد {item.code}
        </p>
      </div>
    </div>
    <div className="text-left shrink-0">
      <span className="font-black text-xs text-amber-700 dark:text-amber-400 font-mono block">
        {toPersianDigits(item.stockQuantity || 0)} / {toPersianDigits(item.minStockThreshold || 0)}
      </span>
      <Badge variant="warning" size="sm">
        کم‌موجودی
      </Badge>
    </div>
  </div>
);

const OrderRow: React.FC<{ order: Order; onSelect?: (o: Order) => void }> = ({ order, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect?.(order)}
    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl glass-card hover:border-brand/40 text-left transition-all"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <ShoppingBag className="w-4 h-4 text-brand shrink-0" />
      <div className="min-w-0">
        <p className="font-black text-xs text-stone-900 dark:text-white truncate">
          {order.customerName}
        </p>
        <p className="text-[10px] text-stone-500 dark:text-gray-400 truncate">
          سفارش {order.code} • {toPersianDigits(order.items?.length || 0)} قلم
        </p>
      </div>
    </div>
    <div className="text-left shrink-0">
      <span className="font-black text-xs text-stone-900 dark:text-white font-mono block">
        {formatToman(order.total)}
      </span>
      <Badge variant="blue" size="sm">
        در انتظار
      </Badge>
    </div>
  </button>
);
