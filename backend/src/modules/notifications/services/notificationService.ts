import { eq } from 'drizzle-orm';

import { db } from '../../../config/drizzle.js';
import { notificationSettings } from '../../../schema/index.js';
import type { NotificationSettings, Order } from '../../../types/index.js';
import {
    sendTelegramMessage,
    isTelegramConfigured,
    resolveTelegramBotUsername,
} from './telegramService.js';
import { sendMelipayamakSms, isMelipayamakConfigured, normalizeMobilePhone } from './melipayamakService.js';

const SETTINGS_ROW_ID = 'notifications';

/**
 * Persisted settings. `botUsername` is cached from a Telegram getMe call —
 * GET /settings must never block on Telegram (unreachable from Iran without
 * a proxy), so identity is resolved once per credential save / test send and
 * served from the blob afterwards.
 */
export interface StoredNotificationSettings extends NotificationSettings {
    botUsername: string | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS: StoredNotificationSettings = {
    telegram: {
        enabled: false,
        notifyNewOrder: false,
        botToken: '',
        chatId: '',
        proxyUrl: '',
    },
    sms: {
        enabled: false,
        notifyNewOrder: false,
        fromNumber: '',
        apiKey: '',
        recipientPhones: [],
    },
    botUsername: null,
};

// ---------------------------------------------------------------------------
// Settings persistence (single JSON-blob row, websiteService pattern)
// ---------------------------------------------------------------------------

function mergeSettings(stored: Partial<StoredNotificationSettings>): StoredNotificationSettings {
    const legacySms = stored.sms as (typeof stored.sms & { recipientPhone?: string }) | undefined;
    const storedPhones = legacySms?.recipientPhones ?? [];
    const migratedPhones =
        storedPhones.length > 0 || !legacySms?.recipientPhone
            ? storedPhones
            : [legacySms.recipientPhone];

    return {
        telegram: {
            ...DEFAULT_NOTIFICATION_SETTINGS.telegram,
            ...(stored.telegram ?? {}),
        },
        sms: {
            ...DEFAULT_NOTIFICATION_SETTINGS.sms,
            ...(legacySms ? { ...legacySms, recipientPhones: migratedPhones } : {}),
        },
        botUsername: stored.botUsername ?? null,
    };
}

export async function getNotificationSettings(): Promise<StoredNotificationSettings> {
    const rows = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.id, SETTINGS_ROW_ID));
    return mergeSettings((rows[0]?.data ?? {}) as Partial<StoredNotificationSettings>);
}

export async function updateNotificationSettings(
    patch: Partial<StoredNotificationSettings>,
): Promise<StoredNotificationSettings> {
    // Channel-level deep merge: a partial telegram/sms patch (e.g. only
    // `enabled`) must not wipe the credentials already saved in the blob.
    const current = await getNotificationSettings();
    const merged = mergeSettings({
        ...current,
        ...patch,
        telegram: { ...current.telegram, ...(patch.telegram ?? {}) },
        sms: { ...current.sms, ...(patch.sms ?? {}) },
    });
    await db
        .insert(notificationSettings)
        .values({
            id: SETTINGS_ROW_ID,
            data: merged as unknown as Record<string, unknown>,
        })
        .onDuplicateKeyUpdate({
            set: { data: merged as unknown as Record<string, unknown>, updatedAt: new Date() },
        });
    return merged;
}

/**
 * Resolves the bot @username via Telegram getMe (through the configured
 * proxy, bounded 4s) and persists it into the settings row for the t.me deep
 * link. Best-effort: unreachable Telegram just keeps the previous value.
 */
export async function refreshTelegramBotUsername(): Promise<string | null> {
    const settings = await getNotificationSettings();
    const identity = await resolveTelegramBotUsername(settings.telegram, 4_000);
    if (!identity) return settings.botUsername;
    await updateNotificationSettings({ botUsername: identity.username });
    return identity.username;
}


// ---------------------------------------------------------------------------
// Outbound notifications
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<Order['paymentMethod'], string> = {
    cod: 'پرداخت در محل',
    card_transfer: 'کارت به کارت',
};

/** Persian message describing a new storefront order. */
export function buildNewOrderMessage(order: Order): string {
    const total = order.total.toLocaleString('fa-IR');
    const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
    const paymentLabel = PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod;
    return [
        `🛕 سفارش جدید ${order.code}`,
        `مشتری: ${order.customerName} — ${order.phone}`,
        `${order.city || '—'}${order.address ? `، ${order.address}` : ''}`,
        `مبلغ: ${total} تومان (${paymentLabel})`,
        `تعداد اقلام: ${itemCount.toLocaleString('fa-IR')}`,
    ].join('\n');
}

/**
 * Fire-and-forget: notifies the workshop about a new storefront order via
 * every channel enabled in settings. Errors are swallowed after logging so
 * they can never break order creation (audit-log pattern).
 */
export function notifyNewOrder(order: Order): void {
    void (async () => {
        const settings = await getNotificationSettings().catch(() => null);
        if (!settings) return;

        if (
            settings.telegram.enabled &&
            settings.telegram.notifyNewOrder &&
            isTelegramConfigured(settings.telegram)
        ) {
            try {
                await sendTelegramMessage(buildNewOrderMessage(order), settings.telegram);
            } catch (err) {
                console.error('[notifications] telegram failed:', err instanceof Error ? err.message : err);
            }
        }

        const recipients = settings.sms.recipientPhones
            .map(normalizeMobilePhone)
            .filter((phone): phone is string => phone !== null);

        if (
            settings.sms.enabled &&
            settings.sms.notifyNewOrder &&
            recipients.length > 0 &&
            isMelipayamakConfigured(settings.sms)
        ) {
            for (const phone of recipients) {
                try {
                    await sendMelipayamakSms(phone, buildNewOrderMessage(order), settings.sms);
                } catch (err) {
                    console.error('[notifications] sms failed:', err instanceof Error ? err.message : err);
                }
            }
        }
    })();
}

// ---------------------------------------------------------------------------
// Test sends (admin-triggered from the settings tab)
// ---------------------------------------------------------------------------

export async function sendTestTelegramMessage(): Promise<void> {
    const settings = await getNotificationSettings();
    await sendTelegramMessage(
        '✅ پیام آزمایشی از سامانه اطلاع‌رسانی پولاریس — اتصال تلگرام برقرار است.',
        settings.telegram,
    );
}

export async function sendTestSms(recipient: string): Promise<void> {
    const settings = await getNotificationSettings();
    await sendMelipayamakSms(
        recipient,
        'پیام آزمایشی از سامانه اطلاع‌رسانی پولاریس — اتصال پیامک برقرار است.',
        settings.sms,
    );
}
