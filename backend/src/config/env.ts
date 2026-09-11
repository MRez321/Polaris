/**
 * Shared environment helpers. Loaded AFTER startup.ts has validated the
 * critical secrets, so the rest of the app can ask "is this production?"
 * from one place instead of each module guessing.
 *
 * Kept separate from config/db.ts (which eagerly creates the MySQL pool on
 * import) so light modules can import this without side effects.
 */

/**
 * True when the deployment should be treated as production for security
 * posture. cPanel/LiteSpeed often leaves NODE_ENV unset, so an https
 * BETTER_AUTH_URL is also treated as production. Mirrors the check in
 * startup.ts (kept in sync by hand — see assertProductionSecrets).
 */
export function isProduction(): boolean {
    return (
        process.env.NODE_ENV === 'production' ||
        (process.env.BETTER_AUTH_URL ?? '').startsWith('https://')
    );
}
