# Frontend Reference — Polaris (`frontend/`)

## Entry & routing

`src/main.tsx` → `src/App.tsx` — providers wrap BrowserRouter: Theme → Brand → Network → Auth → Cart → Favorites. Route table lives in App.tsx (see START-HERE). Guard: `RequireAdmin` component (anon → `/login?next=%2Fworkshop`, non-admin → `/dashboard`).

Two app surfaces:
- **Public storefront** — `src/pages/public/*` inside `PublicLayout` (`src/components/public/`).
- **Workshop admin panel** — `src/modules/workshop/` routed at `/workshop/*` inside `AppLayout`. All admin code isolated here (Phase 5 separation); only shared logic/components stay outside.

## Directory map

```
src/
  App.tsx                  route table + RequireAdmin
  pages/                   public/*, controlpanel/*, LoginPage, SignupPage
  modules/workshop/        THE admin panel
    pages/                 Dashboard, Orders, Inventory, Consignments, People, Finances, Returns, Analytics, Settings, EntityProfile (`profile/:type/:id` for items/sellers/staff/owners)
    layout/                AppLayout (incl. scroll-to-top on route change), Sidebar (nav + «نبض کارگاه» pulse card), Header, MobileNav (bottom bar + actions popover with Plus-badged pills), SideMenu (brand-wired sheet; quick-trigger buttons removed — actions live in MobileNav popover)
    context/               DataContext (workshop data + CompanyBranding `workshopInfo`), UIContext (drawers/modals)
    inventory/consignments/payments/staff/sellers/people/settings/audit/finances/  Manager components per domain
    dashboard/             DashboardOverview (widget visibility panel), StatsCard, TopSellersCard, SalesDebtChart, OverdueAlertBanner
    returns/               ReturnsPage (damage/consignment-return tracking: record → fix (restock) / dispose (write-off))
    analytics/             AnalyticsPage (GA measurement-id save), FinancialReports
    pwa/                   PwaInstallPrompt, ConnectionGuardian
  components/
    ui/                    shadcn-style primitives (Radix-based, Persian Labs RTL)
    common/ public/        shared + storefront components
  context/                 AuthContext, ThemeContext, BrandContext, CartContext, FavoritesContext, NetworkContext
  lib/
    api.ts                 central axios client + all workshop/storefront API calls (328 lines)
    auth.ts                better-auth client (authClient) + mapAuthError (see AUTH.md trap)
    galleryApi.ts (GalleryImage + probed metadata; absoluteGalleryUrl origin-builder), iranian-mobile.ts, normalize-persian-digits.ts, persian-provinces.ts, usePageMeta.ts, utils.ts
  hooks/                   use-controllable-state, useNetworkStatus
```

## API access pattern

- Axios client `api` in `lib/api.ts`: baseURL `'/'` — dev relies on the **Vite proxy** (`/api` → `http://localhost:3016`, override `VITE_PROXY_TARGET`); prod is same-origin. `VITE_API_URL` escape hatch only.
- Workshop endpoints namespaced under `const W = '/api/workshop'` in api.ts; auth via better-auth's `authClient` (cookie session, not axios).
- `getApiErrorMessage(err)` — Persian fallback 'خطا در ارتباط با سرور', surfaces `data.error` from `{error}` response shape.
- Workshop data flows through `DataContext` (fetch + cache + refresh) rather than per-page hooks — check it before adding fetch logic.
- `DataContext.workshopInfo` is typed **CompanyBranding** (server-persisted branding: name, brandName, tagline, logoUrl, addresses, `analyticsSettings`, `dashboardPrefs`); fetched via `companyApi.get()` in `fetchData`. SettingsPage saves it optimistically AND via `companyApi.update(info)` — keys unknown to the company schema (e.g. `owners`) are silently stripped by Zod, which is fine.

