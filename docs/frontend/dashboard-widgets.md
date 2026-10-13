# Workshop Dashboard Widgets

Developer reference for the `/console` index (`DashboardOverview`).

## Overview

`DashboardOverview` renders a responsive grid whose widget set, order, visibility,
column-span and collapse state come from the `DASHBOARD_WIDGETS` registry in
`frontend/src/modules/workshop/dashboard/dashboardLayout.ts`. Each visible widget
is one grid item wrapped in `WidgetShell` (collapsible header with a drag handle)
— with two deliberate exceptions:

- `todoWidget` — owns its own shell (renders bare).
- `overdueAlerts` — renders `null` when there are no overdue consignments (an
  empty shell is never rendered).

New widgets append to `DASHBOARD_WIDGETS`; the registry is the single source of
truth for `layout.order`, so a widget that is removed from the registry stops
rendering everywhere (its `widgetBody` entry should be removed too).

## Widget registry (16 ids)

| id | Label | cols | Renders |
|---|---|---|---|
| `clockWidget` | ساعت و تاریخ شمسی | 3 | inline live Jalali clock |
| `overdueAlerts` | هشدار سرسیدهای گذشته | 3 | `OverdueAlertBanner` (`null` when 0 overdue) |
| `kpiCards` | کارت‌های شاخص کلیدی | 3 | 4 × `StatsCard` (active debt, overdue, inventory value, today's receipts) |
| `todoWidget` | فهرست کارهای کارگاه | 1 | `TodoWidget` (owns shell) |
| `salesDebtChart` | نمودار فروش و بدهی | 2 | `SalesDebtChart` |
| `topSellers` | برترین دست‌فروشان | 1 | `TopSellersCard` |
| `recentHandovers` | آخرین واگذاری‌های امانی | 1 | inline (last 4 consignments) |
| `recentPayments` | آخرین دریافت‌ها | 1 | inline (last 4 payments) |
| `latestShopSales` | آخرین فروش‌های فروشگاه | 1 | inline (last 4 orders) |
| `latestSellerIncome` | آخرین درآمد دست‌فروشان | 1 | inline (last 4 sellers w/ income) |
| `latestReturns` | آخرین مرجوعی‌ها | 1 | inline (last 4 returns) |
| `topItems` | پرفروش‌ترین اقلام | 1 | inline (top 5 items) |
| `scheduledDeliveries` | تحویل‌های زمان‌بندی‌شده | 1 | inline (pending handovers → `/console/consignments`) |
| `incomeWindowStats` | درآمد هفتگی و ماهانه | 3 | inline income chart |
| `actionCenter` | مرکز اقدام مدیریتی | 2 | `ManagerActionCenter` |
| `activityTimeline` | جریان فعالیت‌ها | 1 | `ActivityTimeline` |

## Layout persistence

- `dashboardPrefs` (stored in `company_settings`) is a v2 object:
  `{ version: 2, order[], hidden{}, cols{}, collapsed{}, presets[] }`.
- The server shallow-merges prefs, so clients must always send the **complete** v2
  object — never a partial. Legacy flat `{ widgetId: boolean }` shapes migrate
  client-side via `normalizeLayout()`.
- Visibility, column span (1–3), collapsed state and named shareable presets are
  edited in the dashboard «سفارشی‌سازی» panel (HTML5 drag reorder + up/down
  buttons). `layoutSnapshot()` produces a shareable preset from the current layout.

## Data flow

`DashboardOverview` receives workshop snapshots from the console index route,
sourced from `DataContext` (no per-widget fetches): `stats`
(`DashboardStats`), `consignments`, `sellers`, `payments`, `items`, `orders`,
`returns`, `analytics`. Alert counts and overdue/low-stock slicing are derived
client-side from these props.

## New / changed widgets

### ActivityTimeline

- **File:** `frontend/src/modules/workshop/audit/ActivityTimeline.tsx`
- **Source:** the existing audit API `GET /api/workshop/audit-logs`
  (`auditApi.list`), newest-first, `limit=15` by default.
- **Helpers:** reuses the shared `auditUtils.tsx` display helpers
  (`getEntityIcon`, `getEntityLabel`, `getActionLabel`, `getRoleLabel`,
  `getSeverity`) — the same functions `AuditLogsManager` uses, so the timeline
  and the audit page can never drift on icon/label/severity conventions.
- **Render:** compact per-event row — severity dot · entity icon · entity label ·
  actor (`userName` + role badge) · action + entity badges · `details` · Jalali
  timestamp + IP. `aria-label` includes the full context for screen readers.
- **Footer:** «مشاهده تمام لاگ‌ها» deep-links to the full audit log manager when
  `hideFooter` is false (default).

### ManagerActionCenter

- **File:** `frontend/src/modules/workshop/dashboard/ManagerActionCenter.tsx`
- A single scanning surface for actionable alerts, grouped by concern:
  1. **سرسیدهای امانی** — consignments with outstanding debt past the due date →
     `/console/consignments`
  2. **کالاهای کم‌موجودی** — items at/below `minStockThreshold` (mirrors the
     InventoryManager threshold) → `/console/inventory`
  3. **سفارش‌های در انتظار** — pending orders
- Each row is a clickable `useNavigate` button. Badge counts on the Sidebar/SideMenu
  pulse card mirror these same `DataContext`-derived values.

## Removed

- `liquidBalance` widget — retired. The workshop cash-balance display is now folded
  into the ManagerActionCenter's concern; the `DashboardStats.liquidBalance` type
  field is retained for API compatibility with the still-running
  `dashboard-stats` endpoint.
