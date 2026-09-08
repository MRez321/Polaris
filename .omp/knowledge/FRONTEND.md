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
    layout/                AppLayout (incl. scroll-to-top on route change), Sidebar, Header, MobileNav (bottom bar + actions popover with Plus-badged pills), SideMenu (brand-wired sheet)
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
    galleryApi.ts, iranian-mobile.ts, normalize-persian-digits.ts, persian-provinces.ts, usePageMeta.ts, utils.ts
  hooks/                   use-controllable-state, useNetworkStatus
```

## API access pattern

- Axios client `api` in `lib/api.ts`: baseURL `'/'` — dev relies on the **Vite proxy** (`/api` → `http://localhost:3016`, override `VITE_PROXY_TARGET`); prod is same-origin. `VITE_API_URL` escape hatch only.
- Workshop endpoints namespaced under `const W = '/api/workshop'` in api.ts; auth via better-auth's `authClient` (cookie session, not axios).
- `getApiErrorMessage(err)` — Persian fallback 'خطا در ارتباط با سرور', surfaces `data.error` from `{error}` response shape.
- Workshop data flows through `DataContext` (fetch + cache + refresh) rather than per-page hooks — check it before adding fetch logic.
- `DataContext.workshopInfo` is typed **CompanyBranding** (server-persisted branding: name, brandName, tagline, logoUrl, addresses, `analyticsSettings`, `dashboardPrefs`); fetched via `companyApi.get()` in `fetchData`. SettingsPage saves it optimistically AND via `companyApi.update(info)` — keys unknown to the company schema (e.g. `owners`) are silently stripped by Zod, which is fine.

## Workshop panel specifics (2026-09 overhaul)

- **Item create/edit form** (InventoryManager modal): USD purchase price (`purchasePriceUsd`, 2-decimal, Latin digits, shown as `$25.00`-style chips on profile), cost breakdown (`costBreakdown`: fabric/sewing/accessories/transport/packaging, live sum + per-line % with >40% red warning), percent-based pricing toggle (base = workshop cost → seller/shop prices auto-compute), per-size/color variant pricing toggle, initial stock, min-stock threshold, and «این کالا سفارش است و هنوز تولید نشده» checkbox → `productionStatus='pending_production'` (hidden from handover/shop allocation until «علامت‌گذاری آماده» → `itemsApi.markReady`).
- **EntityProfilePage** (`/workshop/profile/{items|sellers|staff|owners}/:id`): gallery at top (main image + thumb strip, `images` JSON), header summary, sales-tracking box, timeline with channel tabs (all/shop/seller) + text search. All view memos (`itemView`/`sellerView`/`staffView`/`ownerView` + `visibleEntries`) run BEFORE the not-found early return — hook-count stability is mandatory (see START-HERE gotchas).
- **DashboardOverview**: collapsible widget-visibility panel (5 switches) → `dashboardPrefs` persisted through `companyApi.update`; KPI cards, SalesDebtChart, TopSellersCard, recent-handovers, recent-payments sections each toggle independently.
- **ReturnsPage** (`/workshop/returns`): stat cards (damaged/fixed/disposed/consignment-returns), channel tabs (all/seller/customer/provider/in-process), damage records use `DMG-` codes (consignment returns keep `HND-`-linked rows); record flow: create (item SelectMenu + source + qty + reason) → «ترمیم» (Modal: repairer name, restocks qty) or «اسقاط» (ConfirmDialog, write-off) or delete.
- **AnalyticsPage** (`/workshop/analytics`): reads `GET /api/workshop/analytics` (NOT `/analytics/summary` — 404); GA measurement ID persists via companyApi `analyticsSettings.gaMeasurementId`; save/reset verified round-trip.
- **MobileNav**: bottom bar (dashboard/inventory/handover/actions); actions popover = bordered `rounded-2xl` pills each with a Plus icon (emerald = payment, brand = handover, violet = workshop expense). SideMenu sheet shows brand logo + name from `useBrand()`/CompanyBranding.

## Conventions

- Persian copy everywhere; RTL layout; Persian numerals in display (`normalize-persian-digits.ts`), ASCII in inputs/API.
- Toasts: Sonner only. Dates: date-fns fa-IR. Icons: lucide-react + @persianlabs/icons. Animations: motion.
- No test infra — `npm run build` (`tsc -b && vite build`) is the check. Run it after any edit; browser-verify UI changes (login page errors render in `p.text-rose-600`, toast is transient).
- PWA: manifest + PwaInstallPrompt; ConnectionGuardian blocks financial ops offline (red status = `/api/health` failing, checks DB not process).

## Controlpanel (`/controlpanel/*`, separate from workshop)

- `ThemeSettingsPage`, `WebsiteSettingsPage` (marketing site settings — website_settings JSON blob), `ShopManagementPage`, `BlogManagerPage`.
- Access: admin (all), author (blog only — enforced server-side by requireRole('admin','author') on /api/blog).
