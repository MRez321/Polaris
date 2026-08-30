import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    text: string;
    isPositive: boolean;
  };
  highlight?: boolean;
  badge?: string;
  badgeVariant?: 'default' | 'gold' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight,
  badge,
  badgeVariant = 'gold',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between overflow-hidden ${
        highlight
          ? 'glass-panel text-stone-900 dark:text-white border-[#CEAE80]/50 dark:border-[#CEAE80]/40 shadow-xl hover:border-[#CEAE80] glass-card-interactive ring-1 ring-[#CEAE80]/20'
          : 'glass-card text-stone-900 dark:text-white hover:border-[#CEAE80]/50 glass-card-interactive'
      } ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {/* Subtle top light reflection line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-gray-400">
            {title}
          </p>
          <h4
            className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${
              highlight ? 'text-amber-800 dark:text-[#CEAE80]' : 'text-stone-900 dark:text-white'
            }`}
          >
            {value}
          </h4>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 ${
            highlight
              ? 'bg-gradient-to-br from-[#CEAE80] to-[#B59363] text-black shadow-md font-bold ring-2 ring-[#CEAE80]/30'
              : 'bg-stone-100 dark:bg-white/5 text-[#A67C38] dark:text-[#CEAE80] border border-black/5 dark:border-white/10 backdrop-blur-md'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/10 relative z-10">
        {subtitle && (
          <span className="text-xs text-stone-500 dark:text-gray-400 truncate">
            {subtitle}
          </span>
        )}
        {badge && (
          <Badge variant={badgeVariant} size="sm">
            {badge}
          </Badge>
        )}
        {trend && (
          <span
            className={`text-xs font-bold ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.text}
          </span>
        )}
      </div>
    </div>
  );
};
