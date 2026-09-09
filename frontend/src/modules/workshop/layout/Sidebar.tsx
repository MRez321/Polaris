import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  ArrowLeftRight,
  CreditCard,
  Settings,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useData } from '@/modules/workshop/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export const Sidebar: React.FC = () => {
  const { consignments, items } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;
  // Mirrors InventoryManager's low-stock rule: at or below the threshold.
  const lowStockCount = items.filter((i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)).length;
  const pendingCount = items.filter((i) => i.productionStatus === 'pending_production').length;

  const navItems = [
    { to: '/workshop', label: 'داشبورد', icon: LayoutDashboard, end: true },
    { to: '/workshop/orders', label: 'سفارش‌های فروشگاه', icon: ShoppingBag },
    { to: '/workshop/inventory', label: 'انبار و موجودی اجناس', icon: Package },
    {
      to: '/workshop/consignments',
      label: 'حواله‌ها و تحویل امانی',
      icon: ArrowLeftRight,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    { to: '/workshop/people', label: 'فروشندگان و پرسنل', icon: Users },
    { to: '/workshop/returns', label: 'مرجوعی‌ها و خرابی‌ها', icon: RotateCcw },
    { to: '/workshop/analytics', label: 'تحلیل فروش', icon: BarChart3 },
    { to: '/workshop/finances', label: 'امور مالی، درآمد و هزینه‌ها', icon: CreditCard },
    { to: '/workshop/settings', label: 'تنظیمات و مدیریت', icon: Settings },
  ].filter((item) => isAdmin || item.to === '/workshop');

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 glass-panel rounded-2xl p-3 shadow-xl space-y-1.5 transition-all">
        <div className="px-3 py-2 text-[11px] font-black text-stone-600 dark:text-gray-400 tracking-wider">
          سیستم مدیریت پولاریس
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all text-right ${
                  isActive
                    ? 'bg-brand text-brand-on font-black shadow-md'
                    : 'text-stone-800 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-brand-ink'}`}
                    />
                    <span className={isActive ? 'text-black' : 'text-stone-800 dark:text-gray-200'}>
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {toPersianDigits(item.badge)}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        <div className="pt-3 mt-3 border-t border-stone-200 dark:border-white/5 px-1">
          <div className="p-3 rounded-xl bg-brand/10 dark:bg-brand/15 border border-brand/20 dark:border-brand/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-brand-deep dark:bg-brand animate-pulse"></span>
              <p className="font-black text-xs text-stone-900 dark:text-white">نبض کارگاه</p>
            </div>
            <div className="divide-y divide-brand/15">
              <button
                type="button"
                onClick={() => navigate('/workshop/consignments')}
                className="w-full flex items-center justify-between gap-2 py-1.5 group cursor-pointer"
              >
                <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                  حواله‌های معوق
                </span>
                <span className={`text-xs font-black ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-400'}`}>
                  {toPersianDigits(overdueCount)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/workshop/inventory')}
                className="w-full flex items-center justify-between gap-2 py-1.5 group cursor-pointer"
              >
                <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                  اجناس کم‌موجودی
                </span>
                <span className={`text-xs font-black ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`}>
                  {toPersianDigits(lowStockCount)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/workshop/inventory')}
                className="w-full flex items-center justify-between gap-2 py-1.5 group cursor-pointer"
              >
                <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                  در انتظار تولید
                </span>
                <span className={`text-xs font-black ${pendingCount > 0 ? 'text-brand-deep dark:text-brand' : 'text-stone-400'}`}>
                  {toPersianDigits(pendingCount)}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
