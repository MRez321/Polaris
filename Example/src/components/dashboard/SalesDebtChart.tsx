import React, { useState } from 'react';
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
  Legend,
} from 'recharts';
import { formatToman, toPersianDigits } from '../../utils/persian';

interface ChartProps {
  darkMode?: boolean;
}

export const SalesDebtChart: React.FC<ChartProps> = ({ darkMode }) => {
  const [chartType, setChartType] = useState<'flow' | 'sellers'>('flow');

  // Simulated 7-day consignment vs settlement flow
  const flowData = [
    { day: 'شنبه', handover: 14500000, collected: 8200000, debtBalance: 78000000 },
    { day: 'یکشنبه', handover: 9200000, collected: 11000000, debtBalance: 76200000 },
    { day: 'دوشنبه', handover: 18400000, collected: 14000000, debtBalance: 80600000 },
    { day: 'سه‌شنبه', handover: 22000000, collected: 17500000, debtBalance: 85100000 },
    { day: 'چهارشنبه', handover: 12000000, collected: 19800000, debtBalance: 77300000 },
    { day: 'پنج‌شنبه', handover: 31000000, collected: 28500000, debtBalance: 79800000 },
    { day: 'جمعه', handover: 6500000, collected: 15200000, debtBalance: 71100000 },
  ];

  const sellerDistributionData = [
    { name: 'حسین احمدی', totalDebt: 18450000, totalPaid: 30050000, creditLimit: 35000000 },
    { name: 'رضا میرزایی', totalDebt: 34200000, totalPaid: 51800000, creditLimit: 50000000 },
    { name: 'صادق شریفی', totalDebt: 21900000, totalPaid: 10100000, creditLimit: 25000000 },
    { name: 'بهزاد غلامی', totalDebt: 6500000, totalPaid: 13000000, creditLimit: 20000000 },
    { name: 'علیرضا کاظمی', totalDebt: 0, totalPaid: 15000000, creditLimit: 15000000 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
                tick={{ fill: '#888888', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000000).toLocaleString('fa-IR')} م`}
                orientation="right"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="handover"
                name="ارزش واگذاری امانی"
                stroke="#CEAE80"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#goldGradient)"
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="دریافتی تسویه شده"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#greenGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
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
