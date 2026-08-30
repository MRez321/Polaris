import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../../config/auth.js';

/**
 * Attaches the better-auth session (if any) to `req.auth`.
 * Never rejects: anonymous requests continue with `req.auth = null`.
 * Downstream guards (`requireAuth`, `requireRole`) decide whether a route
 * needs a session; this middleware only attributes the actor for audit logs.
 */
export async function attachSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        req.auth = result
            ? {
                  user: {
                      id: result.user.id,
                      name: result.user.name,
                      email: result.user.email,
                      role: result.user.role ?? null,
                      image: result.user.image ?? null,
                  },
                  session: { id: result.session.id, token: result.session.token },
              }
            : null;
    } catch {
        req.auth = null;
    }
    next();
}

/**
 * Hard guard: rejects anonymous requests with a Persian 401. Mount after
 * attachSession; use for routes any authenticated role may access.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.auth) {
        res.status(401).json({ error: 'ابتدا وارد حساب کاربری خود شوید' });
        return;
    }
    next();
}

/**
 * Role guard factory. Requires an authenticated session whose role is in the
 * allowed list. Returns Persian 401/403 errors.
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth) {
            res.status(401).json({ error: 'ابتدا وارد حساب کاربری خود شوید' });
            return;
        }
        const role = req.auth.user.role ?? 'user';
        if (!roles.includes(role)) {
            res.status(403).json({ error: 'شما اجازه انجام این عمل را ندارید' });
            return;
        }
        next();
    };
}
