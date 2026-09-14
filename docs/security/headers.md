# HTTP Security Headers & CSP

`backend/src/core/middleware/securityHeaders.ts`, applied globally in `app.ts`. `app.disable('x-powered-by')`.

## Header set

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | see below |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` — **only** when `NODE_ENV=production` AND the request is HTTPS (never on local HTTP) |

## CSP

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://polarisstyle.ir;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none'
```

Rationale:

- **`unsafe-inline` for script+style is deliberate.** The SPA has a pre-paint theme script (dark/light before first paint to avoid flashing), inline JSON-LD, and a runtime `brand-palette` `<style>` block. Hash-based strictness was evaluated and rejected: hashes change every rebuild and the pre-paint script is index.html-static. Third-party scripts are NOT loaded; if one is ever added, extend `script-src` explicitly — never remove the policy.
- **Fonts pinned** to Google Fonts CDN only. **Images**: self-hosted + `data:` URIs + the production domain.
- **`frame-ancestors 'none'`** (+ X-Frame-Options DENY) — clickjacking.
- **`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`** — plugin/embed and form-exfiltration hardening.

The policy was verified against the live app (public SPA, login, workshop dashboard, settings incl. 2FA QR + OTP flow, notifications) under a real browser — nothing breaks.

## CORS

Origins from `core/origins.ts` (single source shared with better-auth + socket.io). Untrusted origins get a 403 from Express CORS. Frontend dev runs on Vite :5173; prod is same-origin.
