import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowLeftRight,
  CreditCard,
  Settings,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useData } from '@/context/DataContext';

export const Sidebar: React.FC = () => {
  const { consignments } = useData();

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  const navItems = [
    { to: '/', label: 'پیشخوان و داشبورد', icon: LayoutDashboard, end: true },
    { to: '/inventory', label: 'انبار و موجودی پوشاک', icon: Package },
    {
      to: '/consignments',
      label: 'حواله‌ها و تحویل امانی',
      icon: ArrowLeftRight,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    { to: '/people', label: 'فروشندگان و پرسنل کارگاه', icon: Users },
    { to: '/finances', label: 'امور مالی، درآمد و هزینه‌ها', icon: CreditCard },
    { to: '/settings', label: 'تنظیمات، ممیزی و سامانه', icon: Settings },
  ];

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
                    ? 'bg-[#CEAE80] text-black font-black shadow-md'
                    : 'text-stone-800 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#A67C38] dark:text-[#CEAE80]'}`}
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
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-[#CEAE80]/15 border border-amber-600/20 dark:border-[#CEAE80]/30 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A67C38] dark:bg-[#CEAE80] animate-pulse"></span>
              <p className="font-black text-xs text-stone-900 dark:text-white">قاعده مالی کارگاه:</p>
            </div>
            <p className="text-[10px] text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              تسویه فاکتورها بر مبنای اصل تقدم تاریخی بدهی‌ها
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
