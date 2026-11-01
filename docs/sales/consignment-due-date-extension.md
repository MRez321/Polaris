# Consignment due-date extension (`PUT /api/workshop/consignments/:id/due-date`)

Lets an authorized user push an unpaid handover's settlement deadline forward without
touching the debt itself. Built for the dashboard overdue banner, where «۱ روز / ۲ روز /
۳ روز» presets clear a stale alert in one click.

## Contract

```
PUT /api/workshop/consignments/:id/due-date
Content-Type: application/json
{ "days": 2 }
→ 200 Consignment DTO   (same shape as GET /consignments)
```

| Input | Rule |
|---|---|
| `days` | `int`, `1 ≤ days ≤ 30` (`extendDueDateSchema`, Zod at the controller) |
| `:id` | consignment id; soft-deleted rows are invisible (`isDeleted = false` in the `SELECT … FOR UPDATE`) |

Errors (standard `{ error: string }` shape):

| Status | Message | Cause |
|---|---|---|
| 400 | `مدت تمدید باید بین ۱ تا ۳۰ روز باشد` | service guard (non-integer / out of range) |
| 400 | `این واگذاری تسویه شده است` | `remainingAmount <= 0` — nothing to extend |
| 404 | `واگذاری یافت نشد` | unknown or soft-deleted id |
| 400 | Zod message | body missing/typed wrong (`days` not an integer) |

## Semantics

`extendConsignmentDueDate(id, days)` — `backend/src/modules/workshop/inventoryService.ts`:

```ts
const base = existing.dueDate.getTime() > now.getTime() ? existing.dueDate : now;
const dueDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
```

- The new deadline is measured from **`max(dueDate, now)`**. A handover that is already
  overdue therefore lands `days` from *today*, not `days` after an ancient deadline — a preset
  must be able to clear a 90-day-old alert.
- Only `dueDate` (and `updatedAt`) change: `totalAmount`, `remainingAmount`, `status` and all
  payment allocations stay untouched.
- Runs inside `db.transaction` with `.for('update')` on the row, so two concurrent extensions
  serialize instead of both reading the same stale base.
- After commit: `emitDataChanged('consignment', 'update')` (SSE refresh) and a
  `recordAudit` entry — `action: 'update'`, `entityType: 'consignment'`,
  details `سررسید واگذاری <code> برای <seller> به مدت <days> روز تمدید شد`.

## Wiring

| Layer | Location |
|---|---|
| Route | `backend/src/modules/workshop/router.ts` — `router.put('/consignments/:id/due-date', consignments.extendDueDate)` (registered after `POST /consignments/:id/deliver`) |
| Handler | `backend/src/modules/workshop/controllers/consignmentsController.ts` — `extendDueDateSchema` + `extendDueDate` |
| Service | `backend/src/modules/workshop/inventoryService.ts` — `extendConsignmentDueDate` |
| Frontend client | `frontend/src/lib/api.ts` — `consignmentsApi.extendDueDate(id, days)` |
| Frontend UI | `dashboard/OverdueAlertBanner.tsx` (per-row `CalendarPlus` presets) → `DashboardPage.handleExtendDueDate` (toast + `fetchData()`) |

`deliveryStatus` / `deliveryDate` are unrelated: extending a *settlement* deadline never moves
a *scheduled delivery* date (that is `POST /consignments/:id/deliver`'s territory).

## Verification

- `cd backend && npx tsc --noEmit --pretty false`
- `cd backend && npx tsx scripts/test-acceptance.mts` → 125/125 (unchanged by this endpoint)
- Browser: dashboard → overdue widget → row preset «۲ روز» → `PUT … 200`, toast
  «سررسید واگذاری HND-… با موفقیت تمدید شد», row leaves the banner, overdue count drops by one,
  and the same row's `dueDate` in `GET /consignments` is now 2 days out.

No schema change: `consignments.dueDate` already existed (`datetime`, NOT NULL); no migration was
added, so the latest migration file stays `0023_p0c_supplier_columns.sql`.
