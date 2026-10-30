# Database Reference — Polaris (MySQL + Drizzle)

## Connection

Local: `127.0.0.1:3306`, db `polaris`, user `MRez` / `64321608`, charset utf8mb4 (persian_ci). Server: cPanel MySQL (`.env` only, differs from local — never assume prod creds).
Schema definitions: `backend/src/schema/*.ts` (auth, workshop, orders, cms, company, notifications, audit, userAddresses, clientId, **newModel** = P0-C supply: suppliers extended, supplier_prices, purchase_requests(+items), purchases(+items receipt tracking), purchase_receipts(+items), supply_costs, supply_cost_allocations); migrations: `backend/drizzle/00*` (17: 0000–0016 — 0015 workshop todos, 0016 P0-C supply chain). Local schema applied: 52 tables.
52 tables.
P0-D Unified Sales tables (schema in `newModel.ts` for existing stubs + `schema/sales.ts` for seller sales):
`sales_channels` (id, code, name, type, description, is_active, sort_order),
`customers` (id, code, name, phone, email, province, city, address, postal_code, credit_limit, current_debt, total_purchases, order_count, first/last_order_at, acquisition_channel_id, tags JSON, notes, is_active, deleted_by),
`sales_orders` (id, code, order_type, channel_id, customer_id, seller_id, customer details snapshot, status, payment_status, subtotal, discount, shipping, tax, total, paid, remaining, currency, utm fields, tracking_code, note, status timestamps, created_by, is_deleted),
`sales_order_lines` (id, sales_order_id, item_id, sku, item_code, item_name, size, color, quantity, unit_price, discount, line_total, snapshot JSON),
`seller_sales` (id, code, seller_id, channel_id, sale_date, status, subtotal, commission, net_settlement, settled, remaining, note, submitted/confirmed by+at, is_deleted),
`seller_sale_lines` (id, seller_sale_id, item_code, quantity, unit_price, line_total),
`sales_payments` (id, code, order_id, seller_sale_id, customer_id, seller_id, amount, payment_method, payment_date, tracking_number, status, note, created_by, is_deleted).

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

**Workshop** (`schema/workshop.ts`): `items` (code auto-gen PLR-nnn; 3 prices cost/consignment/retail; `purchase_price_usd` DECIMAL(12,2) nullable; JSON `cost_breakdown` {fabric,sewing,accessories,transport,packaging}; `production_status` `ready` (P0-B retired `pending_production`/mark-ready → 410; column preserved, all rows `ready`); stock + minThreshold; sizes/colors/fabric; images JSON array for profile gallery; JSON `variantPrices`), `categories`, `sellers` (guarantee, creditLimit, bankAccounts JSON, currentDebt, status), `consignments` (JSON `ConsignmentItemLine[]` incl. per-line returned/sold qty; totalAmount/netAmount/paidAmount/remainingAmount; status active→partially_settled→settled; overdue flag; `delivery_status` `delivered`|`pending` + `delivery_date` datetime nullable — **scheduled handover** «تحویل بار زمان‌بندی‌شده»: `pending` rows reserve stock but debt/due-date only apply after `POST /consignments/:id/deliver` stamps `delivered_at`; pending rows excluded from FIFO/settlement/dashboard aggregates), `consignment_returns` (`ReturnItemLine[]`, condition heal…, `workshop_notifications` (event + derived rows: `type` critical|need_action|notification|system, `severity`, `link` for click-through navigation, `read_at` nullable, payload JSON)

**Customer orders** (`schema/orders.ts`): `orders` (status machine; mine-scoped for users), `user_addresses`.

**Supply chain** (`schema/newModel.ts`, migrations 0016+0023): `suppliers` (id, code, shop_name (maps to legacy `name` on write for backward compat), contact_persons JSON, phones JSON, city, categories JSON, isActive (column `is_active`), + legacy contact_person, phone, email, address, note, cooperation_terms, payment_terms, payment_due_days, min_order_amount, timestamps/deletedAt; **migration 0023** adds the new columns `shop_name`, `contact_persons`, `phones`, `city`, `categories` + indexes `suppliers_shop_name_idx`, `suppliers_city_idx`, `suppliers_active_idx`); `supplier_prices` (append-only price history, FK supplier_id+sku_id); `purchase_requests` (draft→submitted→approved→rejected/cancelled→converted); `purchase_request_items`; `purchases` (draft→ordered→partially_received→received→cancelled; `request_id` FK link); `purchase_items` (quantity, unit_cost, received_quantity); `purchase_receipts` (supplier_id, warehouse_id, location_id, received_by); `purchase_receipt_items`; `supply_costs` (cost_type enum, amount, currency, cost_date, payment_terms, allocation_method); `supply_cost_allocations` (cost_id, purchase_item_id, amount — Σ == cost amount via largest-remainder).

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
- Item pricing: USD purchase price is reference-only (`purchase_price_usd`); `cost_breakdown` lines sum to workshop cost (form warns when any line >40% of total); percent-based pricing computes consignment/retail from workshop cost at form level. P0-B retired `pending_production`/mark-ready (→ 410); every item is handover/shop eligible on creation.
- Damage records: `fix` returns quantity to item stock (like a healthy return); `dispose` is a write-off (no restock). Both keep the record for audit.
- Expenses: 4 allocation modes (see table list above). Profit distribution: recipient `assignedAmount` minus cost obligations already paid = net settlement; draft → approved → paid.

## Soft delete

Items/sellers/staff/expenses/consignments are soft-deleted (trash system; restore / edit-and-restore / permanent-delete endpoints in workshop router). Nothing is hard-deleted by the normal UI paths.
