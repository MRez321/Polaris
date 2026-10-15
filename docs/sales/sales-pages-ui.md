# Sales Pages UI/UX — Console

Unified admin surfaces for the P0-D sales module: sales orders, seller sales,
customers, channels, and payments. All pages share a consistent mobile-first
card/skeleton pattern.

## File map

```
frontend/src/modules/workshop/pages/
  SalesOrdersPage.tsx
  SellerSalesPage.tsx
  CustomersPage.tsx
  SalesChannelsPage.tsx
  SalesPaymentsPage.tsx
frontend/src/modules/workshop/components/CustomerFormModal.tsx
```

## Shared patterns

- **Status filter tabs**: each list page has a horizontal scrollable tab bar
  (All / relevant statuses) above the list. Tabs use `bg-brand` +
  `text-brand-on` for the active state, `text-stone-600` for inactive.
- **Loading skeleton**: before data resolves (or on error), the page renders
  placeholder skeleton rows (`animate-pulse`) instead of a bare spinner.
- **Empty state**: `FileText` or relevant icon + Persian message when no rows.
- **Refresh button**: `RefreshCw` icon in the header actions.
- **Persian digits**: `toPersianDigits()` wraps all display numbers.
- **Amounts**: `تومان` suffix, `toLocaleString('fa-IR')` for thousands
  separators.

## SalesOrdersPage

- Columns: code | channel | items | customer | date | status | payment | total | remaining
- Status badges via `STATUS_COLOR` map (11 statuses, each with a color).
- Payment status as a secondary badge.
- Expanded view shows order lines + status transition buttons.
- Transitions follow the lifecycle: `draft → pending → confirmed → paid →
  picking → packed → shipped → delivered → returned → refunded`.

## SellerSalesPage

- Settlement summary at top: total outstanding (`netSettlementAmount` sum) +
  remaining settlement (`remainingSettlement` sum).
- Status badges via `STATUS_COLOR` map (5 statuses).
- Expanded view shows commission breakdown + line items + status transitions.
- Settled sales are excluded from the "pending settlement" total.

## CustomersPage

- `CustomerFormModal` (inline modal, not a toast placeholder) for create/edit.
- Fields: code, name, phone, email, province, city, address, postalCode,
  creditLimit, isActive (toggle), tags (comma-separated), notes.
- Summary badges: active count, inactive count, total debt.
- Search filters by name, phone, code, or email.
- Table columns: code | name | phone | debt | credit limit | order count | status | actions.
- Actions: edit (opens modal), toggle active, delete.

## SalesChannelsPage

- Card-based grid layout (`sm:grid-cols-2 lg:grid-cols-3`).
- Channel type icons from a `CHANNEL_TYPE_ICONS` map.
- Stat badges: active count, inactive count.
- Search by name, code, or channel type.

## SalesPaymentsPage

- Summary cards: total amount, completed count, pending count, pending amount.
- Status filter tabs: All / موفق / در انتظار / ناموفق / بازپرداخت.
- Search by code, orderId, sellerSaleId, or customerId.
- Table columns: code | reference (order/seller/customer) | amount | method | status | date.
- Payment method icons from `PAYMENT_METHOD_ICONS` map.
