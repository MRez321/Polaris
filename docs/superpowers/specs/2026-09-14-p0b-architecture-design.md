# P0-B — Architecture & Data-Model Restructure — Design Spec

- Status: APPROVED design (in-chat section-by-section review 2026-09-14) — pending user spec review
- Classification: architectural (schema + service layer restructure + route unification)
- Scope: spec items **1, 2, 11, 12, 13, 26, 27, 28, 37** of `temp/p0b.txt`. Sibling briefs P0-C/P0-D/P0-E/P0-F exist; this spec builds the foundation they extend.
- Base: `main` @ 7547ec2. Live dev DB verified identical to `drizzle/meta/0016_snapshot.json` (27 tables).

## Problem

1. **Wrong domain model.** A bespoke tailoring-production model (`items.productionStatus`, handover/consignment flows) is hardwired through inventory, debts, and dashboards, while the real business is buy → stock → sell through shop/sellers/website. Financial state (`sellers.currentDebt`, `consignments.paidAmount/remainingAmount`) is manually written per code path — no transaction history a balance can be derived from.
2. **Direct stock-column mutations.** Eight confirmed sites write `items.stockQuantity` / `items.websiteQuantity` directly; stock is a column, not a ledger. No exact-location tracking, no atomic transfers, no audit trail of movement.
3. **Weak audit.** `audit_logs` lacks `entity_id`, `before`, `after`, `user_agent`, `metadata`; ~65 ad-hoc `logAudit` call sites pass inconsistent entity labels (e.g. orders logged as `'settings'`).
4. **Split admin surfaces.** `/workshop` (admin) and `/controlpanel` (admin+author) are two route trees, two layouts, two nav systems, gated by role membership (`isAdmin`, `isWebsiteStaff`) rather than permissions.
5. **Migration hygiene.** 0000–0004 journal hashes mismatch their files (post-application edits, harmless), and `__drizzle_migrations` row 18 is a phantom (hash matches no file, created 2026-09-14T00:51Z). Verified against drizzle's `migrate()` implementation (high-water-mark on `created_at` only): both are inert. Live schema == main snapshot, `npm run db:migrate` applies cleanly, row 18 must NOT be deleted.

## Goals

- Business model becomes `Supplier → Purchase → Receiving → Warehouse/Location → Inventory → Order → Payment/Settlement`; Production exits the core flow (data preserved, no workflow depends on it).
- SKU is the single reference for purchase/inventory/order lines; Product/Variant carry no stock.
- `InventoryLedger` is the source of truth; every stock mutation is a DB transaction that appends a ledger entry with reference + actor. Legacy stock columns become derived caches written only by the ledger service.
- All financial flows go through `FinancialTransaction`; balances derivable from rows; no manual balance source of truth.
- Audit log records actor/action/entity/before/after/ip/user-agent/metadata for every sensitive operation, secrets stripped.
- Critical entities soft-delete (archive) with restore; ledger/financial/audit/operational-order rows are never hard-deleted.
- Single-versioned-migration discipline: applied migrations immutable, seeds separate + idempotent, deploy = Backup → validation → migrate → deploy → verify.
- One admin surface: `/console`, access by permission, `/workshop` + `/controlpanel` redirect there.

## Non-Goals

- P0-C scope: supplier management, purchase orders, landed cost, receiving workflows. P0-B creates the tables + minimal service seams only.
- P0-D scope: unified sales (channel management UX, customer workflows, seller-sale capture, website-checkout cutover to `sales_orders`). P0-B creates tables + a minimal order service used by tests; legacy `orders` stays the live website order store.
- P0-E scope: management dashboards/UX revamp. `getDashboardStats` keeps its current shape, re-pointed at ledger/financial caches.
- P0-F scope: cleanup items 36/38.
- Rebuilding 28 legacy orders or 87 consignment line-items into the new tables — the backfill covers products/SKUs/opening stock/opening debt; per-line sales history migration belongs to P0-D.
- New frontend component library adoption (Persian Labs UI reviewed; existing stack suffices — no new components needed for P0-B).

## Decision Record

