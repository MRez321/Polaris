#!/usr/bin/env node
/**
 * Lightweight database seeder for cPanel environments.
 * Avoids loading better-auth to prevent WebAssembly OOM errors.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
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

let pool = null;

async function closePool() {
    if (pool) {
        await pool.end().catch(() => {});
        pool = null;
    }
}

// Helper to generate a bcrypt-like hash if needed,
// but better-auth uses specific hashing.
// For cPanel seeding, we will try to use a known hash or insert directly.
// Note: better-auth uses @oslojs/password which uses scrypt/bcrypt.
// Since we can't load that here easily without memory issues,
// we will insert a placeholder and recommend changing password via UI
// OR use a pre-computed hash if available.
// HOWEVER, the safest way on cPanel without SSH is to insert the user
// and let the first login fail, then use "Forgot Password" feature
// OR run this script locally and export the user row.

// BUT, let's try a minimal approach:
// If you have a local dev environment, run the original seed there,
// get the hash, and put it here.
// For now, I will provide a script that inserts categories and company,
// and skips the admin user creation to avoid OOM,
// instructing you to create it via the app's "Forgot Password" or locally.

try {
    pool = mysql.createPool({
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: DB_NAME,
        charset: 'utf8mb4_persian_ci',
        timezone: 'Z',
    });

    await pool.query('SELECT 1');

    console.log(`🌱 در حال seed کردن دیتابیس «${DB_NAME}» ...`);

    // 1. Categories
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
    if (createdCategories === 0) console.log('  = دسته‌بندی‌ها قبلا ثبت شده‌اند');

    // 2. Company settings
    const [companyResult] = await pool.query('INSERT IGNORE INTO company_settings (id, data) VALUES (?, ?)', [
        'company',
        JSON.stringify(DEFAULT_COMPANY),
    ]);
    if (companyResult.affectedRows > 0) {
        console.log('  + اطلاعات پیش‌فرض برند و کارگاه');
    } else {
        console.log('  = اطلاعات برند و کارگاه قبلا ثبت شده است');
    }

    // 3. Blog posts
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
        if (createdPosts === 0) console.log('  = مطالب وبلاگ قبلا ثبت شده‌اند');
    } else {
        console.log('  ⚠️ فایل blog-seed.json یافت نشد؛ وبلاگ seed نشد');
    }

    // 4. Admin User
    // Check if admin exists
    const [existingAdmin] = await pool.query('SELECT id FROM user WHERE email = ?', [ADMIN_EMAIL]);

    if (existingAdmin.length > 0) {
        await pool.query("UPDATE user SET role = 'admin' WHERE id = ?", [existingAdmin[0].id]);
        console.log(`  = کاربر مدیر قبلا وجود دارد: ${ADMIN_EMAIL} (نقش admin تضمین شد)`);
    } else {
        console.log('  ⚠️ ساخت کاربر مدیر به دلیل محدودیت حافظه سرور انجام نشد.');
        console.log('  راه حل ۱: این اسکریپت را روی کامپیوتر خودتان (لوکال) اجرا کنید و یوزر ساخته شده را به سرور منتقل کنید.');
        console.log('  راه حل ۲: از طریق صفحه لاگین سایت، گزینه "فراموشی رمز عبور" را بزنید تا لینک ست رمز جدید برای ایمیل ارسال شود.');
        console.log(`  ایمیل پیشنهادی: ${ADMIN_EMAIL}`);
    }

    console.log('\n✅ عملیات Seed با موفقیت انجام شد');
    await closePool();
    process.exit(0);

} catch (err) {
    console.error('❌ Seed ناموفق بود:', err?.message ?? err);
    await closePool();
    process.exit(1);
}