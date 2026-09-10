# Changelog

All notable changes to **Polaris Style** (polarisstyle.ir) are documented in this file.

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) — newest version first, oldest last. Semver-style tags from the deploy pipeline (`v*` pushes trigger the cPanel FTP deploy). Content is in English (developer document); user-facing strings inside the app are Persian.

## [Unreleased]

### Added
- Backup system for database, website files and combined full archives: `backend/src/modules/backups/` (mysqldump → gzip pipeline, tar archives, base64url file ids, path-traversal guard, retention pruning, cPanel UAPI full-backup trigger), `/api/workshop/backups` routes, `backup_settings` table (migration 0015) and a 15-minute scheduler in `server.ts`.
- Workshop todo list: `workshop_todos` table (migration 0015), `todoService`/`todoController` CRUD + clear-done endpoints, and a color-coded Todo widget on the workshop dashboard (priorities low→urgent with sky/amber/rose/red accents, Persian date picker, progress bar, overdue counter).
- Dashboard layout customization v2: 16-widget registry with per-widget visibility, HTML5 drag-and-drop reorder (plus up/down buttons), column span (1–3) and collapsible state, plus named shareable presets — persisted server-side in `company_settings.dashboardPrefs` (v2 schema with client-side migration from the legacy flat `{widgetId: boolean}` shape via `normalizeLayout`).
- Backup manager UI in workshop settings: run-now actions (database / website / full / cPanel), schedule + retention + Telegram-notify settings, backup file list with Jalali dates, download and delete.
- Telegram relay option: `relayUrl` setting (Cloudflare Worker base-URL relay, takes precedence over `proxyUrl`) in the notifications settings UI and `telegramService`, with setup guide `docs/telegram-relay-guide.md` and worker example `docs/telegram-proxy-worker.js`.
- Audit-log support for the new domains: entity types `todo` and `backup` with icons/labels in `AuditLogsManager` and entity-filter options.

### Changed
- Dashboard clock widget title changed from «ساعت زنده کارگاه» to «ساعت کارگاه».
- Overdue alert banner recolored from amber to rose across header, icon, title, body and item borders.

### Fixed
- Smoke suites `smoke-phase2.mjs` and `smoke-phase3.mjs` now send the required `province` field when placing test orders (schema drift from the checkout CitySelector work); all three suites pass again.

## [v0.5.6] - 2026-09-09

### Added
- Scheduled consignment handovers: `delivery_status` (delivered / pending) and `delivery_date` columns on `consignments` (migrations 0013–0014); stock is reserved on scheduling while seller debt and due-date countdown start only on physical delivery.
- Workshop notification center: in-app notifications table `workshop_notifications` (migrations 0013), `notificationsService` with 20+ event types across consignments/payments/items, and `NotificationsPanel` in the workshop header.
- Dashboard widgets for scheduled deliveries, pending production, top items, latest returns, latest seller income, latest shop sales, liquid balance and income-window stats (14-widget dashboard).
- Telegram/SMS outbound settings per event type in `NotificationsManager` (persisted in `notification_settings`).

### Fixed
- Order-status pipeline corrections and audit-log coverage for the new flows (schema/mapper alignment in migration 0013).

## [v0.5.5] - 2026-09-08

### Added
- Gallery metadata probing (width/height/size/mime from file signature, migration 0012) with `backfill-gallery-meta.mjs` script and `alt`-text editing in the gallery manager.
- Inventory form and item card refinements; sidebar/side-menu updates.

### Fixed
- Trusted-origin handling in `core/origins.ts`.

## [v0.5.41] - 2026-09-08

### Fixed
- Login button not responding (auth form regression from v0.5.4).

## [v0.5.4] - 2026-09-08

### Added
- Major workshop dashboard update: KPI cards, sales/debt chart, top sellers, recent handovers and recent payments widgets with per-widget visibility toggles.
- `.omp/knowledge` agent knowledge base introduced for faster session starts.

### Changed
- Analytics, consignments, inventory, settings and profile pages updated for the new dashboard data.

## [v0.5.3] - 2026-09-07

### Fixed
- Auth problem: `mapAuthError()` substring checks reordered (`invalid email or password` before `invalid email`) so failed logins show the correct Persian message.

## [v0.5.2] - 2026-09-05

### Added
- Workshop system overhaul: staff manager, finances manager, financial reports, entity profile pages, variant-price utilities (migration 0010) and refined consignment/payment/order flows.

### Changed
- Mobile nav, dashboard and analytics rebuilt on the new workshop data layer.

## [v0.5.1] - 2026-09-04

### Fixed
- Migration errors on the production host (journal/snapshot alignment for migrations 0010–0011).

## [v0.5.0] - 2026-09-04

### Added
- Website user profile for customers on the public site.
- Theme management in the website control panel.

## [v0.4.62] - 2026-09-03

### Fixed
- UI bugs in the public/workshop navigation (sheet component, AppLayout, PublicLayout).

## [v0.4.61] - 2026-09-03

