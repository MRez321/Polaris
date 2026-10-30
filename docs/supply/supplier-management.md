# Supplier Management

## Overview

The supplier management system in the Polaris console manages **suppliers** (تأمین‌کنندگان) and **supply orders** (سفارشات خرید) as distinct surfaces, each with its own route and UI.

## Routes

| Route | Page | Component | Purpose |
|-------|------|-----------|---------|
| `/console/suppliers` | SuppliersPage | `frontend/src/modules/workshop/supply/SuppliersPage.tsx` | Grid of supplier cards, search, filtering, actions |
| `/console/supply-orders` | SupplyOrdersPage | `frontend/src/modules/workshop/supply/SupplyOrdersPage.tsx` | Purchase orders, receipts, cost tracking |
| `/console/profile/supplier/:id` | SupplierProfilePage | `frontend/src/modules/workshop/supply/SupplierProfilePage.tsx` | Detail view of a single supplier |

## Domain Model

### Supplier

The supplier model has been redesigned with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes (auto-generated) | Primary key; not shown in form |
| `code` | string | No | Auto-generated; e.g. `SUP-20241015-001` |
| `shopName` | string | Yes | Shop/factory name (maps to legacy `name` column) |
| `contactPersons` | Array<{id?, name, phone?}> | No | Multiple contact persons; at least one recommended |
| `phones` | string[] | No | Multiple phone numbers |
| `city` | string | Yes | City of operation |
| `categories` | string[] | No | Clothing categories they supply (comma/Persian-comma separated) |
| `address` | string | No | Full address |
| `email` | string | No (legacy) | Retained for backward compatibility |
| `isActive` | boolean | Yes | Active/inactive (default: true) |
| `cooperationTerms` | string | No | e.g. "پیش‌پرداخت ۵۰٪" |
| `paymentTerms` | string | No | e.g. "۳۰ روزه" |
| `paymentDueDays` | number | No | Payment deadline in days |
| `minOrderAmount` | number | No | Minimum order amount (tومان) |
| `note` | string | No | Internal notes |

### Backend Schema

File: `backend/src/schema/newModel.ts` — `suppliers` table.

Legacy columns (`name`, `contact_person`, `phone`, `email`) are retained for backward compatibility. The service maps `shopName` → `name` on write so existing queries against the legacy `name` column still work.

### Database Migration

File: `backend/drizzle/0023_p0c_supplier_columns.sql`

Columns added:
- `shop_name` (varchar 255, NOT NULL, default '')
- `contact_persons` (json, nullable)
- `phones` (json, nullable)
- `city` (varchar 128, nullable)
- `categories` (json, nullable)
- `is_active` (boolean, NOT NULL, default true)
- `email`, `address`, `cooperation_terms`, `payment_terms`, `payment_due_days`, `min_order_amount` (legacy extended fields)

Indexes added:
- `suppliers_shop_name_idx` on `shop_name`
- `suppliers_city_idx` on `city`
- `suppliers_active_idx` on `is_active`

Apply with:
```bash
cd backend && npx drizzle-kit migrate
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/workshop/supply/suppliers` | List suppliers (supports `search`, `city`, `isActive` filters) | bearer |
| POST | `/api/workshop/supply/suppliers` | Create supplier | bearer |
| GET | `/api/workshop/supply/suppliers/:id` | Get supplier detail | bearer |
| PATCH | `/api/workshop/supply/suppliers/:id` | Update supplier | bearer |
| PUT | `/api/workshop/supply/suppliers/:id/activate` | Activate supplier | bearer |
| PUT | `/api/workshop/supply/suppliers/:id/deactivate` | Deactivate supplier | bearer |
| DELETE | `/api/workshop/supply/suppliers/:id` | Delete supplier (soft) | bearer |

## Frontend Architecture

### SupplierCard (`SupplierCard.tsx`)

A card-based UI component following the SellersManager pattern:

- **Shop name** with code badge
- **Status indicator** (active/inactive badge)
- **Contact persons** list with names and phones
- **Clickable phone numbers** (tel: links)
- **City** display
- **Categories** as tags
- **Stats** (order count, total purchases)
- **Quick actions**: edit, activate/deactivate

### SuppliersPage (`SuppliersPage.tsx`)

- **Grid layout** of `SupplierCard` components
- **Search** by shop name or code
- **City filter** (dropdown of Persian provinces)
- **Category filter** (client-side filtering)
- **Status filter** (active / inactive / all)
- **Clear filters** button
- **Create supplier** button → opens `SupplierFormModal`
- **Permission gate**: requires `suppliers.manage` for create/edit/delete

### SupplierFormModal (`SupplierFormModal.tsx`)

