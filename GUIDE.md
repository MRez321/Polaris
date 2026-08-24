# Polaris Style — User Guide

Polaris Style is the inventory, consignment, and finance management app for the Polaris Style workshop. It is a **mobile-first Persian web app** built for the business owners: track goods, hand them to sellers, collect money, pay workshop costs, and split the profit — all from a phone.

Full endpoint documentation lives in [API.md](./API.md).

---

## Getting Started

- **Open the app**: go to `https://polarisstyle.ir` in any browser.
- **Install as an app (PWA)**: in the Settings page (تنظیمات) → the PWA card, or from the browser menu → *Add to Home Screen / Install app*. After install it runs full-screen like a native app and works offline for already-loaded screens.
- **Layout**: one bottom/side navigation with six areas:

| Page      | Route              | What it does                                    |
| --------- | ------------------ | ----------------------------------------------- |
| Dashboard | `/`                | Live numbers: debts, payments, stock, profit    |
| Inventory | `/inventory`       | Goods, categories, stock levels                 |
| Consignments | `/consignments` | Handovers to sellers, returns, settlements      |
| People    | `/people`          | Sellers and staff                               |
| Finances  | `/finances`        | Payments, workshop expenses, profit distribution, reports |
| Settings  | `/settings`        | Branding, partners, trash, system status, audit logs |

---

## Online Status & Data Safety

The app constantly checks that **the database is reachable** (not just the server), because that is what decides whether your data can be saved.

- The status monitor pings `/api/health` every 10 seconds and on window focus.
- **Green / برخط** → data is being saved normally.
- **Red / قطع ارتباط** → the app blocks financial operations to prevent mismatches (nothing is silently lost or half-saved).
- In **Settings → system tab** you can run a manual ping test (تست پینگ و برقراری ارتباط): it shows server status, latency in ms, and last sync time.

---

## Dashboard

The opening screen summarizes the whole business at a glance:

- **Total active debt** (بدهی فعال) — what all sellers currently owe.
- **Overdue debt & overdue consignments** — handovers past their due date that are not settled.
- **Today's payments** — money collected today.
- **Inventory value** — stock × cost price.
- **Items in sellers' hands** — units handed out minus returned/sold.
- **Low-stock alerts** — items at or below their minimum threshold.
- **Workshop costs, collected total, net profit** — collected payments minus workshop expenses.

---

## Inventory (انبار و کالا)

Each product (کالا) has:

- A **code** (generated automatically), name, and **category**.
- Three prices: **cost** (what it costs you), **consignment price** (what the seller owes you per unit), **retail price** (suggested sale price).
- **Stock quantity** and a **minimum threshold** — when stock falls to the threshold the dashboard flags it.
- **Sizes, colors, fabric**, and images.

**Guides**

1. **Add a product**: Inventory → add button → fill name, category, prices, stock, sizes/colors → save.
2. **Add a category**: inside the item form, "new category" (دسته‌بندی جدید) → type the label → it becomes selectable immediately.
3. **Edit / delete**: open the item → edit fields, or delete. Deleting is **soft** — the item goes to the trash and can be restored (see below).

---

## People — Sellers (دست‌فروش‌ها)

Sellers take goods on consignment and pay you back from their sales. Each seller profile keeps:

- Contact info (phone, extra phones, address, national code).
- **Guarantee** (ضمانت): type — promissory note / cheque / national card / trusted guarantor — plus amount and details.
- **Credit limit** — the ceiling for goods you hand over.
- **Bank accounts** for paying them back or settling.
- Live money counters: **current debt**, total handovers value, total paid.
- Status: `active`, `suspended`, `settled`.

**Guide — add a seller**: People → sellers → add → name + phone are required; set the guarantee and credit limit before the first handover → save.

---

## People — Staff (پرسنل)

Staff profiles track: role + role title, phones, hire date, **salary type** (monthly / piecework / hourly) and amount, bank accounts, resume attachment, status (active / leave / inactive), and an **activity history** (tasks, handovers, payments, attendance, notes).

---

## Consignments (واگذاری کالا)

The heart of the workflow. A consignment (واگذاری) = goods handed to a seller with a due date.

**Money lifecycle of one consignment:**

```
totalAmount (value handed over)
  − returnedAmount (unsold goods returned)
  = netAmount (seller's debt for this handover)
  − paidAmount (payments allocated to it)
  = remainingAmount (still owed)
```

Status moves automatically: `active` → `partially_settled` → `settled`; past the due date it is flagged `overdue`.