### Added
- Shop allocation: `website_quantity` column on `items` (migration 0007) separating website stock from workshop stock, wired through inventory service, public items controller and shop management page.

### Changed
- Quality-of-life pass across workshop UI (header, inventory, control panel) and smoke-phase3 suite.

## [v0.4.6] - 2026-09-03

### Added
- Features for delivering/receiving payments: expanded `NewPaymentModal` (+410 lines) with chained settlement across invoices, plus handover/finances page updates.

### Fixed
- Visual bugs in public layout and mobile nav.

## [v0.4.52] - 2026-09-02

### Changed
- Leftover of the previous commit: `.env.example`, Melipayamak SMS service, router and `NotificationsManager` refinements.

## [v0.4.51] - 2026-08-31

### Fixed
- Removed top-level `await` from `server.ts` (async IIFE) to solve the startup problem on the cPanel host.

## [v0.4.5] - 2026-08-31

### Added
- Revamped workshop navigation (header, mobile nav, side menu) and notification center: outbound Telegram + Melipayamak SMS integration with `notification_settings` table (migration 0006) and per-event delivery.

## [v0.4.41] - 2026-08-30

### Changed
- Updated `seed.js` script (follow-up to v0.4.4).

## [v0.4.4] - 2026-08-30

### Changed
- Updated `seed.js` script.

## [v0.4.3] - 2026-08-30

### Fixed
- Migration errors on the host (drizzle journal alignment, `tmp-inspect-out.txt` diagnosis; `repair-migrations.mjs` workflow).

## [v0.4.2] - 2026-08-30

### Removed
- Phase 5 cleanup: legacy `/api/workshop` alias removed (API mounted only at `/api/workshop`), smoke suites retargeted with 404 assertions on legacy paths; dead files deleted (docker-compose, App.css, layout/Footer, temp/, companyApi) and unused dependencies dropped (axios backend; socket.io-client, vite-plugin-pwa frontend).

### Added
- Phase 3: CMS + auth backend modules with schema split into domain files.
- Phase 2: workshop module (`modules/workshop`) with `/api/workshop` mount.
- Phase 1: shared kernel (`src/core`), centralized origins, startup auto-migration.
- Phase 4: frontend workshop module split.
- Bounded migration retry loop (3 attempts, 5s backoff) and `ADMIN_EMAIL`/`ADMIN_PASSWORD` seed vars documented in `.env.example`.

## [v0.4.1] - 2026-08-28

### Changed
- Updated login flow and roles (87 files: auth pages, role guards, use-controllable-state hook).

## [v0.4.0] - 2026-08-28

### Added
- Frontend landing page design (new public pages).
- Website settings in the admin panel + Google OAuth + home page.

### Fixed
- Sign-in/login bugs; interim cleanups.

## [v0.3.7] - 2026-08-26

### Fixed
- UTF-8 charset declaration in the HTML head.

## [v0.3.6] - 2026-08-26

### Added
- Theme switcher, gallery, and image handling fixes (migration 0002, imageFile utility, vite config).

## [v0.3.5] - 2026-08-25

### Changed
- Major QoL improvements across backend controllers (consignments, expenses, items, sellers, staff) and routes.

## [v0.3.4] - 2026-08-24

### Fixed
- Page title and removal of the mobile nav glass effect.

## [v0.3.3] - 2026-08-24

### Fixed
- `dist` added to `.gitignore` (after accidental commit and cleanup of useless env files).

## [v0.3.2] - 2026-08-24

### Changed
- Updated GitHub Action.

## [v0.3.1] - 2026-08-24

### Fixed
- Write permission added to the release Action.

## [v0.3.0] - 2026-08-24

### Added
- Extra READMEs/API/GUIDE docs for information.

## [v0.2.7] - 2026-08-24

### Added
- Deployment scripts fixed + `.env.example` added.

## [v0.2.6] - 2026-08-24

### Changed
- Backend and frontend connected on the same domain (no API subdomain).

## [v0.2.5] - 2026-08-24

### Changed
- Deploy Action updated for single-node deployment; production API base address fallback.

## [v0.2.4] - 2026-08-24

### Fixed
- Backend type problems that prevented build (follow-up to v0.2.3).

## [v0.2.3] - 2026-08-24

### Fixed
- Backend type problems that prevented build.

## [v0.2.2] - 2026-08-24

### Changed
- Brought back the old deploy Action.

## [v0.2.1] - 2026-08-24

### Changed
- Connection Guardian restyled; mobile table/filter-tag layout fixes; Persian Labs dropdowns.

## [v0.2.0] - 2026-08-23

### Fixed
- Mistake in `AGENTS.md`.

## [v0.1.7] - 2026-08-20

### Fixed
- Auth fix (better-auth configuration).

## [v0.1.6] - 2026-08-19

### Added
- Public statics to the backend build.

## [v0.1.5] - 2026-08-19

### Changed
- Backend port and CORS settings (follow-up to v0.1.4).

## [v0.1.4] - 2026-08-19

### Changed
- Backend port and CORS settings.

## [v0.1.3] - 2026-08-19

### Added
- Build Action for the backend.

