import type { OrderStatus } from '@/types';

/**
 * Unified order-status vocabulary for the workshop UI.
 * Palette: orange = نیاز به اقدام, blue = اطلاع/در جریان,
 * emerald = موفق/تحویل‌شده, rose = لغو/بحرانی.
 */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  pending: {
    label: 'در انتظار تایید',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
  },
  confirmed: {
    label: 'تایید شده',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  preparing: {
    label: 'در حال آماده‌سازی',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  shipped: {
    label: 'ارسال شده',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  delivered: {
    label: 'تحویل شده',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  },
  cancelled: {
    label: 'لغو شده',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
  },
};
