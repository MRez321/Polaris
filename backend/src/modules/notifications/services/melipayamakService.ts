/**
 * Melipayamak Console REST leaf — outbound SMS only.
 *
 * Docs: https://www.melipayamak.com/api/ (کنسول ملی پیامک, REST + token).
 * Endpoint: POST https://console.melipayamak.com/api/send/simple/{apiKey}
 * Body: { from, to, text } — username (9015867713) is the sender line.
 * Credentials come from .env (MELIPAYAMAK_API / MELIPAYAMAK_USERNAME).
 */

const CONSOLE_BASE = 'https://console.melipayamak.com/api';

/** Throw when the env credentials for the SMS panel are missing. */
export class MelipayamakNotConfiguredError extends Error {
    constructor() {
        super('اطلاعات اتصال به پنل پیامکی تنظیم نشده است');
        this.name = 'MelipayamakNotConfiguredError';
    }
}

export function isMelipayamakConfigured(): boolean {
    return Boolean(process.env.MELIPAYAMAK_API && process.env.MELIPAYAMAK_USERNAME);
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
export async function sendMelipayamakSms(to: string, text: string): Promise<MelipayamakSendResult> {
    const token = process.env.MELIPAYAMAK_API;
    const from = process.env.MELIPAYAMAK_USERNAME;
    if (!token || !from) throw new MelipayamakNotConfiguredError();

    const normalizedTo = normalizeMobilePhone(to);
    if (!normalizedTo) throw new Error('شماره موبایل گیرنده معتبر نیست (قالب ۰۹xxxxxxxxx)');

    let response: Response;
    try {
        response = await fetch(`${CONSOLE_BASE}/send/simple/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: normalizedTo, text }),
            signal: AbortSignal.timeout(10_000),
        });
    } catch (err) {
        throw new Error(`ارتباط با پنل ملی‌پیامک برقرار نشد (${(err as Error).name ?? 'خطای شبکه'})`);
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
