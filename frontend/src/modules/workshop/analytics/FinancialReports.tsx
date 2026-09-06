import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  PieChart as PieIcon,
  Users,
  Wrench,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import type {
  DashboardStats,
  Seller,
  Consignment,
  PaymentRecord,
  GarmentItem,
  StaffMember,
  WorkshopExpense,
  Order,
} from '@/types';
import { SelectMenu } from '@/components/ui/select-menu';
import { formatToman, toPersianDigits, toJalaliDate } from '@/utils/persian';
import { ordersApi } from '@/lib/api';

// JS getDay(): 0=یکشنبه ... 6=شنبه
const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1C1C1C',
  borderRadius: '12px',
  borderColor: '#CEAE80',
  color: '#fff',
  fontSize: '12px',
} as const;

// Expense category labels for the costs pie chart
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  machinery_maintenance: 'سرویس و تعمیر چرخ‌ها',
  workshop_improvement: 'بهسازی و تجهیزات کارگاه',
  materials_supplies: 'پارچه، خرج‌کار و ملزومات',
  rent_bills: 'اجاره و قبوض',
  logistics: 'حمل و نقل',
  other: 'سایر هزینه‌ها',
};

// Order status labels for the website orders pie chart
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار بررسی',
  confirmed: 'تایید شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: 'ماهانه',
  piecework: 'مقطوع / توافقی',
  hourly: 'ساعتی',
};

interface FinancialReportsProps {
  stats: DashboardStats;
  sellers: Seller[];
  consignments: Consignment[];
  payments: PaymentRecord[];
  items: GarmentItem[];
  staff: StaffMember[];
}

type PeriodType = 'this_week' | 'this_month' | 'past_months' | 'specific_month' | 'custom_range';

