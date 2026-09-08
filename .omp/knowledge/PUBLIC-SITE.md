# Public Storefront Reference — Polaris

The customer-facing site. Distinct context from the workshop (see DOMAIN.md). All admin/workshop code is isolated in `src/modules/workshop/` — public code never imports from it.

## Routes & files

| Route | Page file |
|---|---|
| `/` | `src/pages/public/HomePage.tsx` |
| `/shop` | `src/pages/public/ShopPage.tsx` |
| `/product/:id` | `src/pages/public/ProductPage.tsx` |
| `/blog`, `/blog/:slug` | `src/pages/public/BlogPage.tsx`, `BlogPostPage.tsx` |
| `/contact` | `src/pages/public/ContactPage.tsx` |
| `/checkout` | `src/pages/public/CheckoutPage.tsx` |
| `/dashboard` | `src/pages/public/CustomerDashboardPage.tsx` (customer account: orders, addresses) |
| `/login`, `/signup` | `src/pages/{LoginPage,SignupPage}.tsx` |

Wrapped in `PublicLayout` (`src/components/public/`). Marketing site works anonymous; checkout/customer pages need a session (any role).

## API surfaces used (from `src/lib/api.ts` + better-auth client)

- Catalog: `GET /api/public/{items,categories,company,blog,blog/:slug}` — anonymous; responses filtered to marketing-safe fields (no cost/consignment prices, no stock levels, no internal branding).
- Orders: `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/mine/:id` — any authenticated user, mine-scoped (`backend/src/controllers/ordersController.ts`).
- Addresses: `GET/POST /PUT/DELETE /api/addresses` — owner-scoped (`backend/src/controllers/addressesController.ts`).
- Auth: `authClient` from `src/lib/auth.ts` (sign-up/sign-in/OAuth, cookie session).

## State (client-side contexts in `src/context/`)

- `CartContext` — shopping cart (client-side; checkout turns it into an order)
- `FavoritesContext` — product favorites
- `NetworkContext` + `useNetworkStatus` — `/api/health` polling (10s + window focus)
- `ThemeContext` / `BrandContext` — site theming; brand pulled from company settings

## Controlpanel overlap

Admins manage the public site at `/controlpanel/*` (`src/pages/controlpanel/`): theme, website settings, shop, blog. Authors get blog only. These pages call `/api/blog*`, `/api/website/settings`, `/api/company`, `/api/gallery*`, `/api/uploads` — see BACKEND.md mount table.
