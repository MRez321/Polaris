import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Side-effect module: MUST be the first import of server.ts so the crash
// guards and boot diagnostics run before any other module (better-auth config,
// DB pool) is evaluated.

dotenv.config();

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

logStartupDiagnostics();
