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
      supply/        supplier CRUD, purchase requests/orders, receipts, supply costs, landed cost (P0-C)
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
:/api/workshop/*  (workshopAdminChain: requireAuth → requireRole('admin') → workshopRouter)
:/api/workshop/supply/*  (mounted in workshopRouter; requirePermission gates per-op)


Legacy `/api/workshop-legacy` inline mount was removed in Phase 5 — `/api/workshop` is the only path; smoke suites assert 404 on legacy.

## Workshop router endpoints (backend/src/modules/workshop/router.ts)
```
GET  /dashboard/stats        GET /audit-logs        GET /analytics (sales/debt/expense analytics aggregation)
GET/PUT /orders, PUT /orders/:id          (status transitions)
GET/POST/PUT/DELETE /items, PUT /items/:id/shop-allocation (row-locked: concurrent handovers/orders can never over-allocate; websiteQuantity only moves via this endpoint, never via PUT /items/:id), POST /items/:id/mark-ready → 410 retired (production flow removed P0-B)
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
GET/POST/PUT/DELETE /todos (workshop todo list: id, text, priority low|medium|high|urgent, dueDate, done, doneAt), POST /todos/clear-done (returns {cleared: n})
GET /backups (list), POST /backups/run/:kind (kind: database|website|full|cpanel), GET /backups/download/:id (base64url id, traversal-guarded), DELETE /backups/:id, GET/PUT /backups/settings (scheduleHours, retention, autoKind, autoEnabled, notifyTelegram, cpanel creds)
```

## Supply router endpoints (P0-C: backend/src/modules/supply/supplyRouter.ts, mounted at `/api/workshop/supply`)
```
GET  /suppliers, POST /suppliers, GET/GET-detail /suppliers/:id, PATCH /suppliers/:id
POST /suppliers/:id/activate, POST /suppliers/:id/deactivate
GET /suppliers/:id/prices, POST /suppliers/:id/prices  (price history is append-only — UPDATE inserts a new row)
GET /purchase-requests, POST /purchase-requests, GET /purchase-requests/:id, PATCH /purchase-requests/:id
POST /purchase-requests/:id/{submit|approve|reject|cancel}  (transition guarded), POST /purchase-requests/:id/convert  (approved-only → purchase order)
GET /purchase-orders, POST /purchase-orders, GET /purchase-orders/:id, PATCH /purchase-orders/:id, POST /purchase-orders/:id/cancel
POST /purchase-orders/:id/receipts, GET /purchase-orders/:id/receipts, GET /receipts/:id
POST /purchase-orders/:id/costs, PATCH/DELETE /purchase-orders/:id/costs/:costId, GET /purchase-orders/:id/costs
GET /purchase-orders/:id/landed-cost
```
Permissions: `suppliers.view/manage`, `purchasing.view/manage/approve/receive`, `supplycosts.manage`, `purchasefinance.view`. All admin-only via the workshopAdminChain. See `docs/superpowers/specs/2026-10-poc-supply.md` for full design.

`/api/company` (companyController): GET returns the full CompanyBranding JSON from `company_settings.data`; PUT validates with `companySchema` (Zod) which includes optional `analyticsSettings {gaMeasurementId, websiteUrl}` and `dashboardPrefs` (v2 layout object `{version: 2, order, hidden, cols, collapsed, presets}` — see FRONTEND.md) — `updateCompany` shallow-merges fields into the JSON blob (nested objects replace wholesale, so callers always send the complete nested object).

Notes from the old API reference:
- **Notifications**: credentials live in the DB (JSON blob); env entries (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`, `MELIPAYAMAK_API`, `MELIPAYAMAK_USERNAME`) are **fallbacks** used only when no DB value exists. `GET settings` never touches the network; test endpoints send real messages.
- **Migration 0005**: promotes every remaining legacy `staff`-role user to `admin`. Roles: admin / author / user; accountant/supervisor/tailor/staff are declared but unenforced — do not gate on them.
- **Telegram relay**: `relayUrl` (DB) / `TELEGRAM_RELAY_URL` (env fallback) is a Cloudflare-Worker base-URL relay — the api.telegram.org base is swapped, connection is DIRECT (no proxy agent). It takes precedence over `proxyUrl` (CONNECT proxy via undici ProxyAgent). Guide: `docs/telegram-relay-guide.md`, worker example: `docs/telegram-proxy-worker.js`.
- **Backups** (`src/modules/backups/`): backupService runs mysqldump → tar-czipped `.sql.gz` (database), tar of backend root (website), or both (full); binary resolution is env override (`MYSQLDUMP_PATH`/`TAR_PATH`) → PATH → common install dirs (Windows System32 tar.exe included). cPanel full backup triggers UAPI `POST https://<host>:2083/execute/Backup/fullbackup` with `Authorization: cpanel <user>:<token>`. Files stored in `backend/backups/` (gitignored) named `<kind>-YYYYMMDD-HHmmss.*`; ids are base64url of the filename — download route guards path traversal; prune enforces retention. `BackupKind` is defined locally in backupService.ts AND mirrored in backupSettingsService.ts (no circular import) — NOT in shared types. Scheduler: 15-min `setInterval` in `server.ts` (`BACKUP_TICK_MS`); automatic backups get an `auto-` filename prefix.

Controllers are thin (parse → service call → res.json); business logic lives in `services/inventoryService.ts` — soft-delete via trash system, consignment stock math, debt allocation (JSON `DebtAllocation[]` on payments), shop allocation splits.

## Conventions

- Zod validation at every controller boundary; error shape `{ error: string }` (smoke-tested).
- Audit logging via `recordAudit()` / `entityActor(tx, userId)` from `core/services/auditService.ts` — `audit_logs` table, columns are `entity_type`/`entity_id`/`action`/`details`. P0-C supply actions (supplier CRUD, price append, request/order/receipt/cost changes) all audit with the session actor. Only successful logins audited automatically (better-auth session-create hook).
- TS: ESM (`"type": "module"`), `.js` import suffixes, no top-level await in server.ts (broke cPanel startup once — see commit f0ad94a).
- Node >=18; running on Node 22 locally, cPanel runs its own selector version.

## Smoke suites (cwd backend/, backend must be running on 3016)

- `node scripts/test-acceptance.mts` — full invariant suite (P0-B + P0-C): runs real services against dev MySQL; asserts cache == Σledger, Σ allocations == cost amount, payables separate from expenses, every movement audited + actor-traced. Expects 79/79 checks (57 P0-B + 22 P0-C). RUN after any backend change.
- `node scripts/smoke.mjs` — full flow: sign-in, role check, CRUD, expenses, profit distribution, audit, error shape. RUN after any backend change.

## Starting the backend

```bash
# via bash tool, timeout: 0 — auto-backgrounds as a job
cd backend && npm run dev     # tsx watch, port 3016, dotenvx injected
```
Health: `curl http://localhost:3016/api/health` (checks MySQL connectivity, not just process).
Hub daemon CANNOT host it (EACCES 0.0.0.0:3016) — always bash background jobs.
