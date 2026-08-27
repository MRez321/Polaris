import type { Request, Response } from 'express';
import { count, desc } from 'drizzle-orm';

import { db } from '../config/drizzle.js';
import dbPool from '../config/db.js';
import { auditLogs } from '../schema/index.js';
import { toAuditDto } from '../models/mappers.js';
import { getDashboardStats } from '../services/inventoryService.js';

export async function dashboardStats(_req: Request, res: Response): Promise<void> {
    res.json(await getDashboardStats());
}

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
    const limitRaw = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 20;
    const offsetRaw = parseInt(String(req.query.offset ?? ''), 10);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

    const [rows, totals] = await Promise.all([
        db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(auditLogs),
    ]);
    res.json({ logs: rows.map(toAuditDto), total: totals[0]?.value ?? 0 });
}

/**
 * Connection check: proves the MySQL database is reachable and data can be
 * saved — not just that the Node process is up. Returns 503 when the DB is
 * down so clients report "cannot save data".
 */
export async function health(_req: Request, res: Response): Promise<void> {
    const body = { uptime: process.uptime(), timestamp: new Date().toISOString() };
    try {
        await dbPool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', ...body });
    } catch (err) {
        console.error('❌ Health check: database unreachable:', err);
        res.status(503).json({ status: 'error', database: 'disconnected', ...body });
    }
}
