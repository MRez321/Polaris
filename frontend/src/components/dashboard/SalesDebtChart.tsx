import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Line,
  Legend,
} from 'recharts';
import { formatToman } from '../../utils/persian';
import { useData } from '../../context/DataContext';

interface ChartProps {
  darkMode?: boolean;
}

// JS getDay(): 0=یکشنبه ... 6=شنبه
const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

const EmptyChartState: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center text-sm text-stone-500 dark:text-gray-400">
    داده‌ای برای نمایش وجود ندارد
  </div>
);

export const SalesDebtChart: React.FC<ChartProps> = () => {
  const [chartType, setChartType] = useState<'flow' | 'sellers'>('flow');
  const { consignments = [], payments = [], sellers = [] } = useData();

  const totalCurrentDebt = useMemo(
    () => sellers.reduce((sum, s) => sum + (s.currentDebt || 0), 0),
    [sellers]
  );

  // «روند واگذاری / دریافتی»: last 7 calendar days (device-local) from real records.
  // Debt balance is reconstructed EXACTLY backwards from current reality:
  // balance(day d) = Σ(all sellers currentDebt) − Σ(handover amounts after d) + Σ(collected after d)
  const flowData = useMemo(() => {
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
      const daysAgo = 6 - idx; // oldest → newest
      const dayStart = new Date(startOfToday);
      dayStart.setDate(dayStart.getDate() - daysAgo);
      const dayStartT = dayStart.getTime();
      const dayEndT = dayStartT + 24 * 60 * 60 * 1000;

      const inDay = (e: { t: number }) => e.t >= dayStartT && e.t < dayEndT;
      const afterDay = (e: { t: number }) => e.t >= dayEndT;

      return {
        day: PERSIAN_WEEKDAYS[dayStart.getDay()],
        handover: handoverEvents.filter(inDay).reduce((s, e) => s + e.amt, 0),
        collected: collectedEvents.filter(inDay).reduce((s, e) => s + e.amt, 0),
        debtBalance:
          totalCurrentDebt -
          handoverEvents.filter(afterDay).reduce((s, e) => s + e.amt, 0) +
          collectedEvents.filter(afterDay).reduce((s, e) => s + e.amt, 0),
      };
    });
  }, [consignments, payments, totalCurrentDebt]);

  // «تفکیک بدهی فروشندگان»: top-5 real sellers by total volume (current debt + settled payments)
  const sellerDistributionData = useMemo(
    () =>
      [...sellers]
        .sort(
          (a, b) =>
            (b.currentDebt || 0) + (b.totalPaid || 0) - ((a.currentDebt || 0) + (a.totalPaid || 0))
        )
        .slice(0, 5)
        .map((s) => ({
          name: s.name,
          totalDebt: s.currentDebt || 0,
          totalPaid: s.totalPaid || 0,
          creditLimit: s.creditLimit || 0,
        })),
    [sellers]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const creditLimit = payload[0]?.payload?.creditLimit;
      return (
        <div className="bg-white dark:bg-[#141416] p-3.5 rounded-xl shadow-2xl border border-stone-200 dark:border-[#CEAE80]/30 text-xs text-right text-stone-900 dark:text-white">
          <p className="font-bold text-amber-800 dark:text-[#CEAE80] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-1.5 text-stone-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-stone-900 dark:text-white font-mono">
                {formatToman(entry.value)}
              </span>
            </div>
          ))}
          {typeof creditLimit === 'number' ? (
            <div className="flex items-center justify-between gap-4 py-1 mt-1 pt-1 border-t border-stone-200 dark:border-white/10">
              <span className="text-stone-500 dark:text-gray-400">سقف اعتبار:</span>
              <span className="font-bold text-stone-900 dark:text-white font-mono">
                {formatToman(creditLimit)}
              </span>
            </div>
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CEAE80]" />
            <span className="text-amber-800 dark:text-[#CEAE80]">تحلیل گردش کالا و جریان مالی وصولی‌ها</span>
          </h4>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            روند هفتگی واگذاری امانی در برابر دریافتی‌های تسویه شده با دست‌فروشان
          </p>
        </div>

        <div className="flex items-center bg-stone-100 dark:bg-[#1A1A1E] border border-black/5 dark:border-white/5 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setChartType('flow')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartType === 'flow'
                ? 'bg-[#CEAE80] text-black font-black shadow-sm'
                : 'text-stone-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            روند واگذاری / دریافتی
          </button>
          <button
            onClick={() => setChartType('sellers')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartType === 'sellers'
                ? 'bg-[#CEAE80] text-black font-black shadow-sm'
                : 'text-stone-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            تفکیک بدهی فروشندگان
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        {chartType === 'flow' ? (
          flowData.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CEAE80" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#CEAE80" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#222222"
                />
                <XAxis dataKey="day" tick={{ fill: '#888888', fontSize: 11 }} />
                <YAxis
                  yAxisId="flow"
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000000).toLocaleString('fa-IR')} م`}
                  orientation="right"
                />
                <YAxis
                  yAxisId="debt"
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000000).toLocaleString('fa-IR')} م`}
                  orientation="left"
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="flow"
                  type="monotone"
                  dataKey="handover"
                  name="ارزش واگذاری امانی"
                  stroke="#CEAE80"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#goldGradient)"
                />
                <Area
                  yAxisId="flow"
                  type="monotone"
                  dataKey="collected"
                  name="دریافتی تسویه شده"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#greenGradient)"
                />
                <Line
                  yAxisId="debt"
                  type="monotone"
                  dataKey="debtBalance"
                  name="مانده کل بدهی"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )
        ) : sellerDistributionData.length === 0 ? (
          <EmptyChartState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sellerDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#222222"
              />
              <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#888888', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000000).toLocaleString('fa-IR')} م`}
                orientation="right"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="totalPaid" name="مجموع وصولی" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalDebt" name="مانده بدهی جاری" fill="#CEAE80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
