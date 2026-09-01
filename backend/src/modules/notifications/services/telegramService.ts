/**
 * Telegram Bot API leaf. Sends text messages via
 * https://api.telegram.org/bot<token>/sendMessage.
 *
 * Credentials are resolved from the notification_settings JSON blob first
 * (saved from the admin UI) and fall back to .env
 * (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / TELEGRAM_PROXY_URL) so existing
 * deployments keep working until values are saved from the UI.
 *
 * api.telegram.org is blocked in Iran: when a proxy URL is configured, every
 * request to the API is routed through it via an undici ProxyAgent
 * dispatcher (HTTP/HTTPS CONNECT proxies only — SOCKS is not supported).
 * The proxy applies to Telegram traffic only; Melipayamak is domestic and
 * stays direct.
 *
 * Fire-and-forget semantics live in notificationService; this module only
 * knows the wire protocol.
 */

import { request as undiciRequest, ProxyAgent } from 'undici';

const API_BASE = 'https://api.telegram.org';

/** Resolved (DB → env) Telegram credentials for one send. */
export interface TelegramCredentials {
    botToken: string;
    chatId: string;
    /** HTTP(S) proxy URL or '' for a direct connection. */
    proxyUrl: string;
}

/** Throw when no credentials for the Telegram bot are configured. */
export class TelegramNotConfiguredError extends Error {
    constructor() {
        super('اطلاعات اتصال به تلگرام تنظیم نشده است');
        this.name = 'TelegramNotConfiguredError';
    }
}

/**
 * Resolves credentials from the settings blob, falling back to env vars.
 * `botToken`/`chatId` must be non-empty; `proxyUrl` may be ''.
 */
export function resolveTelegramCredentials(
    stored?: Partial<{ botToken: string; chatId: string; proxyUrl: string }>,
): TelegramCredentials {
    return {
        botToken: (stored?.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim(),
        chatId: (stored?.chatId || process.env.TELEGRAM_CHAT_ID || '').trim(),
        proxyUrl: (stored?.proxyUrl || process.env.TELEGRAM_PROXY_URL || '').trim(),
    };
}

export function isTelegramConfigured(
    stored?: Partial<{ botToken: string; chatId: string; proxyUrl: string }>,
): boolean {
    const { botToken, chatId } = resolveTelegramCredentials(stored);
    return Boolean(botToken && chatId);
}

/** One ProxyAgent per proxy URL, cached for the process lifetime. */
const proxyAgents = new Map<string, ProxyAgent>();

function proxyDispatcher(proxyUrl: string): ProxyAgent | undefined {
    if (!/^https?:\/\//i.test(proxyUrl)) return undefined;
    let agent = proxyAgents.get(proxyUrl);
    if (!agent) {
        agent = new ProxyAgent({ uri: proxyUrl });
        proxyAgents.set(proxyUrl, agent);
    }
    return agent;
}

export interface TelegramSendResult {
    ok: boolean;
    messageId?: number;
    error?: string;
}

/** Bot identity from getMe — powers the t.me deep link in the settings UI. */
export interface TelegramBotIdentity {
    username: string;
    firstName?: string;
}

/**
 * Calls a Telegram Bot API method with the resolved credentials, routing
 * through the configured proxy when present. `timeoutMs` bounds the round
 * trip so UI-triggered identity lookups can stay snappy.
 */
async function telegramApi<T>(
    method: string,
    credentials: TelegramCredentials,
    body?: Record<string, unknown>,
    timeoutMs = 10_000,
): Promise<T> {
    const { botToken, chatId, proxyUrl } = credentials;
    if (!botToken || !chatId) throw new TelegramNotConfiguredError();

    const dispatcher = proxyDispatcher(proxyUrl);
    if (proxyUrl && !dispatcher) {
        throw new Error('آدرس پروکسی معتبر نیست (باید با http:// یا https:// شروع شود)');
    }

    let response: { statusCode: number; body: { json: () => Promise<unknown> } };
    try {
        response = await undiciRequest(`${API_BASE}/bot${botToken}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body ?? {}),
            headersTimeout: timeoutMs,
            bodyTimeout: timeoutMs,
            ...(dispatcher ? { dispatcher } : {}),
        });
    } catch (err) {
        const reason =
            err instanceof Error && err.message
                ? err.message
                : 'خطای شبکه';
        throw new Error(
            proxyUrl
                ? `ارتباط با تلگرام از طریق پروکسی برقرار نشد (${reason})`
                : `ارتباط با تلگرام برقرار نشد (${reason})`,
        );
    }

    let payload: unknown;
    try {
        payload = await response.body.json();
    } catch {
        throw new Error(`پاسخ نامعتبر از تلگرام (کد ${response.statusCode})`);
    }

    const typed = payload as { ok?: boolean; result?: T; description?: string };
    if (response.statusCode < 200 || response.statusCode >= 300 || !typed.ok) {
        throw new Error(
            typed.description ?? `درخواست به تلگرام ناموفق بود (کد ${response.statusCode})`,
        );
    }
    return typed.result as T;
}


/**
 * Sends a plain-text message to the configured chat. Rejects on transport
 * failure or when the API answers ok:false — callers convert that into a
 * user-facing Persian message.
 */
export async function sendTelegramMessage(
    text: string,
    stored?: Partial<{ botToken: string; chatId: string; proxyUrl: string }>,
): Promise<TelegramSendResult> {
    const credentials = resolveTelegramCredentials(stored);
    const result = await telegramApi<{ message_id?: number }>('sendMessage', credentials, {
        chat_id: credentials.chatId,
        text,
        // No parse_mode: order text is free-form Persian and must
        // never break Telegram's HTML/markdown parser.
        disable_web_page_preview: true,
    });
    return { ok: true, messageId: result.message_id };
}

/**
 * Resolves the bot's @username via getMe (through the proxy when set) so the
 * settings UI can link straight to the chat the messages are delivered to.
 * Returns null when the bot is unreachable — the UI then hides the link.
 */
export async function resolveTelegramBotUsername(
    stored?: Partial<{ botToken: string; chatId: string; proxyUrl: string }>,
    timeoutMs = 10_000,
): Promise<TelegramBotIdentity | null> {
    try {
        const credentials = resolveTelegramCredentials(stored);
        const me = await telegramApi<{ id: number; username?: string; first_name?: string }>(
            'getMe',
            credentials,
            undefined,
            timeoutMs,
        );
        return me.username ? { username: me.username, firstName: me.first_name } : null;
    } catch {
        return null;
    }
}
