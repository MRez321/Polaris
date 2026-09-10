/**
 * Dashboard layout engine — pure helpers for the v2 dashboard arrangement:
 * widget catalog (id + Persian label + default desktop span), legacy-prefs
 * migration, and the preset state used by the dashboard settings panel.
 * Nothing here talks to the network; persistence stays in DashboardPage.
 */
import type {
  DashboardLayout,
  DashboardPreset,
  DashboardWidgetCols,
  LegacyDashboardPrefs,
} from '@/types';

/** One row of the widget catalog rendered by the settings panel. */
export interface DashboardWidgetDef {
  id: string;
  label: string;
  /** Default desktop span in the 3-column grid. */
  cols: DashboardWidgetCols;
}

/** All dashboard widgets in default order. New widgets append at the end. */
export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'clockWidget', label: 'ساعت و تاریخ شمسی', cols: 3 },
  { id: 'overdueAlerts', label: 'هشدار سرسیدهای گذشته', cols: 3 },
  { id: 'kpiCards', label: 'کارت‌های شاخص کلیدی', cols: 3 },
  { id: 'todoWidget', label: 'فهرست کارهای کارگاه', cols: 1 },
  { id: 'salesDebtChart', label: 'نمودار فروش و بدهی', cols: 2 },
  { id: 'topSellers', label: 'برترین دست‌فروشان', cols: 1 },
  { id: 'recentHandovers', label: 'آخرین واگذاری‌های امانی', cols: 1 },
  { id: 'recentPayments', label: 'آخرین دریافت‌ها', cols: 1 },
  { id: 'latestShopSales', label: 'آخرین فروش‌های فروشگاه', cols: 1 },
  { id: 'latestSellerIncome', label: 'آخرین درآمد دست‌فروشان', cols: 1 },
  { id: 'latestReturns', label: 'آخرین مرجوعی‌ها', cols: 1 },
  { id: 'topItems', label: 'پرفروش‌ترین اقلام', cols: 1 },
  { id: 'scheduledDeliveries', label: 'تحویل‌های زمان‌بندی‌شده', cols: 1 },
  { id: 'pendingProduction', label: 'اقلام در انتظار تولید', cols: 1 },
  { id: 'liquidBalance', label: 'موجودی صندوق کارگاه', cols: 1 },
  { id: 'incomeWindowStats', label: 'درآمد هفتگی و ماهانه', cols: 3 },
];

/** The pristine default layout (also the shape saved as a preset). */
export function defaultLayout(): DashboardLayout {
  return {
    version: 2,
    order: DASHBOARD_WIDGETS.map((w) => w.id),
    hidden: [],
    collapsed: [],
    cols: Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.id, w.cols])),
    presets: [],
  };
}

function isV2(prefs: unknown): prefs is DashboardLayout {
  return (
    typeof prefs === 'object' &&
    prefs !== null &&
    (prefs as { version?: unknown }).version === 2 &&
    Array.isArray((prefs as { order?: unknown }).order)
  );
}

/**
 * Normalizes whatever is stored in company_settings.dashboardPrefs into a
 * complete v2 layout. Legacy flat visibility maps migrate as-is; unknown
 * widget ids (removed features) are dropped, new widgets are appended.
 */
export function normalizeLayout(
  prefs: DashboardLayout | LegacyDashboardPrefs | undefined | null,
): DashboardLayout {
  const base = defaultLayout();

  if (!prefs || typeof prefs !== 'object') return base;
  if (!isV2(prefs)) {
    // Legacy flat map: visible = key with true, hidden = key with false.
    const legacy = prefs as LegacyDashboardPrefs;
    const hidden: string[] = [];
    for (const [id, visible] of Object.entries(legacy)) {
      if (visible === false) hidden.push(id);
    }
    return { ...base, hidden };
  }

  const known: Record<string, true> = Object.fromEntries(
    base.order.map((id) => [id, true as const]),
  );
  const order = prefs.order.filter((id) => known[id]);
  // Append widgets introduced after this layout was saved.
  for (const id of base.order) {
    if (!order.includes(id)) order.push(id);
  }

  const cols = { ...base.cols };
  for (const [id, span] of Object.entries(prefs.cols ?? {})) {
    if (known[id] && (span === 1 || span === 2 || span === 3)) cols[id] = span;
  }

  return {
    version: 2,
    order,
    hidden: (prefs.hidden ?? []).filter((id) => known[id]),
    collapsed: (prefs.collapsed ?? []).filter((id) => known[id]),
    cols,
    presets: Array.isArray(prefs.presets) ? prefs.presets : [],
  };
}

/** Snapshot of the current arrangement (everything except the preset list). */
export function layoutSnapshot(
  layout: DashboardLayout,
): Omit<DashboardLayout, 'presets'> {
  return {
    version: 2,
    order: [...layout.order],
    hidden: [...layout.hidden],
    collapsed: [...layout.collapsed],
    cols: { ...layout.cols },
  };
}

/** Applies a preset's saved data to the live layout, keeping the preset list. */
export function applyPreset(layout: DashboardLayout, preset: DashboardPreset): DashboardLayout {
  const merged = normalizeLayout({ ...preset.data, presets: layout.presets });
  return { ...merged, presets: layout.presets };
}

/** Tailwind span class for a widget in the 3-col desktop grid. */
export function spanClass(cols: DashboardWidgetCols | undefined): string {
  if (cols === 2) return 'lg:col-span-2';
  if (cols === 3) return 'lg:col-span-3';
  return 'lg:col-span-1';
}
