/**
 * Telegram Bot API leaf. Sends text messages via
 * https://api.telegram.org/bot<token>/sendMessage using the credentials
 * from .env (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).
 *
 * Fire-and-forget semantics live in notificationService; this module only
 * knows the wire protocol.
 */

const API_BASE = 'https://api.telegram.org';

/** Throw when the env credentials for the Telegram bot are missing. */
export class TelegramNotConfiguredError extends Error {
    constructor() {
        super('اطلاعات اتصال به تلگرام تنظیم نشده است');
        this.name = 'TelegramNotConfiguredError';
    }
}

export function isTelegramConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export interface TelegramSendResult {
    ok: boolean;
    messageId?: number;
    error?: string;
}

/**
 * Sends a plain-text message to the configured chat. Rejects on transport
 * failure or when the API answers ok:false — callers convert that into a
 * user-facing Persian message.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new TelegramNotConfiguredError();

    let response: Response;
    try {
        response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                // No parse_mode: order text is free-form Persian and must
                // never break Telegram's HTML/markdown parser.
                disable_web_page_preview: true,
            }),
            signal: AbortSignal.timeout(10_000),
        });
    } catch (err) {
        throw new Error(`ارتباط با تلگرام برقرار نشد (${(err as Error).name ?? 'خطای شبکه'})`);
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw new Error(`پاسخ نامعتبر از تلگرام (کد ${response.status})`);
    }

    const payload = body as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (!response.ok || !payload.ok) {
        throw new Error(payload.description ?? `ارسال پیام تلگرام ناموفق بود (کد ${response.status})`);
    }

    return { ok: true, messageId: payload.result?.message_id };
}
