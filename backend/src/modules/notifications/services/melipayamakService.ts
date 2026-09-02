/**
 * Melipayamak outbound SMS leaf.
 *
 * Two REST flavors, tried in order:
 *  1. Console REST — POST console.melipayamak.com/api/send/simple/{apiKey},
 *     body { from, to, text }. Needs a console-generated key.
 *  2. Legacy panel REST — POST rest.payamak-panel.com/api/SendSMS/SendSMS,
 *     body { username, password, to, from, text }. Here MELIPAYAMAK_USERNAME
 *     is the panel username (sender line) and MELIPAYAMAK_API doubles as the
 *     panel password. Only used when the console rejects the key as invalid,
 *     so a console-key deployment never changes behavior.
 *
 * Credentials are resolved from the notification_settings JSON blob first
 * (saved from the admin UI) and fall back to .env
 * (MELIPAYAMAK_API / MELIPAYAMAK_USERNAME) so existing deployments keep
 * working until values are saved from the UI.
 *
 * Domestic service — requests are NEVER routed through a proxy.
 */

const CONSOLE_BASE = 'https://console.melipayamak.com/api';
const PANEL_BASE = 'https://rest.payamak-panel.com/api';

const REQUEST_TIMEOUT_MS = 10_000;

/** Resolved (DB → env) Melipayamak credentials for one send. */
export interface MelipayamakCredentials {
    /** Legacy panel password OR console API key (same UI field). */
    apiKey: string;
    /** Sender line (خط ارسال). */
    fromNumber: string;
    /** Legacy panel login; empty when only console credentials exist. */
    panelUsername: string;
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
 * fromNumber = sender line (خط ارسال, UI field / MELIPAYAMAK_USERNAME).
 * panelUsername = legacy panel login (MELIPAYAMAK_PANEL_USERNAME, env only).
 */
export function resolveMelipayamakCredentials(
    stored?: Partial<{ apiKey: string; fromNumber: string }>,
): MelipayamakCredentials {
    return {
        apiKey: (stored?.apiKey || process.env.MELIPAYAMAK_API || '').trim(),
        fromNumber: (stored?.fromNumber || process.env.MELIPAYAMAK_USERNAME || '').trim(),
        panelUsername: (process.env.MELIPAYAMAK_PANEL_USERNAME || '').trim(),
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

/** Outcome of one endpoint attempt, normalized across the two flavors. */
interface EndpointAttempt {
    /** null = accepted; otherwise a Persian error for the admin. */
    error: string | null;
    /** True when the endpoint rejected the *credentials themselves* — the
     *  signal to try the other flavor before giving up. */
    authRejected: boolean;
    /** Delivery receipt id when the endpoint accepted the send. */
    recId?: string | number;
}

/** Narrow an arbitrary JSON body to a loose string field, '' when absent. */
function stringField(body: unknown, field: string): string {
    if (body && typeof body === 'object' && field in body) {
        const value = (body as Record<string, unknown>)[field];
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
    }
    return '';
}

/** POST JSON and parse the response body, or fail with a Persian reason. */
async function postJson(
    url: string,
    body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown } | { ok: boolean; status: number; body: null }> {
    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (err) {
        const reason = err instanceof Error && err.name ? err.name : 'خطای شبکه';
        throw new Error(`ارتباط با پنل ملی‌پیامک برقرار نشد (${reason})`);
    }
    try {
        return { ok: response.ok, status: response.status, body: await response.json() };
    } catch {
        return { ok: response.ok, status: response.status, body: null };
    }
}

/** Console REST attempt: POST /api/send/simple/{apiKey}. */
async function tryConsole(
    apiKey: string,
    fromNumber: string,
    to: string,
    text: string,
): Promise<EndpointAttempt> {
    const { ok, status, body } = await postJson(`${CONSOLE_BASE}/send/simple/${apiKey}`, {
        from: fromNumber,
        to,
        text,
    });
    if (ok) {
        const recIdRaw = stringField(body, 'recId');
        return { error: null, authRejected: false, recId: recIdRaw || undefined };
    }
    if (body === null) return { error: `پاسخ نامعتبر از ملی‌پیامک (کد ${status})`, authRejected: false };

    // Console failure payload: { status: '<persian message>' } with HTTP 400.
    const message = stringField(body, 'status');
    const authRejected = status === 400 && /معتبر نیست/.test(message);
    return {
        error: `ارسال پیامک ناموفق بود${message ? ` (${message})` : ` (کد ${status})`}`,
        authRejected,
    };
}

/** Legacy panel REST attempt: POST /api/SendSMS/SendSMS. */
async function tryLegacyPanel(
    apiKey: string,
    panelUsername: string,
    fromNumber: string,
    to: string,
    text: string,
): Promise<EndpointAttempt> {
    const { ok, status, body } = await postJson(`${PANEL_BASE}/SendSMS/SendSMS`, {
        // Legacy flavor: username/password = panel login (env), from = sender line.
        username: panelUsername,
        password: apiKey,
        to,
        from: fromNumber,
        text,
    });
    if (body === null) return { error: `پاسخ نامعتبر از ملی‌پیامک (کد ${status})`, authRejected: false };

    // Panel answers HTTP 200 with { Value, RetStatus, StrRetStatus } even on
    // failure. RetStatus 1 = Ok and the recId lands in Value.
    const retStatusRaw = stringField(body, 'RetStatus');
    const retStatus = Number(retStatusRaw);
    if (ok && retStatus === 1) {
        const recIdRaw = stringField(body, 'Value');
        return { error: null, authRejected: false, recId: recIdRaw || undefined };
    }

    // RetStatus 0 (UserNameAndPasswordFailed) → wrong panel credentials.
    const strRetStatus = stringField(body, 'StrRetStatus');
    return {
        error: `ارسال پیامک ناموفق بود${strRetStatus ? ` (${strRetStatus})` : ` (کد ${status})`}`,
        authRejected: retStatus === 0,
    };
}

/**
 * Sends a single simple SMS. Tries the console REST first; when the console
 * rejects the key as invalid (a legacy-panel credential set), retries via the
 * legacy panel REST. Rejects with a Persian message on failure.
 */
export async function sendMelipayamakSms(
    to: string,
    text: string,
    stored?: Partial<{ apiKey: string; fromNumber: string }>,
): Promise<MelipayamakSendResult> {
    const { apiKey, fromNumber, panelUsername } = resolveMelipayamakCredentials(stored);
    if (!apiKey || !fromNumber) throw new MelipayamakNotConfiguredError();

    const normalizedTo = normalizeMobilePhone(to);
    if (!normalizedTo) throw new Error('شماره موبایل گیرنده معتبر نیست (قالب ۰۹xxxxxxxxx)');

    const consoleAttempt = await tryConsole(apiKey, fromNumber, normalizedTo, text);
    let attempt: EndpointAttempt = consoleAttempt;
    if (consoleAttempt.authRejected && panelUsername) {
        attempt = await tryLegacyPanel(apiKey, panelUsername, fromNumber, normalizedTo, text);
    }

    if (attempt.error) throw new Error(attempt.error);
    return { recId: attempt.recId };
}
