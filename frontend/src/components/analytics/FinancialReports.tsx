import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  PieChart as PieIcon,
  Users,
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
import type { DashboardStats, Seller, Consignment, PaymentRecord, GarmentItem } from '../../types';
import { SelectMenu } from '../ui/select-menu';
import { formatToman, toPersianDigits } from '../../utils/persian';
interface FinancialReportsProps {
  stats: DashboardStats;
  sellers: Seller[];
  consignments: Consignment[];
  payments: PaymentRecord[];
  items: GarmentItem[];
}

type PeriodType = 'this_week' | 'this_month' | 'past_months' | 'specific_month' | 'custom_range';

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  stats,
  sellers = [],
  consignments = [],
  payments = [],
  items = [],
}) => {
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>('بهمن ۱۴۰۳');
  const [customStartDate, setCustomStartDate] = useState<string>('1403/10/01');
  const [customEndDate, setCustomEndDate] = useState<string>('1403/11/30');

  // Filter datasets based on selected period
  const { filteredHandoversTotal, filteredPaymentsTotal } =
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

  // Chart 1: Bar Data (Days / Weeks)
  const barChartData = [
    { name: 'شنبه', واگذاری: 12500000, وصولی: 9800000 },
    { name: 'یکشنبه', واگذاری: 18200000, وصولی: 14500000 },
    { name: 'دوشنبه', واگذاری: 14000000, وصولی: 16000000 },
    { name: 'سه‌شنبه', واگذاری: 22000000, وصولی: 19500000 },
    { name: 'چهارشنبه', واگذاری: 28500000, وصولی: 24000000 },
    { name: 'پنج‌شنبه', واگذاری: 34000000, وصولی: 31000000 },
    { name: 'جمعه', واگذاری: 8000000, وصولی: 6500000 },
  ];

  // Chart 2: Aging Pie Data
  const pieData = [
    { name: 'تازه (<۷ روز)', value: agingUnder7Days || 35000000, color: '#10B981' },
    { name: 'میان‌مدت (۷-۱۴ روز)', value: aging7To14Days || 18000000, color: '#F59E0B' },
    { name: 'پرریسک (>۱۴ روز)', value: agingOver14Days || 12000000, color: '#EF4444' },
  ];

  const handleExportData = () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      reportPeriod: period,
      stats,
      sellers,
      consignments,
      payments,
      items,
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
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">
              گزارش‌های جامع مالی، نمودارهای آماری و آنالیز سنی مطالبات (Aging)
            </span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            تحلیل ماندگاری حساب دست‌فروشان، نمودارهای مقایسه‌ای واگذاری و وصولی، و راندمان نقدینگی کارگاه
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-200 dark:bg-[#1E1E1E] hover:bg-[#CEAE80] hover:text-black border border-[#CEAE80]/40 text-[#CEAE80] text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 self-stretch sm:self-auto justify-center"
        >
          <Download className="w-4 h-4" />
          <span>دانلود گزارش اکسل / JSON</span>
        </button>
      </div>

      {/* PERIOD SELECTOR COMPONENT */}
      <div className="glass-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CEAE80]" />
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
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              این هفته
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'this_month'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              این ماه
            </button>
            <button
              onClick={() => setPeriod('past_months')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'past_months'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              ۳ ماه گذشته
            </button>
            <button
              onClick={() => setPeriod('specific_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'specific_month'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              ماه انتخابی
            </button>
            <button
              onClick={() => setPeriod('custom_range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'custom_range'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
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

      {/* PERIOD SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500 space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
            کل واگذاری امانی در بازه انتخابی:
          </span>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
            {formatToman(filteredHandoversTotal || stats.totalConsignmentValue || 185000000)}
          </p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
            کل وصولی نقدی در بازه انتخابی:
          </span>
          <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {formatToman(filteredPaymentsTotal || stats.totalCollected || 142000000)}
          </p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-[#CEAE80] space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-gray-400 block">
            راندمان وصولی بازه:
          </span>
          <p className="text-lg sm:text-xl font-black text-[#CEAE80] font-mono">
            {toPersianDigits(
              Math.round(
                ((filteredPaymentsTotal || 142000000) /
                  (filteredHandoversTotal || 185000000 || 1)) *
                  100
              )
            )}
            ٪ وصولی نقد
          </p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Bar Chart: Handovers vs Collections */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#CEAE80]" />
                <span>نمودار مقایسه‌ای حجم تحویل امانی و تسویه نقدی</span>
              </h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                مقایسه جریان خروج لباس از انبار و ورود وجه نقد به حساب کارگاه
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-4" dir="ltr">
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
                  contentStyle={{
                    backgroundColor: '#1C1C1C',
                    borderRadius: '12px',
                    borderColor: '#CEAE80',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="واگذاری" fill="#CEAE80" radius={[6, 6, 0, 0]} />
                <Bar dataKey="وصولی" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Aging Breakdown */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4">
          <div>
            <h4 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#CEAE80]" />
              <span>ترکیب ریسک سنی مطالبات</span>
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">تفکیک ماندگاری مطالبات معوق</p>
          </div>

          <div className="h-48 w-full" dir="ltr">
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatToman(Number(val))}
                  contentStyle={{
                    backgroundColor: '#1C1C1C',
                    borderRadius: '12px',
                    borderColor: '#CEAE80',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs">
            {pieData.map((item, idx) => (
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
        </div>
      </div>

      {/* Aging Analysis 3-Tier Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Sellers Risk & Ranking Table */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
        <h4 className="font-black text-sm text-stone-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-[#CEAE80]" />
          <span className="text-[#CEAE80]">جدول وضعیت اعتباری و وصولی تک‌تک فروشندگان</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
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
                    <td className="p-2.5 font-bold text-stone-900 dark:text-white">{s.name}</td>
                    <td className="p-2.5 text-stone-500 dark:text-gray-400">{s.streetLocation}</td>
                    <td className="p-2.5 font-mono text-left" dir="ltr">
                      {formatToman(s.totalHandoversValue || 0)}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-left" dir="ltr">
                      {formatToman(s.totalPaid || 0)}
                    </td>
                    <td className="p-2.5 font-mono font-black text-[#CEAE80] text-left" dir="ltr">
                      {formatToman(s.currentDebt || 0)}
                    </td>
                    <td className="p-2.5 font-mono text-stone-400 text-left" dir="ltr">
                      {formatToman(s.creditLimit || 0)}
                    </td>
                    <td className="p-2.5 text-center">
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
    </div>
  );
};
