# Deployment Reference — Polaris (cPanel + GitHub Actions)

## Architecture

Single domain `https://polarisstyle.ir` — NO API subdomain, NO CORS. Caddy + BitNinja-WafPro sit in front. Express serves: `/api/*`, `/socket.io/*`, everything else = built frontend from `public/` with SPA fallback to index.html. cPanel Node.js selector: app root `/PolarisStyle/`, startup `server.js`, watches `tmp/` for restart trigger.

```
/PolarisStyle/            BACKEND_PATH   (entry server.js, compiled dist)
├── server.js + src/      compiled backend
├── .env                  SERVER-ONLY — never uploaded, never deleted by deploy
├── public/               FRONTEND_PATH  (Vite build)
└── tmp/                  RESTART_PATH   (restart.txt trigger)
```

## Deploy pipeline (`.github/workflows/deploy.yml`, trigger: `v*` tags)

1. Build backend (`tsc` → dist, copies package.json + public/)
2. FTP-sync `backend/dist/` → `/PolarisStyle/` (clears stale public/)
3. Build frontend (Vite)
4. FTP-sync `frontend/dist/` → `/PolarisStyle/public/`
5. Upload timestamped `restart.txt` → `/PolarisStyle/tmp/` → cPanel restarts app

Order matters (backend before frontend, restart last). `**/.env` excluded from FTP sync. Secrets: FTP_HOST/USERNAME/PASSWORD/PORT, BACKEND_PATH, FRONTEND_PATH, RESTART_PATH (GitHub Actions secrets, already configured).

**To deploy**: commit to main → `git tag vX.Y.Z` → `git push origin main --tags`. Backend runs "Run NPM Install" only needed first deploy (node_modules not uploaded).

## Env vars

Backend `.env` (local, real values): DB_HOST/PORT/USER/PASSWORD/NAME, PORT=3016, BETTER_AUTH_SECRET, BETTER_AUTH_URL, FRONTEND_URL, GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, ADMIN_EMAIL/ADMIN_PASSWORD (seed), TELEGRAM_BOT_TOKEN/CHAT_ID, MELIPAYAMAK_* (SMS). Prod `.env` is server-only — prod secrets/passwords DIFFER from repo by design.

Frontend `.env`: `VITE_API_URL` empty (dev = Vite proxy, prod = same-origin). `VITE_PROXY_TARGET` overrides local backend target.

## Prod debugging (no SSH — FTP + cPanel UI only)

- Health: `https://polarisstyle.ir/api/health` → 200 `{status:ok, database:connected}` / 503 DB down. Checks MySQL, not just process.
- WAF: plain curl from outside may be filtered; test POSTs through a real browser. Real-browser POSTs reach the backend fine.
- App logs: cPanel → Node.js app log (shows missing .env, BETTER_AUTH_SECRET, node_modules issues).
- DB: cPanel phpMyAdmin (see AUTH.md for the password-reset UPDATE).
- Migrations auto-run at startup. Out-of-sync bookkeeping → `scripts/repair-migrations.mjs` locally.
- Backend boots even with MySQL down (503 until pool reconnects) — a down DB is not a down app.

## Release history

- `v0.5.2` = `16fb090` (workshop overhaul) — deployed 2026-09-05.
- `0c1222e` mapAuthError fix — committed after v0.5.2; **not yet tagged/deployed** (as of 2026-09-07).
- Branches: main (active), backup-20260823, backup-20260824 (remote backups).
- Git author: Reza Mousavi <MRez321@gmail.com>.