## [v0.1.2] - 2026-08-19

### Changed
- Updated Action.

## [v0.1.1] - 2026-08-19

### Added
- Installed packages for frontend & backend.

## [v0.1.0] - 2026-08-19

### Changed
- Deploy changes (deploy.yml workflow, `.env.example` placeholder).

## [v0.0.7] - 2026-08-19

### Changed
- Build updated to contain `package.json` (copy-public script).

[Unreleased]: https://github.com/MRez321/Polaris/compare/v0.5.6...HEAD
[v0.5.6]: https://github.com/MRez321/Polaris/compare/v0.5.5...v0.5.6
[v0.5.5]: https://github.com/MRez321/Polaris/compare/v0.5.41...v0.5.5
[v0.5.41]: https://github.com/MRez321/Polaris/compare/v0.5.4...v0.5.41
[v0.5.4]: https://github.com/MRez321/Polaris/compare/v0.5.3...v0.5.4
[v0.5.3]: https://github.com/MRez321/Polaris/compare/v0.5.2...v0.5.3
[v0.5.2]: https://github.com/MRez321/Polaris/compare/v0.5.1...v0.5.2
[v0.5.1]: https://github.com/MRez321/Polaris/compare/v0.5.0...v0.5.1
[v0.5.0]: https://github.com/MRez321/Polaris/compare/v0.4.62...v0.5.0
[v0.4.62]: https://github.com/MRez321/Polaris/compare/v0.4.61...v0.4.62
[v0.4.61]: https://github.com/MRez321/Polaris/compare/v0.4.6...v0.4.61
[v0.4.6]: https://github.com/MRez321/Polaris/compare/v0.4.52...v0.4.6
[v0.4.52]: https://github.com/MRez321/Polaris/compare/v0.4.51...v0.4.52
[v0.4.51]: https://github.com/MRez321/Polaris/compare/v0.4.5...v0.4.51
[v0.4.5]: https://github.com/MRez321/Polaris/compare/v0.4.41...v0.4.5
[v0.4.41]: https://github.com/MRez321/Polaris/compare/v0.4.4...v0.4.41
[v0.4.4]: https://github.com/MRez321/Polaris/compare/v0.4.3...v0.4.4
[v0.4.3]: https://github.com/MRez321/Polaris/compare/v0.4.2...v0.4.3
[v0.4.2]: https://github.com/MRez321/Polaris/compare/v0.4.1...v0.4.2
[v0.4.1]: https://github.com/MRez321/Polaris/compare/v0.4.0...v0.4.1
[v0.4.0]: https://github.com/MRez321/Polaris/compare/v0.3.7...v0.4.0
[v0.3.7]: https://github.com/MRez321/Polaris/compare/v0.3.6...v0.3.7
[v0.3.6]: https://github.com/MRez321/Polaris/compare/v0.3.5...v0.3.6
[v0.3.5]: https://github.com/MRez321/Polaris/compare/v0.3.4...v0.3.5
[v0.3.4]: https://github.com/MRez321/Polaris/compare/v0.3.3...v0.3.4
[v0.3.3]: https://github.com/MRez321/Polaris/compare/v0.3.2...v0.3.3
[v0.3.2]: https://github.com/MRez321/Polaris/compare/v0.3.1...v0.3.2
[v0.3.1]: https://github.com/MRez321/Polaris/compare/v0.3.0...v0.3.1
[v0.3.0]: https://github.com/MRez321/Polaris/compare/v0.2.7...v0.3.0
[v0.2.7]: https://github.com/MRez321/Polaris/compare/v0.2.6...v0.2.7
[v0.2.6]: https://github.com/MRez321/Polaris/compare/v0.2.5...v0.2.6
[v0.2.5]: https://github.com/MRez321/Polaris/compare/v0.2.4...v0.2.5
[v0.2.4]: https://github.com/MRez321/Polaris/compare/v0.2.3...v0.2.4
[v0.2.3]: https://github.com/MRez321/Polaris/compare/v0.2.2...v0.2.3
[v0.2.2]: https://github.com/MRez321/Polaris/compare/v0.2.1...v0.2.2
[v0.2.1]: https://github.com/MRez321/Polaris/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/MRez321/Polaris/compare/v0.1.7...v0.2.0
[v0.1.7]: https://github.com/MRez321/Polaris/compare/v0.1.6...v0.1.7
[v0.1.6]: https://github.com/MRez321/Polaris/compare/v0.1.5...v0.1.6
[v0.1.5]: https://github.com/MRez321/Polaris/compare/v0.1.4...v0.1.5
[v0.1.4]: https://github.com/MRez321/Polaris/compare/v0.1.3...v0.1.4
[v0.1.3]: https://github.com/MRez321/Polaris/compare/v0.1.2...v0.1.3
[v0.1.2]: https://github.com/MRez321/Polaris/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/MRez321/Polaris/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/MRez321/Polaris/compare/v0.0.7...v0.1.0
[v0.0.7]: https://github.com/MRez321/Polaris/compare/v0.0.1...v0.0.7
