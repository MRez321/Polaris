import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  ArrowLeftRight,
  Receipt,
  PackageCheck,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';

/**
 * Workshop bottom navigation — exactly five buttons. RTL layout:
 *   [امانات] [سفارش‌ها] [داشبورد] [وجه دریافتی] [تحویل بار]
 * Dashboard is the center-elevated primary; the two end slots on the left of
 * center are routes, the two on the right open the quick-action modals.
 */
export const MobileNav: React.FC = () => {
  const { consignments } = useData();
  const { openQuickHandover, openQuickPayment } = useUI();

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  const routeClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
      isActive
        ? 'text-brand-on dark:text-brand font-black bg-brand/20 dark:bg-brand/20 border border-brand/30 dark:border-brand/40'
        : 'text-stone-700 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold'
    }`;

  const actionClass =
    'relative flex flex-col items-center py-1 px-2 rounded-xl transition-all text-stone-700 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold active:scale-95';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#141416] border-t border-stone-200 dark:border-white/5 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="grid grid-cols-5 items-center justify-items-center h-14">
        {/* امانات — route (RTL first slot, leftmost) */}
        <NavLink to="/workshop/consignments" className={routeClass}>
          <span className="relative">
            <ArrowLeftRight className="w-4 h-4 mb-0.5 shrink-0" />
            {overdueCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center font-black animate-pulse">
                {toPersianDigits(overdueCount)}
              </span>
            )}
          </span>
          <span className="text-[10px] whitespace-nowrap">امانات</span>
        </NavLink>

        {/* سفارش‌ها — route */}
        <NavLink to="/workshop/orders" className={routeClass}>
          <ShoppingBag className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="text-[10px] whitespace-nowrap">سفارش‌ها</span>
        </NavLink>

        {/* داشبورد — center, lifted gold FAB */}
        <NavLink to="/workshop" end className="relative flex flex-col items-center px-2 -translate-y-3.5">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-brand-on flex items-center justify-center shadow-lg shadow-brand/40 ring-4 ring-white dark:ring-[#141416] transition-transform active:scale-95">
            <LayoutDashboard className="w-5 h-5 text-brand-on" />
          </span>
          <span className="text-[10px] whitespace-nowrap font-black text-black dark:text-brand mt-0.5">
            داشبورد
          </span>
        </NavLink>

        {/* وجه دریافتی — opens the quick payment modal */}
        <button type="button" onClick={() => openQuickPayment()} className={actionClass} title="ثبت وجه دریافتی">
          <Receipt className="w-4 h-4 mb-0.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <span className="text-[10px] whitespace-nowrap">وجه دریافتی</span>
        </button>

        {/* تحویل بار — opens the quick handover modal */}
        <button type="button" onClick={() => openQuickHandover()} className={actionClass} title="تحویل بار جدید">
          <PackageCheck className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="text-[10px] whitespace-nowrap">تحویل بار</span>
        </button>
      </div>
    </nav>
  );
};
