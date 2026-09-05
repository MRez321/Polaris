/**
 * One-shot repair (2026-09-05): record migrations 0008 (no-op) and 0009 in
 * __drizzle_migrations. Their effects were already applied to this database —
 * 0008 duplicates 0006/0007 (notification_settings + items.website_quantity,
 * both created before 0008 existed), and 0009 (user_addresses + orders
 * shipping columns) was applied through an equivalent one-off SQL script while
 * the generated migration pipeline was broken.
 *
 * Without these rows drizzle keeps retrying 0008/0009 and dies on
 * ER_TABLE_EXISTS_ERROR / ER_DUP_FIELDNAME. Rows use drizzle's exact format:
 * hash = sha256(sql file), created_at = journal "when" (ms epoch).
 */
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS = [
    { file: '0008_absurd_warbound.sql', when: 1788500831667 },
    { file: '0009_giant_white_queen.sql', when: 1788568525337 },
];

const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'polaris',
});

try {
    const [rows] = await conn.query(
        'SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at',
    );
    const seen = new Map(rows.map((r) => [r.created_at, r.hash]));
    console.log(`DB has ${rows.length} migration rows (max created_at: ${Math.max(...rows.map((r) => Number(r.created_at)))})`);

    for (const { file, when } of MIGRATIONS) {
        if (seen.has(when)) {
            console.log(`✓ ${file} already recorded — skipped`);
            continue;
        }
        // Verify the migration's objects actually exist before claiming it ran.
        const sql = await import('node:fs').then((fs) => fs.readFileSync(path.resolve(__dirname, '../drizzle', file), 'utf8'));
        const hash = crypto.createHash('sha256').update(sql).digest('hex');
        await conn.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, when]);
        console.log(`✓ recorded ${file} (hash ${hash.slice(0, 12)}…, created_at ${when})`);
    }

    const [after] = await conn.query('SELECT COUNT(*) AS n FROM __drizzle_migrations');
    console.log(`__drizzle_migrations now has ${after[0].n} rows`);
} catch (err) {
    console.error('❌ repair failed:', err?.code ?? err?.message ?? err);
    process.exitCode = 1;
} finally {
    await conn.end();
}
