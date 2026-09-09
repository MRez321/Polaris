# Backend Reference — Polaris

## Structure

```
backend/
  server.ts          entry — express + socket.io bootstrap, no top-level await (cPanel constraint)
  src/
    app.ts           express app assembly, static /public + SPA fallback, mounts /api
    config/drizzle.ts  db connection (mysql2 pool + drizzle)
    core/origins.ts  trusted origins — SINGLE SOURCE for CORS (express, better-auth, socket.io)
    core/services/auditService.ts  logAudit()
    routes/apiRoutes.ts   global route table + permission order (see below)
    modules/
      auth/          better-auth service + requireAuth/requireRole middleware + /api/auth mount
      workshop/      router.ts + controllers/ (10) + services/inventoryService.ts (39KB core logic)
      cms/           blog, company, website, gallery controllers
      notifications/ settings + Telegram/SMS (Melipayamak) senders
    controllers/     health, orders (customer), addresses (customer)
    schema/          drizzle table definitions — auth, workshop, orders, cms, company, notifications, audit, userAddresses, clientId
  scripts/           migrate.js, seed.js, seed-workshop.js, smoke*.mjs, copy-public.js, repair-migrations.mjs
  drizzle/          *.sql migration files (15: 0000–0014)
  uploads/          multer output (gitignored)
  public/           frontend prod build copied here by copy-public.js at build
```

## Route mount order in apiRoutes.ts (order IS the auth)

```
/api/health                                public
/api/public/{items,categories,company,blog} public (marketing-safe fields only)
--- requireAuth ---
/api/orders, /api/orders/mine              any authenticated user
/api/addresses*                            owner-scoped
/api/blog*                                 requireRole('admin','author')
--- requireRole('admin') ---
/api/company*, /api/website/settings, /api/uploads, /api/gallery*
/api/workshop/*  (workshopAdminChain: requireAuth → requireRole('admin') → workshopRouter)
```

Legacy `/api/workshop-legacy` inline mount was removed in Phase 5 — `/api/workshop` is the only path; smoke suites assert 404 on legacy.

## Workshop router endpoints (backend/src/modules/workshop/router.ts)
```
GET  /dashboard/stats        GET /audit-logs        GET /analytics (sales/debt/expense analytics aggregation)
GET/PUT /orders, PUT /orders/:id          (status transitions)
GET/POST/PUT/DELETE /items, PUT /items/:id/shop-allocation (row-locked: concurrent handovers/orders can never over-allocate; websiteQuantity only moves via this endpoint, never via PUT /items/:id), POST /items/:id/mark-ready (pending_production → ready)
GET/POST /categories
GET/POST/PUT/DELETE /sellers (+GET /sellers/:id)
GET/POST/DELETE /consignments, POST /consignments/return, POST /consignments/:id/deliver (scheduled → delivered: stamps deliveredAt, applies seller debt/due), GET /consignments/returns
GET/POST /payments
GET/POST/PUT/DELETE /staff, GET/PUT /owners
GET/POST/PUT/DELETE /expenses, GET/POST /profit-distribution
GET/POST /damage-records, PUT /damage-records/:id, POST /damage-records/:id/fix (repairs + restocks), (dispose = PUT status)
GET /trash, POST /trash/restore/:type/:id, PUT /trash/edit-and-restore/:type/:id, DELETE /trash/permanent/:type/:id
GET/PUT /notifications/settings, POST /notifications/test/{telegram,sms}
GET /notifications/feed (+ ?limit), POST /notifications/feed/read (one), POST /notifications/feed/read-all  (workshop notifications center: derived + event notifications, per-item read marks)
```

`/api/company` (companyController): GET returns the full CompanyBranding JSON from `company_settings.data`; PUT validates with `companySchema` (Zod) which includes optional `analyticsSettings {gaMeasurementId, websiteUrl}` and flat `dashboardPrefs: Record<string, unknown>` — `updateCompany` shallow-merges fields into the JSON blob (nested objects replace wholesale, so callers always send the complete nested object).

Notes from the old API reference:
- **Notifications**: credentials live in the DB (JSON blob); env entries (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`, `MELIPAYAMAK_API`, `MELIPAYAMAK_USERNAME`) are **fallbacks** used only when no DB value exists. `GET settings` never touches the network; test endpoints send real messages.
- **Migration 0005**: promotes every remaining legacy `staff`-role user to `admin`. Roles: admin / author / user; accountant/supervisor/tailor/staff are declared but unenforced — do not gate on them.
- **Socket.io**: endpoint `/socket.io` on same origin; backend still hosts it, frontend client removed.

Controllers are thin (parse → service call → res.json); business logic lives in `services/inventoryService.ts` — soft-delete via trash system, consignment stock math, debt allocation (JSON `DebtAllocation[]` on payments), shop allocation splits.

## Conventions

- Zod validation at every controller boundary; error shape `{ error: string }` (smoke-tested).
- Audit logging via `logAudit(user, action, entity, details, ip?)` from `core/services/auditService.ts` — `audit_logs` table, column is `details` NOT `description`. Only successful logins audited automatically (better-auth session-create hook).
- TS: ESM (`"type": "module"`), `.js` import suffixes, no top-level await in server.ts (broke cPanel startup once — see commit f0ad94a).
- Node >=18; running on Node 22 locally, cPanel runs its own selector version.

## Smoke suites (cwd backend/, backend must be running on 3016)

- `node scripts/smoke.mjs` — full flow: sign-in, role check, CRUD, expenses, profit distribution, audit, error shape. RUN after any backend change.
- `smoke-phase2.mjs`, `smoke-phase3.mjs` — phase-scoped regression suites.

## Starting the backend

```bash
# via bash tool, timeout: 0 — auto-backgrounds as a job
cd backend && npm run dev     # tsx watch, port 3016, dotenvx injected
```
Health: `curl http://localhost:3016/api/health` (checks MySQL connectivity, not just process).
Hub daemon CANNOT host it (EACCES 0.0.0.0:3016) — always bash background jobs.
