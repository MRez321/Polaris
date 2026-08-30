import type { Request, Response } from 'express';

import dbPool from '../config/db.js';

/**
 * Connection check: proves the MySQL database is reachable and data can be
 * saved — not just that the Node process is up. Returns 503 when the DB is
 * down so clients report "cannot save data". Global endpoint (uptime probes);
 * deliberately outside the workshop module.
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
