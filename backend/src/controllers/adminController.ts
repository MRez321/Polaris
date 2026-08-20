import type { Request, Response } from 'express';
import { db } from '../config/drizzle.js';
import { auditLog, user } from '../schema/auth.js';
import { desc } from 'drizzle-orm';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(50);
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user);
        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};