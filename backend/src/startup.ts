import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Side-effect module: MUST be the first import of server.ts so the crash
// guards and boot diagnostics run before any other module (better-auth config,
// DB pool) is evaluated.

dotenv.config();

import { isProduction } from './config/env.js';

/**
 * Fail-closed secret gate for production. In production the auth secret
 * MUST be present and strong (>= 32 chars — better-auth signs/encrypts
 * sessions and 2FA secrets with it); a weak or missing secret would leave
 * every token forgeable. Dev keeps running so the local environment is
 * never blocked by this check.
 */
function assertProductionSecrets(): void {
    if (!isProduction()) return;

    const secret = process.env.BETTER_AUTH_SECRET ?? '';
    if (secret.length < 32) {
        throw new Error(
            'Required production secret is not configured: BETTER_AUTH_SECRET must be set to a random value of at least 32 characters (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
        );
    }
}

/**
 * Logs deployment-critical configuration (names only, never secrets) so the
 * cPanel Node app log shows exactly what is missing when startup fails.
 */
function logStartupDiagnostics(): void {
    const cwd = process.cwd();
    console.log(`🩺 cwd: ${cwd} | .env present: ${fs.existsSync(path.join(cwd, '.env'))}`);

    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'BETTER_AUTH_SECRET'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.warn(`⚠️  Missing env vars: ${missing.join(', ')}`);
    }

    console.log(
        `🗄️  DB target: ${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME ?? 'polaris'} as "${process.env.DB_USER ?? 'root'}"`,
    );
    console.log(`🔐 Deployment mode: ${isProduction() ? 'production' : 'development'}`);
}

// Crash guards: on cPanel shared hosting a dead process becomes an opaque 503
// page served by the web server. Log loudly so the Node app log shows the cause.
// uncaughtException leaves the process in an unknown state → exit for a clean
// Passenger restart; unhandled rejections are logged and survived.
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception, shutting down:', err);
    process.exit(1);
});

assertProductionSecrets();
logStartupDiagnostics();
