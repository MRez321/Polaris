/**
 * Security headers + Content-Security-Policy (P0-A-08).
 *
 * CSP scoped to what Polaris actually uses:
 *  - default-src 'self' — Vite assets, socket.io (same-origin ws upgrade),
 *    backend-served SPA all pass
 *  - script-src 'self' 'unsafe-inline' — index.html ships a pre-paint theme
 *    script and an inline JSON-LD block; vite build inlines small assets.
 *    (A hash-based policy would break every rebuild's derived CSS; the
 *    pre-paint script must run before first paint so defer is not an option.)
 *  - style-src 'self' 'unsafe-inline' — Tailwind utility classes + a
 *    runtime-injected <style id="brand-palette"> block from derive-palette.js
 *  - font-src fonts.gstatic.com; style-src adds fonts.googleapis.com (CSS)
 *  - img-src 'self' data: — uploads + inline SVG favicons + OG images
 *  - connect-src 'self' — API calls, socket.io ws(s)://same-origin
 *  - frame-ancestors 'none'; base-uri 'self'; object-src 'none'
 *
 * Google sign-in is a top-level redirect (accounts.google.com → /api/auth/
 * callback/google): navigation redirects are not restricted by CSP
 * (form-action covers form targets only), so no entry is required.
 */
import type { NextFunction, Request, Response } from 'express';

import { IS_PRODUCTION } from '../security/env.js';

const CSP = [
    "default-src 'self'",
    // Pre-paint theme script + JSON-LD are inline; derive-palette injects styles.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://polarisstyle.ir",
    "connect-src 'self'",
    // OAuth-popups are not used; framing is never legitimate.
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
].join('; ');

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), interest-cohort=()');
    res.setHeader('Content-Security-Policy', CSP);

    // HSTS only behind HTTPS in production; the local dev server runs plain
    // HTTP on localhost and a stray header would force-fail mixed setups.
    if (IS_PRODUCTION && req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
}
