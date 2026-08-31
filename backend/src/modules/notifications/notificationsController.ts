import type { Request, Response } from 'express';
import { z } from 'zod';
import type { NotificationSettings } from '../../types/index.js';
import {
    getNotificationSettings,
    updateNotificationSettings,
    sendTestTelegramMessage,
    sendTestSms,
} from './services/notificationService.js';
import { isTelegramConfigured } from './services/telegramService.js';
import { isMelipayamakConfigured } from './services/melipayamakService.js';
import { logAudit } from '../../core/services/auditService.js';

const IRANIAN_MOBILE = /^09\d{9}$/;

const notificationSettingsSchema = z
    .object({
        telegram: z
            .object({
                enabled: z.boolean().optional(),
                notifyNewOrder: z.boolean().optional(),
            })
            .optional(),
        sms: z
            .object({
                enabled: z.boolean().optional(),
                notifyNewOrder: z.boolean().optional(),
                fromNumber: z.string().max(20).optional(),
                recipientPhone: z
                    .string()
                    .regex(IRANIAN_MOBILE, 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد')
                    .or(z.literal(''))
                    .optional(),
            })
            .optional(),
    })
    .optional()
    .default({});

/** Settings + env-presence badges. Credentials themselves never leave the server. */
export async function getNotifications(_req: Request, res: Response): Promise<void> {
    const settings = await getNotificationSettings();
    res.json({
        ...settings,
        telegramConfigured: isTelegramConfigured(),
        smsConfigured: isMelipayamakConfigured(),
    });
}

export async function updateNotifications(req: Request, res: Response): Promise<void> {
    const patch = notificationSettingsSchema.parse(req.body);
    const updated = await updateNotificationSettings(patch as Partial<NotificationSettings>);
    logAudit(req.auth ?? null, 'update', 'settings', 'تنظیمات اطلاع‌رسانی به‌روزرسانی شد', req.ip);
    res.json({
        ...updated,
        telegramConfigured: isTelegramConfigured(),
        smsConfigured: isMelipayamakConfigured(),
    });
}

export async function testTelegramNotification(req: Request, res: Response): Promise<void> {
    try {
        await sendTestTelegramMessage();
        logAudit(req.auth ?? null, 'create', 'notifications', 'پیام آزمایشی تلگرام ارسال شد', req.ip);
        res.json({ success: true, message: 'پیام آزمایشی تلگرام با موفقیت ارسال شد' });
    } catch (err) {
        res.status(502).json({ message: err instanceof Error ? err.message : 'ارسال پیام تلگرام ناموفق بود' });
    }
}

export async function testSmsNotification(req: Request, res: Response): Promise<void> {
    const recipient = z
        .string()
        .regex(IRANIAN_MOBILE, 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد')
        .parse(req.body?.recipient);
    try {
        await sendTestSms(recipient);
        logAudit(req.auth ?? null, 'create', 'notifications', `پیامک آزمایشی به ${recipient} ارسال شد`, req.ip);
        res.json({ success: true, message: `پیامک آزمایشی به ${recipient} ارسال شد` });
    } catch (err) {
        res.status(502).json({ message: err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود' });
    }
}
