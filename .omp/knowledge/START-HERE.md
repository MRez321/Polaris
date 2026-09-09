# Polaris — Agent Knowledge Base

Single source of truth for fast session starts. **Read this file first, then only the file that matches your task.** Order:

1. `START-HERE.md` (this file) — stack, layout, commands, gotchas. ~2 min.
2. The ONE relevant reference file:
   - Editing backend API / adding a route → `BACKEND.md`
   - Editing auth / roles / sessions / login bugs → `AUTH.md`
   - Editing a workshop page / manager UI → `FRONTEND.md`
   - Editing public site / checkout / blog → `PUBLIC-SITE.md`
   - DB schema questions / migrations / new table → `DATABASE.md`
   - Deployment, cPanel, secrets, deploy workflow → `DEPLOY.md`
   - Business terms / money lifecycle / "what does X mean" → `DOMAIN.md`
   - Any bug with unclear cause → `DEBUG-PLAYBOOK.md`

## Project in one paragraph

Polaris Style (`polarisstyle.ir`) — Persian (fa-IR) tailoring/clothing business app with two faces: (1) a **public storefront** (shop, blog, checkout, customer accounts) and (2) an **admin-only workshop panel** at `/workshop` tracking inventory → sellers (consignment handovers) → returns → payments → expenses → profit distribution, plus audit logs and outbound Telegram/SMS notifications. MySQL + Drizzle, Express backend, React 19 frontend, better-auth.

## Stack (verified 2026-09-07)

| Layer | Tech |
|---|---|
| Backend | Express 5 + TypeScript + tsx, port **3016**, `backend/` |
| Frontend | React 19 + Vite 8 + TypeScript ~6, port **5173**, `frontend/` |
| DB | MySQL `polaris` @ 127.0.0.1:3306, user `MRez` pw `64321608`, utf8mb4_persian_ci |
| ORM | Drizzle ORM 0.45 + drizzle-kit, migrations in `backend/drizzle/` |
| Auth | better-auth 1.7 (email+password, Google, GitHub; admin + bearer plugins) |
| Realtime | socket.io (backend) — socket.io-client removed from frontend in Phase 5 |
| Validation | Zod v4 both ends |
| UI | Tailwind 4 + Persian Labs components (`@persianlabs/icons`), RTL, Sonner toasts |
| Charts | recharts; Lists: react-virtuoso; Animation: motion |
| Production | cPanel Node.js at `/PolarisStyle/`, Caddy + BitNinja-WafPro front, FTP deploy via GitHub Actions tag push |

## Repo layout (top level)

```
backend/            Express API (src/modules + src/controllers + src/schema + drizzle/)
frontend/           React SPA (src/pages + src/modules/workshop + src/context + src/lib)
.omp/knowledge/     this knowledge base — THE unified doc home (supersedes markdown/ + PolarisStyle.md)
.github/workflows/  deploy.yml — tag push → FTP to cPanel
```

## Dev commands

```bash
# Backend (cwd backend/) — always via bash background job, timeout: 0
npm run dev            # tsx watch server.ts → http://localhost:3016
# Frontend (cwd frontend/)
npm run dev            # vite → http://localhost:5173
npm run build          # tsc -b && vite build  (typecheck + prod build)
# DB (cwd backend/)
npm run db:migrate     # node scripts/migrate.js
npm run db:seed        # seed.js — creates admin from ADMIN_EMAIL/ADMIN_PASSWORD in .env
npm run db:seed:workshop
# Tests (cwd backend/)
node scripts/smoke.mjs         # full API smoke suite — RUN after any backend change
node scripts/smoke-phase2.mjs / smoke-phase3.mjs
```

**Server-lifecycle gotcha (critical)**: hub daemon cannot run the backend (`EACCES 0.0.0.0:3016`). Start both servers via `bash` with `timeout: 0` (they auto-background as jobs bg_2/bg_3). Check with `curl http://localhost:3016/api/health`.

## Frontend routes (frontend/src/App.tsx)

| Route | Page | Guard |
|---|---|---|
| `/`, `/shop`, `/product/:id`, `/blog`, `/blog/:slug`, `/contact`, `/checkout`, `/dashboard` | Public storefront | none (checkout/dashboard need session) |
| `/login`, `/signup` | Auth screens | none |
| `/workshop/*` | Admin panel (Dashboard, Orders, Inventory, Consignments, People, Finances, Returns (`/workshop/returns`), Analytics (`/workshop/analytics`), Settings, `profile/:type/:id`) | `RequireAdmin` → non-admins → `/dashboard` |
| `/controlpanel/{theme,website,shop,blog}` | Website management | admin (settings+blog), author (blog) |

