# Polaris Style Web App

Inventory, consignment, payments, and workshop management system for the **Polaris Style** tailoring business. Persian (RTL), mobile-first PWA. Single-domain deployment: the Node.js backend serves both the API and the built frontend on cPanel shared hosting.

---

## Tech Stack

### Frontend (`frontend/`)

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | React 19 + Vite + TypeScript                       |
| Styling            | Tailwind CSS 4                                     |
| UI components      | Shadcn/ui (Radix-based) + persian-labs RTL components |
| Icons              | Lucide React, @persianlabs/icons                   |
| Routing            | React Router DOM 7                                 |
| HTTP client        | Axios (same-origin `/api` base)                    |
| Charts             | Recharts                                           |
| Validation         | Zod                                                |
| Dates              | date-fns                                           |
| Notifications      | Sonner                                             |

### Backend (`backend/`)

| Concern       | Choice                                          |
| ------------- | ----------------------------------------------- |
| Runtime       | Node.js (ESM) + TypeScript                      |
| Framework     | Express 5                                       |
| Database      | MySQL — `mysql2` connection pool + Drizzle ORM  |
| Auth          | better-auth (email/password, admin + bearer plugins) |
| Validation    | Zod                                             |
| Realtime      | socket.io (attached to the same HTTP server)    |

---

## Project Structure

```
├── .github/workflows/deploy.yml   # CI/CD: build + FTP deploy + restart trigger
├── backend/
│   ├── src/
│   │   ├── core/                   # cross-cutting: db, middleware, audit, socket, origins
│   │   ├── modules/                # feature modules
│   │   │   ├── auth/               # better-auth handler + guards
│   │   │   ├── cms/               # blog, gallery, website settings, company
│   │   │   └── workshop/          # admin workshop module → mounted at /api/workshop
│   │   ├── routes/                 # apiRoutes.ts — shared surfaces (/api/*)
│   │   ├── schema/                 # Drizzle schema (split per domain)
│   │   └── app.ts                 # Express app (CORS, static, SPA fallback)
│   ├── scripts/                   # copy-public.js (build helper), migrate, seed, smoke tests
│   ├── drizzle/                   # generated migrations
│   └── server.ts                  # entry: HTTP server + socket.io + DB check
├── frontend/
│   └── src/
│       ├── modules/workshop/      # admin panel module (routed at /workshop)
│       ├── components/            # shared components (ui, common, public)
│       ├── lib/api.ts             # central axios client
│       └── pages/                 # public storefront + controlpanel
└── markdown/                      # API, GUIDE, STRUCTURE, CMS docs
```

Full tree: [markdown/STRUCTURE.md](markdown/STRUCTURE.md).

---

## Local Development

### 1. Database

Native MySQL on `127.0.0.1:3306` (no container). Create a database and user, put the credentials in `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Migrations run automatically at startup, or apply manually on first run:

```bash
cd backend && npm run db:migrate
```

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # adjust if needed
npm run dev                 # tsx watch on http://localhost:3016
```

Optional: `npm run db:seed` to seed initial data, `npm run db:generate` after schema changes.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # Vite on http://localhost:5173
```

Vite proxies `/api` → `http://localhost:3016` (override target with `VITE_PROXY_TARGET`), so the frontend works with no extra configuration.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable           | Example                     | Purpose                                        |
| ------------------ | --------------------------- | ---------------------------------------------- |
| `DB_HOST`          | `localhost`                 | MySQL host                                     |
| `DB_PORT`          | `3306`                      | MySQL port (cPanel may use a non-standard one) |
| `DB_USER`          | `polarisAdmin`              | MySQL user                                     |
| `DB_PASSWORD`      | `Polaris6432`               | MySQL password                                 |
| `DB_NAME`          | `polaris`                   | Database name                                  |
| `PORT`             | `3016`                      | HTTP port (cPanel Node.js selector assigns it) |
| `BETTER_AUTH_SECRET` | long random string        | Session/token signing secret (required)        |
| `BETTER_AUTH_URL`  | `https://polarisstyle.ir`   | Public URL of the app                          |
| `FRONTEND_URL`     | `https://polarisstyle.ir`   | Trusted origin for CORS / better-auth / socket.io |
| `CORS_ORIGIN`      | —                           | Optional extra allowed origin                  |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Optional Google OAuth        |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | Optional GitHub OAuth        |

