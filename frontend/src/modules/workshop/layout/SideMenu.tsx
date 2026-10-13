import React from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { Home, Scissors } from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useBrand } from '@/context/BrandContext';
import { useAuth } from '@/context/AuthContext';
import { useWorkshopAlerts } from '@/modules/workshop/layout/useWorkshopAlerts';
import {
  NAV_GROUPS,
  BADGE_VARIANT_CLASS,
  type NavItemConfig,
} from '@/modules/workshop/layout/nav-config';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Workshop hamburger side menu (mobile Header entry). Mirrors the desktop
 * Sidebar IA (Item 29) via the shared NAV_GROUPS config, so the two surfaces
 * never drift. Section headers label each IA group; operational badges mirror
 * the real overdue / low-stock counts from DataContext.
 */
export const SideMenu: React.FC<SideMenuProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useBrand();
  const { hasPermission } = useAuth();
  const { overdueCount, lowStockCount } = useWorkshopAlerts();

  // Close on any navigation (route or modal-triggered).
  React.useEffect(() => {
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active
        ? 'bg-brand/15 border border-brand/40 text-brand-on dark:text-brand'
        : 'border border-transparent text-stone-700 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
    }`;

  const alertCount = (item: NavItemConfig) =>
    item.badge === 'overdue' ? overdueCount : item.badge === 'lowStock' ? lowStockCount : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="start" showCloseButton={false} className="w-80 p-0 bg-white dark:bg-[#141416] border-e border-stone-200 dark:border-white/10">
        <SheetHeader className="p-4 pb-2 border-b border-stone-200 dark:border-white/5">
          <SheetTitle className="flex items-center gap-2.5 text-base font-black text-stone-900 dark:text-white">
            <span className="w-9 h-9 rounded-xl bg-brand text-brand-on flex items-center justify-center shadow-md overflow-hidden">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company.brandName || 'لوگو'} className="w-full h-full object-cover" />
              ) : (
                <Scissors className="w-5 h-5 -rotate-45 text-black" />
              )}
            </span>
            {company?.brandName || company?.name || 'پولاریس استایل'}
          </SheetTitle>
          <SheetDescription className="text-[11px] font-medium text-stone-600 dark:text-gray-400">
            سیستم مدیریت کارگاه
          </SheetDescription>
        </SheetHeader>

        {/* IA groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((i) => !i.permission || hasPermission(i.permission));
            if (!visibleItems.length) return null;
            return (
              <div key={group.id} className="space-y-0.5">
                <p className="px-3 pb-1.5 text-[11px] font-black tracking-wide text-stone-500 dark:text-gray-500">
                  {group.label}
                </p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const count = alertCount(item);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => onOpenChange(false)}
                      className={({ isActive }) => itemClass(isActive)}
                    >
                      <span className="relative flex items-center gap-3">
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && count > 0 ? (
                          <span
                            className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${BADGE_VARIANT_CLASS[item.badge]} text-white text-[9px] flex items-center justify-center font-black`}
                          >
                            {toPersianDigits(count)}
                          </span>
                        ) : null}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          {/* Public site link — always available, closes the sheet. */}
          <div className="mt-auto border-t border-stone-200 dark:border-white/5 pt-3">
            <button type="button" onClick={() => go('/')} className={itemClass(false)}>
              <Home className="w-4.5 h-4.5 shrink-0" />
              بازگشت به سایت اصلی
            </button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
