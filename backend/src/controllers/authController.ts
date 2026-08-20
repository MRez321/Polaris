import type { Request, Response } from 'express';
import { auth } from '../config/auth.js';

export const handleAuth = async (req: Request, res: Response) => {
    try {
        // Pass the request directly to Better Auth's handler
        await auth.handler(req, res);

        // Optional: Add audit logging here by checking req.path
        // e.g., if (req.path.includes('sign-in')) logAction(...)
    } catch (error) {
        console.error('Auth Controller Error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};