| Decision | Choice | Rationale |
|---|---|---|
| Legacy data strategy | New-schema-primary + backfill + convert all write paths | Live shop keeps running without drift; item 12 (block direct stock writes) fully satisfied within P0-B; chosen in design review (Option 1). |
| Legacy tables | Kept, read-compatible, deprecated — never dropped | 69/87/48/28/49/50 live rows; spec forbids destroying data; P0-C/D retire workflows then P0-F cleans up. |
| Website orders in P0-B | Ledger interception + new minimal order service | Legacy `orders` keeps being written (UI untouched) while its stock effect moves to ledger rows referencing the legacy order id; `sales_orders` service exists for tests and P0-D. No dual-write. |
| Warehouse topology | 1 warehouse «کارگاه», locations «رف انبار» + «ویترین فروشگاه» | Matches one physical site; website pool becomes a location not a column split. Custody locations per seller track consigned goods. |
| Open debt modeling | Opening `PAYABLE` rows per seller (189,075,000 تومان across 49) + counterparty references to legacy consignments | Balances derivable; legacy debt columns become caches. |
| Seller entity | Keep existing `sellers` table (add `deleted_by`) | 49 live rows + full workflow coupling; new `suppliers`/`customers` tables are the new-model entities. |
| Order/financial table names | `sales_orders`, `sales_order_lines`, `sales_payments`, `settlements` — P0-D's names | Avoids a rename when P0-D lands. |
| Test vehicle | Service-level Node scripts against live dev DB | No test infra in repo; matches smoke-script conventions; exercises the exact production code paths. |
| Phantom journal row 18 | Leave untouched | Drizzle migrator reads only the newest row's `created_at` as high-water mark; deleting rows is riskier than ignoring it. |
| Migration packaging | 0017 tables+audit columns / 0018 FKs / 0019 indexes | Each migration one logical change; 0017 testable pure-schema on a clean DB. |
| Category «مانتو» row | Map to `women_clothing` during backfill, reported | Label mismatch only (one row); backfill log lists every non-id category value. |
| Persian Labs UI | Reviewed (llms.txt); no adoption in P0-B | /console reuses existing nav/layout components; registry components are a P0-E concern. |

## Domain Model (17 new tables)

All migrations additive; applied migrations untouched. Money columns `bigint` (toman), same convention as legacy. Actors are FKs to `users.id` (better-auth).

### Catalog (item 11)

```
products            (id, name, category_id?, description?, status, deleted_at, deleted_by, …)
product_variants    (id, product_id FK, attributes JSON {color?, size?}, deleted_at, deleted_by)
skus                (id, product_variant_id FK, code UNIQUE, barcode UNIQUE?, name?,
                     cost_price?, sale_price?, min_stock_threshold?,
                     deleted_at, deleted_by)
```

- No stock column anywhere in the catalog chain. Inventory is queried as `Σ inventory_ledger(sku_id)`.
- Backfill: each legacy item → 1 Product + 1 Variant + one SKU per size/color combination (66/69 items have sizes+colors arrays); items without variants get a single size-less SKU. `variant_prices` (1 user) merges into SKU sale prices.
- SKU generation: `{itemCode}-{size|'STD'}-{color|'STD'}` with collision suffix; deterministic for idempotent backfill.

### Parties

```
suppliers           (id, code?, name, phone?, note?, deleted_at, deleted_by)   — minimal, P0-C extends
customers           (id, code?, full_name, phone?, address?, deleted_at, deleted_by) — minimal, P0-D extends
```

`sellers` (existing) gains only `deleted_by`. Legacy `staff` and `users` untouched.

### Physical (item 13)

```
warehouses         (id, code?, name, deleted_at, deleted_by)
locations          (id, warehouse_id FK, code?, name, deleted_at, deleted_by)
```

