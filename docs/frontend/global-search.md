# Global Search (Ctrl / Cmd+K)

A Spotlight-style quick-search overlay available from every `/console/*` page.

## Files

- `frontend/src/modules/workshop/layout/GlobalSearch.tsx` — the overlay (renders
  inside `<Modal>`).
- `frontend/src/modules/workshop/layout/Header.tsx` — mounts `GlobalSearch` behind
  the `searchOpen` state; the search trigger button and the global `Ctrl/Cmd+K`
  listener live here.

## Behavior

- **No extra network request.** Results come from the live `DataContext` entities:
  `items`, `sellers`, `consignments`, `payments`, `returns`, `staffMembers`,
  `owners` (seven searchable scopes, plus an `all` aggregate).
- **Matching:** `match(q, ...fields)` — case-insensitive substring over code, name,
  category label, phone, national code, etc. (per scope). Query is trimmed; an
  empty query shows all scopes' chips with zero counts.
- **Scoping:** a scope-filter chip bar lets the user narrow to one concern. Each
  chip shows a live match count badge; the active scope is highlighted
  (`bg-brand text-brand-on shadow-sm`).
- **Slicing:** each scope is capped at `PER_SCOPE_LIMIT = 6` results. Total shown
  is `sum(activeScopes.map(s => resultsByScope[s].length))`.
- **Empty state:** «نتیجه‌ای یافت نشد» when no scope matches the query.
- **Dismiss:** `Escape`, backdrop click, or the close button closes the overlay
  without navigating.

## Navigation (result click → deep link)

Clicking a result runs `navigateTo(first.path)` (which closes the overlay, then
uses `react-router-dom`'s `useNavigate`):

| Scope | Route |
|---|---|
| item | `/console/profile/items/:id` |
| seller | `/console/profile/sellers/:id` |
| consignment | `/console/consignments` (list — consignments have no single receipt view) |
| payment | `/console/finances/payments` |
| return | `/console/returns` |
| staff | `/console/profile/staff/:id` |
| owner | `/console/profile/owners/:id` |

`Enter` on the highlighted (first) result performs the same navigation as a click.

## Hotkey

`Ctrl/Cmd+K` opens the overlay from anywhere on a `/console` route. The listener
is mounted on `document` in `Header.tsx` (so the overlay only mounts when the
Header is rendered — i.e. inside the console). On open, the search input is
autofocused; re-pressing the hotkey re-focuses it.

## IA

GlobalSearch consumes the same `DataContext` that the dashboard widgets and
`ManagerActionCenter` use, so any data refresh anywhere in the console updates
search results consistently — there is no separate search index.
