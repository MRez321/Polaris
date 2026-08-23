import dotenv from 'dotenv';

dotenv.config();

import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../src/config/drizzle.js';
import { categories, companySettings, user } from '../src/schema/index.js';
import { categories, companySettings, user, account } from '../src/schema/index.js';
import { auth } from '../src/config/auth.js';

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

async function seedCategories(): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
        const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, cat.id));
        if (existing.length === 0) {
            await db.insert(categories).values({ id: cat.id, label: cat.label });
            console.log(`  + دسته‌بندی: ${cat.label}`);
        }
    }
}

async function seedCompany(): Promise<void> {
    const existing = await db.select({ id: companySettings.id }).from(companySettings).where(eq(companySettings.id, 'company'));
    if (existing.length === 0) {
        await db.insert(companySettings).values({
            id: 'company',
            data: DEFAULT_COMPANY as unknown as Record<string, unknown>,
        });
        console.log('  + اطلاعات پیش‌فرض برند و کارگاه');
    }
}

async function seedAdmin(): Promise<void> {
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, ADMIN_EMAIL));
    if (existing.length > 0) {
        console.log(`  = کاربر مدیر قبلا ساخته شده: ${ADMIN_EMAIL}`);
        return;
    }
    const result = await auth.api.signUpEmail({
        body: {
            name: 'مدیر سیستم',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
        },
    });
    // Promote to admin role
    if (result?.user?.id) {
        await db.update(user).set({ role: 'admin' }).where(eq(user.id, result.user.id));
        console.log(`  + کاربر مدیر: ${ADMIN_EMAIL} (رمز: ${ADMIN_PASSWORD})`);
    } else {
        console.error('  ⚠️ ساخت کاربر مدیر ناموفق بود');
    }
}

async function main(): Promise<void> {
    console.log('🌱 Seeding database...');
    await seedCategories();
    await seedCompany();
    await seedAdmin();
    console.log('✅ Seed complete');
    await pool.end();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
