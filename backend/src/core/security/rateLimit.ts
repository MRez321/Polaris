/**
 * In-memory rate limiter (P0-A-07).
 *
 * Fixed-window counters keyed by client IP (and, for credential endpoints,
 * IP+identifier so distributed guesses against ONE account get throttled
 * without penalizing all users behind a NAT).
 *
 * Constraints that shaped this design:
 *  - Shared hosting: no Redis. Single Express process → in-memory Map is
 *    correct for the deployment; multi-instance setups would need a shared
 *    store (documented in docs/security).
 *  - `trust proxy` is ON (cPanel/Caddy front the app), so req.ip honors
 *    X-Forwarded-For. A spoofed XFF on a misconfigured proxy is a known
 *    limitation documented with the headers decision.
 *
 * Buckets:
 *  - auth       10 / 15 min  per IP+identifier — sign-in/sign-up/email-send
 *               (better-auth's own per-route limits still apply beneath)
 *  - mfa        10 / 1 min   per IP — /two-factor/* (belt-and-braces above
 *               the plugin's built-in 3/10s)
 *  - sensitive  20 / 1 min   per IP — backup run/delete/download, settings
 *               PUTs, notification test sends
 *  - general    180 / 1 min per IP — every other /api route
 */
import type { NextFunction, Request, Response } from 'express';

interface WindowState {
    count: number;
    resetAt: number;
}

/** Map key → current window. Swept lazily on write; bounded by key count. */
const windows = new Map<string, WindowState>();

/** Last time a sweep removed expired entries. */
let lastSweep = 0;

function sweep(now: number): void {
    // One sweep per minute at most — never a hot-path scan.
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, state] of windows) {
        if (state.resetAt <= now) windows.delete(key);
    }
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

function hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    sweep(now);

    const state = windows.get(key);
    if (!state || state.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }
    if (state.count < limit) {
        state.count += 1;
        return { allowed: true, remaining: limit - state.count, retryAfterSeconds: 0 };
    }
    return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
}

function clientIp(req: Request): string {
    // trust proxy is enabled → req.ip is already X-Forwarded-For-derived.
    return req.ip ?? 'unknown';
}

/** Persian message for the 429 body — the { error } shape the frontend reads. */
const TOO_MANY_REQUESTS = 'درخواست‌های بیش از حد؛ لطفاً کمی بعد دوباره تلاش کنید';

function reject(res: Response, retryAfterSeconds: number): void {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: TOO_MANY_REQUESTS });
}

// ---------------------------------------------------------------------------
// Bucket presets
// ---------------------------------------------------------------------------

const BUCKETS = {
    auth: { limit: 10, windowMs: 15 * 60_000 },
    mfa: { limit: 10, windowMs: 60_000 },
    sensitive: { limit: 20, windowMs: 60_000 },
    general: { limit: 180, windowMs: 60_000 },
} as const;

type BucketName = keyof typeof BUCKETS;

function limiter(bucket: BucketName) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { limit, windowMs } = BUCKETS[bucket];
        const key = `${bucket}:${clientIp(req)}`;
        const result = hit(key, limit, windowMs);
        if (!result.allowed) {
            reject(res, result.retryAfterSeconds);
            return;
        }
        next();
    };
}

/**
 * Credential-endpoint limiter: IP + submitted identifier. The identifier is
 * taken from the parsed JSON body (email for sign-in/sign-up) so password
 * guessing against one account trips the limit even when spread across the
 * rest of the API surface. Body-less requests fall back to IP-only.
 */
function authIdentifierLimiter(req: Request, res: Response, next: NextFunction): void {
    const { limit, windowMs } = BUCKETS.auth;
    const identifier =
        typeof req.body === 'object' && req.body !== null && typeof (req.body as Record<string, unknown>).email === 'string'
            ? ((req.body as Record<string, string>).email as string).trim().toLowerCase()
            : '';
    const key = `auth:${clientIp(req)}:${identifier}`;
    const result = hit(key, limit, windowMs);
    if (!result.allowed) {
        reject(res, result.retryAfterSeconds);
        return;
    }
    next();
}

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** better-auth credential routes (relative to /api/auth). */
const AUTH_CREDENTIAL_PATHS = new Set([
    '/sign-in/email',
    '/sign-up/email',
    '/sign-in/social',
    '/forgot-password',
    '/reset-password',
    '/two-factor/enable',
    '/two-factor/disable',
    '/two-factor/generate-backup-codes',
]);

/** MFA verification routes — tighter window, IP-only. */
const MFA_PATHS = new Set([
    '/two-factor/verify-totp',
    '/two-factor/verify-otp',
    '/two-factor/verify-backup-code',
    '/two-factor/send-otp',
]);

/** Business routes (relative to /api) needing the sensitive bucket. */
const SENSITIVE_PATTERNS: readonly { method: string; regex: RegExp }[] = [
    { method: 'POST', regex: /^\/workshop\/backups\/run$/ },
    { method: 'POST', regex: /^\/workshop\/notifications\/test\// },
    { method: 'DELETE', regex: /^\/workshop\/backups\/[^/]+$/ },
    { method: 'GET', regex: /^\/workshop\/backups\/[^/]+\/download$/ },
    { method: 'PUT', regex: /^\/workshop\/(backups|notifications)\/settings$/ },
    { method: 'POST', regex: /^\/(gallery|blog)$/ },
    { method: 'DELETE', regex: /^\/(gallery|blog)\// },
];

/** True when the path (relative to /api/auth) is a credential route. */
export function isAuthCredentialPath(authSubPath: string): boolean {
    return AUTH_CREDENTIAL_PATHS.has(authSubPath);
}

/** True when the path (relative to /api/auth) is an MFA verify route. */
export function isMfaPath(authSubPath: string): boolean {
    return MFA_PATHS.has(authSubPath);
}

function classifySensitive(apiPath: string, method: string): boolean {
    return SENSITIVE_PATTERNS.some((p) => p.method === method && p.regex.test(apiPath));
}

/**
 * Express middleware tree (mounted BEFORE all /api routes, including
 * better-auth): classifies and applies the right bucket.
 */
export function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();
    const path = req.path; // relative to mount point /api

    // Static/SPA assets are not rate limited (served before this middleware
    // in app.ts anyway); OPTIONS preflight is never limited.
    if (method === 'OPTIONS') {
        next();
        return;
    }

    if (path === '/auth' || path.startsWith('/auth/')) {
        const sub = path.slice('/auth'.length) || '/';
        if (isMfaPath(sub)) {
            limiter('mfa')(req, res, next);
            return;
        }
        if (isAuthCredentialPath(sub)) {
            authIdentifierLimiter(req, res, next);
            return;
        }
        // Other /api/auth traffic (get-session, sign-out, callback): general.
        limiter('general')(req, res, next);
        return;
    }

    if (classifySensitive(path, method)) {
        limiter('sensitive')(req, res, next);
        return;
    }

    limiter('general')(req, res, next);
}
