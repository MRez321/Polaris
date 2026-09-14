# Secrets & Credential Handling

## Server-side credential masking (P0-A-09)

`backend/src/core/utils/sanitize.ts` exports `API_MASK` (16 bullets `•••••••••••••••`) and `isMaskedCredential(value)`.

Applies to: `notification_settings.telegram.botToken`, `notification_settings.sms.apiKey` (Melipayamak), `backup_settings.cpanelToken`.

**Contract (GET):**

- Real value exists → response carries `API_MASK` bullets. The secret never leaves the server in any API response.
- Nothing configured → `''` (distinct from masked — the UI can tell "configured" from "empty" without seeing the value).

**Contract (PUT):**

- Client submits the exact mask unchanged → backend skips the field (secret survives a save-everything round-trip).
- Client submits a NEW value → overwrites.
- Client submits `''` → clears.
- The secret is never echoed in any PUT response.

This round-trip is why "save settings without touching the token" can't destroy the stored credential — verified live including a real DB-stored secret surviving a mask-resubmit.

## Log sanitization

Every `console.*` site in the backend wraps values in `sanitizeError` / `sanitizeMessage` (`core/utils/sanitize.ts`): redacts token-like and credential-shaped substrings before logging. The full list of log sites was audited 2026-09-14 — all clean; new log statements must keep the wrapper.

## Environment hygiene

- `.env` is gitignored (root pattern `.env`); only `.env.example` (placeholders) is tracked. Verified: `git ls-files | grep .env` shows only `backend/.env.example`.
- `BETTER_AUTH_SECRET` strength is asserted at boot (`core/security/env.ts`): production throws on missing/weak secret; dev warns.
- Secrets in env are fallbacks only for notifications; DB-stored values (masked at the API boundary) take precedence.
- DB password is passed to mysqldump via `MYSQL_PWD` env, never `--password=…` argv (see [backups.md](./backups.md)).

## No secrets client-side

- Frontend never stores tokens/secrets in `localStorage` — only theme, cart, favorites, PWA flags (audited).
- No `dangerouslySetInnerHTML` anywhere in `frontend/src`.
- Auth session rides the HttpOnly cookie via better-auth client.

## Where secrets intentionally appear in the repo (not bugs)

- `backend/scripts/seed.js` + `.omp/knowledge/*` carry the documented local dev admin password (`ADMIN_EMAIL`/`ADMIN_PASSWORD` envs override) — local-only; prod `.env` differs by design.
- Smoke scripts sign in with the documented dev admin password — test tooling, runs against local DB only.