## Workshop panel specifics (2026-09 overhaul)
- **Item create/edit form** (InventoryManager modal): USD purchase price (`purchasePriceUsd`, 2-decimal, Latin digits, shown as `$25.00`-style chips on profile), cost breakdown (`costBreakdown`: fabric/sewing/accessories/transport/packaging, live sum + per-line % with >40% red warning), percent-based pricing toggle (base = workshop cost → seller/shop prices auto-compute), per-size/color variant pricing toggle, initial stock, min-stock threshold, and «این کالا سفارش است و هنوز تولید نشده» checkbox → `productionStatus='pending_production'` (hidden from handover/shop allocation until «علامت‌گذاری آماده» → `itemsApi.markReady`). **Sizes are paired letter–number strings** (`PRESET_SIZES`: فری‌سایز, `S - 38`, `M - 40`, `L - 42`, `XL - 44`, `2XL - 46`, `3XL - 48`) stored as single strings in `item.sizes[]` — no downstream schema; legacy flat sizes ('S', '38') surface as custom chips in edit mode.
- **EntityProfilePage** (`/workshop/profile/{items|sellers|staff|owners}/:id`): gallery at top (main image + thumb strip, `images` JSON), header summary, sales-tracking box, timeline with channel tabs (all/shop/seller) + text search. All view memos (`itemView`/`sellerView`/`staffView`/`ownerView` + `visibleEntries`) run BEFORE the not-found early return — hook-count stability is mandatory (see START-HERE gotchas).
- **DashboardOverview**: collapsible widget-visibility panel (**14 switches**) → `dashboardPrefs` persisted through `companyApi.update` (server-side in `company_settings.data`, NOT localStorage; nested objects replace wholesale so the complete object is always sent). Widgets: ساعت و تاریخ شمسی (Jalali clock/date/weekday, 1s tick), کارت‌های شاخص کلیدی (KPI cards), نمودار فروش و بدهی (SalesDebtChart), برترین دست‌فروشان (TopSellersCard), آخرین واگذاری‌های امانی, آخرین دریافت‌ها, آخرین فروش‌های فروشگاه (online shop sales), آخرین درآمد دست‌فروشان (seller income), آخرین مرجوعی‌ها (returns), پرفروش‌ترین اقلام (most-sold items, shop+seller), تحویل‌های زمان‌بندی‌شده (scheduled deliveries — pending `delivery_status`, shows موعد تحویل from `deliveryDate`), اقلام در انتظار تولید (pending_production), موجودی صندوق کارگاه (liquid balance), درآمد ۷ و ۳۰ روز اخیر (weekly/monthly pure & impure income window).
- **ReturnsPage** (`/workshop/returns`): stat cards (damaged/fixed/disposed/consignment-returns), channel tabs (all/seller/customer/provider/in-process), damage records use `DMG-` codes (consignment returns keep `HND-`-linked rows); record flow: create (item SelectMenu + source + qty + reason) → «ترمیم» (Modal: repairer name, restocks qty) or «اسقاط» (ConfirmDialog, write-off) or delete.
- **AnalyticsPage** (`/workshop/analytics`): reads `GET /api/workshop/analytics` (NOT `/analytics/summary` — 404); GA measurement ID persists via companyApi `analyticsSettings.gaMeasurementId`; save/reset verified round-trip.
- **MobileNav**: bottom bar (dashboard/inventory/handover/actions); actions popover = bordered `rounded-2xl` pills each with a Plus icon (emerald = payment, brand = handover, violet = workshop expense). SideMenu sheet shows brand logo + name from `useBrand()`/CompanyBranding.
- **Gallery (Settings → گالری تصاویر, 2026-09)**: `GalleryManager` + `GalleryUploadModal` (direct upload: device/camera inputs ≤10 files, shared category+tags, client-side `compressImage` then `galleryApi.upload`). `GalleryImageDetailModal` edits label/alt/category/tags and shows a metadata panel (ابعاد، فرمت، حجم فایل، نام فایل، تاریخ شمسی) — values probed server-side at upload; legacy rows show «—». **URL policy**: DB stores portable relative `/uploads/...`; UI displays & copies the absolute URL via `absoluteGalleryUrl(url)` = `new URL(url, window.location.origin)` — domain-derived (works on localhost:5173/8090 and polarisstyle.ir without hardcoding); website `<img>` usage stays same-origin relative. Grid cards use `alt={row.alt || row.label}`, dimension badges on hover, and the header shows a live image count.
- **Sidebar pulse card («نبض کارگاه», 2026-09)**: replaced the old «قاعده مالی کارگاه» box below the nav divider. Live counts from DataContext (zero extra fetches): حواله‌های معوق (rose when >0) → `/workshop/consignments`, اجناس کم‌موجودی (amber when >0; `stockQuantity <= minStockThreshold`, mirrors InventoryManager) → `/workshop/inventory`, در انتظار تولید (`productionStatus === 'pending_production'`) → `/workshop/inventory`. Each row is a clickable `useNavigate` button.
- **NotificationsPanel (مرکز اعلان‌ها, 2026-09)**: bell button always visible in workshop Header (unread count badge, rose). Opens a start-side Sheet; rows typed `critical` (rose) / `need_action` (orange) / `notification` (blue) / `system` (stone); unread rows fully opaque, read rows `opacity-55`; header shows «N جدید» pill + «خواندن همه» (marks all read); clicking a row marks it read optimistically and navigates `link` (e.g. `/workshop/consignments`). Data via `notificationsApi.listFeed/markFeedRead/markAllFeedRead`; derived rows (e.g. pending-delivery «حواله X در انتظار تحویل») are re-derived server-side from live data. Refreshes on every open and on DataContext data refreshes.
- **Scheduled handover (تحویل بار زمان‌بندی‌شده, 2026-09)**: NewHandoverModal has a schedule checkbox «تحویل بار در تاریخ معین» → reveals a Jalali DatePicker (Gregorian payload in `deliveryDate`); HandoverManager has a «در انتظار تحویل (N)» tab (orange badge) listing pending handovers with a «تحویل شد» (emerald) button → `POST /consignments/:id/deliver`, then `onDataRefresh()` from ConsignmentsPage refreshes the whole grid. DTO note: consignment `deliveryDate` = *scheduled* date; `deliveredAt` = actual delivery moment (stamped by deliver).
- **Unified color language (2026-09)**: red/rose = overdue, critical, destructive; orange = need-action/pending-delivery/payable-rent; amber/yellow = warning/low-stock/maintenance; green/emerald = success, settled, delivered, income; blue = info/neutral-process (order status, utilities); brand gold = authority (admin, improvement costs); stone = خنثی/neutral. Order-status badges share `src/lib/orderStatus.ts` `ORDER_STATUS_META` (label + badge classes, consumed by OrdersPage + DashboardOverview) — reuse, don't fork. Cost-category chips live in `WorkshopManager.categoryOptions` (amber=maintenance, blue=materials, brand=improvement, orange=rent, blue=utilities, emerald=staff bonus, stone=other, sky=tools). Seller-channel badges: emerald=shop, blue=seller. No purple/violet/indigo/cyan/lime anywhere in the workshop module.

## Conventions

- Persian copy everywhere; RTL layout; Persian numerals in display (`normalize-persian-digits.ts`), ASCII in inputs/API.
- Toasts: Sonner only. Dates: date-fns fa-IR. Icons: lucide-react + @persianlabs/icons. Animations: motion.
- No test infra — `npm run build` (`tsc -b && vite build`) is the check. Run it after any edit; browser-verify UI changes (login page errors render in `p.text-rose-600`, toast is transient).
- PWA: manifest + PwaInstallPrompt; ConnectionGuardian blocks financial ops offline (red status = `/api/health` failing, checks DB not process).

## Controlpanel (`/controlpanel/*`, separate from workshop)

- `ThemeSettingsPage`, `WebsiteSettingsPage` (marketing site settings — website_settings JSON blob), `ShopManagementPage`, `BlogManagerPage`.
- Access: admin (all), author (blog only — enforced server-side by requireRole('admin','author') on /api/blog).
