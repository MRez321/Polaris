# Authentication & MFA

## Stack

better-auth 1.7 (`backend/src/modules/auth/service.ts`) with `admin()`, `bearer()`, `twoFactor()` plugins over `@better-auth/drizzle-adapter`. No second auth system exists or is permitted — all auth changes go through better-auth.

- Email+password (scrypt, see AUTH.md for exact params), Google OAuth, GitHub OAuth.
- Session cookie `better-auth.session_token`: HttpOnly, SameSite=Lax, 7d expiry, 1d idle expiry (`requireAuth` enforces both). Bearer tokens accepted for API clients (token == session token value).
- CSRF: better-auth requires a trusted `Origin` on POSTs; origins from `core/origins.ts` (single source shared with Express CORS + socket.io).

## TOTP 2FA (P0-A-06)

UI: workshop Settings → Security (`TwoFactorSettings.tsx`); challenge flow on `LoginPage`.

Lifecycle:

1. **Enable** — `POST /api/auth/two-factor/enable {password}` → `{totpURI, backupCodes}`. Backup codes are returned exactly once. Unverified state: `user.two_factor_enabled = 0`, `two_factor.verified = 0` — sign-in is NOT challenged yet (no mid-setup lockout).
2. **Verify** — `POST /api/auth/two-factor/verify-totp {code}` (Bearer). Flips `verified` + `two_factor_enabled`. **Session rotates**: the pre-verify Bearer token is revoked server-side; only the new session (cookie / `set-auth-token` header) works. The response body's `token`/`user` fields are stale echoes — never trust them (verified empirically 2026-09-13).
3. **Challenge** — subsequent sign-ins return `{twoFactorRedirect: true, twoFactorMethods: ['totp']}` and a signed `2fa-*` cookie instead of a token.
4. **Complete** — `POST /two-factor/verify-totp {code}` with the `2fa` cookie (no Authorization) → `{token}` — a working session usable for `two-factor/disable`.
5. **Disable** — `POST /two-factor/disable {password}` clears the `two_factor` row and resets the flag.

Hardening:

- Enable/disable require the account password (better-auth `sensitiveSessionMiddleware`).
- 5 wrong challenge codes → temporary lock (better-auth `attemptsConfig`), backed by the `mfa` rate bucket (10/min/IP).
- Secrets stored symmetrically encrypted with `BETTER_AUTH_SECRET`; backup codes hashed.
- Existing users are never forced into 2FA; high-privilege accounts are capable of it (tested).

## Login hardening

- Audit log on every successful login (`databaseHooks.session.create.after` → `audit_logs`).
- Failed logins rate-limited: auth bucket 10/15min keyed IP+email — 429 Persian error, `Retry-After: 900`.
- No email verification / password reset exists by design (no SMTP); admin password recovery = direct DB hash write (see AUTH.md).
