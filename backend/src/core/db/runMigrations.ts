import path from 'path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Drizzle wraps failed queries in DrizzleQueryError whose message is just
 * "Failed query: …" — the real MySQL error (errno/code/sqlMessage) only exists
 * on err.cause. Unwraps the chain so startup logs show the actual reason.
 * (scripts/migrate.js keeps a twin copy — it must not import from src.)
 */
interface CauseLike {
    code?: string;
    errno?: number;
    sqlMessage?: string;
    message?: string;
    cause?: unknown;
}

function isCauseLike(value: unknown): value is CauseLike {
    return typeof value === 'object' && value !== null;
}

export function describeError(err: unknown): string {
    const parts = [err instanceof Error ? err.message : String(err)];
    let cause: unknown = err instanceof Error ? err.cause : undefined;
    while (isCauseLike(cause)) {
        const detail =
            cause.code || cause.errno
                ? ` [${cause.code ?? cause.errno}] ${cause.sqlMessage ?? cause.message ?? ''}`
                : `: ${cause.message ?? String(cause)}`;
        parts.push(`↳ علت: ${detail}`);
        cause = cause.cause;
    }
    return parts.join('\n');
}

/**
 * Startup migration: same steps as scripts/migrate.js (which stays for manual
 * CLI runs) but non-fatal — a failed migration logs loudly and the server
 * stays up so cPanel never enters a restart loop; /api/health keeps reporting
 * DB state and the next Passenger restart re-attempts.
 *
 * Steps:
 *   1. CREATE DATABASE IF NOT EXISTS (utf8mb4 / utf8mb4_persian_ci).
 *   2. ALTER DATABASE charset (pre-existing databases).
 *   3. Run drizzle migrations from ./drizzle.
 *   4. CONVERT every table to utf8mb4_persian_ci.
 *
 * Uses its own short-lived connections; the app pool (config/db) is untouched.
 */

export async function runMigrations(): Promise<void> {
    const DB_NAME = process.env.DB_NAME ?? 'polaris';

    // DB_NAME is interpolated into raw SQL — validate strictly first.
    if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
        throw new Error(`نام دیتابیس نامعتبر است: "${DB_NAME}"`);
    }

    const baseConfig: mysql.PoolOptions = {
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        timezone: 'Z',
    };

    let migrationPool: mysql.Pool | null = null;
    try {
        // 1-2. Connect without a database, ensure the database exists with the
        // right charset, and fix pre-existing databases.
        migrationPool = mysql.createPool({ ...baseConfig });
        await migrationPool.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`,
        );
        await migrationPool.query(
            `ALTER DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`,
        );
        await migrationPool.end();

        // 3. Reconnect with the database selected and apply drizzle migrations.
        migrationPool = mysql.createPool({
            ...baseConfig,
            database: DB_NAME,
            charset: 'utf8mb4_persian_ci',
        });
        const db = drizzle(migrationPool);
        await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../drizzle') });

        // 4. Convert every existing table to the Persian collation so tables
        // created before this runner existed adopt it too.
        const [tables] = await migrationPool.query('SHOW TABLES');
        const tableNames = (tables as Record<string, unknown>[]).map((row) => Object.values(row)[0]);
        for (const table of tableNames) {
            await migrationPool.query(
                `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`,
            );
        }

        console.log(`✅ مایگریشن: ${tableNames.length} جدول آماده است (utf8mb4_persian_ci)`);
    } finally {
        // Own short-lived pool; the app pool (config/db) is untouched.
        await migrationPool?.end().catch(() => {});
    }
}
