import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { useWorkshopAlerts } from '@/modules/workshop/layout/useWorkshopAlerts';
import {
  NAV_GROUPS,
  BADGE_VARIANT_CLASS,
  type NavItemConfig,
} from '@/modules/workshop/layout/nav-config';

export const Sidebar: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { overdueCount, lowStockCount } = useWorkshopAlerts();

  // Filter items by permission, then drop groups that become empty.
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || hasPermission(i.permission)),
  })).filter((g) => g.items.length > 0);

  const alertCount = (item: NavItemConfig) =>
    item.badge === 'overdue' ? overdueCount : item.badge === 'lowStock' ? lowStockCount : 0;

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 flex flex-col glass-panel rounded-2xl p-2 shadow-xl transition-all">
        <div className="px-3 py-2 text-[11px] font-black text-stone-600 dark:text-gray-400 tracking-wider">
          سیستم مدیریت پولاریس
        </div>

        {/* Scrollable nav so the sidebar never overflows on shorter viewports. */}
        <nav className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {visibleGroups.map((group) => {
            return (
              <div key={group.id} className="mb-4 last:mb-0">
                {/* Section header — always visible, non-collapsible */}
                <p className="px-3 pb-2 text-[10px] font-black tracking-wider text-stone-500 dark:text-gray-500 uppercase">
                  {group.label}
                </p>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const count = alertCount(item);
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
                              <span
                                className={isActive ? 'text-black' : 'text-stone-800 dark:text-gray-200'}
                              >
                                {item.label}
                              </span>
                            </div>
                            {item.badge && count > 0 ? (
                              <span
                                className={`px-2 py-0.5 rounded-full ${BADGE_VARIANT_CLASS[item.badge]} text-[10px] font-black`}
                              >
                                {toPersianDigits(count)}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* نبض کارگاه — preserved live summary (overdue + low stock) so the
            workshop pulse stays visible at a glance; nav-item badges mirror
            the same real counts. */}
        {(hasPermission('consignments.view') || hasPermission('inventory.view')) && (
          <div className="pt-3 mt-3 border-t border-stone-200 dark:border-white/5 px-1">
            <div className="p-3 rounded-xl bg-brand/10 dark:bg-brand/15 border border-brand/20 dark:border-brand/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-brand-deep dark:bg-brand animate-pulse"></span>
                <p className="font-black text-xs text-stone-900 dark:text-white">نبض کارگاه</p>
              </div>
              <div className="divide-y divide-brand/15">
                <button
                  type="button"
                  onClick={() => navigate('/console/consignments')}
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
                  onClick={() => navigate('/console/inventory')}
                  className="w-full flex items-center justify-between gap-2 py-1.5 group cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                    اجناس کم‌موجودی
                  </span>
                  <span className={`text-xs font-black ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`}>
                    {toPersianDigits(lowStockCount)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Public site link — always available */}
        <div className="mt-auto border-t border-stone-200 dark:border-white/5 pt-3 px-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-stone-800 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 transition-all"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>بازگشت به سایت اصلی</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
