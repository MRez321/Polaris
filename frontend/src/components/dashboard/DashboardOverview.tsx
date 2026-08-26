import React from 'react';
import {
  Wallet,
  AlertOctagon,
  CreditCard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import type {
  DashboardStats,
  Consignment,
  Seller,
  PaymentRecord,
  GarmentItem,
} from '../../types';
import { StatsCard } from './StatsCard';
import { OverdueAlertBanner } from './OverdueAlertBanner';
import { SalesDebtChart } from './SalesDebtChart';
import { TopSellersCard } from './TopSellersCard';
import { formatToman, toJalaliDate, toJalaliDateTime, toPersianDigits } from '../../utils/persian';
import { Badge } from '../common/Badge';

interface DashboardOverviewProps {
  stats: DashboardStats;
  consignments?: Consignment[];
  sellers?: Seller[];
  payments?: PaymentRecord[];
  items?: GarmentItem[];
  darkMode?: boolean;
  onOpenHandover?: () => void;
  onOpenPayment?: () => void;
  onSelectSeller?: (seller: Seller) => void;
  onSelectConsignment?: (c: Consignment) => void;
  onGoToTab?: (tab: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  consignments = [],
  sellers = [],
  payments = [],
  items = [],
  darkMode = false,
  onOpenPayment = () => {},
  onSelectSeller = (_seller: Seller) => {},
  onSelectConsignment = (_c: Consignment) => {},
  onGoToTab = (_tab: any) => {},
}) => {
  const safeConsignments = consignments || [];
  const safeSellers = sellers || [];
  const safePayments = payments || [];
  const safeItems = items || [];

  const overdueConsignments = safeConsignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  );

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
          onClick={() => onGoToTab('finances')}
        />
      </div>

      {/* Interactive Charts & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesDebtChart darkMode={darkMode} />
        </div>
        <div className="lg:col-span-1">
          <TopSellersCard
            sellers={safeSellers}
            onSelectSeller={onSelectSeller}
            onRecordPayment={() => onOpenPayment()}
          />
        </div>
      </div>

      {/* Recent Activity & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Handover Consignments */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-[#CEAE80]" />
              <span>آخرین واگذاری‌های امانی به دست‌فروشان</span>
            </h4>
            <button
              onClick={() => onGoToTab('consignments')}
              className="text-xs text-amber-800 dark:text-[#CEAE80] hover:underline font-bold"
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
                  className="p-3.5 rounded-xl glass-card hover:border-[#CEAE80]/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">
                        {c.sellerName}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#1E1E22] text-stone-700 dark:text-[#CEAE80] font-mono border border-black/5 dark:border-white/5">
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

        {/* Recent Payments */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-green-400" />
              <span>آخرین دریافت‌های نقدی و تسویه‌ها</span>
            </h4>
            <button
              onClick={() => onGoToTab('finances')}
              className="text-xs text-amber-800 dark:text-[#CEAE80] hover:underline font-bold"
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
      </div>
    </div>
  );
};
