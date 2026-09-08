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
    pages/                 Dashboard, Orders, Inventory, Consignments, People, Finances, Settings, EntityProfile
    layout/                AppLayout, Sidebar, Header, MobileNav, SideMenu
    context/               DataContext (workshop data), UIContext (drawers/modals)
    inventory/consignments/payments/staff/sellers/people/settings/audit/finances/  Manager components per domain
    dashboard/             StatsCard, TopSellersCard, SalesDebtChart, OverdueAlertBanner
    analytics/             FinancialReports
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

## Conventions

- Persian copy everywhere; RTL layout; Persian numerals in display (`normalize-persian-digits.ts`), ASCII in inputs/API.
- Toasts: Sonner only. Dates: date-fns fa-IR. Icons: lucide-react + @persianlabs/icons. Animations: motion.
- No test infra — `npm run build` (`tsc -b && vite build`) is the check. Run it after any edit; browser-verify UI changes (login page errors render in `p.text-rose-600`, toast is transient).
- PWA: manifest + PwaInstallPrompt; ConnectionGuardian blocks financial ops offline (red status = `/api/health` failing, checks DB not process).

## Controlpanel (`/controlpanel/*`, separate from workshop)

- `ThemeSettingsPage`, `WebsiteSettingsPage` (marketing site settings — website_settings JSON blob), `ShopManagementPage`, `BlogManagerPage`.
- Access: admin (all), author (blog only — enforced server-side by requireRole('admin','author') on /api/blog).
