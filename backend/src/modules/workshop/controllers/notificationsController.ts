import type { Request, Response } from 'express';

import {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../services/notificationsService.js';
import { pathParam } from '../../../core/utils/apiError.js';

/** Merged stored-event + live-derived feed for the workshop header bell. */
export async function getWorkshopNotifications(_req: Request, res: Response): Promise<void> {
    res.json(await listNotifications());
}

export async function readWorkshopNotification(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه اعلان');
    await markNotificationRead(id);
    res.json({ message: 'اعلان خوانده شد' });
}

export async function readAllWorkshopNotifications(_req: Request, res: Response): Promise<void> {
    await markAllNotificationsRead();
    res.json({ message: 'همه اعلان‌ها خوانده شدند' });
}
