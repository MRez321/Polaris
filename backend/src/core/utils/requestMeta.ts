import type { Request } from 'express';

/**
 * Extracts the User-Agent header from an incoming request for audit records.
 * Returns `undefined` when the header is absent (older clients, server-side
 * calls). Truncated to 255 chars to match `audit_logs.user_agent` varchar(255).
 */
export function requestUserAgent(req: Request): string | undefined {
    const raw = req.headers['user-agent'];
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    return raw.length > 255 ? raw.slice(0, 255) : raw;
}
