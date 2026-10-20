# Customer User Dashboard & Account Menu

Developer reference for the public-facing customer `/dashboard` page and the shared `UserMenu` dropdown.

## Files

| Concern | File |
|---|---|
| Page | `frontend/src/pages/public/CustomerDashboardPage.tsx` |
| UserMenu dropdown | `frontend/src/components/common/UserMenu.tsx` |
| Auth context | `frontend/src/context/AuthContext.tsx` |
| Orders API | `frontend/src/lib/api.ts` (`ordersApi`) |
| Favorites context | `frontend/src/context/FavoritesContext.tsx` |
| Cart context | `frontend/src/context/CartContext.tsx` |

## UserMenu (account dropdown)

`UserMenu` is the single shared dropdown used in both `PublicHeader` (storefront) and
the console `Header`. It renders a `DropdownMenu` from `@/components/ui/dropdown-menu`.

### Menu items (always visible)

| Label | Icon | Target | Notes |
|---|---|---|---|
| حساب کاریمی | `UserRound` | `/dashboard` | Always first item |
| سبد خرید | `ShoppingBag` | opens cart, then `/shop` | Badge: cart item count |
| مورد علاقه ها | `Heart` | `/dashboard` | Badge: favorites count (rose) |
| پنل کارگاه | `LayoutDashboard` | `/console` | Admin-only (`isAdmin`) |
| خروج از حساب کاربری | `LogOut` | — | Destructive variant, always last after separator |

### Sign-out state

When no user is signed in, `UserMenu` renders a single **ورود** (login) button that
navigates to the `loginTo` prop (default `/login`).

### Removed items

The following items were previously in the menu and have been removed:

- **سفارش‌های من** (My Orders) — replaced by the dashboard Orders tab
- **آدرس‌های من** (My Addresses) — accessible via the dashboard Addresses tab
- **تنظیمات وب‌سایت** (Website Settings) — use `/console/website/website` directly
- **مدیریت وبلاگ** (Blog Management) — use `/console/website/blog` directly

## Dashboard tab structure

`CustomerDashboardPage` uses **two** `<Tabs>` components sharing a single `activeTab`
state via `value` / `onValueChange`:

1. **Sidebar** (`TabsList` vertical, visible) — the clickable nav triggers.
2. **Main content** (`TabsList` hidden, with `TabsContent` panels) — the rendered content.

This shared-state pattern ensures clicking a sidebar trigger immediately switches the
main content panel (and vice-versa).

### Tabs

| Value | Label | Icon | Component | Status |
|---|---|---|---|---|
| `orders` | سفارش‌ها | `Package` | `OrdersTab` | Live — shows orders with expandable tracking timeline |
| `order-history` | تاریخچه سفارش‌ها | `Clock` | `OrdersHistoryTab` | Placeholder — pending future implementation |
| `favorites` | علاقه‌مندی‌ها | `Heart` | `FavoritesTab` | Live — resolves favorite item IDs against the catalog |
| `addresses` | آدرس‌ها | `MapPin` | `AddressBookSection` | Live — CRUD address book with add/edit/delete |
| `profile` | پروفایل | `UserRound` | `ProfileTab` | Live — name/email edit, console quick-entry per role, sign out |

### OrdersHistoryTab placeholder

`OrdersHistoryTab` (added as a placeholder) renders an `Empty` state with a
`Clock` icon and the message «این بخش در دست توسعه است». It is wired into both the
sidebar triggers and the main content `TabsContent` with value `order-history`.
When this tab is implemented, the component should be expanded to show delivered /
cancelled orders with payment history.
