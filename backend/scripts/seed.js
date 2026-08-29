#!/usr/bin/env node
/**
 * Self-contained, idempotent database seeder.
 *
 * Plain ESM using ONLY production dependencies (mysql2, drizzle-orm, dotenv,
 * better-auth, @better-auth/drizzle-adapter). It does NOT import anything from
 * ../src and does NOT need tsx, so it runs under plain `node` on cPanel.
 *
 * Seeds:
 *   1. The 7 default categories (INSERT IGNORE — safe to re-run).
 *   2. Default company/brand settings (INSERT IGNORE).
 *   3. The admin user through better-auth (correct password hash), promoting
 *      it to the `admin` role. Existing admins are left in place (role is
 *      re-asserted).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, boolean, datetime, text, index } from 'drizzle-orm/mysql-core';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env first, then fall back to the current working directory.
// dotenv never overrides variables that are already set.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const DEFAULT_CATEGORIES = [
    { id: 'coats_jackets', label: 'کت، کاپشن و پالتو' },
    { id: 'pants', label: 'شلوار (کتان، جین، اسلش)' },
    { id: 'shirts', label: 'پیراهن مردانه' },
    { id: 'women_clothing', label: 'مانتو و پوشاک بانوان' },
    { id: 'men_clothing', label: 'هودی، تیشرت و اسپرت' },
    { id: 'traditional', label: 'پوشاک سنتی و مجلسی' },
    { id: 'fabrics', label: 'طاقه پارچه و ملزومات دوخت' },
];

const DEFAULT_COMPANY = {
    name: 'کارگاه دوزندگی و تولیدی پولاریس استایل',
    slogan: 'تولیدکننده تخصصی پوشاک زمستانه، پالتو و کاپشن‌های راسته بازار',
    website: 'https://polaris-style.ir',
    instagram: '@polaris_style_clothing',
    telegram: 't.me/polaris_style',
    address: 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸',
    postalCode: '۱۱۹۳۶۴۸۲۹۱',
    phone: '02155667788',
    emergencyPhone: '09121112233',
    registrationNumber: '۵۸۹۴۲۱',
    brandName: 'پولاریس استایل',
    tagline: 'تولیدکننده تخصصی پوشاک زمستانه',
    workshopAddress: 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸',
    workshopPhone: '02155667788',
    owners: [],
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@polarisstyle.ir';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PolarisAdmin123!';
const DB_NAME = process.env.DB_NAME ?? 'polaris';

// ---------------------------------------------------------------------------
// better-auth core tables — defined INLINE (mirror backend/src/schema/index.ts)
// so this script never imports TypeScript sources.
// ---------------------------------------------------------------------------
const user = mysqlTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: varchar('image', { length: 512 }),
    role: varchar('role', { length: 32 }),
    banned: boolean('banned').notNull().default(false),
    banReason: varchar('ban_reason', { length: 255 }),
    banExpires: datetime('ban_expires'),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

const session = mysqlTable(
    'session',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        token: varchar('token', { length: 255 }).notNull().unique(),
        expiresAt: datetime('expires_at').notNull(),
        ipAddress: varchar('ip_address', { length: 64 }),
        userAgent: varchar('user_agent', { length: 512 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('session_user_id_idx').on(t.userId)],
);

const account = mysqlTable(
    'account',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        accountId: varchar('account_id', { length: 255 }).notNull(),
        providerId: varchar('provider_id', { length: 255 }).notNull(),
        userId: varchar('user_id', { length: 36 }).notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: datetime('access_token_expires_at'),
        refreshTokenExpiresAt: datetime('refresh_token_expires_at'),
        scope: varchar('scope', { length: 255 }),
        password: varchar('password', { length: 255 }),
        issuer: varchar('issuer', { length: 255 }),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('account_user_id_idx').on(t.userId)],
);

const verification = mysqlTable(
    'verification',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        identifier: varchar('identifier', { length: 255 }).notNull(),
        value: text('value').notNull(),
        expiresAt: datetime('expires_at').notNull(),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('verification_identifier_idx').on(t.identifier)],
);

let pool = null;

async function closePool() {
    if (pool) {
        await pool.end().catch(() => {});
        pool = null;
    }
}

try {
    if (!process.env.BETTER_AUTH_SECRET) {
        console.error('❌ متغیر محیطی BETTER_AUTH_SECRET تنظیم نشده است.');
        console.error('   برای ساخت کاربر مدیر، ابتدا آن را در فایل .env مقداردهی کنید.');
        process.exit(1);
    }

    pool = mysql.createPool({
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: DB_NAME,
        charset: 'utf8mb4_persian_ci',
        timezone: 'Z',
    });

    // Fail fast with a clear hint if the database itself does not exist yet.
    try {
        await pool.query('SELECT 1');
    } catch (err) {
        if (err && err.code === 'ER_BAD_DB_ERROR') {
            console.error(`❌ دیتابیس «${DB_NAME}» وجود ندارد.`);
            console.error('   ابتدا مایگریشن را اجرا کنید:  npm run db:migrate');
            await closePool();
            process.exit(1);
        }
        throw err;
    }

    const db = drizzle(pool);
    console.log(`🌱 در حال seed کردن دیتابیس «${DB_NAME}» ...`);

    // 1. Categories — INSERT IGNORE keeps re-runs safe.
    let createdCategories = 0;
    for (const cat of DEFAULT_CATEGORIES) {
        const [result] = await pool.query('INSERT IGNORE INTO categories (id, label) VALUES (?, ?)', [
            cat.id,
            cat.label,
        ]);
        if (result.affectedRows > 0) {
            console.log(`  + دسته‌بندی: ${cat.label}`);
            createdCategories += 1;
        }
    }
    if (createdCategories === 0) {
        console.log('  = دسته‌بندی‌ها قبلا ثبت شده‌اند');
    }

    // 2. Company settings — JSON column, serialize the default object.
    const [companyResult] = await pool.query('INSERT IGNORE INTO company_settings (id, data) VALUES (?, ?)', [
        'company',
        JSON.stringify(DEFAULT_COMPANY),
    ]);
    if (companyResult.affectedRows > 0) {
        console.log('  + اطلاعات پیش‌فرض برند و کارگاه');
    } else {
        console.log('  = اطلاعات برند و کارگاه قبلا ثبت شده است');
    }

    // 3. Blog posts — read the exported articles and INSERT IGNORE by slug.
    const blogSeedPath = path.resolve(__dirname, 'blog-seed.json');
    if (fs.existsSync(blogSeedPath)) {
        const blogPosts = JSON.parse(fs.readFileSync(blogSeedPath, 'utf8'));
        let createdPosts = 0;
        for (const post of blogPosts) {
            const [result] = await pool.query(
                `INSERT IGNORE INTO blog_posts
                 (id, slug, title, excerpt, image, image_alt, date, read_time, tags, body, status, author_id, author_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', '', 'تیم پولاریس')`,
                [
                    crypto.randomUUID(),
                    post.slug,
                    post.title,
                    post.excerpt,
                    post.image,
                    post.imageAlt,
                    post.date,
                    post.readTime,
                    JSON.stringify(post.tags),
                    JSON.stringify(post.body),
                ],
            );
            if (result.affectedRows > 0) {
                console.log(`  + مطلب وبلاگ: ${post.title}`);
                createdPosts += 1;
            }
        }
        if (createdPosts === 0) {
            console.log('  = مطالب وبلاگ قبلا ثبت شده‌اند');
        }
    } else {
        console.log('  ⚠️ فایل blog-seed.json یافت نشد؛ وبلاگ seed نشد');
    }

    // 4. Admin user through better-auth so the password hash is correct.
    const auth = betterAuth({
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3016',
        database: drizzleAdapter(db, {
            provider: 'mysql',
            schema: { user, session, account, verification },
        }),
        emailAndPassword: { enabled: true },
        plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })],
    });

    const [existingAdmin] = await pool.query('SELECT id FROM user WHERE email = ?', [ADMIN_EMAIL]);
    if (existingAdmin.length > 0) {
        await pool.query("UPDATE user SET role = 'admin' WHERE id = ?", [existingAdmin[0].id]);
        console.log(`  = کاربر مدیر قبلا ساخته شده: ${ADMIN_EMAIL} (نقش admin تضمین شد)`);
    } else {
        const result = await auth.api.signUpEmail({
            body: {
                name: 'مدیر سیستم',
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
            },
        });
        const userId = result?.user?.id;
        if (userId) {
            await pool.query("UPDATE user SET role = 'admin' WHERE id = ?", [userId]);
            console.log(`  + کاربر مدیر ساخته شد: ${ADMIN_EMAIL}`);
            console.log(`     ایمیل: ${ADMIN_EMAIL}`);
            console.log(`     رمز عبور: ${ADMIN_PASSWORD}`);
        } else {
            console.error('  ⚠️ ساخت کاربر مدیر ناموفق بود');
        }
    }

    console.log('\n✅ Seed با موفقیت انجام شد');

    await closePool();
    process.exit(0);
} catch (err) {
    console.error('❌ Seed ناموفق بود:', err?.message ?? err);
    await closePool();
    process.exit(1);
}
