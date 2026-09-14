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
import { API_MASK, isMaskedCredential } from '../../core/utils/sanitize.js';

const IRANIAN_MOBILE = /^09\d{9}$/;

const notificationSettingsSchema = z.object({
    telegram: z
        .object({
            enabled: z.boolean().optional(),
            notifyNewOrder: z.boolean().optional(),
            botToken: z.string().max(128).optional(),
            chatId: z.string().max(64).optional(),
            proxyUrl: z.string().max(512).optional(),
            relayUrl: z.string().max(512).optional(),
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
 *
 * P0-A-09: secrets (botToken, apiKey) are MASKED server-side with the fixed
 * API_MASK. The env fallback resolution still decides the "configured"
 * badges, but the raw credential never leaves the API. A save that submits
 * the mask back unchanged keeps the stored value (handled below).
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
            relayUrl: settings.telegram.relayUrl || telegramEnv.relayUrl,
        },
        sms: {
            ...settings.sms,
            apiKey: settings.sms.apiKey || smsEnv.apiKey,
            fromNumber: settings.sms.fromNumber || smsEnv.fromNumber,
        },
    };
    // Secrets never leave the server: replace with the fixed mask.
    if (resolved.telegram.botToken) resolved.telegram.botToken = API_MASK;
    if (resolved.sms.apiKey) resolved.sms.apiKey = API_MASK;
    res.json({
        ...resolved,
        telegramConfigured: isTelegramConfigured(settings.telegram),
        smsConfigured: isMelipayamakConfigured(settings.sms),
    });
}

export async function updateNotifications(req: Request, res: Response): Promise<void> {
    // Zod's .optional() fields vs the required-fields DTO: this shape has
    // matched the merge logic for years; the assert documents the boundary.
    const parsed = notificationSettingsSchema.parse(req.body);
    const patch = parsed as Partial<NotificationSettings>;

    // P0-A-09: a submitted value that is just the mask echoed back means
    // "unchanged" — strip it so the stored credential is neither overwritten
    // by the literal mask string nor cleared by a partial PUT.
    if (patch.telegram && isMaskedCredential(patch.telegram.botToken)) {
        // Rebuild without botToken: spread-split keeps the other fields.
        const { botToken: _masked, ...rest } = patch.telegram;
        void _masked;
        patch.telegram = rest as typeof patch.telegram;
    }
    if (patch.sms && isMaskedCredential(patch.sms.apiKey)) {
        const { apiKey: _masked, ...rest } = patch.sms;
        void _masked;
        patch.sms = rest as typeof patch.sms;
    }
    const cleanPatch = patch;

    const updated = await updateNotificationSettings(cleanPatch);
    // The saved blob still holds real secrets — mask them in the response too.
    const maskedUpdated = {
        ...updated,
        telegram: { ...updated.telegram, botToken: updated.telegram.botToken ? API_MASK : '' },
        sms: { ...updated.sms, apiKey: updated.sms.apiKey ? API_MASK : '' },
    };

    // Refresh the bot @username only when Telegram credentials were just
    // saved (bounded 4s — Telegram is unreachable without a working proxy,
    // so a stalled lookup must not hang the save).
    const telegramTouched =
        !!cleanPatch.telegram && ('botToken' in cleanPatch.telegram || 'chatId' in cleanPatch.telegram);
    const botUsername = telegramTouched ? await refreshTelegramBotUsername() : updated.botUsername;

    logAudit(req.auth ?? null, 'update', 'settings', 'تنظیمات اطلاع‌رسانی به‌روزرسانی شد', req.ip);
    res.json({
        ...maskedUpdated,
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
