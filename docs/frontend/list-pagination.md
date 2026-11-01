# Client-side list pagination (workshop console)

Every long list inside `/console/*` slices its already-fetched rows on the client and
renders the shared `Pagination` control. No endpoint takes `page`/`limit`; the lists are
bounded by what `DataContext` (or the page's own fetch) already holds.

## Shared control

`frontend/src/components/common/Pagination.tsx`

| Prop | Type | Notes |
|---|---|---|
| `currentPage` | `number` | 1-based |
| `totalItems` | `number` | full, unsliced length |
| `pageSize` | `number` | rows per page |
| `onPageChange` | `(page: number) => void` | first/prev/next/last + page buttons |
| `onPageSizeChange` | `(size: number) => void` | optional; the size `<select>` renders only when provided |
| `pageSizeOptions` | `number[]` | optional; e.g. `[12, 24, 48, 96]` |

Rendered strings (used as test/verification hooks):

- page indicator: `صفحه ۳ / ۶`
- range: `۲۵ تا ۳۶ از ۶۳`
- zero state (`totalItems === 0`): `صفر ردیف یافت شد` — no page buttons at all
- button titles: `اولین صفحه`, `قبلی`, `بعدی`, `آخرین صفحه`

## Page wiring pattern

1. `const [page, setPage] = useState(1)` and `const [pageSize, setPageSize] = useState(N)`.
2. `const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))`
   so a filter that shrinks the list can never leave the pager on a dead page.
3. `const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)`.
4. Reset to page 1 in an effect whose deps are the filter/search values.
5. Global row numbers (rank badges, "#" columns) must be
   `(safePage - 1) * pageSize + localIndex + 1` — `SellersManager` and `TopSellersCard`
   do this so numbering survives paging.

## Page sizes in use

| Surface | File | Page size | Size selector |
|---|---|---|---|
| سفارش‌های فروشگاه | `pages/OrdersPage.tsx` | 10 | — |
| مرجوعی/خرابی (both tabs) | `returns/ReturnsPage.tsx` | 10 | — |
| تأمین‌کنندگان | `supply/SuppliersPage.tsx` | 10 | — |
| کاربران | `settings/UsersManager.tsx` | 10 | — |
| انبار و موجودی | `inventory/InventoryManager.tsx` | 12 | `[12, 24, 48, 96]` |
| کارکنان | `staff/StaffManager.tsx` | 12 | `[12, 24, 48, 96]` |
| فروشندگان | `sellers/SellersManager.tsx` | 12 | `[12, 24, 48, 96]` |
| Dashboard widgets | see `dashboard-widgets.md` | 6 | — |

`ReturnsPage` keeps two independent pagers (`damagePage`, `consignmentPage`) — one per tab —
each with its own reset effect, because the tabs show unrelated collections.

## Dashboard list bodies

`frontend/src/modules/workshop/dashboard/WidgetList.tsx` is the single implementation of
"6 rows per page + pager" for the dashboard:

```tsx
<WidgetList
  items={safeConsignments}
  renderItem={(c, globalIndex) => <Row key={c.id} ... />}
/>
```

- `renderItem(item, globalIndex)` receives the index **across the whole list**, so rank
  numbering continues on page 2.
- The pager renders only when `items.length > pageSize`; `empty` is a node shown instead
  of the list (never `Pagination`'s zero state).
- `className` defaults to `space-y-2.5`; `ManagerActionCenter` groups pass `space-y-1.5`.

`TopSellersCard`, `ActivityTimeline` and `TodoWidget` implement the same 6-row rule
locally (they also render their own headers/footers), so the page size stays uniform
across the dashboard.

## Verification recipe (browser)

1. Load the page, confirm the pager range text equals `min(pageSize, total)` for page 1.
2. Click `بعدی`, confirm the range start moves to `pageSize + 1` and the row set changes.
3. Type a search / switch a filter, confirm the pager returns to `صفحه ۱ / …`.
4. Empty the filter to zero results, confirm `صفر ردیف یافت شد`.