/** Section wrapper with a consistent glass header. */
const ReportSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => (
  <div className="glass-panel p-5 rounded-2xl space-y-5 shadow-xl">
    <div>
      <h4 className="font-black text-sm text-stone-900 dark:text-white flex items-center gap-2">
        {icon}
        <span className="text-brand">{title}</span>
      </h4>
      {subtitle && <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  stats,
  sellers = [],
  consignments = [],
  payments = [],
  items = [],
  staff = [],
}) => {
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>('بهمن ۱۴۰۳');
  const [customStartDate, setCustomStartDate] = useState<string>('1403/10/01');
  const [customEndDate, setCustomEndDate] = useState<string>('1403/11/30');

  // Workshop expenses + website orders fetched directly (fallback to empty arrays)
  const [expenses, setExpenses] = useState<WorkshopExpense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/api/workshop/expenses')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setExpenses(Array.isArray(d) ? d : []))
      .catch(() => setExpenses([]));
    ordersApi
      .all()
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]));
  }, []);

  // Filter datasets based on selected period
  const { filteredHandoversTotal, filteredPaymentsTotal, filteredConsignments, filteredPayments } =
    useMemo(() => {
      const now = new Date();
      let cFiltered = [...consignments];
      let pFiltered = [...payments];

      if (period === 'this_week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        cFiltered = consignments.filter((c) => new Date(c.date) >= weekAgo);
        pFiltered = payments.filter((p) => new Date(p.date) >= weekAgo);
      } else if (period === 'this_month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        cFiltered = consignments.filter((c) => new Date(c.date) >= monthAgo);
        pFiltered = payments.filter((p) => new Date(p.date) >= monthAgo);
      } else if (period === 'past_months') {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        cFiltered = consignments.filter((c) => new Date(c.date) >= threeMonthsAgo);
        pFiltered = payments.filter((p) => new Date(p.date) >= threeMonthsAgo);
      }

      const hTotal = cFiltered.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
      const pTotal = pFiltered.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        filteredConsignments: cFiltered,
        filteredPayments: pFiltered,
        filteredHandoversTotal: hTotal,
        filteredPaymentsTotal: pTotal,
      };
    }, [period, consignments, payments]);

  // Filter expenses & orders by the same period window
  const { filteredExpenses, filteredOrders } = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (period === 'this_week') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'this_month') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (period === 'past_months') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const exp =
      cutoff != null
        ? (expenses || []).filter((e) => new Date(e.date) >= (cutoff as Date))
        : expenses;
    const ords =
      cutoff != null
        ? (orders || []).filter((o) => new Date(o.createdAt || (o as any).date) >= (cutoff as Date))
        : orders;

    return { filteredExpenses: exp, filteredOrders: ords };
  }, [period, expenses, orders]);

  // Aging analysis of debts
  const nowTime = Date.now();
  let agingUnder7Days = 0;
  let aging7To14Days = 0;
  let agingOver14Days = 0;

  (consignments || []).forEach((c) => {
    if ((c.remainingAmount || 0) > 0) {
      const ageInDays = Math.floor((nowTime - new Date(c.date).getTime()) / (24 * 60 * 60 * 1000));
      if (ageInDays <= 7) {
        agingUnder7Days += c.remainingAmount || 0;
      } else if (ageInDays <= 14) {
        aging7To14Days += c.remainingAmount || 0;
      } else {
        agingOver14Days += c.remainingAmount || 0;
      }
    }
  });

  const totalOutstanding =
    stats?.totalOutstandingDebt || agingUnder7Days + aging7To14Days + agingOver14Days;
  const under7Pct = totalOutstanding ? Math.round((agingUnder7Days / totalOutstanding) * 100) : 0;
  const midPct = totalOutstanding ? Math.round((aging7To14Days / totalOutstanding) * 100) : 0;
  const overPct = totalOutstanding ? Math.round((agingOver14Days / totalOutstanding) * 100) : 0;

  const collectionEfficiency =
    filteredHandoversTotal > 0
      ? Math.round((filteredPaymentsTotal / filteredHandoversTotal) * 100)
      : 0;
  const hasAgingData = totalOutstanding > 0;

  // Chart 1: Bar Data — last 7 calendar days (device-local) from real consignments & payments
  const barChartData = useMemo(() => {
    const handoverEvents = (consignments || [])
      .map((c) => ({ t: new Date(c.date).getTime(), amt: c.totalAmount || 0 }))
      .filter((e) => !isNaN(e.t));
    const collectedEvents = (payments || [])
      .map((p) => ({ t: new Date(p.date).getTime(), amt: p.amount || 0 }))
      .filter((e) => !isNaN(e.t));
    if (handoverEvents.length === 0 && collectedEvents.length === 0) return [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, idx) => {
      const daysAgo = 6 - idx;
      const dayStart = new Date(startOfToday);
      dayStart.setDate(dayStart.getDate() - daysAgo);
      const dayStartT = dayStart.getTime();
      const dayEndT = dayStartT + 24 * 60 * 60 * 1000;
      return {
        name: PERSIAN_WEEKDAYS[dayStart.getDay()],
        واگذاری: handoverEvents
          .filter((e) => e.t >= dayStartT && e.t < dayEndT)
          .reduce((s, e) => s + e.amt, 0),
        وصولی: collectedEvents
          .filter((e) => e.t >= dayStartT && e.t < dayEndT)
          .reduce((s, e) => s + e.amt, 0),
      };
    });
  }, [consignments, payments]);

  // Chart 2: Aging Pie Data — real outstanding amounts only, no fallbacks
  const pieData = [
    { name: 'تازه (<۷ روز)', value: agingUnder7Days, color: '#10B981' },
    { name: 'میان‌مدت (۷-۱۴ روز)', value: aging7To14Days, color: '#F59E0B' },
    { name: 'پرریسک (>۱۴ روز)', value: agingOver14Days, color: '#EF4444' },
  ];

  // SECTION 2 — Workshop costs: KPIs, category pie, staff salaries
  const totalExpensesAmount = (filteredExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const monthlySalariesTotal = (staff || []).reduce(
    (s, m) => s + (m.status === 'active' && m.salaryType === 'monthly' ? m.salaryAmount || 0 : 0),
    0
  );

  const expensesCategoryPie = useMemo(() => {
    const byCat = new Map<string, number>();
    (filteredExpenses || []).forEach((e) => {
      byCat.set(e.category, (byCat.get(e.category) || 0) + (e.amount || 0));
    });
    const palette = ['#CEAE80', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];
    let i = 0;
    return Array.from(byCat.entries())
      .filter(([, v]) => v > 0)
      .map(([cat, v]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat] || cat,
        value: v,
        color: palette[i++ % palette.length],
      }));
  }, [filteredExpenses]);

  // SECTION 4 — Website orders: KPIs and status pie
  const orderKpis = useMemo(() => {
    const all = orders || [];
    const delivered = all.filter((o) => o.status === 'delivered');
    const inProgress = all.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status));
    const cancelled = all.filter((o) => o.status === 'cancelled');
    const deliveredRevenue = delivered.reduce((s, o) => s + (o.total || 0), 0);
    const inProgressRevenue = inProgress.reduce((s, o) => s + (o.total || 0), 0);
    const potentialRevenue = cancelled.reduce((s, o) => s + (o.total || 0), 0);
    return { all, delivered, inProgress, deliveredRevenue, inProgressRevenue, potentialRevenue };
  }, [orders]);

  const ordersStatusPie = useMemo(() => {
    const byStatus = new Map<string, number>();
    (filteredOrders || []).forEach((o) => {
      byStatus.set(o.status, (byStatus.get(o.status) || 0) + 1);
    });
    const palette = ['#F59E0B', '#3B82F6', '#8B5CF6', '#CEAE80', '#10B981', '#EF4444'];
    let i = 0;
    return Array.from(byStatus.entries())
      .filter(([, v]) => v > 0)
      .map(([status, v]) => ({
        name: ORDER_STATUS_LABELS[status] || status,
        value: v,
        color: palette[i++ % palette.length],
      }));
  }, [filteredOrders]);

  // CSV cell escaping: wrap in quotes, double embedded quotes
  const csvCell = (val: string | number): string => {
    const s = String(val ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };

  const handleExportCsv = () => {
    const rows: string[] = [];
    const pushRow = (cells: (string | number)[]) => rows.push(cells.map(csvCell).join(','));

    pushRow(['گزارش جامع مالی کارگاه پولاریس']);
    pushRow(['تاریخ خروجی', toJalaliDate(new Date())]);
    pushRow(['بازه تحلیل', period]);
    pushRow([]);

    pushRow(['تحویل‌های امانی دوره']);
    pushRow(['تاریخ', 'فروشنده', 'تعداد اقلام', 'مبلغ کل']);
    (filteredConsignments || []).forEach((c) =>
      pushRow([toJalaliDate(c.date), c.sellerName || '-', (c.items || []).length, c.totalAmount || 0])
    );
    pushRow(['مجموع تحویل‌ها', '', '', filteredHandoversTotal]);
    pushRow([]);

    pushRow(['وصولی‌های نقدی دوره']);
    pushRow(['تاریخ', 'فروشنده', 'مبلغ', 'روش پرداخت']);
    (filteredPayments || []).forEach((p) =>
      pushRow([toJalaliDate(p.date), p.sellerName || '-', p.amount || 0, p.paymentMethod || '-'])
    );
    pushRow(['مجموع وصولی‌ها', '', '', filteredPaymentsTotal]);
    pushRow([]);

    pushRow(['هزینه‌های کارگاه']);
    pushRow(['تاریخ', 'عنوان', 'دسته‌بندی', 'مبلغ', 'پرداخت‌کننده']);
    (filteredExpenses || []).forEach((e) =>
      pushRow([
        toJalaliDate(e.date),
        e.title || '-',
        EXPENSE_CATEGORY_LABELS[e.category] || e.category || '-',
        e.amount || 0,
        e.paidBy || '-',
      ])
    );
    pushRow(['مجموع هزینه‌ها', '', '', totalExpensesAmount]);
    pushRow(['حقوق ماهانه پرسنل', '', '', monthlySalariesTotal]);
    pushRow([]);

    pushRow(['سفارش‌های وب‌سایت']);
    pushRow(['تاریخ', 'کد پیگیری', 'مشتری', 'وضعیت', 'مبلغ']);
    (filteredOrders || []).forEach((o) =>
      pushRow([
        toJalaliDate(o.createdAt || (o as any).date),
        o.trackingCode || o.id,
        o.customerName || '-',
        ORDER_STATUS_LABELS[o.status] || o.status,
        o.total || 0,
      ])
    );
    pushRow(['درآمد تحویل‌شده', '', '', orderKpis.deliveredRevenue]);
    pushRow(['درآمد در جریان', '', '', orderKpis.inProgressRevenue]);
    pushRow([]);

    const csv = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polaris-financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      reportPeriod: period,
      stats,
      sellers,
      consignments,
      payments,
      items,
      staff,
      expenses,
      orders,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `polaris-financial-report-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 text-stone-900 dark:text-white max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-brand">
              گزارش‌های جامع مالی، هزینه‌ها، فروشندگان و وب‌سایت
            </span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            تحلیل ماندگاری حساب دست‌فروشان، هزینه‌های کارگاه، حقوق پرسنل و سفارش‌های فروشگاه آنلاین
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-200 dark:bg-[#1E1E1E] hover:bg-brand hover:text-brand-on border border-brand/40 text-brand text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>دانلود JSON</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>دانلود اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* PERIOD SELECTOR COMPONENT */}
      <div className="glass-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              بازه زمانی تحلیل گزارش:
            </span>
          </div>

          {/* Period Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-stone-200 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <button
              onClick={() => setPeriod('this_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'this_week'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              این هفته
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'this_month'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              این ماه
            </button>
            <button
              onClick={() => setPeriod('past_months')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'past_months'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              ۳ ماه گذشته
            </button>
            <button
              onClick={() => setPeriod('specific_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'specific_month'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              ماه انتخابی
            </button>
            <button
              onClick={() => setPeriod('custom_range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'custom_range'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              بازه تاریخی دلخواه
            </button>
          </div>
        </div>

        {/* Sub Controls for Specific Month or Custom Range */}
        {period === 'specific_month' && (
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-3">
            <span className="text-xs text-stone-500">انتخاب ماه:</span>
            <SelectMenu
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="w-auto"
              options={[
                { value: 'بهمن ۱۴۰۳', label: 'بهمن ۱۴۰۳' },
                { value: 'دی ۱۴۰۳', label: 'دی ۱۴۰۳' },
                { value: 'آذر ۱۴۰۳', label: 'آذر ۱۴۰۳' },
                { value: 'آبان ۱۴۰۳', label: 'آبان ۱۴۰۳' },
                { value: 'مهر ۱۴۰۳', label: 'مهر ۱۴۰۳' },
              ]}
            />
          </div>
        )}

        {period === 'custom_range' && (
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-500">از تاریخ:</span>
              <input
                type="text"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="1403/10/01"
                className="px-3 py-1.5 rounded-xl glass-input text-xs font-mono outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-500">تا تاریخ:</span>
              <input
                type="text"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="1403/11/30"
                className="px-3 py-1.5 rounded-xl glass-input text-xs font-mono outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ============ SECTION 1: OVERVIEW ============ */}
      <ReportSection
        icon={<LayoutDashboard className="w-4 h-4 text-brand" />}
        title="نمای کلی و جریان نقدی کارگاه"
        subtitle="مقایسه واگذاری امانی و وصولی نقدی در بازه انتخابی"
      >
        {/* PERIOD SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-brand space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              کل واگذاری امانی در بازه انتخابی:
            </span>
            <p className="text-lg sm:text-xl font-black text-brand-ink dark:text-brand font-mono" dir="ltr">
              {formatToman(filteredHandoversTotal)}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              کل وصولی نقدی در بازه انتخابی:
            </span>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
              {formatToman(filteredPaymentsTotal)}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-brand space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              راندمان وصولی بازه:
            </span>
            <p className="text-lg sm:text-xl font-black text-brand font-mono">
              {toPersianDigits(collectionEfficiency)}
              ٪ وصولی نقد
            </p>
          </div>
        </div>

        {/* Main Bar Chart: Handovers vs Collections */}
        <div className="space-y-4">
          <div>
            <h5 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              <span>نمودار مقایسه‌ای حجم تحویل امانی و تسویه نقدی</span>
            </h5>
            <p className="text-[11px] text-stone-400 mt-0.5">
              مقایسه جریان خروج لباس از انبار و ورود وجه نقد به حساب کارگاه
            </p>
          </div>

          <div className="h-64 w-full pt-4" dir="ltr">
            {barChartData.length === 0 ? (
              <div
                className="h-full flex items-center justify-center text-xs text-stone-500 dark:text-gray-400"
                dir="rtl"
              >
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis
                  tickFormatter={(v) => `${v / 1000000}M`}
                  tick={{ fontSize: 10, fill: '#888' }}
                />
                <Tooltip
                  formatter={(val: any) => formatToman(Number(val))}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="واگذاری" fill="#CEAE80" radius={[6, 6, 0, 0]} />
                <Bar dataKey="وصولی" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </ReportSection>

      {/* ============ SECTION 2: WORKSHOP COSTS ============ */}
      <ReportSection
        icon={<Wrench className="w-4 h-4 text-brand" />}
        title="هزینه‌های کارگاه و حقوق پرسنل"
        subtitle={`مجموع هزینه‌های بازه: ${formatToman(totalExpensesAmount)} • حقوق ماهانه پرسنل: ${formatToman(monthlySalariesTotal)}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Costs KPI cards */}
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-2xl border-l-4 border-l-rose-500 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
                مجموع هزینه‌های بازه:
              </span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
                {formatToman(totalExpensesAmount)}
              </p>
            </div>
            <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
                مجموع حقوق ماهانه پرسنل فعال:
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                {formatToman(monthlySalariesTotal)}
              </p>
            </div>
            <div className="glass-card p-4 rounded-2xl border-l-4 border-l-brand space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
                جمع هزینه + حقوق (بازه):
              </span>
              <p className="text-lg font-black text-brand font-mono" dir="ltr">
                {formatToman(totalExpensesAmount + monthlySalariesTotal)}
              </p>
            </div>
          </div>

          {/* Expense category pie */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white">
              سهم دسته‌بندی‌ها از هزینه‌های کارگاه
            </h5>
            <div className="h-56 w-full" dir="ltr">
              {expensesCategoryPie.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-500 dark:text-gray-400" dir="rtl">
                  داده‌ای برای نمایش وجود ندارد
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesCategoryPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expensesCategoryPie.map((entry, index) => (
                        <Cell key={`exp-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatToman(Number(val))}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {expensesCategoryPie.length > 0 && (
              <div className="space-y-1.5 text-xs">
                {expensesCategoryPie.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-stone-600 dark:text-stone-300 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200" dir="ltr">
                      {formatToman(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Staff salary table */}
        {(staff || []).length > 0 && (
          <div className="space-y-3">
            <h5 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" />
              <span>جدول حقوق و دستمزد پرسنل کارگاه</span>
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs table-stacked">
                <thead className="border-b border-black/10 dark:border-white/10 text-stone-500 dark:text-gray-400">
                  <tr>
                    <th className="p-2.5">نام پرسنل</th>
                    <th className="p-2.5">عنوان نقش</th>
                    <th className="p-2.5">نوع حقوق</th>
                    <th className="p-2.5 text-left">مبلغ حقوق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(staff || []).map((m) => (
                    <tr key={m.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td data-label="نام پرسنل" className="p-2.5 font-bold text-stone-900 dark:text-white">{m.name}</td>
                      <td data-label="عنوان نقش" className="p-2.5 text-stone-500 dark:text-gray-400">{m.roleTitle}</td>
                      <td data-label="نوع حقوق" className="p-2.5 text-stone-500 dark:text-gray-400">
                        {SALARY_TYPE_LABELS[m.salaryType] || m.salaryType}
                      </td>
                      <td data-label="مبلغ حقوق" className="p-2.5 font-mono font-black text-stone-900 dark:text-white text-left" dir="ltr">
                        {formatToman(m.salaryAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 dark:border-white/10">
                    <td colSpan={3} className="p-2.5 font-black text-stone-700 dark:text-gray-300">
                      مجموع ماهانه:
                    </td>
                    <td className="p-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-left" dir="ltr">
                      {formatToman(monthlySalariesTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </ReportSection>

      {/* ============ SECTION 3: SELLERS ============ */}
      <ReportSection
        icon={<Users className="w-4 h-4 text-brand" />}
        title="تحلیل مطالبات فروشندگان و اعتبار بساط‌ها"
        subtitle="ترکیب ریسک سنی مطالبات و وضعیت اعتباری تک‌تک دست‌فروشان"
      >
        {/* Aging pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            <h5 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-brand" />
              <span>ترکیب ریسک سنی مطالبات</span>
            </h5>
            <div className="h-48 w-full" dir="ltr">
              {hasAgingData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`aging-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatToman(Number(val))}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="h-full flex items-center justify-center text-xs text-stone-500 dark:text-gray-400"
                  dir="rtl"
                >
                  داده‌ای برای نمایش وجود ندارد
                </div>
              )}
            </div>
            <div className="space-y-2 text-xs">
              {hasAgingData ? (
                pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-stone-600 dark:text-stone-300 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200" dir="ltr">
                      {formatToman(item.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-[11px] text-stone-500 dark:text-gray-400 py-2">
                  داده‌ای برای نمایش وجود ندارد
                </div>
              )}
            </div>
          </div>

          {/* Aging Analysis 3-Tier Detail Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 0-7 Days */}
            <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  مطالبات تازه (کمتر از ۷ روز)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  {toPersianDigits(under7Pct)}٪ کل
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white font-mono" dir="ltr">
                {formatToman(agingUnder7Days)}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-gray-400">
                ریسک پایین - جریان عادی و پویای فروش در بساط‌ها
              </p>
              <div className="w-full bg-stone-200 dark:bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${under7Pct}%` }} />
              </div>
            </div>

            {/* 7-14 Days */}
            <div className="p-4 rounded-2xl glass-card border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  مطالبات میان‌مدت (۷ الی ۱۴ روز)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {toPersianDigits(midPct)}٪ کل
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white font-mono" dir="ltr">
                {formatToman(aging7To14Days)}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-gray-400">
                نیازمند تماس تلفنی سرپرست و یادآوری تسویه پنج‌شنبه
              </p>
              <div className="w-full bg-stone-200 dark:bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${midPct}%` }} />
              </div>
            </div>

            {/* > 14 Days */}
            <div className="p-4 rounded-2xl glass-card border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  مطالبات پرریسک (بیش از ۱۴ روز)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                  {toPersianDigits(overPct)}٪ کل
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white font-mono" dir="ltr">
                {formatToman(agingOver14Days)}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-gray-400">
                هشدار سفته و توقف صدور فاکتور واگذاری جدید
              </p>
              <div className="w-full bg-stone-200 dark:bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${overPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sellers Risk & Ranking Table */}
        <div className="space-y-4">
          <h5 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            <span>جدول وضعیت اعتباری و وصولی تک‌تک فروشندگان</span>
          </h5>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs table-stacked">
              <thead className="border-b border-black/10 dark:border-white/10 text-stone-500 dark:text-gray-400">
                <tr>
                  <th className="p-2.5">فروشنده</th>
                  <th className="p-2.5">راسته بساط</th>
                  <th className="p-2.5 text-left">کل تحویل امانی</th>
                  <th className="p-2.5 text-left">کل وصولی نقدی</th>
                  <th className="p-2.5 text-left">مانده بدهی</th>
                  <th className="p-2.5 text-left">سقف اعتبار</th>
                  <th className="p-2.5 text-center">وضعیت وصولی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {(sellers || []).map((s) => {
                  const ratio = Math.round(
                    ((s.totalPaid || 0) / (s.totalHandoversValue || 1)) * 100
                  );
                  return (
                    <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td data-label="فروشنده" className="p-2.5 font-bold text-stone-900 dark:text-white">{s.name}</td>
                      <td data-label="راسته بساط" className="p-2.5 text-stone-500 dark:text-gray-400">{s.streetLocation}</td>
                      <td data-label="کل تحویل امانی" className="p-2.5 font-mono text-left" dir="ltr">
                        {formatToman(s.totalHandoversValue || 0)}
                      </td>
                      <td data-label="کل وصولی نقدی" className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-left" dir="ltr">
                        {formatToman(s.totalPaid || 0)}
                      </td>
                      <td data-label="مانده بدهی" className="p-2.5 font-mono font-black text-brand text-left" dir="ltr">
                        {formatToman(s.currentDebt || 0)}
                      </td>
                      <td data-label="سقف اعتبار" className="p-2.5 font-mono text-stone-400 text-left" dir="ltr">
                        {formatToman(s.creditLimit || 0)}
                      </td>
                      <td data-label="وضعیت وصولی" className="p-2.5 text-center">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            ratio > 70
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : ratio > 40
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {toPersianDigits(ratio)}٪ وصولی
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ReportSection>

      {/* ============ SECTION 4: WEBSITE ============ */}
      <ReportSection
        icon={<Globe className="w-4 h-4 text-brand" />}
        title="سفارش‌ها و درآمد فروشگاه آنلاین"
        subtitle={`${toPersianDigits(orderKpis.all.length)} سفارش ثبت‌شده • درآمد تحویل‌شده: ${formatToman(orderKpis.deliveredRevenue)}`}
      >
        {/* Order KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-brand space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              تعداد کل سفارش‌ها:
            </span>
            <p className="text-lg font-black text-brand font-mono">
              {toPersianDigits(orderKpis.all.length)}
            </p>
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              درآمد تحویل‌شده:
            </span>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
              {formatToman(orderKpis.deliveredRevenue)}
            </p>
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500 space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              در جریان ({toPersianDigits(orderKpis.inProgress.length)} سفارش):
            </span>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
              {formatToman(orderKpis.inProgressRevenue)}
            </p>
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-stone-400 space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
              بالقوه (لغو‌شده):
            </span>
            <p className="text-lg font-black text-stone-600 dark:text-stone-300 font-mono" dir="ltr">
              {formatToman(orderKpis.potentialRevenue)}
            </p>
          </div>
        </div>

        {/* Status pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-64 w-full" dir="ltr">
            {ordersStatusPie.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-500 dark:text-gray-400" dir="rtl">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersStatusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ordersStatusPie.map((entry, index) => (
                      <Cell key={`order-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px', direction: 'rtl' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {ordersStatusPie.length > 0 ? (
              ordersStatusPie.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-stone-600 dark:text-stone-300 text-[11px]">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-200" dir="ltr">
                    {toPersianDigits(item.value)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-[11px] text-stone-500 dark:text-gray-400 py-2">
                داده‌ای برای نمایش وجود ندارد
              </div>
            )}
          </div>
        </div>
      </ReportSection>
    </div>
  );
};
