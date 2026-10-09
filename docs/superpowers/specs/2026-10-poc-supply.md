# P0-C: تأمین و موجودی (Supply & Inventory) — Supplier → PO → Receipt → Costs

> Spec items 14–16. Persian (fa-IR) clothing app — Express 5 + Drizzle + MySQL backend, React 19 + Vite frontend.

## Overview

The Supply module lets admin purchase inventory from suppliers through a regulated, auditable workflow:

```
Supplier (price history)
   → Purchase Request (draft → submitted → approved → converted)
   → Purchase Order (draft → ordered → partially_received → received)
   → Goods Receipt (ledger stock ↑ + legacy cache sync + supplier payable)
   → Supply Costs (shipping, customs, etc. — allocated to PO lines)
   → Landed Cost (item cost + allocated burden, per unit)
```

**Key invariant:** the supply flow does **not** depend on the Production module. Receipts post directly to shelf stock via the inventory ledger.

## Backend

### Services (`backend/src/modules/supply/`)

| File | Responsibility |
|---|---|
| `supplierService.ts` | CRUD suppliers; append-only price history (`supplier_prices`); supplier detail with price + purchase history |
| `purchaseService.ts` | Purchase requests lifecycle (transition guards), create/order, `createReceipt` (transactional), supply cost add/update/delete with largest-remainder allocation, `getOrder` returns landed cost |
| `supplyController.ts` | Zod schemas + Persian error messages + route handlers (actor from `req.auth?.user.id`) |
| `supplyRouter.ts` | Express Router, mounted at `/api/workshop/supply` via workshopAdminChain |

### Transactional seams (single-writer rules)

- **Inventory writes:** only via `inventoryLedgerService.ts` → `recordMovements(tx, moves)`. `createReceipt` posts `PURCHASE_RECEIPT` movements (direction: `+` stock) to `shelfLocationId()` (deterministic v5). Then `syncLegacyStockCache(tx, itemId)` per affected legacy item (resolved via `skus.legacyItemId`). No direct stock mutation.
- **Money writes:** only via `financialService.ts` → `recordTransaction(tx, {...})`. Receipts post a `PAYABLE` row (supplier counterparty); supply costs are separate `EXPENSE` rows — never mixed.
- **Audit:** `recordAudit({ actor, action, entityType, entityId, before, after, metadata, details, tx })` via `entityActor(tx, actorId)` for tx-scoped rows.
- **Transactions:** `DbTx` type from `inventoryLedgerService.ts`; all multi-step operations run inside `db.transaction`.

### Allocation algorithm

`applyCostAllocations` uses the **largest-remainder integer method** so `Σ allocations == amount` exactly (no rounding drift). Supports `by_value` (default: `amount × item_value / Σ item_value`) and `by_quantity` (`amount × qty / Σ qty`). Falls back to equal split when total weight is zero.

### Status machines

- **Request:** `draft → submitted → approved → converted` (also `rejected`, `cancelled`)
- **Order:** `draft → ordered → partially_received → received` (also `cancelled`)
- **Transitions are guarded** — e.g. `convertRequest` requires `approved`; over-receipt is rejected (`received > remaining`).

### API routes (`supplyRouter.ts`)

```
Suppliers:     GET/POST /suppliers, GET/GET-detail /suppliers/:id, PATCH /suppliers/:id
               POST /suppliers/:id/activate, POST /suppliers/:id/deactivate
               GET /suppliers/:id/prices, POST /suppliers/:id/prices  (append-only)
Requests:      GET/POST /purchase-requests, GET /purchase-requests/:id, PATCH /purchase-requests/:id
               POST /purchase-requests/:id/{submit|approve|reject|cancel}
               POST /purchase-requests/:id/convert  (must come before :action route)
Orders:        GET/POST /purchase-orders, GET /purchase-orders/:id, PATCH /purchase-orders/:id
               POST /purchase-orders/:id/cancel
Receipts:      POST /purchase-orders/:id/receipts, GET /purchase-orders/:id/receipts, GET /receipts/:id
Costs:         POST /purchase-orders/:id/costs, GET /purchase-orders/:id/costs
               PATCH/DELETE /purchase-orders/:id/costs/:costId
Landed cost:   GET /purchase-orders/:id/landed-cost
```

### Permissions

| Permission | Scope |
|---|---|
| `suppliers.view` | list, get, detail, price list |
| `suppliers.manage` | create, update, activate/deactivate, price add |
| `purchasing.view` | list/get requests + orders |
| `purchasing.manage` | create/update, move, convert |
| `purchasing.receive` | create receipt |
| `supplycosts.manage` | add/update/delete costs |
| `purchasefinance.view` | list costs, landed cost |

Staff role gets `suppliers.view` + `purchasing.view` (read-only supply access). All admin-only via `workshopAdminChain` (`requireAuth → requireRole('admin')`).

## Frontend

### API client (`frontend/src/lib/api.ts`)

`supplyApi` object with typed methods for every endpoint above. Domain types (`Supplier`, `PurchaseOrder`, `PurchaseRequest`, `SupplyCost`, `LandedCostLine`, status enums, payload interfaces) mirror the backend and are re-exported from `api.ts`.

### Page (`frontend/src/modules/workshop/supply/SupplyPage.tsx`)

Self-contained React component (no DataContext dependency) with a tab bar:

- **تأمین‌کنندگان فعال** — list with New button → `/console/supply/suppliers/new`
- **سفارشات خرید** — list with New → `/console/supply/purchase-orders/new`
- **دریافت کالا** — filter to orders needing receiving (`ordered`/`partially_received`)
- **هزینه‌های حمل** — entry point to view/manage costs

Data loads via `useEffect` + `supplyApi` calls; errors render inline (Sonner toast + `getApiErrorMessage`).

### Routes (`frontend/src/App.tsx`)

```
/console/supply                          → SupplyPage (perm: suppliers.view)
/console/supply/suppliers/:id            → SupplyPage
/console/supply/purchase-orders/:id      → SupplyPage
```

All under `ConsoleLayout`, permission-gated by `RequirePermission`.

## Tests

`backend/scripts/test-acceptance.mts` — P0-C section (22 checks): supplier CRUD + append-only price history, request lifecycle, request→order conversion, order edit, goods receipt with inventory ledger invariant, supplier payable posting, supply cost allocation (Σ == amount), landed cost computation, audit trail. The section cleans up all test fixtures on completion.

**Run:** `cd backend && npx tsx scripts/test-acceptance.mts` (expects 79/79: 57 P0-B + 22 P0-C).

## Invariants

1. `items.stockQuantity / websiteQuantity == Σ inventoryLedger` (per location) after every receipt.
2. `sku_locations.quantity == Σ ledger` per SKU/location.
3. `Σ supply_cost_allocations == supply_costs.amount` (largest-remainder, exact integer sum).
4. Supplier `PAYABLE` financial rows are separate from supply-cost `EXPENSE` rows.
5. Every ledger movement carries `referenceType + referenceId + actorId`.
6. `supplier_prices` is append-only — price changes insert, never UPDATE.
