import React from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Users,
  CreditCard,
  Settings,
  Receipt,
  Plus,
  ShoppingBag,
  Globe,
  Home,
  Scissors,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useData } from '@/modules/workshop/context/DataContext';
import { toPersianDigits } from '@/utils/persian';

interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Workshop hamburger side menu (mobile-only entry in the Header). Contains
 * every navigation destination — workshop-only tools, then a gold separator
 * label «فروشگاه» for website-only links, with Settings pinned to the
 * bottom. All items close the sheet on activation.
 */
export const SideMenu: React.FC<SideMenuProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openQuickHandover, openQuickPayment } = useUI();
  const { consignments } = useData();

  const overdueCount = consignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  // Close on any navigation (route or modal-triggered).
  React.useEffect(() => {
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const triggerHandover = () => {
    onOpenChange(false);
    openQuickHandover();
  };

  const triggerPayment = () => {
    onOpenChange(false);
    openQuickPayment();
  };

  const isActive = (to: string) => location.pathname === to;

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active
        ? 'bg-brand/15 border border-brand/40 text-brand-on dark:text-brand'
        : 'border border-transparent text-stone-700 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
    }`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="start" showCloseButton={false} className="w-80 p-0 bg-white dark:bg-[#141416] border-e border-stone-200 dark:border-white/10">
        <SheetHeader className="p-4 pb-2 border-b border-stone-200 dark:border-white/5">
          <SheetTitle className="flex items-center gap-2.5 text-base font-black text-stone-900 dark:text-white">
            <span className="w-9 h-9 rounded-xl bg-brand text-brand-on flex items-center justify-center shadow-md">
              <Scissors className="w-5 h-5 -rotate-45 text-black" />
            </span>
            پولاریس استایل
          </SheetTitle>
          <SheetDescription className="text-[11px] font-medium text-stone-600 dark:text-gray-400">
            سیستم مدیریت کارگاه
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-black tracking-wide text-stone-500 dark:text-gray-500">
            کارگاه
          </p>

          <NavLink to="/workshop" end onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
            داشبورد
          </NavLink>

          <NavLink to="/workshop/consignments" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <span className="relative">
              <ArrowLeftRight className="w-4.5 h-4.5 shrink-0" />
              {overdueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-black">
                  {toPersianDigits(overdueCount)}
                </span>
              )}
            </span>
            حواله‌ها و تحویل امانی
          </NavLink>

          <NavLink to="/workshop/inventory" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <Package className="w-4.5 h-4.5 shrink-0" />
            انبار و موجودی اجناس
          </NavLink>

          <NavLink to="/workshop/people" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <Users className="w-4.5 h-4.5 shrink-0" />
            فروشندگان و پرسنل
          </NavLink>

          <NavLink to="/workshop/finances" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <CreditCard className="w-4.5 h-4.5 shrink-0" />
            امور مالی
          </NavLink>

          <button type="button" onClick={triggerPayment} className={itemClass(false)}>
            <Receipt className="w-4.5 h-4.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
            وجه دریافتی
          </button>

          <button type="button" onClick={triggerHandover} className={itemClass(false)}>
            <Plus className="w-4.5 h-4.5 shrink-0" />
            تحویل بار جدید
          </button>

          {/* Gold gradient separator + website section */}
          <div className="my-3 mx-1 flex items-center gap-2">
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-brand/60 to-transparent" />
            <span className="text-[11px] font-black text-brand-ink flex items-center gap-1">
              <Globe className="w-3 h-3" />
              فروشگاه
            </span>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-brand/60 to-transparent" />
          </div>

          <NavLink to="/workshop/orders" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <ShoppingBag className="w-4.5 h-4.5 shrink-0" />
            سفارش‌های فروشگاه
          </NavLink>

          <button type="button" onClick={() => go('/controlpanel')} className={itemClass(isActive('/controlpanel'))}>
            <Globe className="w-4.5 h-4.5 shrink-0" />
            مدیریت وب‌سایت
          </button>

          <button type="button" onClick={() => go('/')} className={itemClass(false)}>
            <Home className="w-4.5 h-4.5 shrink-0" />
            بازگشت به سایت اصلی
          </button>
        </nav>

        {/* Settings pinned to the bottom */}
        <div className="p-3 border-t border-stone-200 dark:border-white/5">
          <NavLink to="/workshop/settings" onClick={() => onOpenChange(false)} className={({ isActive }) => itemClass(isActive)}>
            <Settings className="w-4.5 h-4.5 shrink-0" />
            تنظیمات و مدیریت
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
};
