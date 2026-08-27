#!/usr/bin/env node
/**
 * Self-contained migration runner.
 *
 * Plain ESM using ONLY production dependencies (mysql2, drizzle-orm, dotenv).
 * It does NOT import anything from ../src and does NOT need tsx, so it runs
 * under plain `node` on the cPanel production server.
 *
 * Steps:
 *   1. Connect without selecting a database.
 *   2. CREATE DATABASE IF NOT EXISTS (utf8mb4 / utf8mb4_persian_ci).
 *   3. ALTER DATABASE to fix pre-existing databases.
 *   4. Reconnect with the database selected, run drizzle migrations.
 *   5. CONVERT every existing table to utf8mb4_persian_ci.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env first, then fall back to the current working directory.
// dotenv never overrides variables that are already set, so this is safe
// no matter where the script is launched from.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const DB_NAME = process.env.DB_NAME ?? 'polaris';

// We interpolate DB_NAME into raw SQL below — validate it strictly first.
if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    console.error(`❌ نام دیتابیس نامعتبر است: "${DB_NAME}"`);
    console.error('   DB_NAME فقط می‌تواند شامل حروف، عدد و _ باشد.');
    process.exit(1);
}

const baseConfig = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    timezone: 'Z',
};

let pool = null;

async function closePool() {
    if (pool) {
        await pool.end().catch(() => {});
        pool = null;
    }
}

try {
    console.log('📦 شروع مایگریشن دیتابیس...');

    // 1. Connect WITHOUT selecting a database.
    pool = mysql.createPool({ ...baseConfig });
    console.log(`   اتصال به MySQL در ${baseConfig.host}:${baseConfig.port} ...`);

    // 2. Create the database if it does not exist yet.
    await pool.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`,
    );
    console.log(`✅ دیتابیس «${DB_NAME}» آماده است (utf8mb4 / utf8mb4_persian_ci)`);

    // 3. Fix pre-existing databases created with a different charset/collation.
    await pool.query(`ALTER DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);

    // 4. Switch to the database and run the drizzle migrations.
    await pool.end();
    pool = mysql.createPool({ ...baseConfig, database: DB_NAME, charset: 'utf8mb4_persian_ci' });
    const db = drizzle(pool);

    console.log('   اعمال مایگریشن‌های drizzle از پوشه ./drizzle ...');
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
    console.log('✅ مایگریشن‌های drizzle اعمال شدند');

    // 5. Convert every existing table/column to the Persian collation so
    //    tables created before this change adopt the charset too.
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map((row) => Object.values(row)[0]);
    for (const table of tableNames) {
        await pool.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);
    }
    console.log(`✅ charset ${tableNames.length} جدول به utf8mb4_persian_ci تبدیل شد`);

    console.log('\n🎉 مایگریشن با موفقیت انجام شد');
    console.log(`   دیتابیس: ${DB_NAME}`);
    console.log(`   تعداد جداول: ${tableNames.length}`);

    await closePool();
    process.exit(0);
} catch (err) {
    console.error('❌ مایگریشن ناموفق بود:', err?.message ?? err);
    await closePool();
    process.exit(1);
}
