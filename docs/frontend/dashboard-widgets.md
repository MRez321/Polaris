# Workshop Dashboard Widgets

Developer reference for the `/console` index (`DashboardOverview`).

## Overview

`DashboardOverview` renders a **single-column stack** — `grid grid-cols-1 gap-6 items-start`.
Every visible widget owns a full-width row; there are no column spans any more.
Widget set, order, visibility and per-widget collapse state come from the
`DASHBOARD_WIDGETS` registry in `frontend/src/modules/workshop/dashboard/dashboardLayout.ts`.
Each widget is wrapped in `WidgetShell` (collapsible header: title, icon, chevron), with two
deliberate exceptions:

- `todoWidget` — `TodoWidget` renders its own shell (fixed title, badge row, progress bar).
- `overdueAlerts` — renders `null` when there are no overdue consignments (an empty shell is
  never rendered).

New widgets append to `DASHBOARD_WIDGETS`; the registry is the single source of truth for
`layout.order`, so a widget removed from the registry stops rendering everywhere (drop its
`widgetBody` entry too, otherwise `noUnusedLocals` fails).

## Widget registry (16 ids)

| id | Label | Renders |
|---|---|---|
| `clockWidget` | ساعت و تاریخ شمسی | inline live Jalali clock (1 s tick, no title label) |
| `overdueAlerts` | هشدار سرسیدهای گذشته | `OverdueAlertBanner` (`null` when 0 overdue) |
| `kpiCards` | کارت‌های شاخص کلیدی | 4 × `StatsCard` (active debt, overdue, inventory value, today's receipts) |
| `todoWidget` | فهرست کارهای کارگاه | `TodoWidget` (owns shell) |
| `salesDebtChart` | نمودار فروش و بدهی | `SalesDebtChart` |
| `topSellers` | برترین دست‌فروشان | `TopSellersCard` — 6 per page |
| `recentHandovers` | آخرین واگذاری‌های امانی | `WidgetList` over all consignments |
| `recentPayments` | آخرین دریافت‌ها | `WidgetList` over all payments |
| `latestShopSales` | آخرین فروش‌های فروشگاه | `WidgetList` over all orders |
| `latestSellerIncome` | آخرین درآمد دست‌فروشان | `WidgetList` over sellers with income > 0, sorted desc |
| `latestReturns` | آخرین مرجوعی‌ها | `WidgetList` over consignment returns |
| `topItems` | پرفروش‌ترین اقلام | `WidgetList` over `analytics.topItems` (rank badge from global index) |
| `scheduledDeliveries` | تحویل‌های زمان‌بندی‌شده | `WidgetList` over pending (`scheduled`) handovers |
| `incomeWindowStats` | درآمد هفتگی و ماهانه | inline 7-day / 30-day income figure |
| `actionCenter` | مرکز اقدام مدیریتی | `ManagerActionCenter` (three paginated groups) |
| `activityTimeline` | جریان فعالیت‌ها | `ActivityTimeline` (`limit=15`, 6 per page) |

## Pagination

All dashboard lists show **6 rows per page** and render `Pagination` only when the list is
longer than 6 — see `docs/frontend/list-pagination.md` for the shared convention.

- `dashboard/WidgetList.tsx` is the generic body: props `items`, `renderItem(item, globalIndex)`,
  `empty`, `pageSize` (default 6), `className` (default `space-y-2.5`). It owns the page state and
  slices; callers keep only the data source and row markup.
- `globalIndex` is the index across the whole list (not the page), so `topItems` ranking and
  `TopSellersCard` rank badges stay correct on page 2+.
- `TopSellersCard`, `ActivityTimeline` and `TodoWidget` implement the same 6-row rule locally
  because they render their own header/footer chrome around the list.
- Row counts: the widgets now show the *entire* collections (paginated), not a fixed "last 4/5".

## Overdue alert banner

`dashboard/OverdueAlertBanner.tsx`

- Sorted **oldest deadline first** (`dueDate` ascending) with the note
  «مرتب‌شده از قدیمی‌ترین سررسید»; 6 rows per page.
- Header aggregates: «N فاکتور امانی» + total outstanding overdue amount.
- Each row: seller name, consignment code, «X روز تاخیر», due date, remaining amount.
- Per-row `CalendarPlus` menu offers 1/2/3-day presets. Selecting one calls
  `onExtendDueDate(consignmentId, days)`, which `DashboardPage` implements as
  `consignmentsApi.extendDueDate` → success toast («سررسید واگذاری HND-… با موفقیت تمدید شد»)
  → `fetchData()`, so the alert list, KPI cards and sidebar counters refresh together.
- The backend extends from `max(dueDate, now)`, so extending a long-overdue handover always
  lands the new deadline in the future — see `docs/sales/consignment-due-date-extension.md`.

## Todo widget

`dashboard/TodoWidget.tsx` (rewritten 2026-11)

- Self-fetching (`todoApi`): mount fetch, refetch after create/clear; optimistic
  toggle-done and delete.
- Add form: text input (`Enter` submits, blank is ignored), priority `SelectMenu`
  (low = sky, medium = amber, high = rose, urgent = red — drives the `border-s-2` row accent),
  `datetime-local` deadline, submit button.
- Sorting: open tasks before done, then earliest deadline (undated last), then newest first.
- Row content: text, priority chip, Jalali date + time (`toJalaliDateTime`), a state label —
  «سررسید گذشته» (rose), «امروز» (amber), «سررسید» (neutral); done rows are struck through.
- Inline edit (pencil): text + priority + deadline in place, «ذخیره» / «انصراف». Clearing the
  date input removes the deadline (`dueDate = ''`).
- Reminders: the bell toggle stores keys `${id}:${dueDate}` in `localStorage`
  (`polaris.todo.reminders`) and requests `Notification.permission`. A 60 s interval checks
  armed keys against the current time and fires `new Notification('یادآور کار کارگاه', { body })`
  once per deadline, then drops the key so it never repeats. Row badge: «یادآور فعال».
- Footer: emerald progress bar with Persian percent, `doneCount/totalCount` badge,
  «N سررسید گذشته» chip and «پاک‌سازی N کار انجام‌شده».
- 6 rows per page via `Pagination`.

## Layout persistence

- `dashboardPrefs` (stored in `company_settings.data.dashboardPrefs`) is a v2 object:
  `{ version: 2, order[], hidden{}, cols{}, collapsed{}, presets[] }`.
- The server shallow-merges prefs, so clients must always send the **complete** v2 object —
  never a partial. Legacy flat `{ widgetId: boolean }` shapes migrate client-side via
  `normalizeLayout()`.
- The «تنظیمات نمایش داشبورد» gear panel only edits **visibility** (one `Switch` per widget) +
  «بازنشانی نمایش». Column spans, drag-reorder and presets are no longer exposed:
  `cols` / `presets` survive in the persisted object as legacy data (the `DashboardWidgetDef.cols`
  comment says as much) and `spanClass()` was deleted. All widgets are full width.

## Data flow

`DashboardOverview` receives workshop snapshots from the console index route, sourced from
`DataContext` (no per-widget fetches): `stats` (`DashboardStats`), `consignments`, `sellers`,
`payments`, `items`, `orders`, `returns`, `analytics`. Alert counts and overdue/low-stock slicing
are derived client-side from these props. `ActivityTimeline` and `TodoWidget` are the two
self-fetching widgets.

## New / changed widgets

### ActivityTimeline

- **File:** `frontend/src/modules/workshop/audit/ActivityTimeline.tsx`
- **Source:** `GET /api/workshop/audit-logs` (`auditApi.list`), newest-first, `limit=15` by default.
- **Helpers:** reuses `auditUtils.tsx` (`getEntityIcon`, `getEntityLabel`, `getActionLabel`,
  `getRoleLabel`, `getSeverity`) — the same functions `AuditLogsManager` uses, so timeline and
  audit page can never drift.
- **Render:** severity dot · entity icon · entity label · actor (name + role badge) · action and
  entity badges · `details` · Jalali timestamp + IP; `aria-label` carries the full context.
  6 rows per page.
- **Footer:** «مشاهده تمام لاگ‌ها» deep-links to the audit manager when `hideFooter` is false.

### ManagerActionCenter

- **File:** `frontend/src/modules/workshop/dashboard/ManagerActionCenter.tsx`
- One scanning surface, three groups, each rendered through `WidgetList` with
  `className="space-y-1.5"` and 6 rows per page:
  1. **سرسیدهای امانی** — consignments with outstanding debt past due, oldest first →
     `/console/consignments`
  2. **کالاهای کم‌موجودی** — items at/below `minStockThreshold` (mirrors `InventoryManager`) →
     `/console/inventory`
  3. **سفارش‌های در انتظار** — pending orders
- Rows are clickable `useNavigate` buttons; badge counts on the Sidebar/SideMenu pulse card use
  the same `DataContext`-derived values.

## Removed

- `liquidBalance` widget — retired. The cash-balance display folded into `ManagerActionCenter`;
  `DashboardStats.liquidBalance` stays for API compatibility with the `dashboard-stats` endpoint.
- Per-widget column spans (`spanClass()`, `cols`-driven `lg:col-span-*`) — the dashboard is a
  single-column stack.