Admin panel code: `frontend/src/modules/workshop/` — pages/, managers per domain (InventoryManager, HandoverManager, PaymentsManager, UsersManager, AuditLogsManager...), shared `context/DataContext.tsx` + `UIContext.tsx`, `layout/` (AppLayout, Sidebar, Header, MobileNav, SideMenu), `returns/` (ReturnsPage), `analytics/` (AnalyticsPage + FinancialReports), `dashboard/` (DashboardOverview + widget cards/charts).

## API surface (one mount: `/api`, `backend/src/routes/apiRoutes.ts`)

Public: `/api/health`, `/api/public/{items,categories,company,blog,blog/:slug}`.
Customer (any auth): `/api/{orders,addresses}` (mine-scoped), `/api/auth/*` (better-auth).
Author/admin: `/api/blog*`.
Admin-only: `/api/company` (GET/PUT — CompanyBranding blob incl. `analyticsSettings` `{gaMeasurementId, websiteUrl}` and `dashboardPrefs` `{widgetId: boolean}`), `/api/website/settings`, `/api/uploads` (multipart; accepts `alt` field; probes width/height/fileSize/mime from the file signature via `probeImageMeta`), `/api/gallery*` (PATCH accepts `alt`; rows carry probed metadata), and everything in `/api/workshop/*` (dashboard stats, audit-logs, orders, items + `POST /items/:id/mark-ready`, categories, sellers, consignments, payments, staff, owners, expenses, profit-distribution, damage-records + `POST /damage-records/:id/fix`, analytics `GET /analytics`, trash, notifications) — see `backend/src/modules/workshop/router.ts`.

## Auth in 30 seconds

better-auth + admin plugin. Roles: `admin`, `author`, `user` (default on signup). Session cookie `better-auth.session_token` (HttpOnly, SameSite=Lax, 7d). Local admin: `admin@polarisstyle.ir` / `PolarisAdmin123!`. No email verification, no password reset (not configured). Password hashing: **scrypt N=16384 r=16 p=1 dkLen=64**, format `salt:key` hex — NOT bcrypt. Details: `AUTH.md`.

## Known gotchas

- **Error message mapping**: `frontend/src/lib/auth.ts` `mapAuthError()` — substring checks are order-sensitive; `invalid email or password` must be checked before `invalid email`. Fixed in commit `0c1222e` after live prod bug (wrong message shown on failed login).
- **DB access from bash**: `node -e` with mysql2 from `backend/` cwd (module resolution). Query errors print as bare `Node.js v22...` — add `.catch(e=>console.error('ERR:',e.message))`.
- **`.omp/` is NOT gitignored** — `.gitignore` lists `.env`, `node_modules`, `dist`, `backend/uploads/`, `.idea`, `#temp`, `a`, `A`. The knowledge base is intentionally committable (unified doc home, supersedes markdown/). Ask before changing this.
- **Prod secrets differ from repo**: `.env` excluded from FTP deploy (`**/.env` in deploy.yml). Prod DB creds/passwords live only on server. Documented admin password works locally only.
- **Stale debug artifacts (user's, don't delete)**: `frontend/.tmp-dp.js`, `backup-20260823/24` branches, `backend/tmp-inspect-out.txt`, `backend/scripts/repair-migrations.mjs` (migration repair tool).
- **No frontend test infra** — `build` is the only check (`tsc -b && vite build`). Backend has smoke suites.
- **Node 22** on this machine; backend package.json claims `>=18`.
- **cPanel prod**: backend runs from `/PolarisStyle/` via cPanel Node.js selector; frontend build copied to `backend/public/` by `scripts/copy-public.js` at build; migrations run via `npm run db:migrate` on server or `repair-migrations.mjs` when `__drizzle_migrations` table is out of sync.
- **React hook order (EntityProfilePage pattern)**: ALL hooks must run before any conditional early-return (`if (view.missing) return …`). The not-found early return sits AFTER every useMemo/useEffect — compute `visibleEntries` unconditionally with internal null-guarding (`source = view && !view.missing ? view.entries : []`). Violation = "Rendered more hooks than during the previous render" boundary crash when data loads after a missing/loading first render. Apply this pattern to any new profile-type page.
- **Dashboard widget visibility**: `DashboardOverview` `WIDGETS` ids: `kpiCards`, `salesDebtChart`, `topSellers`, `recentHandovers`, `recentPayments`. Each grid child is individually wrapped in `isVisible(id)` — never wrap two widgets in one switch (topSellers was once dead-wired inside salesDebtChart). Prefs persist server-side via `companyApi.update({dashboardPrefs})` (optimistic + fire-and-forget).
- **Edit-tool corruption risk**: this codebase repeatedly lost adjacent lines through patch edits (hook calls, import members, open JSX tags, closing grid divs). After every edit re-`read` the file; after every file run `cd frontend && npx tsc -b`. Symptoms: TS2304 for previously-imported names or TS17002 for unbalanced JSX.
- **Windows port blocks can hit any port** (seen 2026-09-09): vite died with `EACCES ::1:5173` and even `127.0.0.1:5174` while 3016/8090 listened fine — Hyper-V/WinNAT exclusion or AV interference, not a code problem. Workaround: run vite on another port (`npx vite --host 0.0.0.0 --port 8090`), then trust the new origin in `backend/src/core/origins.ts` `LOCAL_DEV_PORTS` (8090 added) or uploads POSTs get 403 «مبدأ درخواست مجاز نیست».

