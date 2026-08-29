# Polaris CMS Restructuring Prompt

## Role & Objective
You are an expert Node.js architect specializing in cPanel shared hosting deployments and Persian-language (RTL) web applications. Your task is to incrementally restructure the current Polaris codebase into a modular CMS architecture while preserving ALL existing functionality. We are scaffolding and restructuring only—not building all new features at once.

## Environmental Constraints (Strict Adherence Required)
- **Hosting:** Shared cPanel with Node.js App support
- **Deployment:** FTP ONLY — NO SSH ACCESS
- **Local Dev:** Native MySQL installed on Windows default port (3306). NO DOCKER.
- **Production DB:** MySQL via cPanel (matching local version)
- **Frontend:** built version of frontend will be served on public folder of built backend
- **Backend:** Node.js API also serving frontend from its public folder
- **Migrations:** MUST auto-run on app startup (no CLI access on production)
- **Language:** Persian (Farsi) — utf8mb4_unicode_ci, RTL-compatible, Jalali dates at serialization layer only

## OMP Skills Configuration
Use the following skills from `.omp/config.yml` to guide your work:

### Active Skills to Leverage
- `domain-modeling` — Model tailoring domain (fabrics, measurements, patterns) and CMS content types before writing code
- `to-spec` — Write specs for each restructuring phase BEFORE implementation
- `implement` — Execute approved specs incrementally
- `code-review` — Self-review each phase for regressions and cPanel compatibility
- `diagnosing-bugs` — Identify tight couplings and migration risks in current code
- `tdd` — Write tests for preserved tracking logic before refactoring
- `ui-ux-pro-max` — Apply Persian RTL best practices to any new CMS frontend scaffolding
- `frontend-design` — React/Tailwind patterns for the promotional site scaffold
- `handoff` — Document each completed phase clearly for next session
- `brainstorming` — Propose CMS module boundaries that respect existing tracking logic
- `wizard` — Guide complex multi-phase restructuring decisions
- `grill-me` — Challenge assumptions about backward compatibility before proceeding
- `wait-what` — Pause and clarify when current code structure is ambiguous
- `wayfinder` — Navigate and map existing codebase before proposing changes

### Ignored Skills (Do NOT Use)
- `supabase-*` — We use MySQL exclusively
- `vercel-composition-patterns` — Not deploying to Vercel
- `migrate-to-shoehorn` — Not relevant
- `scaffold-exercises` — Production code only
- `setup-*` — Environment already configured
- `writing-*` — Documentation handled separately

## Target Architecture
Restructure toward this modular structure (adapt based on current code analysis):

```
backend/
├── drizzle/                    # ✅ KEEP AS-IS: Existing migrations + auto-run on startup
│   ├── meta/
│   ├── 0000_*.sql → 0005_*.sql
│   └── 0006_cms_scaffold.sql   # ⭐ NEW: Next migration for CMS tables
├── scripts/                    # ✅ KEEP: seed.js, migrate.js, smoke tests
├── src/
│   ├── config/                 # ✅ KEEP: db.ts, drizzle.ts, auth.ts
│   │   └── i18n.ts             # ⭐ NEW: Persian backend messages + Jalali utils
│   ├── core/                   # ⭐ NEW: Extract from current middleware/utils
│   │   ├── middleware/          # ← Move authMiddleware.ts, errorHandler.ts
│   │   ├── utils/              # ← Move apiError.ts, code.ts
│   │   └── types/              # ← Move express.d.ts, index.ts
│   ├── modules/                # ⭐ NEW MODULAR STRUCTURE
│   │   ├── auth/               # ← Refactor authController + authModel + authRoutes
│   │   │   ├── controller.ts
│   │   │   ├── service.ts      # ← Extract auth logic from current controllers
│   │   │   ├── routes.ts
│   │   │   └── schema.ts       # ← Extract from schema/auth.ts
│   │   ├── tracking/           # ⭐ PRESERVE: All seller/hand-seller logic
│   │   │   ├── sellers/        # ← sellersController + related services
│   │   │   ├── consignments/   # ← consignmentsController + HandoverManager logic
│   │   │   ├── orders/         # ← ordersController + ordersService
│   │   │   ├── payments/       # ← paymentsController
│   │   │   ├── inventory/      # ← itemsController + inventoryService
│   │   │   ├── expenses/       # ← expensesController
│   │   │   ├── staff/          # ← staffController
│   │   │   └── dashboard/      # ← dashboardController + auditService
│   │   ├── cms/                # ⭐ NEW SCAFFOLD (interfaces + empty services only)
│   │   │   ├── pages/          # ← Absorb websiteController + publicController
│   │   │   ├── blog/           # ← Refactor blogController + blogService
│   │   │   ├── gallery/        # ← Refactor galleryController + galleryService
│   │   │   ├── settings/       # ← Absorb settingsService + companyController
│   │   │   └── media/          # ⭐ NEW: File upload abstraction for cPanel FTP
│   ├── schema/                 # ✅ KEEP BUT EXTEND: Add CMS + tailoring schemas
│   │   ├── auth.ts
│   │   ├── clientId.ts
│   │   ├── cms.ts              # ⭐ NEW
│   │   ├── tailoring.ts        # ⭐ NEW
│   │   └── index.ts            # Update exports
│   ├── app.ts                  # ✅ KEEP: Update route registration to use modules
│   └── startup.ts              # ✅ KEEP: Add auto-migration trigger here
├── .env.example
├── drizzle.config.ts           # ✅ KEEP: Already configured for MySQL
├── server.ts
└── tsconfig.json

Frontend restructuring comes AFTER backend is stable
```

## Execution Rules
1. **NEVER** suggest SSH, CI/CD, Docker, Supabase, or Vercel deployment strategies
2. **NEVER** change the database engine or suggest PostgreSQL
3. **NEVER** build all CMS features at once — scaffold structure and interfaces only
4. **ALWAYS** use `domain-modeling` before touching code
5. **ALWAYS** use `to-spec` → get approval → `implement` cycle per phase
6. **ALWAYS** validate Persian string handling (utf8mb4, RTL markers, Jalali conversion)
7. **ALWAYS** maintain backward compatibility with existing API consumers
8. **ALWAYS** use `grill-me` before making destructive changes to tracking module
9. **ALWAYS** use `handoff` after completing each phase

## Immediate Next Step
Do NOT start coding. Begin by:
1. Using `wayfinder` to analyze the current folder structure I provide below
2. Using `diagnosing-bugs` to identify coupling risks in existing tracking logic
3. Using `domain-modeling` to propose CMS module boundaries that wrap (not replace) current work
4. Using `to-spec` to draft Phase 1 spec (core infrastructure + migration system)
5. Using `grill-me` to challenge your own plan before presenting it

Present your audit findings and proposed phased plan for my approval before any implementation.

## Current Folder Structure
read [STRUCTURE.md](STRUCTURE.md)

update it with new structure after finishing

i want everything related to the current admin dashboard to be seperated into its own category and under this route /workshop do this seperation on the restructure of backend and frontend you can add your own structure for this specific task and not follow the target structure, everything related to workshop should be seperate except the shared logics and compnents