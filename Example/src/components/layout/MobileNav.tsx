import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowLeftRight,
  CreditCard,
  Settings,
} from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overdueCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, overdueCount }) => {
  // Mobile navigation consolidated tabs
  const items = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'inventory', label: 'انبار', icon: Package },
    {
      id: 'consignments',
      label: 'امانات',
      icon: ArrowLeftRight,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    { id: 'people', label: 'اشخاص و پرسنل', icon: Users },
    { id: 'finances', label: 'مالی و درآمد', icon: CreditCard },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-stone-200 dark:border-white/5 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-black dark:text-[#CEAE80] font-black bg-amber-500/20 dark:bg-[#CEAE80]/20 border border-amber-600/30 dark:border-[#CEAE80]/40'
                  : 'text-stone-700 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>

              {item.badge && (
                <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center font-black animate-pulse">
                  {toPersianDigits(item.badge)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
