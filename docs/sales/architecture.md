# Sales Architecture (P0-D)

## Overview

The unified sales system manages the full sales lifecycle across all channels:
website storefront, social networks (Instagram, Telegram, Bale, Eitaa, Basalam),
wholesale, consignment, and manual retail. It unifies customer orders and street
seller sales into a single architecture with shared entities for customers,
channels, and payments.

## Entities

### Core tables (in `newModel.ts`)

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `sales_channels` | Sales channel registry | `code` (e.g. `website`, `instagram`), `name`, `type`, `isActive`, `sortOrder` |
| `customers` | Customer/party records | `code`, `name`, `phone`, `credit_limit`, `current_debt`, `total_purchases`, `order_count`, `tags` |
| `sales_orders` | Customer-facing orders (retail/wholesale/consignment/manual) | `code`, `order_type`, `channel_id`, `customer_id`, `status`, financial fields |
| `sales_order_lines` | Line items for orders | `sales_order_id`, `item_id`, `sku`, `quantity`, `unit_price`, `line_total` |
| `sales_payments` | All payments (customer payments + seller settlements) | `order_id` / `seller_sale_id` (exactly one), `amount`, `payment_method`, `status` |

### Seller sales tables (in `schema/sales.ts`)

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `seller_sales` | Street seller's actual sale records | `code`, `seller_id`, `channel_id`, `status`, `commission_amount`, `net_settlement_amount` |
| `seller_sale_lines` | Line items for seller sales | `seller_sale_id`, `item_code`, `quantity`, `unit_price`, `line_total` |

## Routes (backend)

Mounted at `/api/workshop` (admin-only):

### Sales Orders
- `GET /sales-orders` — list (filter: `status`, `channelId`, `sellerId`, `customerId`, `code`, `dateFrom`, `dateTo`)
- `POST /sales-orders` — create (draft status)
- `GET /sales-orders/:id` — fetch with lines
- `PUT /sales-orders/:id/status` — lifecycle transition

### Seller Sales
- `GET /seller-sales` — list
- `POST /seller-sales` — create (draft status)
- `GET /seller-sales/:id` — fetch with lines
- `PUT /seller-sales/:id/status` — lifecycle transition

### Sales Payments
- `GET /sales-payments` — list
- `POST /sales-payments` — create (targets exactly one: order or seller sale)

### Customers
- `GET /customers` — list (active only)
- `GET /customers/:id` — fetch
- `POST /customers` — create
- `PUT /customers/:id` — update

### Sales Channels
- `GET /sales-channels` — list all channels
- `GET /sales-channels/:id` — fetch

## Permissions

| Permission | Description |
|-----------|-------------|
| `sales.view` | List/get sales orders |
| `sales.manage` | Create orders, transitions |
| `seller-sales.view` | List/get seller sales |
| `seller-sales.manage` | Create seller sales, transitions |
| `customers.view` | List/get customers |
| `customers.manage` | Create/update customers |
| `channels.view` | List/get sales channels |
| `payments.view` | List sales payments |
| `payments.manage` | Create sales payments |

## Key design decisions

1. **Server-side price computation**: Unit prices come from the `items` table, never from
   client input. The API boundary (Zod schemas) rejects `unitPrice` from clients.

2. **Stock movement on transition only**: Creating a sales order in `draft` status does NOT
   move stock. The `confirmed` transition posts a SALE movement (stock out of shop pool).
   `returned`/`cancelled` after confirmation posts a RETURN_IN movement (stock back to shop pool).

3. **Audit logging in services**: Every financial mutation (`createSalesOrder`,
   `transitionSalesOrderStatus`, `createSellerSale`, `transitionSellerSaleStatus`,
   `createCustomer`, `updateCustomer`) calls `recordAudit()` inside the transaction.

4. **Seller sales use `entity_code` for items**: Unlike sales orders (which reference `items.id`),
   seller sales reference items by their `code` field, since sellers may not know item UUIDs.

5. **Exactly-one-target rule for payments**: A `sales_payments` row must target exactly one of
   a sales order or a seller sale. Both null or both set is rejected.

6. **Customer code generation**: Auto-generated via `nextCode('CUST', ...)` if not supplied.
   Format: `CUST-000001`, etc.

## Frontend surface

Routes registered at `/console/*`:
- `/console/sales-orders` — `SalesOrdersPage` (permission: `sales.view`)
- `/console/seller-sales` — `SellerSalesPage` (permission: `seller-sales.view`)
- `/console/customers` — `CustomersPage` (permission: `customers.view`)
- `/console/sales-channels` — `SalesChannelsPage` (permission: `channels.view`)
- `/console/sales-payments` — `SalesPaymentsPage` (permission: `payments.view`)

API clients in `frontend/src/lib/api.ts`:
- `salesOrdersApi` — list, get, create, transitionStatus
- `sellerSalesApi` — list, get, create, transitionStatus
- `salesPaymentsApi` — list, create
- `customersApi` — list, get, create, update
- `salesChannelsApi` — list, get
