import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  ArrowLeftRight,
  CreditCard,
  Settings,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useData } from '@/modules/workshop/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export const MobileNav: React.FC = () => {
  const { consignments } = useData();
  const { isAdmin } = useAuth();

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  const items = [
    { to: '/workshop', label: 'داشبورد', icon: LayoutDashboard, end: true },
    { to: '/workshop/orders', label: 'سفارش‌ها', icon: ShoppingBag },
    { to: '/workshop/inventory', label: 'انبار', icon: Package },
    {
      to: '/workshop/consignments',
      label: 'امانات',
      icon: ArrowLeftRight,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    { to: '/workshop/people', label: 'اشخاص و پرسنل', icon: Users },
    { to: '/workshop/finances', label: 'مالی و درآمد', icon: CreditCard },
    { to: '/workshop/settings', label: 'تنظیمات', icon: Settings },
  ].filter((item) => isAdmin || item.to === '/workshop');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#141416] border-t border-stone-200 dark:border-white/5 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-black dark:text-[#CEAE80] font-black bg-amber-500/20 dark:bg-[#CEAE80]/20 border border-amber-600/30 dark:border-[#CEAE80]/40'
                    : 'text-stone-700 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold'
                }`
              }
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>

              {item.badge && (
                <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center font-black animate-pulse">
                  {toPersianDigits(item.badge)}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
