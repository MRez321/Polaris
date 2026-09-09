import React from 'react';
import {
  Wallet,
  AlertOctagon,
  CreditCard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  X,
  Clock,
  Store,
  TrendingUp,
  Undo2,
  Trophy,
  CalendarClock,
  Scissors,
  Landmark,
  ChartColumn,
} from 'lucide-react';
import type {
  DashboardStats,
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
  dashboardPrefs?: { [widgetId: string]: boolean };
  onDashboardPrefsChange?: (prefs: { [widgetId: string]: boolean }) => void;
}

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

  // Live Jalali clock — one tick per second.
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Widget visibility: defaults ON, overridden by persisted dashboardPrefs.
  const isVisible = (id: string) => dashboardPrefs?.[id] !== false;
  const toggleWidget = (id: string, checked: boolean) => {
    onDashboardPrefsChange({ ...dashboardPrefs, [id]: checked });
  };

  const WIDGETS: { id: string; label: string }[] = [
    { id: 'clockWidget', label: 'ساعت و تاریخ شمسی' },
    { id: 'kpiCards', label: 'کارت‌های شاخص کلیدی' },
    { id: 'salesDebtChart', label: 'نمودار فروش و بدهی' },
    { id: 'topSellers', label: 'برترین دست‌فروشان' },
    { id: 'recentHandovers', label: 'آخرین واگذاری‌های امانی' },
    { id: 'recentPayments', label: 'آخرین دریافت‌ها' },
    { id: 'latestShopSales', label: 'آخرین فروش‌های فروشگاه' },
    { id: 'latestSellerIncome', label: 'آخرین درآمد دست‌فروشان' },
    { id: 'latestReturns', label: 'آخرین مرجوعی‌ها' },
    { id: 'topItems', label: 'پرفروش‌ترین اقلام' },
    { id: 'scheduledDeliveries', label: 'تحویل‌های زمان‌بندی‌شده' },
    { id: 'pendingProduction', label: 'اقلام در انتظار تولید' },
    { id: 'liquidBalance', label: 'موجودی صندوق کارگاه' },
    { id: 'incomeWindowStats', label: 'درآمد هفتگی و ماهانه' },
  ];

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

  return (
    <div className="space-y-6">
      {/* Widget visibility settings (gear) */}
      <div className="flex justify-end">
        <Collapsible
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          className="w-full"
        >
          <CollapsibleTrigger className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-stone-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-white/10 transition-all active:scale-95">
            {settingsOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            تنظیمات نمایش داشبورد
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass-panel p-4 rounded-2xl mt-3 border border-brand/20 shadow-xl">
              <p className="text-xs font-black text-stone-700 dark:text-gray-300 mb-3">
                نمایش یا پنهان‌سازی بخش‌های داشبورد:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {WIDGETS.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-stone-800 dark:text-gray-200">{w.label}</span>
                    <Switch
                      checked={isVisible(w.id)}
                      onCheckedChange={(checked: boolean) => toggleWidget(w.id, checked)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Live Jalali clock / date / weekday */}
      {isVisible('clockWidget') && (
        <div className="glass-panel p-5 rounded-2xl border border-stone-200 dark:border-white/5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/15 text-brand-ink dark:text-brand flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight text-stone-900 dark:text-white">
                  {new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}
                </p>
                <p className="text-xs text-stone-500 dark:text-gray-400 font-bold mt-1">ساعت زنده کارگاه</p>
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
        </div>
      )}

      {/* Overdue Alert Banner */}
      <OverdueAlertBanner
        overdueConsignments={overdueConsignments}
        sellers={safeSellers}
        onSelectConsignment={onSelectConsignment}
        onRecordPaymentForSeller={() => {
          onOpenPayment();
        }}
      />

      {/* KPI Cards Grid */}
      {isVisible('kpiCards') && (
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
      )}

      {/* Interactive Charts & Top Sellers */}
      {(isVisible('salesDebtChart') || isVisible('topSellers')) && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isVisible('salesDebtChart') && (
        <div className="lg:col-span-2">
          <SalesDebtChart darkMode={darkMode} />
        </div>
        )}
        {isVisible('topSellers') && (
        <div className="lg:col-span-1">
          <TopSellersCard
            sellers={safeSellers}
            onSelectSeller={onSelectSeller}
            onRecordPayment={() => onOpenPayment()}
          />
        </div>
        )}
      </div>
      )}

      {/* Recent Activity & Recent Payments */}
      {isVisible('recentHandovers') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Handover Consignments */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-brand" />
              <span>آخرین واگذاری‌های امانی به دست‌فروشان</span>
            </h4>
            <button
              onClick={() => onGoToTab('consignments')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>

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
        </div>
      </div>
      )}

      {/* Recent Payments */}
      {isVisible('recentPayments') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-green-400" />
              <span>آخرین دریافت‌های نقدی و تسویه‌ها</span>
            </h4>
            <button
              onClick={() => onGoToTab('finances/payments')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>

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
        </div>
      )}

      {/* Latest shop sales (storefront orders) */}
      {isVisible('latestShopSales') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>آخرین فروش‌های فروشگاه آنلاین</span>
            </h4>
            <button
              onClick={() => onGoToTab('orders')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>
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
      )}

      {/* Latest seller income (consignment revenue) */}
      {isVisible('latestSellerIncome') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-green-400" />
              <span>آخرین درآمد از دست‌فروشان</span>
            </h4>
          </div>
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
      )}

      {/* Latest returns */}
      {isVisible('latestReturns') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-rose-600 dark:text-red-400" />
              <span>آخرین مرجوعی‌ها از دست‌فروشان</span>
            </h4>
            <button
              onClick={() => onGoToTab('consignments')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>
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
      )}

      {/* Top items (cross-channel) */}
      {isVisible('topItems') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand" />
              <span>پرفروش‌ترین اقلام (فروشگاه + دست‌فروش)</span>
            </h4>
          </div>
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
      )}

      {/* Scheduled deliveries (pending handovers) */}
      {isVisible('scheduledDeliveries') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>تحویل‌های زمان‌بندی‌شده (در انتظار تحویل)</span>
            </h4>
            <button
              onClick={() => onGoToTab('consignments')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>
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
      )}

      {/* Pending production items */}
      {isVisible('pendingProduction') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>اقلام در انتظار تولید</span>
            </h4>
            <button
              onClick={() => onGoToTab('inventory')}
              className="text-xs text-brand-ink dark:text-brand hover:underline font-bold"
            >
              مشاهده همه
            </button>
          </div>
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
      )}

      {/* Workshop liquid balance */}
      {isVisible('liquidBalance') && (
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
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
        </div>
      )}

      {/* Weekly & monthly income (pure & gross) */}
      {isVisible('incomeWindowStats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all flex flex-col justify-between">
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
          <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all flex flex-col justify-between">
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
      )}
    </div>
  );
};
