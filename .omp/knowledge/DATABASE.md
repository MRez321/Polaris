# Database Reference — Polaris (MySQL + Drizzle)

## Connection

Local: `127.0.0.1:3306`, db `polaris`, user `MRez` / `64321608`, charset utf8mb4 (persian_ci). Server: cPanel MySQL (`.env` only, differs from local — never assume prod creds).
Schema definitions: `backend/src/schema/*.ts`; migrations: `backend/drizzle/0000…0014_*.sql` (15 files) + `meta/`; applied state in `__drizzle_migrations`. 0012 added `gallery_images` metadata columns; 0013 added scheduled-delivery + workshop notifications (see below); 0014 added `consignments.delivery_date` (nullable datetime — the *scheduled* handover date, distinct from `delivered_at` = actual delivery moment).

**Ad-hoc DB queries** (bash, cwd `backend/` — module resolution needs it):

```js
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:'127.0.0.1',user:'MRez',password:'64321608',database:'polaris'});
  const [t] = await c.query('SHOW TABLES');
  console.log(t.map(x=>Object.values(x)[0]).join(' | '));
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); })"
```
Always add the `.catch` — without it errors print as bare `Node.js v22.x` with no message.

## Tables by domain (26, verified live 2026-09-09)

**better-auth** (`schema/auth.ts`): `user` (id, name, email, role varchar32, banned, …), `session`, `account` (provider rows; credential rows carry scrypt `password` = `salt:key`), `verification`.

**Workshop** (`schema/workshop.ts`): `items` (code auto-gen PLR-nnn; 3 prices cost/consignment/retail; `purchase_price_usd` DECIMAL(12,2) nullable; JSON `cost_breakdown` {fabric,sewing,accessories,transport,packaging}; `production_status` `ready`|`pending_production` — order-made items hidden from handover/shop until mark-ready; stock + minThreshold; sizes/colors/fabric; images JSON array for profile gallery; JSON `variantPrices`), `categories`, `sellers` (guarantee, creditLimit, bankAccounts JSON, currentDebt, status), `consignments` (JSON `ConsignmentItemLine[]` incl. per-line returned/sold qty; totalAmount/netAmount/paidAmount/remainingAmount; status active→partially_settled→settled; overdue flag; `delivery_status` `delivered`|`pending` + `delivery_date` datetime nullable — **scheduled handover** «تحویل بار زمان‌بندی‌شده»: `pending` rows reserve stock but debt/due-date only apply after `POST /consignments/:id/deliver` stamps `delivered_at`; pending rows excluded from FIFO/settlement/dashboard aggregates), `consignment_returns` (`ReturnItemLine[]`, condition heal…, `workshop_notifications` (event + derived rows: `type` critical|need_action|notification|system, `severity`, `link` for click-through navigation, `read_at` nullable, payload JSON)

**Customer orders** (`schema/orders.ts`): `orders` (status machine; mine-scoped for users), `user_addresses`.

**CMS/company** (`schema/cms.ts`, `company.ts`): `blog_posts`, `website_settings` (JSON blob), `company_settings` (JSON blob — full CompanyBranding: branding fields + `analyticsSettings` {gaMeasurementId, websiteUrl} + `dashboardPrefs` **v2 layout object** `{version: 2, order[], hidden{}, cols{}, collapsed{}, presets[]}` (legacy flat `{widgetId: boolean}` migrates client-side via `normalizeLayout`) + owners list), `gallery_images` (url relative `/uploads/...`; fileName; category; label; `alt` varchar255 — alt text for SEO/a11y; tags JSON; **probed metadata (migration 0012)**: `width`/`height` int nullable, `file_size` int bytes, `mime_type` varchar32 — filled server-side by `probeImageMeta` at upload, backfilled via `node scripts/backfill-gallery-meta.mjs`; mime comes from the file signature, so a `.gif`-named PNG records `image/png`), `notification_settings` (JSON blob — telegram/SMS config incl. `relayUrl`).

**Workshop todos** (`schema/workshop.ts`, migration 0015): `workshop_todos` (id uuid, text, priority low|medium|high|urgent, dueDate datetime nullable, done boolean, doneAt, createdAt).

**Infra**: `audit_logs` (`details` column — NOT `description`; 500 latest kept in UI), `backup_settings` (`schema/backups.ts`, migration 0015 — JSON blob: autoEnabled, scheduleHours, retention, autoKind database|website|full, notifyTelegram, lastBackupAt, cpanelHost/User/Token), `__drizzle_migrations`.

## JSON-in-column pattern

Settings tables and workshop aggregates store JSON blobs (`data` json / typed interfaces in `schema/workshop.ts` mirroring `frontend/src/types`): `BankAccountInfo`, `VariantPrices`, `ConsignmentItemLine`, `ReturnItemLine`, `DebtAllocation`. When changing these shapes, update BOTH the Drizzle `$type<>()` interfaces and frontend types — they're declared twice by design.

## Migrations workflow

1. Edit `backend/src/schema/*.ts`.
2. `npm run db:generate` (drizzle-kit) → new `backend/drizzle/NNNN_*.sql`.
3. Local: `npm run db:migrate` (scripts/migrate.js). Server: migrations auto-run at app startup (no CLI on prod).
4. If prod `__drizzle_migrations` is out of sync with files (hash/order mismatch): `scripts/repair-migrations.mjs` reconciles the bookkeeping table — user's debug tool, keep.
5. After deploying 0012 on prod, run `node scripts/backfill-gallery-meta.mjs` once to probe legacy gallery files (plain-deps ESM, safe on cPanel).

## Business math (lives in services/inventoryService.ts)

- Consignment: `netAmount = totalAmount − returnedAmount`; `remainingAmount = netAmount − paidAmount`. Return healthy → restock; damaged → debt drops but NOT restocked. Can't return more than seller still holds (qty − returned − sold).
- Payment **chain settlement** (تسویه زنجیره‌ای): allocated across seller's open consignments **oldest-first**; leftover → `unallocatedAmount`. Full allocation breakdown stored on the payment row.
- Handover deducts stock immediately. Scheduled handover (`delivery_status` = `pending`): stock reserved at creation, seller debt/due-date/counters deferred until «تحویل شد» (`POST /consignments/:id/deliver`). Low-stock alert when stock ≤ minThreshold. Shop allocation (`items.shop_allocation`) splits stock between shop/warehouse.
- Item pricing: USD purchase price is reference-only (`purchase_price_usd`); `cost_breakdown` lines sum to workshop cost (form warns when any line >40% of total); percent-based pricing computes consignment/retail from workshop cost at form level. `pending_production` items are excluded from handover eligibility and public catalog until `mark-ready`.
- Damage records: `fix` returns quantity to item stock (like a healthy return); `dispose` is a write-off (no restock). Both keep the record for audit.
- Expenses: 4 allocation modes (see table list above). Profit distribution: recipient `assignedAmount` minus cost obligations already paid = net settlement; draft → approved → paid.

## Soft delete

Items/sellers/staff/expenses/consignments are soft-deleted (trash system; restore / edit-and-restore / permanent-delete endpoints in workshop router). Nothing is hard-deleted by the normal UI paths.
