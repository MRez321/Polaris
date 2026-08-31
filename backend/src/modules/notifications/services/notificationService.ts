import { eq } from 'drizzle-orm';

import { db } from '../../../config/drizzle.js';
import { notificationSettings } from '../../../schema/index.js';
import type { NotificationSettings, Order } from '../../../types/index.js';
import { isTelegramConfigured, sendTelegramMessage } from './telegramService.js';
import { isMelipayamakConfigured, sendMelipayamakSms } from './melipayamakService.js';

const SETTINGS_ROW_ID = 'notifications';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    telegram: {
        enabled: false,
        notifyNewOrder: false,
    },
    sms: {
        enabled: false,
        notifyNewOrder: false,
        fromNumber: '',
        recipientPhone: '',
    },
};

// ---------------------------------------------------------------------------
// Settings persistence (single JSON-blob row, websiteService pattern)
// ---------------------------------------------------------------------------

function mergeSettings(stored: Partial<NotificationSettings>): NotificationSettings {
    return {
        telegram: { ...DEFAULT_NOTIFICATION_SETTINGS.telegram, ...(stored.telegram ?? {}) },
        sms: { ...DEFAULT_NOTIFICATION_SETTINGS.sms, ...(stored.sms ?? {}) },
    };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    const rows = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.id, SETTINGS_ROW_ID));
    return mergeSettings((rows[0]?.data ?? {}) as Partial<NotificationSettings>);
}

export async function updateNotificationSettings(
    patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
    const merged = mergeSettings({ ...(await getNotificationSettings()), ...patch });
    const existing = await db
        .select({ id: notificationSettings.id })
        .from(notificationSettings)
        .where(eq(notificationSettings.id, SETTINGS_ROW_ID));
    if (existing[0]) {
        await db
            .update(notificationSettings)
            .set({ data: merged as unknown as Record<string, unknown>, updatedAt: new Date() })
            .where(eq(notificationSettings.id, SETTINGS_ROW_ID));
    } else {
        await db.insert(notificationSettings).values({
            id: SETTINGS_ROW_ID,
            data: merged as unknown as Record<string, unknown>,
        });
    }
    return merged;
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

        if (settings.telegram.enabled && settings.telegram.notifyNewOrder && isTelegramConfigured()) {
            try {
                await sendTelegramMessage(buildNewOrderMessage(order));
            } catch (err) {
                console.error('[notifications] telegram failed:', err instanceof Error ? err.message : err);
            }
        }

        if (
            settings.sms.enabled &&
            settings.sms.notifyNewOrder &&
            settings.sms.recipientPhone &&
            isMelipayamakConfigured()
        ) {
            try {
                await sendMelipayamakSms(settings.sms.recipientPhone, buildNewOrderMessage(order));
            } catch (err) {
                console.error('[notifications] sms failed:', err instanceof Error ? err.message : err);
            }
        }
    })();
}

// ---------------------------------------------------------------------------
// Test sends (admin-triggered from the settings tab)
// ---------------------------------------------------------------------------

export async function sendTestTelegramMessage(): Promise<void> {
    await sendTelegramMessage('✅ پیام آزمایشی از سامانه اطلاع‌رسانی پولاریس — اتصال تلگرام برقرار است.');
}

export async function sendTestSms(recipient: string): Promise<void> {
    await sendMelipayamakSms(
        recipient,
        'پیام آزمایشی از سامانه اطلاع‌رسانی پولاریس — اتصال پیامک برقرار است.',
    );
}
