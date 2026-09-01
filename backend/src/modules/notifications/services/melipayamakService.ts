/**
 * Melipayamak Console REST leaf — outbound SMS only.
 *
 * Docs: https://www.melipayamak.com/api/ (کنسول ملی پیامک, REST + token).
 * Endpoint: POST https://console.melipayamak.com/api/send/simple/{apiKey}
 * Body: { from, to, text } — fromNumber (e.g. 9015867713) is the sender line.
 *
 * Credentials are resolved from the notification_settings JSON blob first
 * (saved from the admin UI) and fall back to .env
 * (MELIPAYAMAK_API / MELIPAYAMAK_USERNAME) so existing deployments keep
 * working until values are saved from the UI.
 *
 * Domestic service — requests are NEVER routed through a proxy.
 */

const CONSOLE_BASE = 'https://console.melipayamak.com/api';

/** Resolved (DB → env) Melipayamak credentials for one send. */
export interface MelipayamakCredentials {
    /** Console REST API key (GUID). */
    apiKey: string;
    /** Sender line, e.g. 9015867713. */
    fromNumber: string;
}

/** Throw when no credentials for the SMS panel are configured. */
export class MelipayamakNotConfiguredError extends Error {
    constructor() {
        super('اطلاعات اتصال به پنل پیامکی تنظیم نشده است');
        this.name = 'MelipayamakNotConfiguredError';
    }
}

/**
 * Resolves credentials from the settings blob, falling back to env vars.
 * The env var MELIPAYAMAK_USERNAME holds the sender line (historical name).
 */
export function resolveMelipayamakCredentials(
    stored?: Partial<{ apiKey: string; fromNumber: string }>,
): MelipayamakCredentials {
    return {
        apiKey: (stored?.apiKey || process.env.MELIPAYAMAK_API || '').trim(),
        fromNumber: (stored?.fromNumber || process.env.MELIPAYAMAK_USERNAME || '').trim(),
    };
}

export function isMelipayamakConfigured(
    stored?: Partial<{ apiKey: string; fromNumber: string }>,
): boolean {
    const { apiKey, fromNumber } = resolveMelipayamakCredentials(stored);
    return Boolean(apiKey && fromNumber);
}

export interface MelipayamakSendResult {
    recId?: string | number;
    count?: number;
}

/** Normalizes 09… / +989… / 989… into the raw local 09xxxxxxxxx form. */
export function normalizeMobilePhone(input: string): string | null {
    const digits = input.replace(/[^\d+]/g, '');
    const local = digits.replace(/^\+?98/, '0');
    return /^09\d{9}$/.test(local) ? local : null;
}

/**
 * Sends a single simple SMS. Rejects with a Persian message on transport
 * failure, an HTTP error status, or a Melipayamak error payload.
 */
export async function sendMelipayamakSms(
    to: string,
    text: string,
    stored?: Partial<{ apiKey: string; fromNumber: string }>,
): Promise<MelipayamakSendResult> {
    const { apiKey, fromNumber } = resolveMelipayamakCredentials(stored);
    if (!apiKey || !fromNumber) throw new MelipayamakNotConfiguredError();

    const normalizedTo = normalizeMobilePhone(to);
    if (!normalizedTo) throw new Error('شماره موبایل گیرنده معتبر نیست (قالب ۰۹xxxxxxxxx)');

    let response: Response;
    try {
        response = await fetch(`${CONSOLE_BASE}/send/simple/${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromNumber, to: normalizedTo, text }),
            signal: AbortSignal.timeout(10_000),
        });
    } catch (err) {
        const reason = err instanceof Error && err.name ? err.name : 'خطای شبکه';
        throw new Error(`ارتباط با پنل ملی‌پیامک برقرار نشد (${reason})`);
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw new Error(`پاسخ نامعتبر از ملی‌پیامک (کد ${response.status})`);
    }

    if (!response.ok) {
        // Console answers with a numeric/string code in `value` on failure.
        const payload = body as { value?: string | number; message?: string };
        throw new Error(
            `ارسال پیامک ناموفق بود${payload.value !== undefined ? ` (کد ${payload.value})` : ` (کد ${response.status})`}`,
        );
    }

    const payload = body as { recId?: string | number; count?: number };
    return { recId: payload.recId, count: payload.count };
}
