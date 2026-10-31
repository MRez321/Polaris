/**
 * Shared console navigation information architecture (Item 29).
 *
 * Single source of truth for the `/console/*` management IA, consumed by the
 * desktop Sidebar, the mobile SideMenu sheet, and (conceptually) MobileNav.
 * Routes here are real `/console/*` targets — never fabricated. Visibility is
 * driven by the `permission` field (RBAC); each consumer filters via
 * `hasPermission` so a role without the permission never sees the item.
 *
 * Badge slots (`badge: 'overdue' | 'lowStock'`) are resolved at render time by
 * `useWorkshopAlerts()` so this file stays pure data (no hooks).
 */
import type { Permission } from '@/lib/permissions';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  UserCheck,
  ShoppingCart,
  ArrowLeftRight,
  CreditCard,
  Settings,
  BarChart3,
  Globe,
  Palette,
  Newspaper,
  Bell,
  Images,
  Briefcase,
  Truck,
  RotateCcw,
} from 'lucide-react';

export interface NavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact-match active state (for the dashboard index). */
  end?: boolean;
  /** Permission gating — undefined means visible to every console user. */
  permission?: Permission;
  /** Operational badge resolved by useWorkshopAlerts(). Undefined = no badge. */
  badge?: 'overdue' | 'lowStock';
}

export interface NavGroupConfig {
  id: string;
  /** Section header, e.g. "تأمین و موجودی". */
  label: string;
  items: NavItemConfig[];
}

/**
 * The operational IA groups. Every route is a real `/console/*` target.
 * Order within a group is the recommended left-to-right reading order.
 */
export const NAV_GROUPS: NavGroupConfig[] = [
  // Dashboard is its own group, first thing in the menu.
  {
    id: 'dashboard',
    label: '',
    items: [
      { to: '/console', label: 'داشبورد', icon: LayoutDashboard, end: true, permission: 'analytics.view' },
    ],
  },
  // === انبار و موجودی ===
  {
    id: 'inventory',
    label: 'انبار و موجودی',
    items: [
      {
        to: '/console/inventory',
        label: 'انبار و موجودی',
        icon: Package,
        badge: 'lowStock',
        permission: 'inventory.view',
      },
      { to: '/console/supply-orders', label: 'سفارشات خرید', icon: ShoppingCart, permission: 'purchasing.view' },
      { to: '/console/returns', label: 'مرجوعی و خرابی', icon: RotateCcw, permission: 'returns.view' },
    ],
  },
  // === توزیع و فروش ===
  {
    id: 'distribution',
    label: 'توزیع و فروش',
    items: [
      {
        to: '/console/consignments',
        label: 'فروش امانی و حواله‌ها',
        icon: ArrowLeftRight,
        badge: 'overdue',
        permission: 'consignments.view',
      },
      { to: '/console/orders', label: 'سفارش‌های فروشگاه', icon: ShoppingBag, permission: 'orders.view' },
    ],
  },
  // === درحال توسعه ===
  {
    id: 'development',
    label: 'درحال توسعه',
    items: [
      { to: '/console/sales-orders', label: 'سفارشات فروش', icon: ShoppingBag, permission: 'sales.view' },
      { to: '/console/seller-sales', label: 'فروش فروشندگان', icon: Users, permission: 'seller-sales.view' },
      { to: '/console/customers', label: 'مشتریان', icon: UserCheck, permission: 'customers.view' },
      { to: '/console/sales-channels', label: 'کانال‌های فروش', icon: Globe, permission: 'channels.view' },
      {
        to: '/console/sales-payments',
        label: 'پرداخت‌های فروش',
        icon: CreditCard,
        permission: 'payments.view',
      },
    ],
  },
  // === اشخاص ===
  {
    id: 'people',
    label: 'اشخاص',
    items: [
      { to: '/console/people', label: 'افراد', icon: Users, permission: 'people.view', end: true },
      { to: '/console/people/staff', label: 'کارکنان', icon: Briefcase, permission: 'people.view' },
      { to: '/console/people/suppliers', label: 'تأمین‌کنندگان', icon: Truck, permission: 'suppliers.view' },
      { to: '/console/people/sellers', label: 'فروشندگان', icon: UserCheck, permission: 'people.view' },
      { to: '/console/people/users', label: 'کاربران', icon: Users, permission: 'settings.manage' },
    ],
  },
  // === مالی و گزارش ===
  {
    id: 'financials',
    label: 'مالی و گزارش',
    items: [
      { to: '/console/finances', label: 'امور مالی', icon: CreditCard, permission: 'finances.view' },
      { to: '/console/analytics', label: 'گزارش و تحلیل', icon: BarChart3, permission: 'analytics.view' },
    ],
  },
  // === وب‌سایت و فروشگاه ===
  {
    id: 'website',
    label: 'وب‌سایت و فروشگاه',
    items: [
      { to: '/console/website/website', label: 'تنظیمات وب‌سایت', icon: Globe, permission: 'website.manage' },
      { to: '/console/website/theme', label: 'ظاهر وب‌سایت', icon: Palette, permission: 'website.manage' },
      { to: '/console/website/shop', label: 'فروشگاه آنلاین', icon: ShoppingBag, permission: 'website.manage' },
      { to: '/console/website/blog', label: 'مدیریت وبلاگ', icon: Newspaper, permission: 'blog.manage' },
    ],
  },
  // === مدیریت سیستم ===
  {
    id: 'system',
    label: 'مدیریت سیستم',
    items: [
      { to: '/console/settings', label: 'تنظیمات و مدیریت', icon: Settings, permission: 'settings.manage' },
      { to: '/console/notifications', label: 'اطلاع‌رسانی', icon: Bell, permission: 'settings.manage' },
      { to: '/console/gallery', label: 'گالری تصاویر', icon: Images, permission: 'settings.manage' },
    ],
  },
];

/** Badge color for a resolved alert count. */
export const BADGE_VARIANT_CLASS: Record<Exclude<NavItemConfig['badge'], undefined>, string> = {
  overdue: 'bg-rose-600 text-white',
  lowStock: 'bg-amber-600 text-white',
};
