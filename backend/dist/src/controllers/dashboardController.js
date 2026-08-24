import { desc } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { auditLogs } from '../schema/index.js';
import { toAuditDto } from '../models/mappers.js';
import { getDashboardStats } from '../services/inventoryService.js';
export async function dashboardStats(_req, res) {
    res.json(await getDashboardStats());
}
export async function listAuditLogs(_req, res) {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
    res.json(rows.map(toAuditDto));
}
export async function health(_req, res) {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
}
//# sourceMappingURL=dashboardController.js.map