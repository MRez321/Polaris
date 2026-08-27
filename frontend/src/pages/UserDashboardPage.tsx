import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Users,
  ArrowLeftRight,
  Wallet,
  Receipt,
  Boxes,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { dashboardApi, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatNumber, formatToman } from '@/utils/persian';
import type { DashboardStats } from '@/types';

const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.stats();
      setStats(data);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'خطا در دریافت اطلاعات داشبورد');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
            خوش آمدید، {user?.name}
          </h2>
          <p className="text-xs text-stone-600 dark:text-gray-400 mt-1 font-medium">
            نمای کلی کارگاه در یک نگاه
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-[#CEAE80]/15 border border-[#CEAE80]/30 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black">
          کاربر
        </span>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#CEAE80]" />
          <p className="text-xs font-bold">در حال بارگذاری اطلاعات کارگاه...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-black text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black text-xs font-black shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatsCard
              title="کل طلب فعال از فروشندگان"
              value={formatToman(stats.totalActiveDebt)}
              icon={Wallet}
              highlight
            />
            <StatsCard
              title="دریافتی‌های امروز"
              value={formatToman(stats.todayPayments)}
              icon={Receipt}
            />
            <StatsCard
              title="ارزش موجودی انبار"
              value={formatToman(stats.totalInventoryValue)}
              icon={Boxes}
            />
            <StatsCard
              title="امانات فعال"
              value={formatNumber(stats.activeConsignmentsCount)}
              subtitle="حواله در دست فروشندگان"
              icon={ArrowLeftRight}
            />
            <StatsCard
              title="فروشندگان"
              value={formatNumber(stats.totalSellersCount ?? 0)}
              icon={Users}
            />
            <StatsCard
              title="اقلام نزد فروشندگان"
              value={formatNumber(stats.totalItemsInHands ?? 0)}
              icon={Package}
            />
          </div>

          {/* Access notice */}
          <div className="glass-card rounded-2xl p-4 flex items-start gap-3 border border-[#CEAE80]/20">
            <Info className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80] shrink-0 mt-0.5" />
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              دسترسی شما به بخش‌های مدیریتی محدود است؛ برای تغییر نقش با مدیر سیستم تماس بگیرید.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default UserDashboardPage;
