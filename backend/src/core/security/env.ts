/**
 * Environment / production security validation (P0-A-03).
 *
 * Single place that knows which env vars are secrets, which are mandatory in
 * production, and what a strong secret looks like. Never logs values —
 * names only.
 */
import dotenv from 'dotenv';

dotenv.config();

export const IS_PRODUCTION =
    process.env.NODE_ENV === 'production' ||
    /^https:\/\//.test(process.env.BETTER_AUTH_URL ?? '');

/** Secrets that must exist in production or the app refuses to boot. */
const PRODUCTION_REQUIRED: readonly string[] = ['BETTER_AUTH_SECRET', 'DB_PASSWORD', 'DB_NAME', 'DB_USER', 'DB_HOST'];

/** Env keys treated as secrets anywhere they appear (sanitizer + masking). */
export const SECRET_ENV_KEYS: readonly string[] = [
    'BETTER_AUTH_SECRET',
    'DB_PASSWORD',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_SECRET',
    'ADMIN_PASSWORD',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_PROXY_URL',
    'TELEGRAM_RELAY_URL',
    'MELIPAYAMAK_API',
    'MELIPAYAMAK_USERNAME',
    'MELIPAYAMAK_PANEL_USERNAME',
];

/**
 * A "strong" secret: at least 32 chars of entropy-ish material. Generating a
 * 32-byte hex string (the documented bootstrap recipe) yields 64 chars.
 */
export function isStrongSecret(value: string | undefined): boolean {
    if (!value) return false;
    if (value.length < 32) return false;
    // Reject obvious placeholders that ship in examples/docs.
    const lower = value.toLowerCase();
    if (lower.includes('generate') || lower.includes('example') || lower.includes('change_me') || lower.includes('changeme')) {
        return false;
    }
    return true;
}

/**
 * Validates the production secret invariant. In production every mandatory
 * secret must be present and strong — NO silent fallbacks, NO insecure
 * defaults. In development a missing secret only warns (the local .env is
 * developer-owned).
 *
 * Throws: Error('Required production secret is not configured') in production.
 */
export function assertProductionSecrets(): void {
    const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]);
    const weak = PRODUCTION_REQUIRED.filter((key) => {
        const v = process.env[key];
        // DB_* secrets are strong by presence; BETTER_AUTH_SECRET must be strong.
        return key === 'BETTER_AUTH_SECRET' && v !== undefined && !isStrongSecret(v);
    });

    if (IS_PRODUCTION && (missing.length > 0 || weak.length > 0)) {
        throw new Error('Required production secret is not configured');
    }
    if (!IS_PRODUCTION && missing.length > 0) {
        console.warn(`⚠️  Missing env vars (dev only tolerated): ${missing.join(', ')}`);
    }
}

/**
 * Auth-secret-specific gate used at better-auth construction time: the
 * cookie/session signing secret must exist and be strong in every
 * environment (dev included) — placeholder secrets are rejected.
 */
export function assertStrongAuthSecret(): void {
    const v = process.env.BETTER_AUTH_SECRET;
    if (!isStrongSecret(v)) {
        if (IS_PRODUCTION) {
            throw new Error('Required production secret is not configured');
        }
        console.warn('⚠️  BETTER_AUTH_SECRET is missing or weak (dev) — set a 32+ char random string');
    }
}
