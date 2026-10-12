/**
 * P0-D: Sales Channel controller.
 *
 * Routes (mounted in router.ts at /api/workshop):
 *   GET /sales-channels       → listSalesChannels
 *   GET /sales-channels/:id   → getSalesChannel
 */
import type { Request, Response } from 'express';

import * as svc from '../services/salesService.js';
import { toSalesChannelDto } from '../../../models/mappers.js';
import { pathParam } from '../../../core/utils/apiError.js';

/** Admin: list all sales channels (website, instagram, sellers, etc.). */
export async function listSalesChannels(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listSalesChannels();
    res.json(rows.map(toSalesChannelDto));
}

/** Admin: fetch a single sales channel. */
export async function getSalesChannel(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کانال فروش');
    const row = await svc.getSalesChannel(id);
    res.json(toSalesChannelDto(row));
}
