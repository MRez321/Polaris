# Seller Commissions & Settlements

## Overview

Seller sales capture transactions made by street sellers (فروشندگان) on behalf
of the business. Each seller sale is associated with a seller and a sales channel,
tracks a commission for the seller, and flows through a defined lifecycle from
draft to settlement.

## Lifecycle

```
draft → submitted → confirmed → settled
  ↓         ↓            ↓
cancelled  cancelled    cancelled
```

### States

| Status | Description |
|--------|-------------|
| `draft` | Just created, not yet submitted to the seller |
| `submitted` | Seller has taken the sale to the street/customer |
| `confirmed` | Admin confirmed the sale; commission is due |
| `settled` | Full settlement paid to seller (terminal) |
| `cancelled` | Cancelled before settlement (terminal) |

### Valid transitions

| From | To |
|------|----|
| `draft` | `submitted`, `cancelled` |
| `submitted` | `confirmed`, `cancelled` |
| `confirmed` | `settled`, `cancelled` |
| `settled` | (terminal) |
| `cancelled` | (terminal) |

## Commission model

When a seller sale is **confirmed**, the system:

1. **Posts a SALE stock movement** to the seller's custody location (seller
   receives physical stock from the shop pool).
2. Calculates the **commission amount**: the seller's share of the sale based
   on the seller's commission rate (typically 10–20% of the subtotal).
3. Calculates the **net settlement amount**: `subtotal - commission_amount`.
   This is the amount the business owes back to the seller.

### Fields on `seller_sales`

| Field | Description |
|-------|-------------|
| `subtotal` | Sum of all line totals (unit_price × quantity) |
| `commission_amount` | Seller's commission (portion kept by seller) |
| `net_settlement_amount` | What the seller must pay back to the business |
| `settled_amount` | Running total of payments made by the seller |
| `remaining_settlement` | `net_settlement_amount - settled_amount` |

## Settlement flow

1. Seller sale reaches `confirmed` status → SALE movement posts, commission
   recorded, `remaining_settlement` = `net_settlement_amount`.
2. Seller pays back the `net_settlement_amount` (via cash pickup, bank transfer,
   etc.). A `sales_payments` record is created with `seller_sale_id` set and
   `amount` equal to the settlement.
3. `settled_amount` is incremented, `remaining_settlement` decreases.
4. When `remaining_settlement` reaches 0, the sale can be marked `settled`.

## Audit trail

- `create`: when a seller sale is created (draft).
- `status_transition`: on every status change, recording before/after status.
- `settlement`: when a payment settles part of the seller's debt.

## Frontend

The `SellerSalesPage` (`/console/seller-sales`) shows:
- All seller sales in a collapsible list (newest first).
- Each sale's status badge, commission breakdown, and line items.
- Status transition buttons (only valid next states shown).
- A summary of total outstanding settlement across all confirmed-but-unsettled sales.

API client: `sellerSalesApi` in `frontend/src/lib/api.ts`.