- **Placeholder-based labels**: no text under inputs; label text and hint examples are in the input placeholder
- **Auto-generated code**: not shown or editable
- **Shop name**: required, validated (red asterisk, error message below input)
- **Contact persons**: multiple entries, each with name + mobile phone fields; new entries appear below existing ones
- **City**: required, validated (supports Persian province names)
- **Categories**: comma (`,`) and Persian comma (`،`) separated input with placeholder instructions
- **Optional fields**: address, cooperation terms, payment terms, payment due days, min order amount, note
- **Toggle switch** for active/inactive status
- **Validation**: required fields checked before submit; error toasts on missing fields
- **glass-card sections** matching SellerFormModal styling

### PurchaseOrderFormModal (`PurchaseOrderFormModal.tsx`)

- **Searchable supplier input**: all suppliers shown by default; type to filter; click to select
- **Add supplier button**: opens the full `SupplierFormModal` via `onRequestAddSupplier` callback for creating a new supplier
- **Persian Calendar** (`DatePicker` component with Shamsi calendar) for expected delivery date
- **Transportation cost** field (تومان)
- **Post tracking code** field for postal tracking
- **Line items**: dynamic table with item name/SKU, type, quantity, unit, unit cost (mimics ItemFormModal styling)
- **Auto-calculated totals**: subtotal, transportation cost, additional costs, grand total
- **glass-card sections** with `FormField` pattern matching SellerFormModal/ItemFormModal styling
- **Persian digit formatting** throughout

### SupplierProfilePage (`SupplierProfilePage.tsx`)

- **Stats grid**: total purchases, order count, last order date
- **Contact info section**: shop name, city, phones, categories, address
- **Orders list** with tabs: receipts, costs
- **Timeline view** of supplier activity

## Permissions Matrix

| Role | suppliers.view | suppliers.manage | purchasing.manage |
|------|----------------|-------------------|-------------------|
| admin | ✓ | ✓ | ✓ |
| author | ✓ | (via blog.manage) | ✗ |
| staff | ✓ | (limited) | (limited) |

## Console Sidebar Navigation

The desktop sidebar is non-collapsible with always-visible section headers (matching the mobile SideMenu pattern). Menu groups:

| Group | Items | Routes | Permissions |
|-------|-------|--------|-------------|
| (Dashboard) | داشبورد | `/console` | `analytics.view` |
| **انبار و موجودی** | انبار و موجودی, سفارشات خرید, مرجوعی و خرابی | `/console/inventory`, `/console/supply-orders`, `/console/returns` | `inventory.view`, `purchasing.view`, `returns.view` |
| **توزیع و فروش** | فروش امانی و حواله‌ها, سفارش‌های فروشگاه | `/console/consignments`, `/console/orders` | `consignments.view`, `orders.view` |
| **درحال توسعه** | سفارشات فروش, فروش فروشندگان, مشتریان, کانال‌های فروش, پرداخت‌های فروش | `/console/sales-orders`, `/console/seller-sales`, `/console/customers`, `/console/sales-channels`, `/console/sales-payments` | `sales.view`, `seller-sales.view`, `customers.view`, `channels.view`, `payments.view` |
| **اشخاص** | افراد (preview page with counts), کارکنان, تأمین‌کنندگان, فروشندگان, کاربران | `/console/people`, `/console/people/staff`, `/console/people/suppliers`, `/console/people/sellers`, `/console/people/users` | `people.view`, `suppliers.view`, `settings.manage` |
| **مالی و گزارش** | امور مالی, گزارش و تحلیل | `/console/finances`, `/console/analytics` | `finances.view`, `analytics.view` |
| **وب‌سایت و فروشگاه** | تنظیمات وب‌سایت, ظاهر وب‌سایت, فروشگاه آنلاین, مدیریت وبلاگ | `/console/website/*` | `website.manage`, `blog.manage` |
| **مدیریت سیستم** | تنظیمات و مدیریت, اطلاع‌رسانی, گالری تصاویر | `/console/settings`, `/console/notifications`, `/console/gallery` | `settings.manage` |

## Validation Rules

| Field | Rule |
|-------|------|
| `shopName` | Required, min 2 chars |
| `city` | Required |
| `contactPersons[*].name` | Required if contact person entry is present |
| `contactPersons[*].phone` | Optional, but if filled must match Iranian phone format |
| `categories` | Parsed by `,` and `،` separators |

## Usage Examples

### Creating a supplier

```typescript
// Via API
const supplier = await supplyApi.createSupplier({
  shopName: 'پارچه‌فروشی اصفهان',
  contactPersons: [{ name: 'علی احمدی', phone: '09121234567' }],
  phones: ['09121234567', '03112345678'],
  city: 'اصفهان',
  categories: ['پارچه', 'لباس مردانه'],
  isActive: true,
});
```

### Creating a purchase order

```typescript
const order = await supplyApi.createPurchaseOrder({
  supplierId: 'uuid',
  expectedDate: '2024-10-20',
  paymentTerms: '۳۰ روزه',
  additionalCosts: 50000,
  transportationCost: 20000,
  trackingCode: '1234567890123',
  items: [{ skuId: 'sku-uuid', quantity: 100, unit: 'بسته', unitCost: 500000 }],
});
```
