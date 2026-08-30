import path from 'path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

import pool from '../../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        await migrationPool?.end().catch(() => {});
        void pool; // app pool untouched; referenced to assert config parity
    }
}
