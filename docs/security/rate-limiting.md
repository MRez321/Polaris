# Rate Limiting

`backend/src/core/security/rateLimit.ts` — fixed-window in-memory limiter, mounted `app.use('/api', apiRateLimiter)` in `app.ts` **before** the better-auth catch-all (so auth endpoints are limited too).

## Buckets

| Bucket | Key | Limit / window | Retry-After |
|---|---|---|---|
| `auth` | IP + `req.body.email` | 10 / 15 min | 900 s |
| `mfa` | IP | 10 / 1 min | 60 s |
| `sensitive` | IP | 20 / 1 min | 60 s |
| `general` | IP | 180 / 1 min | 60 s |

- `authIdentifierLimiter` (auth bucket) reads `req.body.email` so a distributed attack on one account is throttled per-account, and one IP attacking many accounts is throttled per-IP.
- `/api/health` is exempt (monitoring must never 429).

## 429 contract

Status 429, header `Retry-After: <seconds>`, body `{"error": "درخواست‌های بیش از حد؛ لطفاً کمی بعد دوباره تلاش کنید"}` (Persian, standard `{error}` shape).

## Which bucket applies

- `/auth/*` (sign-in/sign-up/etc.) → auth
- `/two-factor/*` → mfa
- permission-declared sensitive routes → sensitive
- everything else under `/api` → general

## Limitations (accepted, documented)

- **In-memory**: per-process Map; windows reset on restart. The cPanel deployment is a single Node process — correct there. Multi-instance/load-balanced setups need a shared store (Redis or similar); until then, N processes = N× the limit.
- **`trust proxy` is `true`**: the limiter trusts `X-Forwarded-For`. Behind cPanel/Caddy this is required and the Node port isn't publicly reachable; a hypothetical direct-to-Node caller could spoof IPs. If Node is ever exposed directly, pin `app.set('trust proxy', <exact hop>)`.
- Fixed windows (not sliding) — a burst exactly at the boundary can pass 2× momentarily. Acceptable at these sizes.

## Verified

`scripts/smoke-security.mjs` §7: 11th auth attempt for a fresh identifier → 429 + Retry-After 900 + Persian body; `/api/health` unaffected while the bucket is burned.
