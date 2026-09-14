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

## Security middleware (P0-A — all mounted in src/app.ts)

| Layer | File | Notes |
|---|---|---|
| Rate limiting | `core/security/rateLimit.ts` | `app.use('/api', apiRateLimiter)` BEFORE the better-auth catch-all. Buckets: auth 10/15min (IP+email), mfa 10/1min, sensitive 20/1min, general 180/1min. `/api/health` excluded. 429 + `Retry-After` + Persian `{error}`. In-memory Map — resets on restart; single-process only. |
| Security headers | `core/middleware/securityHeaders.ts` | nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP (`default-src 'self' …` with `unsafe-inline` for script/style — required by pre-paint theme script + runtime brand-palette style; browser-verified), HSTS (prod HTTPS only). `app.disable('x-powered-by')`. |
| Error sanitization | `core/utils/sanitize.ts` | `sanitizeError`/`sanitizeMessage` wrap every console log site; `API_MASK` (16 bullets) + `isMaskedCredential()` for GET/PUT masking round-trips. |
| RBAC permissions | `core/rbac/permissions.ts` | `requirePermission` middleware; backups + notification-credential routes declare explicit permissions beyond role gates. |

Backup jobs: module-level `backupRunning` lock → concurrent runs return 409 Persian; `downloadBackup` writes an audit row (action `read`, filename+user+IP). mysqldump gets the DB password via `MYSQL_PWD` env (never argv — `ps` leak).

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
GET/POST/PUT/DELETE /todos (workshop todo list: id, text, priority low|medium|high|urgent, dueDate, done, doneAt), POST /todos/clear-done (returns {cleared: n})
GET /backups (list), POST /backups/run/:kind (kind: database|website|full|cpanel), GET /backups/download/:id (base64url id, traversal-guarded), DELETE /backups/:id, GET/PUT /backups/settings (scheduleHours, retention, autoKind, autoEnabled, notifyTelegram, cpanel creds)
```

`/api/company` (companyController): GET returns the full CompanyBranding JSON from `company_settings.data`; PUT validates with `companySchema` (Zod) which includes optional `analyticsSettings {gaMeasurementId, websiteUrl}` and `dashboardPrefs` (v2 layout object `{version: 2, order, hidden, cols, collapsed, presets}` — see FRONTEND.md) — `updateCompany` shallow-merges fields into the JSON blob (nested objects replace wholesale, so callers always send the complete nested object).

Notes from the old API reference:
- **Notifications**: credentials live in the DB (JSON blob); env entries (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`, `MELIPAYAMAK_API`, `MELIPAYAMAK_USERNAME`) are **fallbacks** used only when no DB value exists. `GET settings` never touches the network; test endpoints send real messages.
- **Migration 0005**: promotes every remaining legacy `staff`-role user to `admin`. Roles: admin / author / user; accountant/supervisor/tailor/staff are declared but unenforced — do not gate on them.
- **Telegram relay**: `relayUrl` (DB) / `TELEGRAM_RELAY_URL` (env fallback) is a Cloudflare-Worker base-URL relay — the api.telegram.org base is swapped, connection is DIRECT (no proxy agent). It takes precedence over `proxyUrl` (CONNECT proxy via undici ProxyAgent). Guide: `docs/telegram-relay-guide.md`, worker example: `docs/telegram-proxy-worker.js`.
- **Backups** (`src/modules/backups/`): backupService runs mysqldump → tar-czipped `.sql.gz` (database), tar of backend root (website), or both (full); binary resolution is env override (`MYSQLDUMP_PATH`/`TAR_PATH`) → PATH → common install dirs (Windows System32 tar.exe included). cPanel full backup triggers UAPI `POST https://<host>:2083/execute/Backup/fullbackup` with `Authorization: cpanel <user>:<token>`. Files stored in `backend/backups/` (gitignored) named `<kind>-YYYYMMDD-HHmmss.*`; ids are base64url of the filename — download route guards path traversal; prune enforces retention. `BackupKind` is defined locally in backupService.ts AND mirrored in backupSettingsService.ts (no circular import) — NOT in shared types. Scheduler: 15-min `setInterval` in `server.ts` (`BACKUP_TICK_MS`); automatic backups get an `auto-` filename prefix.


- Zod validation at every controller boundary; error shape `{ error: string }` (smoke-tested).
- Audit logging via `logAudit(user, action, entity, details, ip?)` from `core/services/auditService.ts` — `audit_logs` table, column is `details` NOT `description`. Only successful logins audited automatically (better-auth session-create hook).
- TS: ESM (`"type": "module"`), `.js` import suffixes, no top-level await in server.ts (broke cPanel startup once — see commit f0ad94a).
- Node >=18; running on Node 22 locally, cPanel runs its own selector version.

## Smoke suites (cwd backend/, backend must be running on 3016)

- `node scripts/smoke.mjs` — full flow: sign-in, role check, CRUD, expenses, profit distribution, audit, error shape. RUN after any backend change.
- `smoke-security.mjs` — security regression: 401/403 auth+RBAC, CORS, security headers, credential masking round-trips, full 2FA matrix (leaves admin 2FA OFF), rate-limit 429/Retry-After/Persian, backup traversal + concurrency. Run after any auth/security change; needs a DB reset if a prior run died mid-2FA (AUTH.md lockout trap).

## Starting the backend

```bash
# via bash tool, timeout: 0 — auto-backgrounds as a job
cd backend && npm run dev     # tsx watch, port 3016, dotenvx injected
```
Health: `curl http://localhost:3016/api/health` (checks MySQL connectivity, not just process).
Hub daemon CANNOT host it (EACCES 0.0.0.0:3016) — always bash background jobs.