### Frontend (`frontend/.env`)

| Variable       | Default | Purpose                                                                 |
| -------------- | ------- | ----------------------------------------------------------------------- |
| `VITE_API_URL` | *(empty)* | Axios base URL. Leave empty: dev uses the Vite proxy, production is same-origin. Set an absolute URL only if the API ever lives on a different origin. |

### GitHub Actions secrets (deployment)

| Secret            | Value                  | Purpose                                  |
| ----------------- | ---------------------- | ---------------------------------------- |
| `FTP_HOST`        | cPanel FTP host        | Upload target                            |
| `FTP_USERNAME`    | FTP user               | Upload target                            |
| `FTP_PASSWORD`    | FTP password           | Upload target                            |
| `FTP_PORT`        | `21`                   | FTP port                                 |
| `BACKEND_PATH`    | `/PolarisStyle/`       | Node.js app root on the server           |
| `FRONTEND_PATH`   | `/PolarisStyle/public/`| Where the Vite build is served from      |
| `RESTART_PATH`    | `/PolarisStyle/tmp/`   | Restart trigger file location            |

---

## Deployment

**Single domain — no API subdomain.** The Express backend serves everything on `https://polarisstyle.ir`:

- `/api/*` — business API + better-auth (`/api/auth/*`)
- `/socket.io/*` — realtime endpoint on the same HTTP server
- everything else — the built frontend from `public/`, with an SPA fallback to `index.html` so React Router deep links work

### Server layout (cPanel)

```
/PolarisStyle/            ← Node.js app root (BACKEND_PATH), entry: server.js
├── server.js             ← compiled backend (from backend/dist)
├── src/                  ← compiled modules
├── package.json          ← copied into dist at build time
├── .env                  ← lives only on the server (never uploaded/deleted)
├── public/               ← FRONTEND_PATH: Vite build, served by Express
└── tmp/                  ← RESTART_PATH: restart trigger file
```

### CI/CD pipeline (`.github/workflows/deploy.yml`)

Triggered on version tags (`v*`):

1. **Build backend** — `npm ci && npm run build` (tsc → `dist/`, copies `package.json` + `public/`)
2. **Upload backend** — FTP sync `backend/dist/` → `/PolarisStyle/`
3. **Build frontend** — `npm ci && npm run build` (Vite)
4. **Upload frontend** — FTP sync `frontend/dist/` → `/PolarisStyle/public/` (replaces the backend's placeholder `public/`)
5. **Restart trigger** — uploads a timestamped `restart.txt` → `/PolarisStyle/tmp/`; cPanel's Node.js selector watches `tmp/` and restarts the app

Order matters: backend first (its sync clears the stale `public/`), frontend second, restart last.

### Health check

`GET /api/health` verifies the **MySQL connection**, not just the Node process:

- `200 {"status":"ok","database":"connected"}` — data can be saved
- `503 {"status":"error","database":"disconnected"}` — DB unreachable

The frontend's connection monitor (`useNetworkStatus`) and the ping test in Settings both use this endpoint, so the UI's online status reflects whether data can actually be persisted.

### cPanel notes

- Node.js Selector: app URL `polarisstyle.ir` (the **whole domain**, not `/api`), app root `/PolarisStyle`, startup file `server.js`, Node ≥ 18 (20+ recommended)
- Run "Run NPM Install" in the Node.js Selector after the first deploy — CI does not upload `node_modules`
- The server `.env` must set `BETTER_AUTH_URL` and `FRONTEND_URL` to `https://polarisstyle.ir`
- The backend boots even if MySQL is unreachable — `/api/health` answers `503 {"database":"disconnected"}` until the pool reconnects. If the process itself won't start, the Node app log in cPanel shows the cause (missing `.env`, missing `BETTER_AUTH_SECRET`, or `node_modules` not installed); startup diagnostics print the resolved DB target and any missing env vars
