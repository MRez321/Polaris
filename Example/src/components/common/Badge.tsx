import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'outline' | 'neutral';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className,
  size = 'sm',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-medium',
  };

  const variantClasses = {
    default: 'bg-stone-100/80 dark:bg-white/10 text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-white/10',
    gold: 'bg-amber-500/15 text-amber-800 dark:text-[#CEAE80] border border-amber-500/30 shadow-[0_0_8px_rgba(206,174,128,0.1)]',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
    danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.1)]',
    neutral: 'bg-stone-100/80 dark:bg-white/5 text-stone-600 dark:text-gray-400 border border-stone-200/80 dark:border-white/5',
    outline: 'border border-stone-300 dark:border-white/20 text-stone-700 dark:text-stone-300 bg-white/20 dark:bg-black/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold tracking-normal transition-colors whitespace-nowrap glass-badge',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
