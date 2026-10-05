# AGENTS.md — Polaris agent boot contract

You are working on **Polaris** (polarisstyle.ir): Persian (fa-IR) clothing app — Express 5 + Drizzle + MySQL backend (`backend/`, port 3016), React 19 + Vite frontend (`frontend/`, port 5173), better-auth. Follow this file top-to-bottom every session. No shortcuts.

## 1. Orient (in this order)

1. **Project map** — read `graphify-out/GRAPH_REPORT.md` (communities, god nodes, surprising connections). Query specifics via `graphify-out/graph.json` (`/graphify query`, `/graphify path`, `/graphify explain`). If the report is missing or older than the latest commit, run `/graphify --update` first (needs the graphify skill + Python; resume state lives in `graphify-out/`).
2. **Current state** — read `.omp/knowledge/START-HERE.md`, then the topic file you need (`AUTH`, `BACKEND`, `DATABASE`, `DOMAIN`, `FRONTEND`, `PUBLIC-SITE`, `DEPLOY`, `DEBUG-PLAYBOOK`). This is ground truth; the graph is structure, knowledge is state.
3. **Skill routing** — before any task, check available skills and read the matching one first (`skill://<name>`): bug diagnosis → `diagnosing-bugs`, test-first work → `tdd`, code review → `code-review`, UI build/redesign → `frontend-design` + `ui-ux-pro-max`, architecture questions → `graphify`, creative/feature work → `brainstorming`, React perf → `vercel-react-best-practices`.

## 2. UI components

Before building or modifying any UI component, check the Persian Labs component index first: `https://ui.persian-labs.ir/llms.txt`. Reuse an existing component; do not hand-roll a second variant. Persian copy, RTL, ZWNJ (`U+200C`) in display strings — verify ZWNJ by codepoint probe, never by eye. ASCII digits in API + DB.

## 3. Stack facts

- Backend: Express 5, Drizzle ORM, MySQL (`polaris` DB), better-auth 1.7 (admin + bearer plugins), Zod at every API boundary, error shape `{ error: string }`, English code comments, `.js` import extensions (ESM).
- Frontend: React 19 + Vite + Tailwind, React Router. Unified management surface at `/console/*` (`ConsoleLayout` + `RequirePermission`); legacy `/workshop*` and `/controlpanel*` redirect client-side. Permissions matrix: `frontend/src/lib/permissions.ts` (admin=all, author=`blog.manage`, staff=view subset).
- No test infra — typecheck + build + service scripts are the checks:
  - Frontend: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`, then `npm run build`.
  - Backend: `cd backend && npx tsc --noEmit --pretty false`.
  - P0-B acceptance: `cd backend && npx tsx scripts/test-acceptance.mts` (expect 57/57); migration: `node scripts/verify-migration.mjs` (expect 11/11).
- Dev DB from `backend/`: `mysql2/promise` one-liners with mandatory `.catch` (see `.omp/knowledge` for the recipe). Local admin: `admin@polarisstyle.ir` / `PolarisAdmin123!`; author: `author@test.ir` / `Author123!`.

## 4. Hard rules

- Correctness first, then six-month maintainability. Boring design over abstraction. Never `any`/`as any`; `noUncheckedIndexedAccess` is on.
- NEVER edit applied migrations. NEVER commit `.gitignore` (user-modified — always exclude it from commits).
- Prod-facing scripts are pure `mysql2` — no better-auth/drizzle imports (wasm OOM on cPanel).
- User-reported errors are ground truth; never re-run checks just to confirm them. Unexpected repo changes are the user's — adapt.
- UI changes MUST be verified in a real browser before delivery. Non-trivial work never yields without a smoke run.

## 5. Definition of done (per part)

Each finished part ships as ONE detailed commit (message: what + why + verification evidence). Before committing a part:

1. **Verify** — run the checks from §3 that cover your change (typecheck/build/test script), plus a browser check for UI. Tests alone are not proof.
2. **Knowledge** — update `.omp/knowledge/` files your change stale-dated (routes, guards, schema, endpoints, conventions).
3. **Docs** — write detailed, categorized docs under `docs/` (e.g. `docs/<area>/<topic>.md`); link them from the relevant knowledge file. No orphan docs.
4. **Commit** — `git status` review, detailed message, exclude `.gitignore` and any tmp/scaffold files.

## 6. Final job (when todos complete)

After the last todo is done and before yielding, always: refresh `.omp/knowledge`, finish `docs/`, refresh the graph (`/graphify --update` so `GRAPH_REPORT.md`/`graph.json` match HEAD), then make the delivery commit. A task is not done until knowledge + docs + graph all describe the new HEAD.
