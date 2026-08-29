# Polaris Style — API Reference

REST API for the Polaris Style inventory management system. The backend serves the API and the frontend on the **same origin**.

- **Production base URL**: `https://polarisstyle.ir/api`
- **Local dev**: `http://localhost:3016/api` (or `http://localhost:5173/api` through the Vite proxy)
- **Format**: JSON everywhere. Request bodies must be sent with `Content-Type: application/json`.
- **Errors**: every error is `{ "error": "<Persian message>" }` with an appropriate HTTP status (400 validation, 401/403 auth, 404 not found, 500 internal, 503 database down).

---

## Authentication

Auth is handled by [better-auth](https://www.better-auth.com/) mounted at `/api/auth/*` (email/password + Google OAuth, with admin and bearer plugins).

Session flow:

1. `POST /api/auth/sign-up/email` — create an account
2. `POST /api/auth/sign-in/email` — returns the session and sets the session cookie
3. `GET /api/auth/get-session` — current session (or `null`)
4. `POST /api/auth/sign-out` — invalidate the session

Example:

```bash
curl -c cookies.txt -X POST https://polarisstyle.ir/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email": "owner@polarisstyle.ir", "password": "…"}'
```

With the bearer plugin, an `Authorization: Bearer <session-token>` header works instead of cookies.

### Roles

| Role | Surface | Notes |
| ---- | ------- | ----- |
| `admin` | workshop panel `/app` + website management `/controlpanel` | full access; the better-auth admin plugin treats `admin` as its admin role |
| `author` | `/controlpanel/blog` only | writes blog posts; no workshop data, no website settings |
| `staff` | — (migrated) | legacy pre-role-model accounts; migration `0005` promotes every remaining `staff` user to `admin` |

Route guards are enforced server-side (`requireAuth`, `requireRole(...)` in `src/routes/apiRoutes.ts`): the public storefront is anonymous-readable, order placement and `/orders/mine` need any authenticated user, blog CMS needs `admin` or `author`, and every other business route needs `admin`. The better-auth admin plugin endpoints live under `/api/auth/admin/*` (user list, create user, `set-role`, ban/unban, remove user) and require the `admin` role.

---

## Public Storefront (anonymous)

Read-only catalog for the marketing website. Responses are filtered to marketing-safe fields — cost/consignment prices, stock levels and internal notes never leave these endpoints.

### `GET /api/public/items` → catalog item list

```json
[{
  "id": "…", "code": "PLR-477", "name": "…", "category": "coats_jackets",
  "categoryLabel": "کت، کاپشن و پالتو", "retailPrice": 1099998,
  "sizes": ["M", "L"], "colors": ["مشکی"], "fabric": "…",
  "imageUrl": "…", "images": ["…"], "inStock": true
}]
```

### `GET /api/public/categories` → `{ id, label }[]`

### `GET /api/public/company` → public brand info (name, tagline, contact details)

### `GET /api/public/blog` → published posts only (newest first)

### `GET /api/public/blog/:slug` → one published post (`404` for drafts/unknown slugs)

Blog post shape (shared with the CMS below):

```json
{
  "id": "…", "slug": "ket-size-guide", "title": "…", "excerpt": "…",
  "image": "/uploads/….jpg", "imageAlt": "…", "date": "۱۴۰۵/۰۶/۰۳",
  "readTime": "۵ دقیقه مطالعه", "tags": ["راهنمای خرید"],
  "body": [{ "heading": "optional h2", "text": "paragraph…" }],
  "status": "published", "authorName": "مدیر سیستم"
}
```

---

## Health & Dashboard

### `GET /api/health`

Connection check. Verifies the **MySQL database** is reachable — not just that the Node process is up. The frontend's online-status monitor and the Settings ping test both use this endpoint.

| Status | Meaning            | Body |
| ------ | ------------------ | ---- |
| `200`  | data can be saved  | `{"status":"ok","database":"connected","uptime":123.4,"timestamp":"2026-08-24T07:37:56.432Z"}` |
| `503`  | DB unreachable     | `{"status":"error","database":"disconnected","uptime":123.4,"timestamp":"…"}` |

### `GET /api/dashboard/stats` (admin)

Aggregated numbers for the workshop dashboard. Admin-only — workshop data must not leak to website customers.

```json
{
  "totalActiveDebt": 0,
  "totalOverdueDebt": 0,
  "todayPayments": 0,
  "totalInventoryValue": 0,
  "totalItemsInHands": 0,
  "activeConsignmentsCount": 0,
  "overdueConsignmentsCount": 0,
  "lowStockItemsCount": 0,
  "totalSellersCount": 0,
  "activeSellersCount": 0,
  "totalOutstandingDebt": 0,
  "totalWorkshopCosts": 0,
  "netWorkshopProfit": 0,
  "totalConsignmentValue": 0,
  "totalCollected": 0
}
```

All amounts are in **toman**.

---

## Items & Categories

### `GET /api/items` → `GarmentItem[]`

```json
[{
  "id": "…", "code": "ITM-…", "name": "پالتو مردانه",
  "category": "<category-id>", "categoryLabel": "پالتو",
  "costPrice": 800000, "consignmentPrice": 1100000, "retailPrice": 1400000,
  "stockQuantity": 12, "minStockThreshold": 3,
  "sizes": ["L", "XL"], "colors": ["مشکی", "سرمه‌ای"], "fabric": "پشم",
  "imageUrl": null, "images": [],
  "createdAt": "…", "updatedAt": "…"
}]
```

### `POST /api/items` → `201 GarmentItem`

| Field               | Type       | Required | Notes                       |
| ------------------- | ---------- | -------- | --------------------------- |
| `name`              | string     | ✅       |                             |
| `category`          | string     | ✅       | category id                 |
| `costPrice`         | number ≥ 0 | —        |                             |
| `consignmentPrice`  | number ≥ 0 | —        | price given to the seller   |
| `retailPrice`       | number ≥ 0 | —        |                             |
| `stockQuantity`     | int ≥ 0    | —        |                             |
| `minStockThreshold` | int ≥ 0    | —        | low-stock alert level       |
| `sizes` / `colors`  | string[]   | —        |                             |
| `fabric`            | string     | —        |                             |
| `imageUrl`, `images`| string / string[] | — |                             |

`code` is generated server-side when omitted.

### `PUT /api/items/:id` → `GarmentItem`

Partial update — any subset of the fields above.

### `DELETE /api/items/:id` → `{ "message": "…" }`

**Soft delete** — moves the item to the trash (see [Trash](#trash--recycle-bin)).

### `GET /api/categories` → `{ id, label }[]`

### `POST /api/categories` → `201 { id, label }`

Body: `{ "label": "کاپشن" }`

---

## Sellers

Hand-sellers (دست‌فروش) who receive goods on consignment.

### `GET /api/sellers` → `Seller[]`

### `GET /api/sellers/:id` → `Seller`

```json
{
  "id": "…", "code": "SEL-…", "name": "…", "phone": "0912…",
  "additionalPhones": [], "nationalCode": "…", "streetLocation": "…",
  "hasGuarantee": true,
  "guaranteeType": "promissory_note | cheque | national_card | trusted_guarantor",
  "guaranteeAmount": 5000000, "guaranteeDetails": "…",
  "creditLimit": 20000000,
  "bankAccounts": [{ "bankName": "…", "cardNumber": "…", "shebaNumber": "…", "accountHolder": "…" }],
  "currentDebt": 3500000,
  "totalHandoversValue": 15000000, "totalPaid": 11500000,
  "status": "active | suspended | settled",
  "avatarUrl": null, "notes": null, "createdAt": "…"
}
```

### `POST /api/sellers` → `201 Seller`

Required: `name`, `phone`. Optional: everything else in the shape above (`guaranteeType` must be one of the four enum values when provided).

### `PUT /api/sellers/:id` → `Seller`

Partial update.

### `DELETE /api/sellers/:id`

Soft delete → trash.

---

## Consignments (Handovers / واگذاری)

A consignment hands items over to a seller. Money flow: `totalAmount` (value handed over) → `returnedAmount` (unsold returns) → `netAmount` (what the seller owes) → `paidAmount` → `remainingAmount` (debt).

### `GET /api/consignments` → `Consignment[]`

```json
[{
  "id": "…", "code": "HND-…", "sellerId": "…", "sellerName": "…",
  "date": "…", "dueDate": "…",
  "status": "active | partially_settled | settled | overdue",
  "items": [{
    "itemId": "…", "itemName": "…", "itemCode": "…",
    "quantity": 5, "returnedQuantity": 1, "soldQuantity": 2,
    "unitPrice": 1100000, "totalPrice": 5500000,
    "selectedSize": "L", "selectedColor": "مشکی"
  }],
  "totalAmount": 5500000, "returnedAmount": 1100000, "netAmount": 4400000,
  "paidAmount": 2000000, "remainingAmount": 2400000,
  "notes": null, "handedOverBy": "…", "createdAt": "…"
}]
```

### `POST /api/consignments` → `201 Consignment`

```json
{
  "sellerId": "<seller id>",
  "dueDate": "2026-09-30",
  "notes": "optional",
  "itemsList": [
    { "itemId": "<item id>", "quantity": 5, "unitPrice": 1100000,
      "selectedSize": "L", "selectedColor": "مشکی" }
  ]
}
```

- `itemsList` needs at least one line; quantities are positive integers.
- Quantities are deducted from warehouse stock.

### `POST /api/consignments/return` → `201`

Return unsold goods from a consignment.

```json
{
  "consignmentId": "<consignment id>",
  "returnItems": [
    { "itemId": "<item id>", "quantity": 2, "condition": "healthy", "reason": "فروش نرفته" }
  ],
  "notes": "optional"
}
```

- `condition`: `"healthy"` → quantity goes **back into warehouse stock**; `"damaged"` → written off the consignment but not restocked.
- Cannot return more than the remaining (not yet returned/sold) quantity per line.
- Response: `{ "message", "returnRecord": ConsignmentReturn, "updatedConsignment": Consignment }`.

### `DELETE /api/consignments/:id`

Soft delete → trash.

---

## Payments

### `GET /api/payments` → `PaymentRecord[]`

```json
[{
  "id": "…", "code": "PAY-…", "sellerId": "…", "sellerName": "…",
  "amount": 2000000, "date": "…",
  "paymentMethod": "cash | card | bank_transfer | pos",
  "trackingNumber": null,
  "allocations": [{
    "consignmentId": "…", "consignmentCode": "…", "consignmentDate": "…",
    "allocatedAmount": 1500000,
    "remainingDebtBefore": 2400000, "remainingDebtAfter": 900000,
    "isFullySettled": false
  }],
  "unallocatedAmount": 500000,
  "recordedBy": "…", "notes": null, "createdAt": "…"
}]
```

### `POST /api/payments` → `201 PaymentRecord`

```json
{
  "sellerId": "<seller id>",
  "amount": 2000000,
  "paymentMethod": "card",
  "trackingNumber": "optional",
  "notes": "optional"
}
```

**Automatic chain settlement:** the payment is allocated across the seller's open consignments in chronological order (oldest debt first). Each allocation reduces that consignment's `remainingAmount` and the seller's `currentDebt`; leftovers appear in `unallocatedAmount`.

---

## Store Orders (فروشگاه)

Orders placed on the public storefront. Customers order their own cart; admins manage every order. Prices are re-computed server-side from the items table inside a transaction — client-side totals are estimates only. Cancelling an order restocks its lines.

### `POST /api/orders` → `201 Order` (any authenticated user)

```json
{
  "customerName": "…", "phone": "09121234567",
  "city": "تهران", "address": "…", "note": "optional",
  "paymentMethod": "cod",
  "lines": [{ "itemId": "<item-id>", "quantity": 1, "size": "M", "color": "مشکی" }]
}
```

`paymentMethod`: `cod` (پرداخت در محل) | `card_transfer` (کارت به کارت). Phone must match `^0\d{10}$`. Stock is validated and decremented atomically; insufficient stock → `400`.

### `GET /api/orders/mine` → `Order[]` (any authenticated user)

The caller's own orders, newest first — powers the customer profile at `/dashboard`.

### `GET /api/orders` → `Order[]` (admin)

All orders with customer details and line items.

### `PUT /api/orders/:id` → `Order` (admin)

Body: `{ "status": "…" }` with one of `pending` | `confirmed` | `preparing` | `shipped` | `delivered` | `cancelled`. Moving to `cancelled` restocks the lines.

Order shape:

```json
{
  "id": "…", "code": "ORD-2", "userId": "…", "customerName": "…",
  "phone": "0912…", "city": "تهران", "address": "…", "note": null,
  "paymentMethod": "cod", "status": "pending",
  "totalPrice": 1099998,
  "items": [{ "itemId": "…", "name": "…", "quantity": 1, "unitPrice": 1099998, "size": "M", "color": "مشکی" }],
  "createdAt": "…"
}
```

---

## Staff & Owners

### `GET /api/staff` → `StaffMember[]`

### `POST /api/staff` → `201 StaffMember`

Required: `name`, `role`. Optional:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `roleTitle` | string | display label for the role |
| `phones` | string[] | |
| `nationalCode` | string | |
| `hireDate` | date | |
| `salaryType` | `monthly` \| `piecework` \| `hourly` | |
| `salaryAmount` | number ≥ 0 | |
| `bankAccounts` | BankAccount[] | |
| `status` | `active` \| `leave` \| `inactive` | |
| `resumeUrl`, `resumeAttachmentName`, `resumeAttachmentData` | string | resume file (URL or base64) |
| `activityHistory` | StaffActivity[] | `{ id, date, title, type, description }`, type ∈ `task` \| `handover` \| `payment` \| `attendance` \| `note` |

### `PUT /api/staff/:id` → `StaffMember` (partial) · `DELETE /api/staff/:id` (soft delete)

### `GET /api/owners` → `Owner[]`

Co-founders/partners (kept in settings storage, not the staff table). Deleted owners are filtered out.

### `PUT /api/owners`

Replaces the whole list: `{ "owners": [Owner, … ] }`



```json
{
  "id": "…", "name": "…", "role": "…",
  "sharePercentage": 50, "sharesCount": 100,
  "nationalCode": "…", "phones": ["0912…"], "email": "…",
  "bankAccounts": [{ "bankName": "…", "cardNumber": "…", "shebaNumber": "…" }],
  "avatarUrl": "…", "bio": "…"
}
```

→ `{ "message": "لیست شرکا ذخیره شد" }`

---

## Workshop Expenses & Profit Distribution

### `GET /api/expenses` → `WorkshopExpense[]`

### `POST /api/expenses` → `201 WorkshopExpense`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `title` | string | required |
| `category` | string | optional |
| `amount` | number ≥ 0 | required |
| `date` | date | defaults to now |
| `paidBy` | string | |
| `paymentMethod` | `cash` \| `bank_transfer` \| `card` \| `cheque` | |
| `receiptImageUrl` | string | |
| `isRecurring` | boolean | |
| `costAllocation` | `shared_by_equity` \| `workshop_fund` \| `specific_payer` \| `custom_split` | how the cost is split between partners |
| `costShares` | `{ recipientId, recipientName, shareUnits, requiredAmount, isPaid }[]` | for `custom_split` |

### `PUT /api/expenses/:id` (partial) · `DELETE /api/expenses/:id` (soft delete)

### `GET /api/profit-distribution` → `ProfitShareDistribution[]`

### `POST /api/profit-distribution` → `201 ProfitShareDistribution`

```json
{
  "periodName": "مرداد ۱۴۰۵",
  "startDate": "2026-07-23", "endDate": "2026-08-22",
  "reinvestmentReserve": 5000000,
  "netProfit": 45000000,
  "distributionMode": "units",
  "totalShareUnits": 200,
  "recipients": [{
    "id": "…", "name": "…", "role": "…",
    "type": "owner | staff_pool | workshop_fund | investor | custom",
    "shareUnits": 100, "percentage": 50,
    "assignedAmount": 20000000,
    "costObligation": 0, "alreadyPaidForCosts": 0, "netSettlement": 20000000,
    "isSettled": false
  }],
  "status": "draft | approved | paid",
  "notes": "…"
}
```

`distributionMode`: `"units"` splits by `shareUnits` against `totalShareUnits`; `"percentage"` by `percentage`.

---

## Trash / Recycle Bin

Deletes are soft. Five entity types: `item`, `seller`, `staff`, `expense`, `consignment`.

### `GET /api/trash`

```json
{ "items": [], "sellers": [], "staff": [], "expenses": [], "consignments": [] }
```

### `POST /api/trash/restore/:type/:id`

Restore as-is → `{ "message", "restored" }`.

### `PUT /api/trash/edit-and-restore/:type/:id`

Body: a patch object for the entity (e.g. `{ "name": "نام جدید" }` for an item) — applied during restore → `{ "message", "restored" }`.

### `DELETE /api/trash/permanent/:type/:id`

Irreversible → `{ "message": "مورد برای همیشه حذف شد" }`.

Invalid `:type` → `400 { "error": "نوع موجودیت نامعتبر است" }`.

---

## Company Branding

### `GET /api/company` → `CompanyBranding`

Workshop identity + embedded `owners` list:

```json
{
  "name": "…", "slogan": "…", "website": "…", "instagram": "…", "telegram": "…",
  "address": "…", "postalCode": "…", "phone": "…", "emergencyPhone": "…",
  "registrationNumber": "…", "logoUrl": "…", "logoText": "…",
  "brandName": "…", "tagline": "…", "workshopAddress": "…", "workshopPhone": "…",
  "secondaryPhone": "…", "establishedYear": "…",
  "owners": [ …Owner ]
}
```

### `PUT /api/company` → updated `CompanyBranding`

Any subset of the string fields above (owners are managed via `/api/owners`).


---

## Website Settings

Settings for the public marketing website, managed at `/controlpanel/website` (admin only). The storefront catalog reads items directly; this surface controls the site shell (publication toggle, brand copy, contact info).

### `GET /api/website/settings` → `WebsiteSettings`

```json
{
  "enabled": false,
  "siteTitle": "…",
  "description": "…",
  "showPrices": true,
  "showOutOfStock": true
}
```

### `PUT /api/website/settings` → updated `WebsiteSettings`

Any subset of the fields above.
---

## Blog CMS (admin, author)

Content management for the public blog. Drafts are only visible through these endpoints; the public site renders published posts only.

### `GET /api/blog` → `BlogPost[]` (incl. drafts)

### `POST /api/blog` → `201 BlogPost`

Body: the post shape from the [public storefront](#public-storefront-anonymous) minus `id`/`authorName` — required: `slug`, `title`, `excerpt`, `body` (`[{ heading?, text }]`); optional: `image`, `imageAlt`, `date`, `readTime`, `tags`, `status` (`draft` | `published`, default `draft`). The author is recorded from the session.

### `PUT /api/blog/:id` → `BlogPost` (partial update)

### `DELETE /api/blog/:id` → `{ "message": "…" }` (hard delete)

---

## Audit Logs

### `GET /api/audit-logs` → `AuditLog[]` (latest 500)

```json
[{
  "id": "…", "timestamp": "…",
  "userId": "…", "userName": "…", "userRole": "admin",
  "action": "create | update | delete",
  "entity": "item | seller | consignment | payment | return | staff | settings | cost | profit | auth",
  "details": "کالای «پالتو» با کد ITM-12 ایجاد شد",
  "ipAddress": "…"
}]
```

Every create/update/delete above writes an audit entry automatically; the actor comes from the better-auth session (or `سیستم` when anonymous).

---

## Realtime (socket.io)

Endpoint: `/socket.io` on the same origin.

Server → client event:

| Event          | Payload                                          | Fired when                     |
| -------------- | ------------------------------------------------ | ------------------------------ |
| `data-changed` | `{ entity, action, at }`                         | any data mutation is broadcast |

```js
import { io } from 'socket.io-client';
const socket = io(); // same origin
socket.on('data-changed', ({ entity, action }) => refresh(entity));
```

---

## Quick test session

```bash
BASE=https://polarisstyle.ir/api

# 1. DB reachable?
curl $BASE/api/health

# 2. Create an item
curl -X POST $BASE/api/items -H 'Content-Type: application/json' \
  -d '{"name":"پالتو مردانه","category":"<cat-id>","costPrice":800000,"consignmentPrice":1100000,"retailPrice":1400000,"stockQuantity":10,"sizes":["L"],"colors":["مشکی"]}'

# 3. Create a seller
curl -X POST $BASE/api/sellers -H 'Content-Type: application/json' \
  -d '{"name":"فروشنده نمونه","phone":"09120000000","creditLimit":20000000}'

# 4. Hand over goods
curl -X POST $BASE/api/consignments -H 'Content-Type: application/json' \
  -d '{"sellerId":"<seller-id>","dueDate":"2026-09-30","itemsList":[{"itemId":"<item-id>","quantity":5,"unitPrice":1100000}]}'

# 5. Record a payment (auto-settles oldest debt first)
curl -X POST $BASE/api/payments -H 'Content-Type: application/json' \
  -d '{"sellerId":"<seller-id>","amount":2000000,"paymentMethod":"card"}'

# 6. Return unsold items
curl -X POST $BASE/api/consignments/return -H 'Content-Type: application/json' \
  -d '{"consignmentId":"<consignment-id>","returnItems":[{"itemId":"<item-id>","quantity":2,"condition":"healthy"}]}'
```
