import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  ArrowLeftRight,
  Package,
  Receipt,
  PackageCheck,
  Zap,
  Wrench,
} from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

/**
 * Workshop bottom navigation — exactly five slots. RTL layout:
 *   [امانات] [سفارش‌ها] [داشبورد] [انبار] [اقدامات]
 * Dashboard is the center-elevated primary; امانات / سفارش‌ها / انبار are
 * routes, and اقدامات opens a dropdown with quick actions (payment / handover
 * modals + workshop costs navigation).
 */
export const MobileNav: React.FC = () => {
  const { consignments } = useData();
  const { openQuickHandover, openQuickPayment } = useUI();
  const navigate = useNavigate();

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

  const menuItemClass =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-gray-200 outline-none';

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

        {/* انبار — route */}
        <NavLink to="/workshop/inventory" className={routeClass}>
          <Package className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="text-[10px] whitespace-nowrap">انبار</span>
        </NavLink>

        {/* اقدامات — dropdown with quick actions */}
        <DropdownMenu>
          <DropdownMenuTrigger className={actionClass} title="اقدامات سریع">
            <Zap className="w-4 h-4 mb-0.5 shrink-0 text-brand" />
            <span className="text-[10px] whitespace-nowrap">اقدامات</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="w-48">
            <DropdownMenuItem className={menuItemClass} onClick={() => openQuickPayment()}>
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
              <span>ثبت وجه دریافتی</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => openQuickHandover()}>
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span>تحویل بار جدید</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={menuItemClass}
              onClick={() => navigate('/workshop/finances/costs')}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>هزینه کارگاه</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
