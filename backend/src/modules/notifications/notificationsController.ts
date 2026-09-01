import type { Request, Response } from 'express';
import { z } from 'zod';
import type { NotificationSettings } from '../../types/index.js';
import {
    getNotificationSettings,
    updateNotificationSettings,
    refreshTelegramBotUsername,
    sendTestTelegramMessage,
    sendTestSms,
} from './services/notificationService.js';
import { isTelegramConfigured, resolveTelegramCredentials } from './services/telegramService.js';
import { isMelipayamakConfigured, resolveMelipayamakCredentials } from './services/melipayamakService.js';
import { logAudit } from '../../core/services/auditService.js';

const IRANIAN_MOBILE = /^09\d{9}$/;

const notificationSettingsSchema = z.object({
    telegram: z
        .object({
            enabled: z.boolean().optional(),
            notifyNewOrder: z.boolean().optional(),
            botToken: z.string().max(128).optional(),
            chatId: z.string().max(64).optional(),
            proxyUrl: z.string().max(512).optional(),
        })
        .optional(),
    sms: z
        .object({
            enabled: z.boolean().optional(),
            notifyNewOrder: z.boolean().optional(),
            fromNumber: z.string().max(20).optional(),
            apiKey: z.string().max(128).optional(),
            recipientPhones: z
                .array(
                    z
                        .string()
                        .regex(IRANIAN_MOBILE, 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد'),
                )
                .max(20)
                .optional(),
        })
        .optional(),
});

/**
 * Settings + resolved-credential badges + the cached bot @username for the
 * t.me deep link. Never contacts Telegram: identity is persisted in the
 * settings row by refreshTelegramBotUsername (credential save / test send).
 * Admin-only route — the UI's reveal buttons need the real stored values,
 * so they are returned as-is and masked client-side only.
 */
export async function getNotifications(_req: Request, res: Response): Promise<void> {
    const settings = await getNotificationSettings();
    // Overlay env fallbacks onto empty DB fields so the admin sees (and can
    // edit from) the credentials actually in use. First save persists them.
    const telegramEnv = resolveTelegramCredentials(settings.telegram);
    const smsEnv = resolveMelipayamakCredentials(settings.sms);
    const resolved = {
        ...settings,
        telegram: {
            ...settings.telegram,
            botToken: settings.telegram.botToken || telegramEnv.botToken,
            chatId: settings.telegram.chatId || telegramEnv.chatId,
            proxyUrl: settings.telegram.proxyUrl || telegramEnv.proxyUrl,
        },
        sms: {
            ...settings.sms,
            apiKey: settings.sms.apiKey || smsEnv.apiKey,
            fromNumber: settings.sms.fromNumber || smsEnv.fromNumber,
        },
    };
    res.json({
        ...resolved,
        telegramConfigured: isTelegramConfigured(settings.telegram),
        smsConfigured: isMelipayamakConfigured(settings.sms),
    });
}

export async function updateNotifications(req: Request, res: Response): Promise<void> {
    const patch = notificationSettingsSchema.parse(req.body) as Partial<NotificationSettings>;
    const updated = await updateNotificationSettings(patch);

    // Refresh the bot @username only when Telegram credentials were just
    // saved (bounded 4s — Telegram is unreachable without a working proxy,
    // so a stalled lookup must not hang the save).
    const telegramTouched =
        patch.telegram && ('botToken' in patch.telegram || 'chatId' in patch.telegram);
    const botUsername = telegramTouched ? await refreshTelegramBotUsername() : updated.botUsername;

    logAudit(req.auth ?? null, 'update', 'settings', 'تنظیمات اطلاع‌رسانی به‌روزرسانی شد', req.ip);
    res.json({
        ...updated,
        botUsername,
        telegramConfigured: isTelegramConfigured(updated.telegram),
        smsConfigured: isMelipayamakConfigured(updated.sms),
    });
}

export async function testTelegramNotification(req: Request, res: Response): Promise<void> {
    try {
        await sendTestTelegramMessage();
        const botUsername = await refreshTelegramBotUsername();
        logAudit(req.auth ?? null, 'create', 'notifications', 'پیام آزمایشی تلگرام ارسال شد', req.ip);
        res.json({ success: true, message: 'پیام آزمایشی تلگرام با موفقیت ارسال شد', botUsername });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'ارسال پیام تلگرام ناموفق بود';
        res.status(502).json({ message });
    }
}

export async function testSmsNotification(req: Request, res: Response): Promise<void> {
    const recipient = z
        .string()
        .regex(IRANIAN_MOBILE, 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد')
        .parse(req.body?.recipient);
    try {
        await sendTestSms(recipient);
        logAudit(req.auth ?? null, 'create', 'notifications', 'پیامک آزمایشی ارسال شد', req.ip);
        res.json({ success: true, message: `پیامک آزمایشی به ${recipient} ارسال شد` });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود';
        res.status(502).json({ message });
    }
}