**Guide — hand over goods**

1. Consignments → new handover (واگذاری جدید).
2. Pick the seller and a **due date**.
3. Add lines: item, quantity, unit price (defaults to the item's consignment price), optional size/color.
4. Save — stock is deducted from the warehouse immediately.

**Guide — return unsold goods (مرجوعی)**

1. Open the consignment → return (مرجوعی).
2. For each line choose the quantity coming back and its **condition**:
   - **سالم (healthy)** → goes back into warehouse stock, sellable again.
   - **آسیب‌دیده (damaged)** → removed from the seller's debt but **not** restocked.
3. Save — the consignment's debt drops by the returned value.

You cannot return more than what the seller still holds (quantity − already returned − sold).

---

## Payments (پرداخت‌ها)

Record money a seller pays you.

**Guide — record a payment**

1. Finances → payments → new payment: seller, amount, method (cash / card / bank transfer / POS), optional tracking number and notes.
2. Save.

**What happens automatically — chain settlement (تسویه زنجیره‌ای):** the payment is allocated across that seller's open consignments **oldest first**. Each allocation shrinks the consignment's remaining debt and the seller's `currentDebt`. If the payment is bigger than the total debt, the leftover is kept as `unallocatedAmount`. The payment record shows the full allocation breakdown, so every toman is accounted for.

---

## Workshop Expenses (هزینه‌های کارگاه)

Track every workshop cost: materials, rent, utilities, wages.

Each expense has title, category, amount, date, payer, payment method (cash / bank transfer / card / cheque), optional receipt image, and a recurring flag.

**Cost allocation** — who bears the cost:

| Mode                  | Meaning                                        |
| --------------------- | ---------------------------------------------- |
| `shared_by_equity`    | split between partners by their share          |
| `workshop_fund`       | paid from the workshop fund                    |
| `specific_payer`      | one person covers it                           |
| `custom_split`        | explicit per-recipient shares (`costShares`)   |

---

## Profit Distribution (توزیع سود)

At the end of a period, split the profit between partners, staff pool, workshop fund, investors, or custom recipients.

**Guide — monthly profit split**

1. Finances → workshop → profit distribution → new period: name the period (e.g. «مرداد ۱۴۰۵»), set start/end dates.
2. Enter **net profit** and optionally deduct a **reinvestment reserve**.
3. Choose the mode: **by share units** (each recipient's units ÷ total units) or **by percentage**.
4. The app computes each recipient's `assignedAmount`, subtracts cost obligations they already paid, and shows the **net settlement** per person.
5. Save as `draft`, then move to `approved` / `paid` as you settle.

---

## Trash / Recycle Bin (سطل بازیافت)

Nothing is deleted by accident. Items, sellers, staff, expenses, and consignments all go to the trash first.

In **Settings → trash tab** you can, for each deleted record:

- **Restore** (بازیابی) — put it back exactly as it was.
- **Edit & restore** — fix a field (e.g. a wrong name) during restore.
- **Permanent delete** — irreversible; use only when sure.

---

## Settings (تنظیمات)

- **Branding**: workshop name, slogan, logo, contact details, socials — used across the app and reports.
- **Partners (شرکا)**: co-founder profiles with share percentages, share units, bank accounts; used by cost allocation and profit distribution.
- **Trash**: the recycle bin above.
- **System**: PWA status, online/database health, manual ping test.
- **Audit logs (ممیزی)**: every create/edit/delete with who, what, and when — the latest 500 events.

---

## Typical Workflows

### A new seller starts working with you

1. People → add the seller (phone, guarantee, credit limit).
2. Consignments → new handover: pick items and quantities → save.
3. Watch the consignment on the dashboard until the due date.

### Collecting money

1. Finances → payments → record what the seller paid.
2. The app settles the oldest handovers first; check the allocation list on the payment record.
3. Seller's debt updates everywhere (dashboard, seller profile, consignment).

### Season ends — goods come back

1. Open each consignment → return: mark quantities healthy (back to stock) or damaged (written off).
2. Remaining debt now reflects only what was actually sold.
3. Collect the rest via payments.

### Month close

1. Record all workshop expenses with their cost allocation.
2. Finances → profit distribution → compute the period, review each recipient's net settlement, approve and pay.
3. Check the audit log if any number looks off.

---

## Notes

- All amounts are in **toman**.
- The app is RTL Persian throughout; dates are stored as UTC and displayed locally.
- When the connection indicator is red, financial actions are blocked by design — reconnect first, then continue. No data is lost while you wait.
