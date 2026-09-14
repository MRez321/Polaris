# Authorization (RBAC)

## Roles

Stored on `user.role` (varchar 32) — set at signup (`user` default), changed only via the better-auth admin plugin (workshop UsersManager).

| Role | Scope |
|---|---|
| `admin` | Everything: workshop panel, backups, notification credentials, blog, company settings |
| `author` | Controlpanel blog management only |
| `user` | Customer surfaces (orders, addresses, own dashboard) |

`adminRoles: ['admin']` for the admin plugin. Declared-but-unenforced legacy roles (accountant/supervisor/tailor/staff) must not be gated on.

## Middleware chain

```
requireAuth            — session/bearer valid, not expired, not idle-expired
requireRole(...roles)  — role membership
requirePermission(p)   — explicit permission check (core/rbac/permissions.ts)
```

Workshop routes: `requireAuth → requireRole('admin') → workshopRouter`.

## Permission catalog (P0-A-04)

`backend/src/core/rbac/permissions.ts` — declarative permissions for sensitive domains; `admin` implies all. Backups and notification-credential routes declare explicit permissions (`backup.settings.read`, `backup.run`, `notification.settings.read`, …) in `routes/apiRoutes.ts` so a future role split can't silently inherit access.

## Route mount order (order IS the auth)

`backend/src/routes/apiRoutes.ts` — public (`/api/health`, `/api/public/*`), then `requireAuth` (orders/addresses), then role gates, then the admin workshop chain. Adding a route above its gate = security hole; the mount table lives in BACKEND.md.

## Verified

`scripts/smoke-security.mjs` §1–2: anonymous → 401, garbage token → 401, `user` role → 403 on backup list/run/settings/notifications, admin → 200.
