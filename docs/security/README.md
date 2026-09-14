# Security Overview — Polaris

Polaris's security baseline (P0-A hardening, 2026-09). Each topic has a dedicated page:

- [Authentication & MFA](./authentication.md) — better-auth, TOTP 2FA lifecycle, session semantics
- [Authorization (RBAC)](./authorization.md) — roles, permission catalog, route gating
- [Rate Limiting](./rate-limiting.md) — buckets, keys, 429 contract, limitations
- [HTTP Security Headers & CSP](./headers.md) — header set, CSP rationale
- [Secrets & Credential Handling](./secrets.md) — masking round-trips, log sanitization, env hygiene
- [Backups Security](./backups.md) — concurrency lock, audit, traversal defense, MYSQL_PWD

## Verified state

The full regression is `backend/scripts/smoke-security.mjs` (44 checks, run with backend up on :3016):

```
cd backend && node scripts/smoke-security.mjs
```

Covers: 401/403 auth+RBAC, CORS, security headers, credential masking round-trips (secret survives masked resubmit, never serialized), the full 2FA matrix (always leaves admin 2FA **off**), rate-limit 429 + `Retry-After` + Persian body, backup path-traversal and concurrency (409).

## Threat model summary

| Threat | Control |
|---|---|
| Credential stuffing / brute force | auth bucket 10/15min keyed IP+email; Persian 429 + Retry-After |
| MFA code brute force | mfa bucket 10/min + better-auth 5-attempt lock |
| Session theft / replay | HttpOnly cookies, 7d expiry + 1d idle, rotation on 2FA events |
| Privilege escalation | role gates + explicit permission catalog on sensitive routes |
| XSS | CSP (no external scripts), React escaping; no `dangerouslySetInnerHTML` |
| Clickjacking | `frame-ancestors 'none'` + X-Frame-Options DENY |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Secret leakage via API | server-side masking (16 bullets), mask-echo skip on save |
| Secret leakage via logs | sanitizeError/sanitizeMessage at every log site |
| Secret leakage via process list | DB password passed to mysqldump via MYSQL_PWD env |
| Path traversal on downloads | base64url id validation → 404, smoke-tested with `../`, `..%2F`, base64url tricks |
| Backup file overwrite races | module-level run lock → 409 conflict |
| DoS via backup spam | concurrency lock + sensitive bucket |
