# Sales Order Lifecycle

## Status flow

```
draft → pending → confirmed → paid → picking → packed → shipped → delivered
  ↓         ↓         ↓         ↓          ↓          ↓         ↓
  ↓         ↓         ↓         ↓          ↓          ↓         ↓
  ↓         ↓         ↓         ↓          ↓          ↓         ↓
cancelled  cancelled  ↓         ↓          ↓          ↓         ↓
              ↘     ↙          ↓          ↓          ↓         ↓
               ↘   ↙            ↓          ↓          ↓         ↓
               ↘ ↙              ↓          ↓          ↓         ↓
            returns ←─────────── delivered ──→ returned ─→ refunded
```

## States

| Status | Description |
|--------|-------------|
| `draft` | Just created, no stock movement, not yet submitted to fulfillment |
| `pending` | Submitted, awaiting confirmation |
| `confirmed` | Confirmed; **SALE stock movement** (retail orders) or seller stock movement |
| `paid` | Payment received (status tracked on the order) |
| `picking` | Items being gathered from stock |
| `packed` | Items packed, ready to ship |
| `shipped` | Shipped to customer |
| `delivered` | Customer received the goods |
| `returned` | Customer returned goods; **RETURN_IN stock movement** |
| `refunded` | Refund processed |
| `cancelled` | Cancelled before delivery; **RETURN_IN stock movement** (if after confirmed) |

## Valid transitions

| From | To |
|------|----|
| `draft` | `pending` |
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `paid`, `picking`, `cancelled` |
| `paid` | `picking`, `cancelled` |
| `picking` | `packed`, `cancelled` |
| `packed` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `returns`, `cancelled` |
| `delivered` | `returned` |
| `returned` | `refunded` |
| `refunded` | (terminal) |
| `cancelled` | (terminal) |

## Stock implications

| Transition | Stock movement |
|-----------|----------------|
| create → `draft` | None |
| `confirmed` | SALE: decrement shop pool stock |
| `returned` (after confirmed) | RETURN_IN: increment shop pool stock |
| `cancelled` (before confirmed) | None |
| `cancelled` (after confirmed) | RETURN_IN: increment shop pool stock |

## Audit trail

Every status transition is recorded via `auditService.recordAudit()` with:
- `entityType`: `sales-order`
- `action`: `status_transition`
- `before`/`after`: previous and new status
- `details`: human-readable message including the order code

## Payment status

Payment status (`paymentStatus`) on the order is managed separately by the
`salesPaymentService` when payments are recorded. The order lifecycle status and
payment status are independent dimensions that together determine the order's
fulfillment state.
