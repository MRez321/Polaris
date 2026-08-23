import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';

import { auth } from '../config/auth.js';

const handler = toNodeHandler(auth);

/**
 * better-auth owns this subtree. Express `app.all('/api/auth/*', …)` keeps
 * `req.url` intact (no mount-prefix stripping), which the handler requires.
 */
export function authHandler(req: Request, res: Response): void {
    void handler(req, res);
}
