import type { Request, Response, NextFunction } from 'express';
import { auth } from '../config/auth.js';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: typeof auth.$Infer.Session.user;
        }
    }
}

export const protectRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });

        if (!session?.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Attach user to request so controllers can use it
        req.user = session.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid session' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role || '')) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};