- `warehouses.code` UNIQUE; `locations (warehouse_id, code)` UNIQUE.
- Seed: warehouse «کارگاه» with «رف انبار» (default, 1,099 units) and «ویترین فروشگاه» (10 units — today's website pool); plus warehouse «نزد دست‌فروشان» with one location per active seller (custody tracking for handovers). The receiving target for P0-C purchases is «رف انبار» by seed convention (no default-location column — avoids a circular FK warehouses↔locations).

### Channel

```
sales_channels     (id, code UNIQUE, name, type, is_active)   — P0-D names/types
```

Seed: `website`, `consignment` (idempotent INSERT IGNORE, deterministic ids 1/2).

### Purchasing (P0-C workflows, P0-B tables)

```
purchases          (id, code?, supplier_id FK, status draft|confirmed|received|cancelled,
                    total_amount, note?, actor_id, created_at, …)
purchase_items     (id, purchase_id FK, sku_id FK, quantity, unit_cost, received_quantity)
```

### Sales (P0-D workflows, P0-B tables + minimal service)

```
sales_orders       (id, code?, channel_id FK, customer_id?, status draft|confirmed|paid|shipped|delivered|cancelled,
                    total_amount, note?, actor_id, created_at, …)
sales_order_lines  (id, sales_order_id FK, sku_id FK, quantity, unit_price, line_total)
sales_payments     (id, sales_order_id FK, amount, method?, paid_at, actor_id, …)
```

### Finance (item 26)

```
financial_transactions (id, txn_type INCOME|EXPENSE|RECEIVABLE|PAYABLE|PAYMENT|REFUND|SETTLEMENT,
                        direction +/-, amount, counterparty_type, counterparty_id?,
                        reference_type, reference_id?, description?, actor_id, occurred_at, created_at)
settlements        (id, counterparty_type, counterparty_id, amount, note?, actor_id, created_at)
```

- Legacy `payments`, `expenses` remain as-is (workflow source until P0-C/D); backfill also writes PAYMENT/EXPENSE rows referencing legacy ids so balances have history.

### Inventory (item 12)

```
inventory_ledger   (id, sku_id FK, location_id FK, movement_type, quantity_delta,
                    unit_cost?, reference_type, reference_id, reason?, actor_id, created_at)
sku_locations      (sku_id, location_id, quantity)   — composite PK, derived cache
```

Movement types: `PURCHASE_RECEIPT, SALE, RETURN_IN, RETURN_OUT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT` (mysql enum; additions append-only).

### Audit (item 27) — enrich existing table

```
ALTER audit_logs ADD:
  entity_type VARCHAR(64) NOT NULL DEFAULT '',
  entity_id VARCHAR(64) NULL,
  before_json JSON NULL, after_json JSON NULL,
  user_agent VARCHAR(255) NULL, metadata JSON NULL
```

`entity` (old column) data-migrated into `entity_type` in 0017; old rows untouched otherwise. Column `entity` is kept (NOT dropped) — dropping would rewrite history; new code writes both during transition, then P0-F removes it.

### Soft delete (item 28)

New tables: `deleted_at + deleted_by` columns. Legacy soft-deleting tables get `deleted_by` added (values backfilled `NULL` for existing rows — pre-existing deletes have no actor, which is honest). Hard delete stays forbidden for: `inventory_ledger`, `financial_transactions`, `audit_logs`, non-cancelled operational orders (`orders`, `sales_orders`), legacy `payments`, and any table reached through the trash API's permanent-delete map after conversion (item/seller/staff/expense/consignment rows that now anchor ledger/financial references lose access — their permanent delete converts to archive).

## Ledger Service

New `backend/src/core/services/inventoryLedgerService.ts` (independent of module-specific workflows):

```ts
type MovementInput = {
  skuId: string; locationId: string; movementType: MovementType;
  quantityDelta: number;         // signed; sign validated against type
  referenceType: string; referenceId: string; reason?: string;
  unitCost?: number; actorId: string;
};
export async function recordMovements(tx: DbTx, moves: MovementInput[]): Promise<void>
```

- Single entry point; appends rows + updates `sku_locations` cache in the same caller-supplied transaction. Every legacy stock-column write (the `items.stockQuantity`/`websiteQuantity` caches) is updated here, or by a thin module adapter that wraps `recordMovements` — the ONLY code allowed to touch those columns.
- `FOR UPDATE` row lock on `sku_locations` rows (oversell guard preserved from current handover flow).
- Transfers: `TRANSFER_OUT` + `TRANSFER_IN` pair, same DB transaction — atomic by construction.
- Ledger rows are append-only. No service function updates or deletes them; the reversal pattern (`ADJUSTMENT_*` with reason + reference) is the only correction mechanism. No DB trigger added (verified acceptable: the single service seam plus the final grep sweep is the enforcement; triggers would break the drizzle transaction flow with the legacy cache update).

### The eight conversion sites

| # | Site | Becomes |
|---|---|---|
| 1 | `inventoryService.createHandover` L319 (stock −= qty) | `TRANSFER_OUT` رف انبار → `TRANSFER_IN` seller custody location; pair atomic; debt unchanged until `markDelivered` |
| 2 | `inventoryService.setShopAllocation` L136 (stock↔website swap) | `TRANSFER_OUT`/`TRANSFER_IN` pair رف انبار ↔ ویترین per allocation delta |
| 3 | `inventoryService.softDeleteConsignment` L399/405 | reverse #1's pair (goods return) + financial re-open of debt |
| 3a | `inventoryService.restoreEntity` (re-applies debt) | `RECEIVABLE`/`PAYABLE` re-open via financial service |
| 4 | `inventoryService.submitReturn` L543 (healthy += qty) | healthy → `TRANSFER_IN` from custody to رف انبار; damaged → `ADJUSTMENT_OUT` at custody |
| 5 | `damageService.fixDamageRecord` L105-137 (restock) | `ADJUSTMENT_IN` with reference to damage record |
| 6 | `itemsController.createItem` (stockQuantity direct) | item creation + `ADJUSTMENT_IN` opening stock through ledger service |
| 7 | `ordersService.createOrder` L91 (websiteQuantity −=) | `SALE` at ویترین referencing legacy order id |
| 8 | `ordersService.updateOrderStatus` L186-203 (cancel/uncancel) | cancel → `RETURN_IN` at ویترین; uncancel → `SALE` re-post (guarded by status transition) |

Each conversion keeps its current user-facing behavior (same Persian errors, same guards) — only the stock mechanism changes.

## Financial Service

New `backend/src/core/services/financialService.ts`:

```ts
export async function recordTransaction(tx, { txnType, direction, amount, counterparty: {type,id}, reference, description, actorId }): Promise<void>
export async function settleDebt(tx, { sellerId, amount, allocations, actorId }): Promise<void>  // used by createPayment
export async function getSellerBalance(sellerId): Promise<number>  // Σ PAYABLE − Σ PAYMENT (+ REFUND/SETTLEMENT)
```

- `createPayment` (inventoryService L641-736): FIFO allocation logic preserved verbatim, but each allocation writes `PAYMENT` + `SETTLEMENT` financial rows (counterparty=seller, reference=legacy payment id) instead of mutating `sellers.currentDebt/totalPaid` + `consignments.paidAmount/remainingAmount/status` directly. Those legacy columns become caches the financial service maintains inside the same transaction (so legacy UI keeps reading them unchanged).
- `markDelivered` (L433-471): debt application becomes a `PAYABLE` row (counterparty=seller, reference=consignment id) instead of the direct `currentDebt +=` update; cache maintained alongside.
- `submitReturn` debt reduction: `PAYABLE` row with negative direction (reduces the liability) referencing the return id — one mechanism, no REFUND alternative.
- New expense/income capture goes through `recordTransaction` (EXPENSE/INCOME rows); legacy `expenses` table keeps its workflow until P0-E.
- Balances are ALWAYS derived: `getSellerBalance` = sum of rows; legacy cache columns are display conveniences whose drift the verify script checks (Σ cache == Σ ledger — part of migration verification + acceptance script).

## Audit Service

`core/services/auditService.ts` gains `recordAudit` (keeping `logAudit` as a thin wrapper so the ~65 call sites migrate incrementally — all converted in this part):

```ts
recordAudit({ actor, action, entityType, entityId?, before?, after?, metadata?, ip?, userAgent? })
```

- Zod schema validates + strips secrets from before/after/metadata (keys: `password, token, secret, authorization, cookie, twoFactor` values; deep).
- Mandatory coverage: every create/update/archive/restore/delete, price change, ledger write, financial write, order status change, payment/settlement, RBAC/permission changes. The service-layer conversions above call `recordAudit` inside their transactions.
- Existing `ipAddress` column reused; `user_agent` extracted from request headers at controller layer via a small helper.
- Restore operations are logged (action `restore`, before=archived state, after=live state).

## Archive & Trash

- `trashTables` permanent-delete map: entries whose entity now anchors ledger/financial references (item, seller, consignment) get permanent delete converted to archive + a clear Persian message; staff/expense keep permanent delete (no financial anchoring) unless referenced.
- `restoreEntity` debt re-application logic moves into the financial service (see 3a above).
- Hard-delete forbidden list (item 28) enforced by never exposing delete paths for those tables + the final sweep verifying no `DELETE FROM` on them outside tests/scripts.

## Migration Plan (item 37)

Journal integrity resolved: live schema == main 0016 snapshot (verified column-level, 27 tables); phantom row 18 inert (drizzle high-water-mark semantics, verified in `drizzle-orm/mysql-core/dialect.js`); rows 1–17 hashes trusted as-is. **No journal repair. New migrations start at 0017. Applied files immutable.**

| Migration | Content |
|---|---|
| 0017 | 17 new tables (PKs and uniques included; no cross-table FKs to legacy), `audit_logs` new columns + entity→entity_type data copy, `deleted_by` on legacy soft-delete tables |
| 0018 | FKs within new tables + actor FKs to `users` |
| 0019 | Indexes: ledger (sku_id, location_id), (reference_type, reference_id); financial (counterparty_type, counterparty_id), (txn_type, occurred_at); audit (entity_type, entity_id, created_at) |

- Generated via `cd backend && npm run db:generate` after schema edits (drizzle-kit), then hand-ordered/verified one logical change per file. `scripts/migrate.js` (cPanel runner) unchanged.
- Deploy order (spec L446-452): **Backup → Migration validation (run migrator against a restored backup copy of prod) → Migration → Application deploy → Verification** (`scripts/verify-migration.mjs`: schema diff vs expected + cache==Σledger integrity asserts).
- Seed separation: `scripts/backfill-new-model.mjs` (idempotent, deterministic ids, `INSERT IGNORE`/`ON DUPLICATE KEY UPDATE`, pure mysql2 — same pattern as `seed-workshop.js`). All new-table seeds (warehouses/locations/channels) live there, NOT in migrations.

### Backfill (runs once on dev; production runs it after migration)

1. Warehouses + locations + channels (website, consignment) + per-seller custody locations.
2. 69 items → products/variants/SKUs (per size/color; single SKU when none); category `«مانتو»` → `women_clothing` (logged); deterministic sku codes.
3. Opening stock: 1,099 units → `ADJUSTMENT_IN` at رف انبار; 10 units → `ADJUSTMENT_IN` at ویترین. `reason='افتتاح حساب موجودی'`, actor=admin, reference=`backfill`.
4. Opening seller debt: per-seller `PAYABLE` rows (total 189,075,000 تومان, 49 sellers) with legacy consignment breakdown in metadata.
5. Legacy payments (48) → `PAYMENT` rows; expenses (50) → `EXPENSE` rows; both reference legacy ids.
6. Cache reconciliation assert: `items.stockQuantity == Σ ledger(رف انبار)` per item, `websiteQuantity == Σ ledger(ویترین)`, `sellers.currentDebt == Σ PAYABLE − Σ PAYMENT` per seller — script fails on mismatch.

## /console Unification

- **Permissions** extend P0-A's `backend/src/modules/auth/permissions.ts` PERMISSIONS: `inventory.view/manage`, `orders.view/manage`, `consignments.view/manage`, `finances.view/manage`, `people.view/manage`, `settings.manage`, `blog.manage` (exists), `website.manage`, `analytics.view`, `reports.view`.
- **Roles**: admin = all; author = `blog.manage` only (today's controlpanel access); user = none; staff = view-level subset (final composition P0-C/D, seeded admin-only initially).
- **Routes**: `/console/*` mirrors current workshop pages (Dashboard, Orders, Inventory, Consignments, People, Returns, Analytics, Finances, Settings) + the 4 controlpanel pages under `/console/website/*` (theme, website, shop, blog). Index redirect: admin → `/console` dashboard; author → `/console/website/blog`.
- **Redirects**: `/workshop` and `/controlpanel` (and all subpaths) redirect to their /console equivalents via client-side `<Navigate replace>` (SPA — no server-side redirects; external links keep working).
- **Layouts**: `AppLayout` + `ControlPanelLayout` merge into one `ConsoleLayout` (AppLayout as base — same header/glass sidebar structure; blog pages keep their own page components).
- **Nav gating**: sidebar filter becomes permission-based (each nav item declares required permission; items hidden without it) — replaces `isAdmin || item.to === '/workshop'`.
- **Backend**: `/api/workshop` chain stays role=admin today (no API break); permission-level API gating arrives with P0-C/D services. `/api/blog*` unchanged (`blog.manage`).
- Production deprecation rides along: `productionStatus` badge/counter removal from sidebar + `mark-ready` endpoint retired (POST `/api/workshop/items/:id/mark-ready` → 410 with deprecation message). All 69 rows are already `'ready'` — zero data impact.

## Testing

`backend/scripts/test-acceptance.mjs` (+ `verify-migration.mjs`), service-level against live dev MySQL (user's chosen vehicle):

1. Create test SKU (+ `ADJUSTMENT_IN` opening 100 units at رف انبار) — asserts cache==Σledger.
2. Purchase draft → confirm → receiving — asserts stock + qty received, `PURCHASE_RECEIPT` rows exist with reference.
3. Transfer رف انبار → ویترین — atomic pair assert (both rows or neither).
4. `SALE` 2 units from ویترین — cache==Σledger at both locations.
5. Seller payment + settlement — debt cache == Σ PAYABLE − Σ PAYMENT.
6. Handover → TRANSFER_OUT/IN pair; order cancel → RETURN_IN; restore → audit rows present.
7. Cleanup: inverse `ADJUSTMENT_OUT` rows + logical delete of test entities (ledger rows for test SKUs stay — append-only history; test rows carry `referenceType='acceptance-test'` so they are identifiable and excludable from reports).

Invariant asserts after every step: cache==Σledger, debt cache==Σfinancial, every movement has reference+actor, every sensitive action audited. Runs via `node scripts/test-acceptance.mjs` (backend dev DB).

## Acceptance Sweep (24 steps / final criteria)

Post-implementation sweep, grep + review, reported in this spec's implementation notes:
old-model references, direct stock updates (`items.stockQuantity` writes outside ledger service), hard deletes on critical data, contradictory migrations, untraceable financial fields. Target: zero findings or explicit deprecation notes.

24-step order from `temp/p0b.txt` L465-489 maps 1:1 to the implementation plan phases (audit 1-2 done; design 3-4 = this spec; steps 5-24 executed in the plan).

## Implementation Notes (2026-10-04)

### /console unification — built as specified (L245-254)
- `backend/src/modules/auth/permissions.ts`: `PERMISSIONS` + `ROLE_PERMISSIONS` (admin=all, author=`blog.manage`, staff=view subset of inventory/consignments/orders/people/returns/analytics/reports); `/api/workshop` stays `requireRole('admin')`, `/api/blog*` unchanged.
- `frontend/src/lib/permissions.ts` mirrors the matrix + `CONSOLE_ACCESS = ['admin','author','staff']`; `useAuth().hasPermission()` is the single client gate.
- `/console/*` mirrors workshop pages (Dashboard, Orders, Inventory, Consignments, People incl. `people/staff`, Returns, Analytics, Finances incl. `finances/workshop|payments|costs` + `finances/reports` on `reports.view`, Settings) + 4 website pages under `/console/website/*` + `profile/:type/:id` (type→permission map: items→`inventory.view`, sellers/staff/owners→`people.view`).
- Index: `analytics.view` → DashboardPage, else `blog.manage` → `/console/website/blog`, else `/dashboard`. Legacy `/workshop*` and `/controlpanel*` redirect client-side (`/controlpanel/{theme,website,shop,blog}` → `/console/website/*`).
- `AppLayout` + `ControlPanelLayout` deleted; `ConsoleLayout` is the single shell. Sidebar/SideMenu filter per item permission; pulse card gated on `consignments.view || inventory.view`; header quick-actions gated on `consignments.manage`; MobileNav hidden for blog-only roles.
- Production deprecation: `mark-ready` → 410 (`gone('جریان تولید حذف شده است…')`); `productionStatus` badge/counter removed from sidebar, item form, entity profile (DB column preserved, all rows `ready`).
- Browser-verified: admin lands `/console` with 13 nav items; author lands `/console/website/blog` with only the blog item; 8/8 legacy redirects resolve.

### Item-28 grep sweeps (zero open findings)
- `stockQuantity`/`websiteQuantity` writers: only `syncLegacyStockCache` (`inventoryLedgerService.ts:338`, comment at :312 declares the monopoly) + `createItem` opening stock (`inventoryService.ts:92`, consumed once at :109 for the opening `ADJUSTMENT_IN`); `updateItem` strips both fields from the patch (:140). All other hits are reads, Zod schemas, mappers, or notifications text.
- `.delete()` on ledger/financial/audit/order/payment tables: none. Drizzle `.delete()` hits are CMS content (blog/gallery), workshop-entity trash paths (items/sellers/consignments/staff/expenses via soft-delete + audited trash/permanent), todos, notifications, and user addresses. `inventoryService.ts:1290` is the trash permanent-delete for non-financial entities; the controller keeps the audit row.

### Verification evidence
- `test-acceptance.mts`: 57/57 (step 7 logically deletes ALL test entities — item + both consignments + seller + purchase unwind — and asserts derived debt 0).
- `verify-migration.mjs`: 11/11 (cache==Σledger, debt==Σfinancial across sellers, referential integrity).
- Frontend `tsc --noEmit`: 0; `npm run build`: exit 0. Backend `tsc --noEmit`: 0.
