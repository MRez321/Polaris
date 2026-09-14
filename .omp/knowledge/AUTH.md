# Auth & Access Reference — Polaris

## Stack

better-auth 1.7 + `@better-auth/drizzle-adapter`, plugins: `admin()` + `bearer()` + `twoFactor()` (TOTP).
Config: `backend/src/modules/auth/service.ts`. Middleware: `backend/src/modules/auth/middleware.ts` (`requireAuth`, `requireRole(...roles)`), plus permission-based gating `requirePermission` (`core/rbac/permissions.ts` catalog — `admin` implies everything).

## Facts (verified 2026-09-13/14)

- **Providers**: email+password (enabled), Google OAuth, GitHub OAuth. OAuth accounts auto-link to credential users by matching email (`requireLocalEmailVerified: false` — there is NO email verification flow).
- **No password reset / forget-password** — `sendResetPassword` not configured, no SMTP. Recovery = write `account.password` hash directly in DB (recipe below).
- **Roles**: stored on `user.role` (varchar 32) — `admin`, `author`, `user` (signup default). `adminRoles: ['admin']`. Workshop panel requires `admin`; controlpanel blog allows `author`. Sensitive routes (backups, notification credentials) additionally declare explicit permissions (`backup.settings.read`, etc.) — RBAC catalog in `core/rbac/permissions.ts`.
- **Session**: cookie `better-auth.session_token`, HttpOnly, SameSite=Lax, Max-Age 604800 (7d). Bearer tokens also accepted (`bearer()` plugin) — API clients send `Authorization: Bearer <token>`; token value equals the session-token cookie value. Frontend reads session via better-auth client (`frontend/src/lib/auth.ts` → `authClient`).
- **Session expiry/revocation**: sessions have `expiresAt` (7d) + `idleExpiresAt` (1d); both enforced by `requireAuth`. Sign-out and 2FA flows rotate sessions (old tokens revoked).
- **Frontend guard**: `RequireAdmin` in `frontend/src/App.tsx` — anonymous → `/login?next=%2Fworkshop`, signed-in non-admin → `/dashboard`.
- **Login audit**: better-auth `databaseHooks.session.create.after` → `logAudit(..., 'login', 'auth', 'ورود کاربر ...')`. Failures swallowed. `audit_logs` only records SUCCESSFUL logins — a failing login leaves no audit row.
- **Base URL**: `BETTER_AUTH_URL` env (prod: https://polarisstyle.ir, local default http://localhost:3016). Trusted origins from `core/origins.ts` (shared with CORS + socket.io — single source, don't hardcode elsewhere).

## Two-Factor (TOTP) — P0-A-06, verified live

Endpoints (all under `/api/auth`): `two-factor/enable`, `two-factor/verify-totp`, `two-factor/disable`, plus backup-codes & list-codes endpoints. Frontend: `TwoFactorSettings.tsx` (settings panel) + LoginPage challenge flow.

**Setup semantics (better-auth, empirically verified — do NOT trust response bodies):**

1. `POST /two-factor/enable {password}` → `{totpURI, backupCodes[]}` (backup codes shown ONCE). `user.twoFactorEnabled` stays false; DB row `two_factor.verified=0`. At this stage sign-in is NOT challenged.
2. `POST /two-factor/verify-totp {code}` with the Bearer token → 200. DB: `two_factor.verified=1`, `user.two_factor_enabled=1`, session ROTATED (old token revoked — disable with the pre-verify token 401s). The response body's `token`/`user` snapshot are **STALE echoes**; don't assert on them.
3. Sign-in now returns `{twoFactorRedirect:true, twoFactorMethods:['totp']}` (no token) + signed `2fa-*` cookie.
4. Complete the challenge: `POST /two-factor/verify-totp {code}` with `Cookie: <2fa cookies from sign-in response>` (NO Authorization header) → 200 with a WORKING `{token}` — that token can call `two-factor/disable`.
5. `POST /two-factor/disable {password}` → clears both rows; plain sign-in restored. Wrong code → 401 `INVALID_CODE`; 5 wrong challenge attempts lock (backend enforces `attemptsConfig`).

**Lockout trap (dev)**: a failed/interrupted test run can leave admin 2FA verified → every subsequent sign-in challenges. Fix:

```sql
DELETE FROM two_factor; UPDATE user SET two_factor_enabled=0 WHERE email='admin@polarisstyle.ir';
```

`backend/scripts/smoke-security.mjs` §6 exercises the full matrix (enable → no-challenge-while-unverified → verify → challenge → challenge-path verify → wrong-code 401 → disable → plain sign-in restored) and always leaves admin 2FA OFF.

## Rate limits — P0-A-07 (in-memory, single-process)

`backend/src/core/security/rateLimit.ts`, mounted `app.use('/api', apiRateLimiter)` BEFORE the better-auth catch-all. Buckets (key / limit / window):

| Bucket | Key | Limit | 429 `Retry-After` |
|---|---|---|---|
| `auth` | IP + `req.body.email` | 10 / 15 min | 900 |
| `mfa` | IP | 10 / 1 min | 60 |
| `sensitive` | IP | 20 / 1 min | 60 |
| `general` | IP | 180 / 1 min | 60 |

429 body is Persian `{error: "درخواست‌های بیش از حد؛ لطفاً کمی بعد دوباره تلاش کنید"}`. `/api/health` is excluded. Limits reset on server restart (in-memory Map; no Redis on cPanel shared hosting — multi-instance deployments would need a shared store). Auth bucket burn during test iteration: restart the dev server (tsx watch reload) to clear windows.

## Credential masking — P0-A-09

- `GET` notification/backup settings return `botToken`/`apiKey`/`cpanelToken` masked as 16 bullets (`API_MASK`, `core/utils/sanitize.ts`); real value never serialized to the client. Empty value → `''` (nothing configured).
- `PUT` strips exact-mask submissions (`isMaskedCredential`) → unchanged secrets survive re-saves; only a NEW value overwrites. Secret is never echoed in the response.
- Server logs are sanitized (`sanitizeError`/`sanitizeMessage` in all log sites); `x-powered-by` absent.

## Password hashing (critical — not bcrypt!)

Actual scheme: better-auth utils scrypt via `node:crypto`:

- Params **N=16384, r=16, p=1, dkLen=64** (r=16 is unusual — most scrypt uses 8; DON'T guess)
- Salt: 16 random bytes hex (32 chars). Format: `salt:key`, both hex. Key = 128 hex chars.
- Source: `backend/node_modules/@better-auth/utils/dist/password.node.mjs`
- Generate a hash:

```js
const crypto = require('crypto');
const salt = crypto.randomBytes(16).toString('hex');
const key = crypto.scryptSync(password.normalize('NFKC'), salt, 64,
  {N:16384, r:16, p:1, maxmem:128*16384*16*2}).toString('hex');
// store `${salt}:${key}` in account.password
```

## Resetting a password (no forget-password flow exists)

```sql
UPDATE account SET password='<salt>:<key>'
WHERE user_id=(SELECT id FROM user WHERE email='…') AND provider_id='credential';
```
Compute hash with the snippet above, or copy the whole `password` value from a local account row whose password you know (e.g. local admin). Scrypt is self-contained per-row; cross-environment copies work.

## mapAuthError ordering trap (fixed in 0c1222e — keep it fixed)

`frontend/src/lib/auth.ts` `mapAuthError()`: better-auth's wrong-credentials message is `"Invalid email or password"` — the plain `"invalid email"` substring check MUST come after the credentials check or every wrong password displays as "invalid email" in Persian. Current order: already-exists → **invalid-credentials** → invalid-email → password-short → name → not-verified (`'not verified'` exact — broader `'verification'` substring catches unrelated messages) → banned → rate-limit → network → fallback.

## Known states

- Local admin: `admin@polarisstyle.ir` / `PolarisAdmin123!` (verified working 2026-09-07). 2FA must be left OFF after every test run (dev requirement) — verify with `SELECT two_factor_enabled FROM user WHERE email='admin@polarisstyle.ir'`.
- Prod `.env` differs (server-only, never deployed) — repo-documented password may not match prod; by design, not a bug.
- Google OAuth client: `818337388960-72mj57ti8m43lf8qnc558m0k0up6lk8c.apps.googleusercontent.com`, redirect `https://polarisstyle.ir/api/auth/callback/google` (registered, verified).
- Signup creates `user` role; workshop UsersManager changes roles/bans via better-auth admin plugin APIs. Nothing in app code writes `user`/`account` directly except that admin plugin path.
- Throwaway smoke user: `smoke-user@polarisstyle.ir` / `SmokeUser123!` (role `user`) — used by `scripts/smoke-security.mjs` RBAC checks; keep.

## Debug recipe — "can't login"

1. `curl -s http://localhost:3016/api/health` — is backend up?
2. POST `/api/auth/sign-in/email` with `{email,password}` directly (curl, plus `Origin: http://localhost:5173` header — CSRF) — bypass frontend. 200 vs 401 vs 429 vs 5xx tells you where it fails.
3. 401 `Invalid email or password` = data-layer mismatch (password hash / user row), NOT code — check `user` + `account` rows exist and hash verifies (snippet above).
4. **429 Persian error** = rate-limit bucket burned; wait the `Retry-After` seconds or restart dev server.
5. Body `{twoFactorRedirect:true}` and no token = 2FA is ON for that user (see lockout trap above).
6. Browser test through real UI — inline error shows in `p.text-rose-600` on LoginPage (toast is transient; the `<p>` persists). If message looks wrong, check mapAuthError ordering (trap above).
7. Prod: POST via real browser (WAF in front) — plain curl may be filtered. Prod `/api/health` 200 = backend + DB alive.
8. Stale session cookies in a shared browser profile auto-redirect past /login — sign out (`POST /api/auth/sign-out`) before testing login pages.