## Session-start checklist (what "actual work" needs)

1. `git status --short` + `git log --oneline -5` — user's uncommitted work is sacred; detect context drift.
2. Are servers up? `curl -s http://localhost:3016/api/`health` -o /dev/null -w "%{http_code}"` → restart via bash bg jobs if `000`.
3. Read the ONE relevant reference file below.
4. For bugs: `DEBUG-PLAYBOOK.md` has environment-specific reproduction recipes.

## File map (what lives where)

| Need to touch | File/dir |
|---|---|
| API route mount order / permissions | `backend/src/routes/apiRoutes.ts` + `backend/src/modules/workshop/router.ts` |
| A workshop endpoint's logic | `backend/src/modules/workshop/controllers/*Controller.ts` (10 controllers, one per domain) |
| Business logic / complex queries | `backend/src/modules/workshop/services/inventoryService.ts` (39KB — the big one) |
| Auth config | `backend/src/modules/auth/service.ts` (betterAuth config), `middleware.ts` (requireAuth/requireRole) |
| CORS / trusted origins | `backend/src/core/origins.ts` — single source shared by Express + better-auth + socket.io |
| DB schema | `backend/src/schema/*.ts` — auth, workshop, orders, cms, company, notifications, audit, userAddresses, clientId |
| Frontend API client | `frontend/src/lib/api.ts` (workshop), `frontend/src/lib/auth.ts` (better-auth client + error mapping) |
| Frontend state | `frontend/src/context/` — AuthContext (session), DataContext (workshop data), ThemeContext, BrandContext, CartContext, FavoritesContext, NetworkContext |
| Admin UI managers | `frontend/src/modules/workshop/{inventory,consignments,payments,staff,sellers,settings,audit,people,finances}/` |
| Public UI | `frontend/src/pages/public/*` + `frontend/src/components/public/` + `components/ui/` (shadcn-style) |
| Uploads | multer → `backend/uploads/` (gitignored), gallery rows in `gallery_images` |
| Docs | this knowledge base — `.omp/knowledge/` is the single source (markdown/ + old agent files were folded in and removed) |

## DB tables (24, verified live)

Auth: `user`, `session`, `account`, `verification`.
Workshop: `items`, `categories`, `sellers`, `consignments`, `consignment_returns`, `payments`, `staff`, `owners`, `expenses`, `profit_distributions`, `damage_records`.
Orders: `orders`, `user_addresses`.
CMS: `blog_posts`, `website_settings`, `company_settings`, `gallery_images`, `notification_settings`.
Infra: `audit_logs`, `__drizzle_migrations`.

## Conventions (enforced, from project rules + observed)

- ALL user-facing strings Persian; RTL; Persian numerals in display, ASCII in API/DB.
- date-fns + fa-IR locale only (no moment/dayjs).
- Sonner for toasts only.
- Zod at API boundaries.
- Single domain polarisstyle.ir — no API subdomain, no CORS config drift (use `core/origins.ts`).
- Comments in code: English; user-facing copy: Persian.

## Version tags / recent history

- `v0.5.2` = `16fb090` deployed 2026-09-05 (workshop overhaul).
- `0c1222e` fixed auth problem (mapAuthError ordering) — post-v0.5.2, not yet tagged/deployed.
- Branches: `main` (active), `backup-20260823`, `backup-20260824`.
