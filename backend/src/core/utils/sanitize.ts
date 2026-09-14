/**
 * Central sensitive-data sanitizer (P0-A-09).
 *
 * Recursively clones a value and redacts sensitive keys/values before they
 * reach logs, error messages or API responses. Pure — never mutates input.
 *
 * Redaction rules:
 *  1. Object keys matching SENSITIVE_KEYS → '[REDACTED]'
 *  2. Authorization header values → '[REDACTED]'
 *  3. URL query strings that smell like tokens (token=, secret=, key=)
 *  4. Bearer tokens / long JWT-shaped strings in scalar values
 */
const SENSITIVE_KEYS: Record<string, true> = {
    password: true,
    passwd: true,
    newpassword: true,
    currentpassword: true,
    secret: true,
    secrets: true,
    token: true,
    accesstoken: true,
    refreshtoken: true,
    idtoken: true,
    apikey: true,
    authorization: true,
    auth: true,
    cookie: true,
    cookies: true,
    'set-cookie': true,
    privatekey: true,
    backupcodes: true,
    backupcode: true,
    twofactorsecret: true,
    databasepassword: true,
    dbpassword: true,
    cpaneltoken: true,
    telegrambottoken: true,
    bottoken: true,
    googleclientsecret: true,
    githubclientsecret: true,
    clientsecret: true,
    melipayamakapi: true,
    sessiontoken: true,
    'session-token': true,
};

const MASK = '[REDACTED]';

/** Key match is case-insensitive and ignores non-alphanumerics (`_`, `-`, spaces). */
function isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return SENSITIVE_KEYS[normalized] === true;
}

/** JWT-ish or Bearer-ish values get masked even under innocent keys. */
function looksLikeSecretValue(value: string): boolean {
    if (/^bearer\s+/i.test(value)) return true;
    if (/^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\./.test(value)) return true; // JWT
    return false;
}

const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;

/**
 * Recursive redaction. Cycles are cut at MAX_DEPTH; enormous structures are
 * truncated so a bad log call can't DoS the process.
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
    if (depth > MAX_DEPTH) return '[DEPTH_LIMIT]';

    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === 'string') {
        const s = value as string;
        if (looksLikeSecretValue(s)) return MASK;
        // URL with token-ish query params: mask the query string.
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && /[?&](token|secret|key|password|access_token)=/i.test(s)) {
            return s.replace(/\?.*$/, '?[REDACTED]');
        }
        return s;
    }
    if (t === 'number' || t === 'boolean' || t === 'bigint') return value;
    if (t === 'function' || t === 'symbol') return `[${t}]`;

    if (Array.isArray(value)) {
        const items = value.slice(0, MAX_ARRAY_ITEMS).map((v) => sanitizeForLog(v, depth + 1));
        if (value.length > MAX_ARRAY_ITEMS) items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
        return items;
    }

    if (t === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = isSensitiveKey(k) ? MASK : sanitizeForLog(v, depth + 1);
        }
        return out;
    }
    return value;
}

/** String form of the sanitizer — for console/error/audit message paths. */
export function sanitizeMessage(value: unknown): string {
    const clean = sanitizeForLog(value);
    if (typeof clean === 'string') return clean;
    try {
        return JSON.stringify(clean);
    } catch {
        return '[UNSERIALIZABLE]';
    }
}

/** Error-aware wrapper: keeps message/name, redacts everything else. */
export function sanitizeError(err: unknown): { name: string; message: string; stack?: string } {
    const e = err instanceof Error ? err : { name: 'Error', message: String(err) };
    return {
        name: e.name,
        message: typeof e.message === 'string' ? (sanitizeMessage(e.message) as string) : MASK,
    };
}

/** Masks a secret for display: keeps first/last char, hides the middle. */
export function maskSecret(value: string | undefined | null): string {
    if (!value) return '';
    const v = String(value);
    if (v.length <= 4) return '••••';
    return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}
