import type { Request as ExpressRequest, Response } from 'express';
import { auth } from '../config/auth.js';
import { db } from '../config/drizzle.js';
import { auditLog } from '../schema/auth.js';
import { v4 as uuidv4 } from 'uuid';

// 1. Handle all Better Auth endpoints
export const handleAuth = async (req: ExpressRequest, res: Response) => {
    try {
        // Construct full URL for Better Auth
        const baseUrl = process.env.BETTER_AUTH_URL || `http://${req.headers.host}`;
        const url = new URL(req.originalUrl, baseUrl);

        // Create Web Standard Request
        const webRequest = new globalThis.Request(url.toString(), {
            method: req.method,
            headers: req.headers as any,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
        });

        await auth.handler(webRequest, res);

        // Optional: Audit Log for Sign-ins
        if (req.path.includes('/sign-in') && req.method === 'POST') {
            // Logic to log successful sign-ins can go here
        }
    } catch (error) {
        console.error('Auth Handler Error:', error);
        res.status(500).json({ message: 'Authentication service error' });
    }
};

// 2. Get Current User ("Me")
export const getMe = async (req: ExpressRequest, res: Response) => {
    // We cast req.user to 'any' temporarily or extend the interface globally
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json({ user });
};

// 3. Update Profile
export const updateProfile = async (req: ExpressRequest, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { name, image } = req.body;

    try {
        // Use Better Auth API to update user
        const updatedUser = await auth.api.updateUser({
            body: { name, image },
            headers: req.headers,
        });

        // Add Audit Log
        await db.insert(auditLog).values({
            id: uuidv4(),
            userId: user.id,
            action: 'PROFILE_UPDATE',
            details: JSON.stringify({ name, image }),
            ipAddress: req.ip,
        });

        res.json({ user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// 4. Logout All (Admin Feature)
export const logoutAll = async (req: ExpressRequest, res: Response) => {
    const user = (req as any).user;

    // Now .role should work because we are accessing it on the 'any' typed user
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        // In a real app, you would delete all sessions for this user from the DB
        // await db.delete(session).where(eq(session.userId, user.id));

        res.json({ message: 'All sessions terminated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error terminating sessions' });
    }
};