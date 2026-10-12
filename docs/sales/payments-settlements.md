# Payments & Settlements

## Overview

All financial transactions flow through the `sales_payments` table. Payments
target exactly one entity — either a **sales order** (customer payment) or a
**seller sale** (seller settlement). The service enforces the exactly-one-target
rule, computes remaining amounts server-side, and validates payment amounts
against the order/sale's outstanding balance.

## Database

The `sales_payments` table stores:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `code` | varchar(32) | Auto-generated: `SPY-000001` |
| `order_id` | varchar(36) | FK → `sales_orders.id`; nullable |
| `seller_sale_id` | varchar(36) | FK → `seller_sales.id`; nullable |
| `customer_id` | varchar(36) | Optional customer reference |
| `seller_id` | varchar(36) | Optional seller reference (for settlements) |
| `amount` | bigint | Payment amount in IRR toman |
| `payment_method` | varchar(32) | `cash`, `card_transfer`, `bank_transfer`, `pos`, `cheque` |
| `payment_date` | datetime | When payment was received |
| `tracking_number` | varchar(255) | Optional reference (e.g. transaction ID) |
| `status` | varchar(32) | `pending`, `completed`, `failed`, `refunded`, `voided` |
| `note` | text | Optional notes |

Exactly one of `order_id` or `seller_sale_id` must be set.

## Customer payments

When a customer pays for an order:
1. The payment is recorded with `order_id` set.
2. The order's `paid_amount` is incremented by the payment amount.
3. `payment_status` is updated: `pending` → `partial` → `paid`.
4. `remaining_amount` is recalculated: `total_amount - paid_amount`.

If `paid_amount` reaches or exceeds `total_amount`, the order status is
upgraded and `payment_status` becomes `paid`.

## Seller settlements

When a seller is paid for a confirmed sale:
1. The payment is recorded with `seller_sale_id` set.
2. The seller sale's `settled_amount` is incremented by the payment amount.
3. `remaining_settlement` is recalculated: `net_settlement_amount - settled_amount`.

## Validation rules

- Payment amount must be **positive**.
- Payment amount must not exceed the target's **remaining amount** (order's
  `remaining_amount` or sale's `remaining_settlement`).
- `order_id` and `seller_sale_id` are mutually exclusive.

## API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| `GET` | `/sales-payments` | `payments.view` | List all payments |
| `POST` | `/sales-payments` | `payments.manage` | Create a payment |

### Create payment payload

```typescript
{
  orderId?: string;          // target: sales order
  sellerSaleId?: string;     // target: seller sale
  customerId?: string;       // optional ref
  sellerId?: string;         // optional for settlements
  amount: number;            // required, positive
  paymentMethod: 'cash' | 'card_transfer' | 'bank_transfer' | 'pos' | 'cheque';
  trackingNumber?: string;
  note?: string;
}
```

## Frontend

The `SalesPaymentsPage` (`/console/sales-payments`) lists all payments with:
- Payment code, target type (order/seller-settlement/customer), amount,
  method, status, and date.
- Search by code, order/sale/customer ID.
- Summary cards: total payment volume, completed count.

API client: `salesPaymentsApi` in `frontend/src/lib/api.ts`.
