import React from 'react';
import {
  Wallet,
  AlertOctagon,
  CreditCard,
  Package,
  Settings,
  X,
  Clock,
  Landmark,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Play,
  Trash2,
  Columns3,
  GripVertical,
} from 'lucide-react';
import type {
  DashboardStats,
  DashboardLayout,
  DashboardPreset,
  DashboardWidgetCols,
  Consignment,
  Seller,
  PaymentRecord,
  GarmentItem,
  Order,
  ConsignmentReturn,
} from '@/types';
import type { AnalyticsResult } from '@/lib/api';
import { StatsCard } from './StatsCard';
import { OverdueAlertBanner } from './OverdueAlertBanner';
import { SalesDebtChart } from './SalesDebtChart';
import { TopSellersCard } from './TopSellersCard';
import { TodoWidget } from './TodoWidget';
import {
  DASHBOARD_WIDGETS,
  defaultLayout,
  normalizeLayout,
  layoutSnapshot,
  applyPreset,
  spanClass,
} from './dashboardLayout';
import { formatToman, toJalaliDate, toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { Badge } from '@/components/common/Badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { ORDER_STATUS_META } from '@/lib/orderStatus';

interface DashboardOverviewProps {
  stats: DashboardStats;
  consignments?: Consignment[];
  sellers?: Seller[];
  payments?: PaymentRecord[];
  items?: GarmentItem[];
  orders?: Order[];
  returns?: ConsignmentReturn[];
  analytics?: AnalyticsResult | null;
  darkMode?: boolean;
  onOpenHandover?: () => void;
  onOpenPayment?: () => void;
  onSelectSeller?: (seller: Seller) => void;
  onSelectConsignment?: (c: Consignment) => void;
  onGoToTab?: (tab: string) => void;
  dashboardPrefs?: DashboardLayout;
  onDashboardPrefsChange?: (prefs: DashboardLayout) => void;
}

/** Collapsible glass panel wrapper for one dashboard grid item. */
const WidgetShell: React.FC<{
  title: string;
  icon?: React.ReactNode;
  cols?: DashboardWidgetCols;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}> = ({ title, icon, cols, collapsed, onToggleCollapse, children }) => (
  <div className={`glass-panel rounded-2xl border border-stone-200 dark:border-white/5 shadow-xl overflow-hidden ${spanClass(cols)}`}>
    <Collapsible open={!collapsed} onOpenChange={onToggleCollapse}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 text-start hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className="font-black text-stone-900 dark:text-white text-sm">{title}</span>
        </span>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-stone-500 dark:text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-stone-500 dark:text-gray-400" />
        )}
      </button>
      <CollapsibleContent>
        <div className="p-4 sm:p-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  </div>
);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  consignments = [],
  sellers = [],
  payments = [],
  items = [],
  orders = [],
  returns = [],
  analytics = null,
  darkMode = false,
  onOpenPayment = () => {},
  onSelectSeller = (_seller: Seller) => {},
  onSelectConsignment = (_c: Consignment) => {},
  onGoToTab = (_tab: string) => {},
  dashboardPrefs,
  onDashboardPrefsChange = () => {},
}) => {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const [presetName, setPresetName] = React.useState('');

  // ---- Drag reorder (HTML5 DnD, works alongside the up/down buttons) ----
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  // Ref mirror: the drop handler must read the live value even when dragstart→drop
  // land in the same React render (synthetic tests, fast sequences).
  const dragIdRef = React.useRef<string | null>(null);

  const clearDrag = () => {
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  };

  const handleDrop = (targetId: string) => {
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetId) {
      clearDrag();
      return;
    }
    const order = [...layout.order];
    const from = order.indexOf(sourceId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) {
      clearDrag();
      return;
    }
    order.splice(from, 1);
    order.splice(to, 0, sourceId);
    updateLayout({ order });
    clearDrag();
  };

  // Live Jalali clock — one tick per second.
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- Layout state (v2) -------------------------------------------------
  const layout = React.useMemo(
    () => normalizeLayout(dashboardPrefs ?? undefined),
    [dashboardPrefs],
  );
  const updateLayout = (patch: Partial<DashboardLayout>) => {
    onDashboardPrefsChange({ ...layout, ...patch });
  };

  const isVisible = (id: string) => !layout.hidden.includes(id);
  const isCollapsed = (id: string) => layout.collapsed.includes(id);

  const toggleHidden = (id: string, checked: boolean) => {
    const hidden = checked
      ? layout.hidden.filter((x) => x !== id)
      : [...layout.hidden, id];
    updateLayout({ hidden });
  };
  const toggleCollapsed = (id: string) => {
    const collapsed = isCollapsed(id)
      ? layout.collapsed.filter((x) => x !== id)
      : [...layout.collapsed, id];
    updateLayout({ collapsed });
  };
  const setCols = (id: string, cols: DashboardWidgetCols) => {
    updateLayout({ cols: { ...layout.cols, [id]: cols } });
  };
  const move = (id: string, dir: -1 | 1) => {
    const order = [...layout.order];
    const idx = order.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= order.length) return;
    [order[idx], order[next]] = [order[next], order[idx]];
    updateLayout({ order });
  };
  const resetLayout = () => {
    onDashboardPrefsChange({ ...defaultLayout(), presets: layout.presets });
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: DashboardPreset = {
      id: `preset-${Date.now()}`,
      name,
      data: layoutSnapshot(layout),
    };
    updateLayout({ presets: [...layout.presets, preset] });
    setPresetName('');
  };
  const applyPresetById = (id: string) => {
    const preset = layout.presets.find((p) => p.id === id);
    if (!preset) return;
    onDashboardPrefsChange(applyPreset(layout, preset));
  };
  const deletePreset = (id: string) => {
    updateLayout({ presets: layout.presets.filter((p) => p.id !== id) });
  };

  // ---- Derived data ------------------------------------------------------
  const safeConsignments = consignments || [];
  const safeSellers = sellers || [];
  const safePayments = payments || [];
  const safeItems = items || [];
  const safeOrders = orders || [];
  const safeReturns = returns || [];

  const overdueConsignments = safeConsignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  );
  const pendingDeliveries = safeConsignments.filter((c) => c.deliveryStatus === 'pending');
  const pendingProductionItems = safeItems.filter((i) => i.productionStatus === 'pending_production');

  const totalStockCount = safeItems.reduce((s, i) => s + (i.stockQuantity || 0), 0);

  // Real today-vs-yesterday collection delta for the payments KPI card
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const todayPaymentsSum = safePayments
    .filter((p) => new Date(p.date).getTime() >= startOfToday.getTime())
    .reduce((s, p) => s + (p.amount || 0), 0);
  const yesterdayPaymentsSum = safePayments
    .filter((p) => {
      const t = new Date(p.date).getTime();
      return t >= startOfYesterday.getTime() && t < startOfToday.getTime();
    })
    .reduce((s, p) => s + (p.amount || 0), 0);

  let paymentTrend: { text: string; isPositive: boolean } | undefined;
  if (yesterdayPaymentsSum > 0) {
    const deltaPct = Math.round(
      ((todayPaymentsSum - yesterdayPaymentsSum) / yesterdayPaymentsSum) * 100
    );
    paymentTrend = {
      text: `${deltaPct >= 0 ? '+' : '−'}${toPersianDigits(Math.abs(deltaPct))}٪ نسبت به دیروز`,
      isPositive: deltaPct >= 0,
    };
  } else if (todayPaymentsSum > 0) {
    paymentTrend = { text: 'اولین دریافت امروز', isPositive: true };
  }

  // ---- Widget bodies (id → node) ------------------------------------------
  const widgetBody: Record<string, React.ReactNode> = {
    clockWidget: (
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/15 text-brand-ink dark:text-brand flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight text-stone-900 dark:text-white">
              {new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}
            </p>
            <p className="text-xs text-stone-500 dark:text-gray-400 font-bold mt-1">ساعت کارگاه</p>
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-black text-stone-900 dark:text-white">
            {toJalaliDate(now)}
          </p>
          <p className="text-sm font-bold text-brand-ink dark:text-brand mt-1">
            {new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now)}
          </p>
        </div>
      </div>
    ),

    overdueAlerts: (
      <OverdueAlertBanner
        overdueConsignments={overdueConsignments}
        sellers={safeSellers}
        onSelectConsignment={onSelectConsignment}
        onRecordPaymentForSeller={() => {
          onOpenPayment();
        }}
      />
    ),

    kpiCards: (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="کل طلب جاری از دست‌فروشان"
          value={formatToman(stats?.totalActiveDebt || 0)}
          subtitle={`${toPersianDigits(stats?.activeConsignmentsCount || 0)} فاکتور امانی فعال`}
          icon={Wallet}
          highlight={true}
          onClick={() => onGoToTab('consignments')}
        />

        <StatsCard
          title="طلب‌های سررسید گذشته"
          value={formatToman(stats?.totalOverdueDebt || 0)}
          subtitle={
            overdueConsignments.length > 0
              ? `${toPersianDigits(overdueConsignments.length)} فاکتور نیازمند پیگیری فوری`
              : 'همه فاکتورها در موعد قانونی هستند'
          }
          icon={AlertOctagon}
          badge={overdueConsignments.length > 0 ? 'نیازمند اقدام' : 'وضعیت عالی'}
          badgeVariant={overdueConsignments.length > 0 ? 'danger' : 'success'}
          onClick={() => onGoToTab('consignments')}
        />

        <StatsCard
          title="ارزش موجودی انبار کارگاه"
          value={formatToman(stats?.totalInventoryValue || 0)}
          subtitle={`${toPersianDigits(totalStockCount)} عدد لباس در انبار`}
          icon={Package}
          badge={(stats?.lowStockItemsCount || 0) > 0 ? `${toPersianDigits(stats.lowStockItemsCount)} هشدار کسری` : 'موجودی کامل'}
          badgeVariant={(stats?.lowStockItemsCount || 0) > 0 ? 'warning' : 'gold'}
          onClick={() => onGoToTab('inventory')}
        />

        <StatsCard
          title="دریافتی‌های امروز"
          value={formatToman(stats?.todayPayments || 0)}
          subtitle="وصول و تسویه فاکتورها"
          icon={CreditCard}
          trend={paymentTrend}
          onClick={() => onGoToTab('finances/payments')}
        />
      </div>
    ),

    todoWidget: <TodoWidget />,

    salesDebtChart: <SalesDebtChart darkMode={darkMode} />,

    topSellers: (
      <TopSellersCard
        sellers={safeSellers}
        onSelectSeller={onSelectSeller}
        onRecordPayment={() => onOpenPayment()}
      />
    ),

    recentHandovers: (
      <div className="space-y-2.5">
        {safeConsignments.slice(0, 4).map((c) => {
          const itemCount = (c.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
          return (
            <div
              key={c.id}
              onClick={() => onSelectConsignment(c)}
              className="p-3.5 rounded-xl glass-card hover:border-brand/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">
                    {c.sellerName}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#1E1E22] text-stone-700 dark:text-brand font-mono border border-black/5 dark:border-white/5">
                    {c.code}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                  {toPersianDigits(itemCount)} قلم کالا • واگذاری: {toJalaliDateTime(c.date)} •
                  موعد: {toJalaliDate(c.dueDate)}
                </p>
              </div>

              <div className="text-left">
                <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-white block font-mono">
                  {formatToman(c.totalAmount)}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    c.remainingAmount === 0
                      ? 'text-emerald-600 dark:text-green-400'
                      : c.status === 'overdue'
                      ? 'text-rose-600 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {c.remainingAmount === 0
                    ? 'تسویه شده'
                    : `مانده: ${formatToman(c.remainingAmount)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    ),

    recentPayments: (
      <div className="space-y-2.5">
        {safePayments.slice(0, 4).map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-xl glass-card flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">
                  {p.sellerName}
                </span>
                <Badge variant="gold" size="sm">
                  تسویه ({toPersianDigits(p.allocations?.length || 0)} فاکتور)
                </Badge>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                {toJalaliDateTime(p.date)} • {p.paymentMethod === 'cash' ? 'نقدی حضوری' : p.paymentMethod === 'bank_transfer' ? 'انتقال بانکی/پایا' : 'دستگاه کارتخوان'}
              </p>
            </div>

            <div className="text-left">
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-green-400 block font-mono">
                +{formatToman(p.amount)}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">{p.code}</span>
            </div>
          </div>
        ))}
      </div>
    ),

    latestShopSales: (
      <div>
        {safeOrders.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">هنوز سفارشی از فروشگاه ثبت نشده است</p>
        ) : (
          <div className="space-y-2.5">
            {safeOrders.slice(0, 4).map((o) => {
              const meta = ORDER_STATUS_META[o.status];
              return (
                <div
                  key={o.id}
                  onClick={() => onGoToTab('orders')}
                  className="p-3.5 rounded-xl glass-card hover:border-brand/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">{o.customerName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                      {toPersianDigits(o.items.reduce((s, l) => s + l.quantity, 0))} قلم • {toJalaliDateTime(o.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-mono">
                    {formatToman(o.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),

    latestSellerIncome: (
      <div>
        {safeSellers.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">هنوز دست‌فروشی ثبت نشده است</p>
        ) : (
          <div className="space-y-2.5">
            {safeSellers
              .map((s) => ({ seller: s, income: s.totalHandoversValue || 0 }))
              .filter((r) => r.income > 0)
              .sort((a, b) => b.income - a.income)
              .slice(0, 4)
              .map(({ seller, income }) => (
                <div
                  key={seller.id}
                  onClick={() => onSelectSeller(seller)}
                  className="p-3.5 rounded-xl glass-card hover:border-brand/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">{seller.name}</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-green-400 font-mono">
                    {formatToman(income)}
                  </span>
                </div>
              ))}
            {safeSellers.every((s) => (s.totalHandoversValue || 0) === 0) && (
              <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">هنوز درآمدی ثبت نشده است</p>
            )}
          </div>
        )}
      </div>
    ),

    latestReturns: (
      <div>
        {safeReturns.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">مرجوعی‌ای ثبت نشده است</p>
        ) : (
          <div className="space-y-2.5">
            {safeReturns.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl glass-card flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">{r.sellerName}</span>
                    <Badge variant="danger" size="sm">
                      {toPersianDigits(r.items.reduce((s, i) => s + i.quantity, 0))} قلم مرجوعی
                    </Badge>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                    {toJalaliDateTime(r.date)} • فاکتور {r.consignmentCode}
                  </p>
                </div>
                <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-red-400 font-mono">
                  {formatToman(r.totalReturnAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    topItems: (
      <div>
        {!analytics || analytics.topItems.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">هنوز فروشی ثبت نشده است</p>
        ) : (
          <div className="space-y-2.5">
            {analytics.topItems.slice(0, 5).map((t, idx) => (
              <div
                key={t.itemId}
                className="p-3.5 rounded-xl glass-card flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                      idx === 0
                        ? 'bg-brand text-brand-on'
                        : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-gray-300'
                    }`}
                  >
                    {toPersianDigits(idx + 1)}
                  </span>
                  <div>
                    <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white block">{t.itemName}</span>
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 font-mono">
                      فروشگاه {toPersianDigits(t.shopSold)} • دست‌فروش {toPersianDigits(t.sellerSold)}
                    </span>
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-black text-brand-ink dark:text-brand font-mono">
                  {toPersianDigits(t.totalSold)} عدد
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    scheduledDeliveries: (
      <div>
        {pendingDeliveries.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">حواله‌ای در انتظار تحویل نیست</p>
        ) : (
          <div className="space-y-2.5">
            {pendingDeliveries.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectConsignment(c)}
                className="p-3.5 rounded-xl glass-card hover:border-brand/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">{c.sellerName}</span>
                    <Badge variant="orange" size="sm">در انتظار تحویل</Badge>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                    موعد تحویل: {c.deliveryDate ? toJalaliDate(c.deliveryDate) : 'نامشخص'} • ثبت: {toJalaliDateTime(c.date)}
                  </p>
                </div>
                <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-mono">
                  {formatToman(c.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    pendingProduction: (
      <div>
        {pendingProductionItems.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 py-4 text-center">قلمی در انتظار تولید نیست</p>
        ) : (
          <div className="space-y-2.5">
            {pendingProductionItems.slice(0, 5).map((i) => (
              <div
                key={i.id}
                className="p-3.5 rounded-xl glass-card flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">{i.name}</span>
                  <p className="text-[10px] text-stone-500 dark:text-gray-400 font-mono mt-0.5">{i.code}</p>
                </div>
                <Badge variant="warning" size="sm">در انتظار تولید</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    liquidBalance: (
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-gray-400">موجودی صندوق کارگاه</p>
          <p className="text-2xl font-black mt-1 tracking-tight text-stone-900 dark:text-white font-mono">
            {formatToman(stats?.liquidBalance || 0)}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
            دریافتی‌ها منهای هزینه‌های جاری کارگاه
          </p>
        </div>
      </div>
    ),

    incomeWindowStats: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-stone-900 dark:text-white text-sm flex items-center gap-2">
              <ChartColumn className="w-4 h-4 text-brand" />
              <span>درآمد ۷ روز اخیر</span>
            </h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-gray-400">خالص</span>
              <span className="text-base font-black text-emerald-600 dark:text-green-400 font-mono">
                {formatToman(stats?.weekPureIncome || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-gray-400">ناخالص</span>
              <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                {formatToman(stats?.weekGrossIncome || 0)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-stone-900 dark:text-white text-sm flex items-center gap-2">
              <ChartColumn className="w-4 h-4 text-brand" />
              <span>درآمد ۳۰ روز اخیر</span>
            </h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-gray-400">خالص</span>
              <span className="text-base font-black text-emerald-600 dark:text-green-400 font-mono">
                {formatToman(stats?.monthPureIncome || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-gray-400">ناخالص</span>
              <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                {formatToman(stats?.monthGrossIncome || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  // ---- Render --------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Widget arrangement settings (gear) */}
      <div className="flex justify-end">
        <Collapsible
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          className="w-full"
        >
          <CollapsibleTrigger className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-stone-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-white/10 transition-all active:scale-95">
            {settingsOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            تنظیمات چیدمان داشبورد
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass-panel p-4 rounded-2xl mt-3 border border-brand/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-black text-stone-700 dark:text-gray-300">
                  ترتیب، نمایش و ستون‌های بخش‌های داشبورد (برای جابه‌جایی، ردیف را بکشید یا از دکمه‌های بالا و پایین استفاده کنید):
                </p>
                <button
                  onClick={resetLayout}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  بازنشانی چیدمان
                </button>
              </div>
              <div className="space-y-2">
                {layout.order.map((id, idx) => {
                  const def = DASHBOARD_WIDGETS.find((w) => w.id === id);
                  if (!def) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => {
                        dragIdRef.current = id;
                        setDragId(id);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', id); } catch { /* IE quirk guard */ }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverId(id);
                      }}
                      onDragLeave={() => setDragOverId((prev) => (prev === id ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(id);
                      }}
                      onDragEnd={clearDrag}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-colors ${
                        dragId === id
                          ? 'opacity-40 border-brand/50'
                          : dragOverId === id
                            ? 'border-brand bg-brand/5'
                            : isVisible(id)
                              ? 'border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5'
                              : 'border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-stone-300 dark:text-gray-600 shrink-0" />
                        <span className="text-[10px] font-black text-stone-400 dark:text-gray-500 font-mono w-5 text-center">
                          {toPersianDigits(idx + 1)}
                        </span>
                        <span className="text-xs font-bold text-stone-800 dark:text-gray-200 truncate">
                          {def.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Reorder: up/down. RTL means visually right-to-left; arrows use logical direction. */}
                        <button
                          onClick={() => move(id, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                          title="جابه‌جایی به بالا"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => move(id, 1)}
                          disabled={idx === layout.order.length - 1}
                          className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                          title="جابه‌جایی به پایین"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {/* Desktop column span (lg only) */}
                        <span className="flex items-center gap-0.5 ms-1 border-s border-black/10 dark:border-white/10 ps-1.5">
                          <Columns3 className="w-3.5 h-3.5 text-stone-400 dark:text-gray-500" />
                          {([1, 2, 3] as DashboardWidgetCols[]).map((c) => (
                            <button
                              key={c}
                              onClick={() => setCols(id, c)}
                              className={`w-6 h-6 rounded-md text-[10px] font-black transition-colors ${
                                (layout.cols[id] ?? def.cols) === c
                                  ? 'bg-brand text-brand-on'
                                  : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/10'
                              }`}
                              title={`اشغال ${toPersianDigits(c)} ستون در دسکتاپ`}
                            >
                              {toPersianDigits(c)}
                            </button>
                          ))}
                        </span>
                        <Switch
                          checked={isVisible(id)}
                          onCheckedChange={(checked: boolean) => toggleHidden(id, checked)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Presets */}
              <div className="border-t border-black/10 dark:border-white/10 pt-3 space-y-2">
                <p className="text-xs font-black text-stone-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-brand" />
                  چیدمان‌های ذخیره‌شده (قابل اشتراک بین کاربران):
                </p>
                <div className="flex gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') savePreset();
                    }}
                    placeholder="نام چیدمان جدید..."
                    className="flex-1 min-w-0 text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
                  />
                  <button
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    ذخیره چیدمان فعلی
                  </button>
                </div>
                {layout.presets.length > 0 && (
                  <div className="space-y-1.5">
                    {layout.presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10"
                      >
                        <span className="text-xs font-bold text-stone-800 dark:text-gray-200 truncate">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => applyPresetById(p.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-brand/10 text-brand-ink dark:text-brand hover:bg-brand/20 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            اعمال
                          </button>
                          <button
                            onClick={() => deletePreset(p.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-500/10 transition-colors"
                            title="حذف چیدمان"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Unified master grid: every visible widget is one grid item. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {layout.order.map((id) => {
          if (!isVisible(id)) return null;
          const def = DASHBOARD_WIDGETS.find((w) => w.id === id);
          if (!def) return null;

          // Widgets with their own panel chrome render bare inside the shell.
          if (id === 'todoWidget') {
            return (
              <div key={id} className={spanClass(layout.cols[id] ?? def.cols)}>
                <TodoWidget
                  collapsed={isCollapsed(id)}
                  onToggleCollapse={() => toggleCollapsed(id)}
                />
              </div>
            );
          }
          if (id === 'overdueAlerts') {
            // No overdues → nothing to render (not even the shell).
            if (overdueConsignments.length === 0) return null;
            return (
              <div key={id} className={spanClass(layout.cols[id] ?? def.cols)}>
                <WidgetShell
                  title="هشدار سرسیدهای گذشته"
                  cols={layout.cols[id] ?? def.cols}
                  collapsed={isCollapsed(id)}
                  onToggleCollapse={() => toggleCollapsed(id)}
                  icon={<AlertOctagon className="w-4 h-4 text-rose-600 dark:text-red-400" />}
                >
                  <OverdueAlertBanner
                    overdueConsignments={overdueConsignments}
                    sellers={safeSellers}
                    onSelectConsignment={onSelectConsignment}
                    onRecordPaymentForSeller={() => {
                      onOpenPayment();
                    }}
                  />
                </WidgetShell>
              </div>
            );
          }
          return (
            <WidgetShell
              key={id}
              title={def.label}
              cols={layout.cols[id] ?? def.cols}
              collapsed={isCollapsed(id)}
              onToggleCollapse={() => toggleCollapsed(id)}
            >
              {widgetBody[id]}
            </WidgetShell>
          );
        })}
      </div>
    </div>
  );
};
