import dotenv from 'dotenv';

dotenv.config();

import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from '../src/config/drizzle.js';
import pool from '../src/config/db.js';

async function main(): Promise<void> {
    console.log('📦 Applying migrations from ./drizzle ...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations applied successfully');
    await pool.end();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
