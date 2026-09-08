# Debug Playbook — Polaris

Fast triage recipes. Check START-HERE server-status first, then the matching recipe.

## Environment / servers

- **Backend won't start / port issues**: hub daemon gets `EACCES 0.0.0.0:3016` — it cannot host the backend. Always `bash` + `timeout: 0` background jobs: `cd backend && npm run dev` (3016), `cd frontend && npm run dev` (5173). Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3016/api/health`.
- **Health 503**: backend is up but MySQL is unreachable — check MySQL service / creds in `backend/.env`. Backend intentionally survives DB-down.
- **Vite proxy**: `/api` → 3016 via vite.config.ts; if frontend gets network errors while backend is up, check the proxy target (`VITE_PROXY_TARGET`).

## Auth / login

See `AUTH.md` debug recipe (curl sign-in → 401 semantics → mapAuthError ordering → WAF/browser for prod → stale session cookies → scrypt hash verification/reset).

## API bugs

1. Reproduce via curl against local backend (cookies: `--cookie` / session from browser). Authed requests need `better-auth.session_token` cookie or Bearer token.
2. Check route order in `apiRoutes.ts` — mounts are permission boundaries; a route added after `requireRole('admin')` is admin-only regardless of intent.
3. Controllers thin → logic in `modules/workshop/services/inventoryService.ts`. Check Zod parse at boundary; error shape is `{error: string}`.
4. Smoke: `node scripts/smoke.mjs` (cwd backend/, server running) — covers sign-in, roles, CRUD, expenses, profit, audit, error shape.
5. DB state question → query directly (snippet in DATABASE.md), not through the API.

## Frontend bugs

1. `npm run build` (cwd frontend/) — catches TS errors; there is no test infra.
2. Browser-verify with the real browser tool (`xd://browser`): `open` the local URL, `run` with `tab.fill`/`tab.click`. Inline form errors render in `p.text-rose-600` on LoginPage — the toast is transient.
3. Stale sessions: a leftover admin cookie auto-redirects /login → /workshop. `POST /api/auth/sign-out` first.
4. State: AuthContext (session/user/role), DataContext (workshop data cache), ThemeContext, BrandContext. A stale DataContext cache after mutations — look for its refresh/invalidations before assuming backend bug.

## Migrations

- Error "migration hash mismatch" / journal desync on prod: run `scripts/repair-migrations.mjs` locally against prod DB creds (careful) — it reconciles `__drizzle_migrations`.
- New migration not applying: server auto-runs at startup; force restart via `restart.txt` trigger (cPanel watches `tmp/`).
- Never edit an applied migration file — generate a new one (`npm run db:generate`).

## Prod-only issues

- WAF blocks external curl POSTs but browser requests pass — always verify with real browser.
- `.env` drift: prod secrets ≠ repo (deploy excludes `**/.env`). Symptom: works locally, 401/500 on prod with same code — check prod `.env` via cPanel file manager.
- Caddy + BitNinja in front — response headers/logs not accessible; only the app's own behavior.
- Deploy went wrong: tag-triggered FTP sync order is backend → frontend → restart. A half-deploy shows new API with old SPA or vice versa; re-tag or re-run workflow.

## Known non-bugs (don't chase)

- Prod 401 on repo-documented admin password: expected (prod `.env` differs).
- `frontend/.tmp-dp.js`, `backend/tmp-inspect-out.txt`: user's leftover debug files — unrelated, do not delete without asking.
- Google OAuth `redirect_uri_mismatch`: not present — redirect URI is registered and verified.
- socket.io warnings in frontend: socket.io-client was removed in Phase 5; backend still hosts the endpoint.
