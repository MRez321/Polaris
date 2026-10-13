/**
 * Shared audit-log display helpers.
 *
 * Extracted from AuditLogsManager so the ActivityTimeline widget and any future
 * audit surface render entity icons / labels the same way (single source of
 * truth — no second convention).
 */
import React from 'react';
import {
  Package,
  User,
  FileText,
  CreditCard,
  Shield,
  History,
  Receipt,
  TrendingUp,
  Bell,
  ClipboardList,
  Archive,
  ShoppingBag,
  ArrowLeftRight,
  Coins,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { AuditLog } from '@/types';

export type AuditSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const getEntityIcon = (entity: AuditLog['entity']): React.ReactNode => {
  const map: Record<string, React.ReactNode> = {
    item: <Package className="w-4 h-4 text-amber-500" />,
    seller: <User className="w-4 h-4 text-blue-500" />,
    consignment: <FileText className="w-4 h-4 text-brand" />,
    payment: <CreditCard className="w-4 h-4 text-emerald-500" />,
    staff: <Shield className="w-4 h-4 text-orange-500" />,
    return: <History className="w-4 h-4 text-rose-500" />,
    cost: <Receipt className="w-4 h-4 text-amber-500" />,
    profit: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    notifications: <Bell className="w-4 h-4 text-blue-500" />,
    todo: <ClipboardList className="w-4 h-4 text-sky-500" />,
    backup: <Archive className="w-4 h-4 text-violet-500" />,
    order: <ShoppingBag className="w-4 h-4 text-brand" />,
    'inventory-ledger': <ArrowLeftRight className="w-4 h-4 text-sky-500" />,
    'financial-ledger': <Coins className="w-4 h-4 text-emerald-500" />,
    settings: <Shield className="w-4 h-4 text-purple-500" />,
    auth: <Clock className="w-4 h-4 text-stone-400" />,
  };
  return map[entity] ?? <Clock className="w-4 h-4 text-stone-400" />;
};

export const getEntityLabel = (entity: AuditLog['entity']): string => {
  const map: Record<string, string> = {
    item: 'انبار و کالا',
    seller: 'فروشندگان',
    consignment: 'واگذاری امانی',
    payment: 'دریافت وجه و تسویه',
    staff: 'پرسنل و هم‌بنیان‌گذاران',
    return: 'مرجوعی کالا',
    cost: 'هزینه‌ها',
    notifications: 'اطلاع‌رسانی',
    todo: 'کارهای کارگاه',
    backup: 'پشتیبان‌گیری',
    profit: 'توزیع سود',
    settings: 'تنظیمات و برند',
    order: 'سفارش‌ها',
    'inventory-ledger': 'دفتر موجودی',
    'financial-ledger': 'دفتر مالی',
    auth: 'ورود و امنیت',
  };
  return map[entity] ?? 'عملیات';
};

export const getActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: 'ایجاد',
    update: 'ویرایش',
    delete: 'حذف',
    restore: 'بازیابی',
    archive: 'بایگانی',
    login: 'ورود',
  };
  return map[action] ?? action;
};

export const getRoleLabel = (role: string | null | undefined): string => {
  if (role === 'admin') return 'مدیر';
  if (role === 'staff') return 'کاربر';
  return role || '';
};

/**
 * Severity is driven by the action (and settings writes), mapped to the
 * Polaris color language:
 *  - danger:   destructive (delete)
 *  - warning:  sensitive (settings writes, restore, archive)
 *  - success:  constructive (create)
 *  - info:     passive (login, update)
 *  - neutral:  fallback
 */
export const getSeverity = (log: AuditLog): AuditSeverity => {
  if (log.action === 'delete') return 'danger';
  if (log.entity === 'settings') return 'warning';
  if (log.action === 'restore' || log.action === 'archive') return 'warning';
  if (log.action === 'create') return 'success';
  if (log.action === 'login') return 'info';
  if (log.action === 'update') return 'info';
  return 'neutral';
};

export const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30',
  neutral: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-white/10',
};

export const SEVERITY_DOT: Record<AuditSeverity, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  neutral: 'bg-stone-400 dark:bg-stone-500',
};

// Kept for consumers that want an icon per severity state.
export const SEVERITY_ICON: Record<AuditSeverity, LucideIcon> = {
  success: ShoppingBag,
  warning: Receipt,
  danger: Shield,
  info: Clock,
  neutral: Clock,
};
