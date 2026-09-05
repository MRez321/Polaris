/**
 * seed-workshop.js — Idempotent seed for the workshop (کارگاه) module.
 *
 * Bootstraps owners, sellers, items, consignments (handovers), returns,
 * payments (FIFO), staff, expenses, and a profit distribution with fully
 * consistent balances — matching the exact mutation math of
 * `src/modules/workshop/inventoryService.ts`:
 *
 *   handover: total = net = remaining = Σ line.totalPrice, stock −= qty,
 *             seller.debt += total, handoversValue += total
 *   return:   returned = Σ qty×unitPrice, net = total − returned,
 *             remaining = max(0, net − paid), healthy → stock += qty,
 *             seller.debt = max(0, debt − returned)
 *   payment:  FIFO over the seller's open consignments by date asc;
 *             allocate = min(remainingPayment, remaining);
 *             consignment.paid += allocate; seller.totalPaid += FULL amount
 *
 * cPanel-safe: plain mysql2 pool (NO better-auth / drizzle imports — those
 * pull the wasm crypto stack and OOM the process on shared hosting).
 *
 * Run: `npm run db:seed:workshop`
 * Requires the workshop tables to exist first (`npm run db:migrate`).
 *
 * Idempotency: every row uses INSERT IGNORE with deterministic ids/codes, so
 * re-running inserts 0 rows. Balance updates only run when something was
 * newly inserted, so re-runs never fight later manual edits.
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'polaris';

let pool = null;

async function closePool() {
    if (pool) {
        await pool.end().catch(() => {});
        pool = null;
    }
}

/** Deterministic lowercase v4-shaped UUID from a seed string. */
function fixedId(seed) {
    const h = crypto.createHash('sha1').update(seed).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Date helper — UTC morning, ISO-friendly for DATETIME columns. */
const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day, 8, 30, 0));

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

/** Owners — 50/50 محمد / امین (matches the live owners row convention). */
const OWNERS = [
    {
        id: 'o1', name: 'محمد', role: 'مدیر تولید و دوزندگی', sharePercentage: 50, sharesCount: 1,
        nationalCode: '0012345678', phones: ['09121112233'], email: 'mohammad@polarisstyle.ir',
        bankAccounts: [{ id: 'o1-bank-1', bankName: 'بانک ملت', accountNumber: '1234567890', cardNumber: '6104330011223344', shebaNumber: 'IR120120000000001234567890', accountHolder: 'محمد' }],
    },
    {
        id: 'o2', name: 'امین', role: 'مدیر مالی و بازار', sharePercentage: 50, sharesCount: 1,
        nationalCode: '0023456789', phones: ['09125556677'], email: 'amin@polarisstyle.ir',
        bankAccounts: [{ id: 'o2-bank-1', bankName: 'بانک سامان', accountNumber: '2345678901', cardNumber: '6219861020304050', shebaNumber: 'IR560560000000002345678901', accountHolder: 'امین' }],
    },
];

/** Sellers — 5: active / suspended (SLR-504) / fully-settled, with varied guarantees. */
const SELLERS = [
    { code: 'SLR-501', name: 'حاج قاسم فرهادی', phone: '09121110001', nationalCode: '1012345678', guarantee: 'promissory_note', guaranteeAmount: 60_000_000, guaranteeDetails: 'سفته بانکی شماره ۱۲۴ صادره شعبه بازار', creditLimit: 200_000_000, bank: { bankName: 'بانک ملی', accountNumber: '0171234567', cardNumber: '6037991122334455', shebaNumber: 'IR3301700000000017123456' } },
    { code: 'SLR-502', name: 'مهدی رضایی', phone: '09121110002', nationalCode: '1023456789', guarantee: 'cheque', guaranteeAmount: 40_000_000, guaranteeDetails: 'چک صیادی شماره ۵۵۲۱ صادره بانک پاسارگاد', creditLimit: 150_000_000, bank: { bankName: 'بانک پاسارگاد', accountNumber: '0223456789', cardNumber: '5022293344556677', shebaNumber: 'IR10057000000000022345678' } },
    { code: 'SLR-503', name: 'رضا موسوی', phone: '09121110003', nationalCode: '1034567890', guarantee: 'national_card', guaranteeAmount: 0, guaranteeDetails: 'اصل کارت ملی هوشمند کپی‌برابر اصل شده', creditLimit: 80_000_000, bank: { bankName: 'بانک صادرات', accountNumber: '0335678901', cardNumber: '6037694455667788', shebaNumber: 'IR19019000000000033567890' } },
    { code: 'SLR-504', name: 'اکبر کریمی', phone: '09121110004', nationalCode: '1045678901', guarantee: 'trusted_guarantor', guaranteeAmount: 25_000_000, guaranteeDetails: 'ضمانت‌نامه حضوری کاسب معتمد بازارچه قم', creditLimit: 60_000_000, suspended: true, bank: { bankName: 'بانک سپه', accountNumber: '0446678901', cardNumber: '5892102233445566', shebaNumber: 'IR80017000000000044667890' } },
    { code: 'SLR-505', name: 'حاج زهرا سادات', phone: '09121110005', nationalCode: '1056789012', guarantee: 'promissory_note', guaranteeAmount: 15_000_000, guaranteeDetails: 'سفته بانکی معتبر نزد صندوق کارگاه', creditLimit: 50_000_000, bank: { bankName: 'بانک تجارت', accountNumber: '0557788901', cardNumber: '5859836677889900', shebaNumber: 'IR63017000000000055778890' } },
];

/** Items — 8. PLR-602/603/606 carry website_quantity > 0; PLR-605 sits at/below threshold after handover. */
const ITEMS = [
    { code: 'PLR-601', name: 'پالتو زمستانی مردانه مدل «آرارات»', category: 'coats_jackets', cost: 850_000, consign: 1_100_000, retail: 1_450_000, stock: 12, website: 0, threshold: 5, sizes: ['M', 'L', 'XL'], colors: ['مشکی', 'سرمه‌ای'], fabric: 'فاستون ضدآب' },
    { code: 'PLR-602', name: 'کاپشن اسپرت مردانه «توچال»', category: 'coats_jackets', cost: 720_000, consign: 1_100_000, retail: 1_400_000, stock: 18, website: 4, threshold: 6, sizes: ['L', 'XL', 'XXL'], colors: ['زغالی', 'مشکی'], fabric: 'میکرو ضدآب' },
    { code: 'PLR-603', name: 'مانتو پاییزی بانوان «هفت‌سین»', category: 'women_clothing', cost: 680_000, consign: 1_100_000, retail: 1_380_000, stock: 25, website: 6, threshold: 8, sizes: ['S', 'M', 'L'], colors: ['کرم', 'قهوه‌ای'], fabric: 'مخمل سوزنی' },
    { code: 'PLR-604', name: 'شلوار جین اسلش مردانه «دماوند»', category: 'pants', cost: 540_000, consign: 1_100_000, retail: 1_250_000, stock: 30, website: 0, threshold: 10, sizes: ['38', '40', '42'], colors: ['آبی تیره'], fabric: 'دنیم کاغذی' },
    { code: 'PLR-605', name: 'پیراهن مردانه کلاسیک «رودکی»', category: 'shirts', cost: 420_000, consign: 1_100_000, retail: 980_000, stock: 18, website: 0, threshold: 5, sizes: ['39', '40', '41'], colors: ['سفید', 'آبی روشن'], fabric: 'کرپ نخ پنبه' },
    { code: 'PLR-606', name: 'هودی اسپرت مردانه «دیما»', category: 'men_clothing', cost: 480_000, consign: 1_100_000, retail: 1_050_000, stock: 22, website: 5, threshold: 6, sizes: ['M', 'L', 'XL'], colors: ['سرمه‌ای', 'زیتونی'], fabric: 'فلیس دولایه' },
    { code: 'PLR-607', name: 'شال و روسری مجلسی «پروانه»', category: 'traditional', cost: 320_000, consign: 1_100_000, retail: 890_000, stock: 35, website: 0, threshold: 12, sizes: ['اندازه آزاد'], colors: ['ترمه', 'گیسو'], fabric: 'ترمه دست‌دوز' },
    { code: 'PLR-608', name: 'طاقه پارچه فاستون «سهند»', category: 'fabrics', cost: 280_000, consign: 1_100_000, retail: 760_000, stock: 40, website: 0, threshold: 15, sizes: ['۳ متر'], colors: ['ذغالی', 'زغالی روشن'], fabric: 'فاستون پشمی' },
];

const sellerId = (code) => fixedId(`seller-${code}`);
const itemId = (code) => fixedId(`item-${code}`);
const consId = (code) => fixedId(`consignment-${code}`);
const itemByCode = (code) => ITEMS.find((i) => i.code === code);
const sellerByCode = (code) => SELLERS.find((s) => s.code === code);

/** Consignments — 6, spanning active / partially_settled / settled. Line: [itemCode, qty, size, color]. */
const CONSIGNMENTS = [
    { code: 'HND-501', seller: 'SLR-501', date: d(2026, 7, 5), due: d(2026, 8, 5), lines: [['PLR-601', 4, 'L', 'مشکی'], ['PLR-602', 3, 'XL', 'زغالی']], notes: 'واگذاری آغاز فصل — بازار بزرگ تهران' },
    { code: 'HND-502', seller: 'SLR-501', date: d(2026, 7, 20), due: d(2026, 8, 20), lines: [['PLR-604', 6, '40', 'آبی تیره']], notes: 'مکمل واگذاری اول' },
    { code: 'HND-503', seller: 'SLR-502', date: d(2026, 7, 8), due: d(2026, 8, 8), lines: [['PLR-603', 8, 'M', 'کرم'], ['PLR-606', 5, 'L', 'سرمه‌ای']], notes: 'پوشاک بانوان و اسپرت' },
    { code: 'HND-504', seller: 'SLR-503', date: d(2026, 7, 12), due: d(2026, 8, 12), lines: [['PLR-605', 10, '40', 'سفید'], ['PLR-607', 6, 'اندازه آزاد', 'ترمه']], notes: 'پیراهن کلاسیک و شال مجلسی' },
    { code: 'HND-505', seller: 'SLR-505', date: d(2026, 7, 25), due: d(2026, 8, 25), lines: [['PLR-608', 5, '۳ متر', 'ذغالی']], notes: 'طاقه پارچه برای دوخت سفارشی' },
    { code: 'HND-506', seller: 'SLR-504', date: d(2026, 7, 10), due: d(2026, 8, 10), lines: [['PLR-601', 3, 'XL', 'سرمه‌ای'], ['PLR-604', 4, '38', 'آبی تیره']], notes: 'واگذاری آزمایشی فروشنده جدید' },
];

/** Returns — one healthy (stock restored) + one damaged, both on HND-503. */
const RETURNS = [
    {
        consignment: 'HND-503', date: d(2026, 8, 2), processedBy: 'محمد (مدیر)', notes: 'مرجوعی دوره‌ای پایان ماه',
        lines: [
            { itemCode: 'PLR-603', qty: 2, condition: 'healthy', reason: 'مغایرت رنگ با سفارش' },
            { itemCode: 'PLR-606', qty: 1, condition: 'damaged', reason: 'آسیب در حمل‌ونقل' },
        ],
    },
];

/** Payments — FIFO by consignment date asc. Methods per seller-payment union. */
const PAYMENTS = [
    { code: 'PAY-501', seller: 'SLR-505', date: d(2026, 8, 18), method: 'cash', amount: 5_500_000, tracking: '', notes: 'تسویه کامل واگذاری طاقه پارچه' },
    { code: 'PAY-502', seller: 'SLR-503', date: d(2026, 8, 20), method: 'bank_transfer', amount: 10_000_000, tracking: 'TRN-84512', notes: 'واریز بخشی از بدهی' },
    { code: 'PAY-503', seller: 'SLR-501', date: d(2026, 8, 22), method: 'pos', amount: 7_000_000, tracking: 'POS-99123', notes: 'دریافت حضوری سر بساط' },
];

/** Staff — 5, roles from the union, each with activity history. */
const STAFF = [
    { code: 'STF-501', name: 'استاد حسن دوزنده', role: 'tailor', roleTitle: 'سرپرست سالن دوخت', type: 'piecework', amount: 85_000, hire: d(2024, 3, 1), phones: ['09131112233'], nat: '0034567890', bank: { bankName: 'بانک ملت', cardNumber: '6104337788990011', shebaNumber: 'IR48012000000000345678901' } },
    { code: 'STF-502', name: 'اکبری برش‌کار', role: 'cutter', roleTitle: 'برش‌کار حرفه‌ای پارچه', type: 'piecework', amount: 45_000, hire: d(2024, 5, 15), phones: ['09132223344'], nat: '0045678901', bank: { bankName: 'بانک ملی', cardNumber: '6037991122001133', shebaNumber: 'IR33017000000000456789012' } },
    { code: 'STF-503', name: 'میرزا خریدار', role: 'buyer', roleTitle: 'خرید و تأمین متریال', type: 'monthly', amount: 18_500_000, hire: d(2024, 2, 10), phones: ['09133334455'], nat: '0056789012', bank: { bankName: 'بانک تجارت', cardNumber: '5859830011223344', shebaNumber: 'IR63017000000000567890123' } },
    { code: 'STF-504', name: 'خانم صغری حسابدار', role: 'accountant', roleTitle: 'حسابداری و امور مالی', type: 'monthly', amount: 16_000_000, hire: d(2024, 8, 1), phones: ['09134445566'], nat: '0067890123', bank: { bankName: 'بانک سامان', cardNumber: '6219869988776655', shebaNumber: 'IR56056000000000678901234' } },
    { code: 'STF-505', name: 'حاج محسن کنترل کیفیت', role: 'quality_control', roleTitle: 'کنترل کیفیت نهایی', type: 'hourly', amount: 95_000, hire: d(2025, 1, 5), phones: ['09135556677'], nat: '0078901234', bank: { bankName: 'بانک سپه', cardNumber: '5892100011223344', shebaNumber: 'IR80017000000000789012345' } },
    { code: 'STF-506', name: 'استاد رحیم مدیر سالن', role: 'workshop_manager', roleTitle: 'مدیریت سالن تولید', type: 'monthly', amount: 21_000_000, hire: d(2023, 11, 15), phones: ['09136667788'], nat: '0089012345', bank: { bankName: 'بانک ملت', cardNumber: '6104335566778899', shebaNumber: 'IR48012000000000890123456' } },
];

/** Expenses — 8, one per category, various cost allocations. */
const EXPENSES = [
    { code: 'CST-501', title: 'سرویس و تعمیر چرخ‌خیاطی‌های صنعتی', category: 'machinery_maintenance', amount: 24_500_000, date: d(2026, 7, 3), paidBy: 'صندوق کارگاه', method: 'cash', allocation: 'workshop_fund', desc: 'سرویس دوره‌ای ۱۲ چرخ جوخی و درازکوب', recurring: false },
    { code: 'CST-502', title: 'خرید طاقه پارچه فاستون ۴۰۰ متر', category: 'materials_supplies', amount: 112_000_000, date: d(2026, 7, 8), paidBy: 'امین', method: 'bank_transfer', allocation: 'shared_by_equity', desc: 'خرید نقدی متریال تولید پاییز — تسهیم ۵۰-۵۰ بین شرکا', recurring: false },
    { code: 'CST-503', title: 'نصب ریل آویز و چراغ‌های سالن دوخت', category: 'workshop_improvement', amount: 38_500_000, date: d(2026, 7, 15), paidBy: 'محمد', method: 'bank_transfer', allocation: 'specific_payer', desc: 'بهسازی سالن تولید طبق برنامه توسعه', recurring: false },
    { code: 'CST-504', title: 'اجاره ماهانه سالن و انبار', category: 'rent', amount: 45_000_000, date: d(2026, 7, 1), paidBy: 'صندوق کارگاه', method: 'bank_transfer', allocation: 'workshop_fund', desc: 'اجاره مرداد ۱۴۰۵', recurring: true },
    { code: 'CST-505', title: 'قبوض برق صنعتی و آب و گاز', category: 'utilities', amount: 9_800_000, date: d(2026, 7, 27), paidBy: 'صندوق کارگاه', method: 'card', allocation: 'workshop_fund', desc: 'برق سه‌فاز صنعتی سالن دوخت', recurring: false },
    { code: 'CST-506', title: 'خرید قیچی برقی و اتوی بخار صنعتی', category: 'tools_equipment', amount: 15_600_000, date: d(2026, 8, 2), paidBy: 'امین', method: 'card', allocation: 'specific_payer', desc: 'دو اتوی بخار و یک قیچی برقی', recurring: false },
    { code: 'CST-507', title: 'پاداش پایان ماه دوزندگان', category: 'staff_bonus', amount: 22_000_000, date: d(2026, 8, 1), paidBy: 'صندوق کارگاه', method: 'cash', allocation: 'workshop_fund', desc: 'پاداش تولید ماه مرداد', recurring: false },
    { code: 'CST-508', title: 'تعمیر درب سالن و هزینه‌های متفرقه', category: 'other', amount: 4_200_000, date: d(2026, 8, 12), paidBy: 'محمد', method: 'cash', allocation: 'specific_payer', desc: 'هزینه‌های خرد نگهداری', recurring: false },
];

// ---------------------------------------------------------------------------
// Derived balances — the single source of truth, mirroring inventoryService.
// ---------------------------------------------------------------------------

const consTotal = (c) => c.lines.reduce((s, [code, qty]) => s + qty * itemByCode(code).consign, 0);

/** Returns grouped by consignment code. */
const returnsByCons = {};
for (const rt of RETURNS) {
    const lines = rt.lines.map((l) => ({ itemCode: l.itemCode, qty: l.qty, unit: itemByCode(l.itemCode).consign, condition: l.condition }));
    (returnsByCons[rt.consignment] = returnsByCons[rt.consignment] || []).push(...lines);
}
const returnedValueOf = (code) => (returnsByCons[code] || []).reduce((s, r) => s + r.qty * r.unit, 0);

/**
 * Single FIFO pass, date-ordered per seller: each payment records its own
 * allocations (for the payments row JSON) while paidByCons accumulates the
 * running total (for consignment/seller final balances). Mirrors
 * `applyPaymentToConsignments` in inventoryService.
 */
const paidByCons = {};
const paymentAllocations = {};
for (const p of [...PAYMENTS].sort((a, b) => a.date - b.date)) {
    const open = CONSIGNMENTS.filter((c) => c.seller === p.seller).sort((a, b) => a.date - b.date);
    let remaining = p.amount;
    const allocations = [];
    for (const c of open) {
        if (remaining <= 0) break;
        const paidSoFar = (paidByCons[c.code] || []).reduce((s, a) => s + a, 0);
        const remainingNow = Math.max(0, consTotal(c) - returnedValueOf(c.code) - paidSoFar);
        if (remainingNow <= 0) continue;
        const allocate = Math.min(remaining, remainingNow);
        allocations.push({
            consignmentId: consId(c.code), consignmentCode: c.code,
            consignmentDate: c.date.toISOString(),
            allocatedAmount: allocate, remainingDebtBefore: remainingNow,
            remainingDebtAfter: remainingNow - allocate, isFullySettled: remainingNow - allocate <= 0,
        });
        (paidByCons[c.code] = paidByCons[c.code] || []).push(allocate);
        remaining -= allocate;
    }
    paymentAllocations[p.code] = { allocations, unallocated: remaining };
}
const paidValueOf = (code) => (paidByCons[code] || []).reduce((s, a) => s + a, 0);

/** Final consignment state per inventoryService math. */
const consState = (c) => {
    const total = consTotal(c);
    const returned = returnedValueOf(c.code);
    const net = total - returned;
    const paid = paidValueOf(c.code);
    const remaining = Math.max(0, net - paid);
    const status = remaining <= 0 ? 'settled' : paid > 0 ? 'partially_settled' : 'active';
    return { total, returned, net, paid, remaining, status };
};

/** Final seller state: debt = Σ remaining, handovers = Σ total, paid = Σ payment amounts. */
const sellerState = (code) => {
    const mine = CONSIGNMENTS.filter((c) => c.seller === code);
    const debt = mine.reduce((s, c) => s + consState(c).remaining, 0);
    const handovers = mine.reduce((s, c) => s + consState(c).total, 0);
    const paid = PAYMENTS.filter((p) => p.seller === code).reduce((s, p) => s + p.amount, 0);
    const status = sellerByCode(code).suspended ? 'suspended' : (debt === 0 ? 'settled' : 'active');
    return { debt, handovers, paid, status };
};

/** Item stock after handovers (stock −= qty) and healthy returns (stock += qty). */
const itemStock = (code) => {
    let stock = itemByCode(code).stock;
    for (const c of CONSIGNMENTS) {
        for (const [itemCode, qty] of c.lines) if (itemCode === code) stock -= qty;
    }
    for (const rt of RETURNS) {
        for (const l of rt.lines) if (l.itemCode === code && l.condition === 'healthy') stock += l.qty;
    }
    return stock;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: DB_NAME,
            charset: 'utf8mb4_persian_ci',
            timezone: 'Z',
            waitForConnections: true,
            connectionLimit: 10,
        });

        await pool.query('SELECT 1');
        console.log(`🌱 در حال seed کردن داده‌های کارگاه در دیتابیس «${DB_NAME}» ...`);

        // Pre-flight: the workshop tables must exist.
        const [tables] = await pool.query('SHOW TABLES');
        const names = tables.map((r) => Object.values(r)[0]);
        const required = ['items', 'sellers', 'consignments', 'consignment_returns', 'payments', 'staff', 'owners', 'expenses', 'profit_distributions'];
        const missing = required.filter((t) => !names.includes(t));
        if (missing.length > 0) {
            console.error('❌ جدول‌های زیر یافت نشد؛ ابتدا مهاجرت‌ها را اجرا کنید:', missing.join('، '));
            await closePool();
            process.exit(1);
        }

        let fresh = false; // any new row inserted this run

        // ---- owners (single-row JSON array convention — never create a second row) ----
        {
            const [existing] = await pool.query('SELECT id FROM owners LIMIT 1');
            if (existing.length > 0) {
                console.log('= اطلاعات شرکا قبلاً موجود است');
            } else {
                await pool.query(
                    'INSERT INTO owners (id, data, updated_at) VALUES (?,?,?)',
                    [fixedId('polaris-seed-owners'), JSON.stringify(OWNERS), d(2026, 7, 1)],
                );
                fresh = true;
                console.log('+ اطلاعات شرکا (محمد و امین — ۵۰/۵۰)');
            }
        }

        // ---- sellers ----
        for (const s of SELLERS) {
            const [r] = await pool.query(
                `INSERT IGNORE INTO sellers
                    (id, code, name, phone, additional_phones, national_code, street_location,
                     has_guarantee, guarantee_type, guarantee_amount, guarantee_details, credit_limit,
                     bank_accounts, current_debt, total_handovers_value, total_paid, status,
                     notes, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    sellerId(s.code), s.code, s.name, s.phone, JSON.stringify([]), s.nationalCode, '',
                    true, s.guarantee, s.guaranteeAmount, s.guaranteeDetails, s.creditLimit,
                    JSON.stringify([{ id: `${s.code}-bank-1`, ...s.bank, accountHolder: s.name }]),
                    0, 0, 0, 'active',
                    'فروشنده فعال بازار بزرگ تهران', d(2025, 9, 1), d(2026, 8, 25),
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ فروشنده: ${s.name} (${s.code})`); }
        }

        // ---- items ----
        for (const it of ITEMS) {
            const [r] = await pool.query(
                `INSERT IGNORE INTO items
                    (id, code, name, category, cost_price, consignment_price, retail_price,
                     stock_quantity, website_quantity, min_stock_threshold, sizes, colors, fabric,
                     images, created_at, updated_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    itemId(it.code), it.code, it.name, it.category, it.cost, it.consign, it.retail,
                    it.stock, it.website, it.threshold, JSON.stringify(it.sizes), JSON.stringify(it.colors), it.fabric,
                    JSON.stringify([]), d(2026, 6, 15), d(2026, 8, 20), 0,
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ کالا: ${it.name} (${it.code})`); }
        }

        // ---- consignments (handovers) ----
        for (const c of CONSIGNMENTS) {
            const lines = c.lines.map(([code, qty, size, color]) => {
                const item = itemByCode(code);
                return {
                    itemId: itemId(code), itemName: item.name, itemCode: code,
                    quantity: qty, returnedQuantity: 0, soldQuantity: 0,
                    unitPrice: item.consign, totalPrice: qty * item.consign,
                    selectedSize: size, selectedColor: color,
                };
            });
            const st = consState(c);
            const [r] = await pool.query(
                `INSERT IGNORE INTO consignments
                    (id, code, seller_id, seller_name, date, due_date, status, items,
                     total_amount, returned_amount, net_amount, paid_amount, remaining_amount,
                     notes, handed_over_by, created_at, updated_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    consId(c.code), c.code, sellerId(c.seller), sellerByCode(c.seller).name, c.date, c.due,
                    st.status, JSON.stringify(lines), st.total, st.returned, st.net, st.paid, st.remaining,
                    c.notes, 'محمد (مدیر)', c.date, d(2026, 8, 25), 0,
                ],
            );
            if (r.affectedRows > 0) {
                fresh = true;
                console.log(`+ واگذاری: ${c.code} — ${sellerByCode(c.seller).name} — ${st.total.toLocaleString('fa-IR')} تومان (${st.status === 'settled' ? 'تسویه‌شده' : st.status === 'partially_settled' ? 'تسویه بخشی' : 'فعال'})`);
            }
        }

        // ---- returns ----
        for (const rt of RETURNS) {
            const cons = CONSIGNMENTS.find((c) => c.code === rt.consignment);
            const lines = rt.lines.map((l) => {
                const item = itemByCode(l.itemCode);
                return {
                    itemId: itemId(l.itemCode), itemName: item.name,
                    quantity: l.qty, unitPrice: item.consign, totalAmount: l.qty * item.consign,
                    condition: l.condition, reason: l.reason,
                };
            });
            const totalValue = lines.reduce((s, l) => s + l.totalAmount, 0);
            const [r] = await pool.query(
                `INSERT IGNORE INTO consignment_returns
                    (id, consignment_id, consignment_code, seller_id, seller_name, date, items,
                     total_return_amount, processed_by, notes, created_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    fixedId(`return-${rt.consignment}-${rt.date.toISOString().slice(0, 10)}`),
                    consId(rt.consignment), rt.consignment, sellerId(cons.seller), sellerByCode(cons.seller).name,
                    rt.date, JSON.stringify(lines), totalValue, rt.processedBy, rt.notes, rt.date, 0,
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ مرجوعی: ${rt.consignment} — ${totalValue.toLocaleString('fa-IR')} تومان`); }
        }

        // ---- payments (FIFO allocations precomputed above) ----
        for (const p of PAYMENTS) {
            const { allocations, unallocated } = paymentAllocations[p.code];
            const [r] = await pool.query(
                `INSERT IGNORE INTO payments
                    (id, code, seller_id, seller_name, amount, date, payment_method, tracking_number,
                     allocations, unallocated_amount, recorded_by, notes, created_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    fixedId(`payment-${p.code}`), p.code, sellerId(p.seller), sellerByCode(p.seller).name,
                    p.amount, p.date, p.method, p.tracking || null,
                    JSON.stringify(allocations), unallocated, 'محمد (مدیر)', p.notes, p.date, 0,
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ پرداخت: ${p.code} — ${sellerByCode(p.seller).name} — ${p.amount.toLocaleString('fa-IR')} تومان`); }
        }

        // ---- staff ----
        for (const s of STAFF) {
            const activities = [
                { id: fixedId(`act-${s.code}-1`), date: d(2026, 7, 6).toISOString(), title: 'حضور و غیاب تیرماه', type: 'attendance', description: 'حضور کامل ۲۴ روز کاری بدون غیبت' },
                { id: fixedId(`act-${s.code}-2`), date: d(2026, 7, 14).toISOString(), title: 'دریافت پاداش تولید', type: 'payment', description: 'پرداخت کارانه هفته دوم مرداد' },
                { id: fixedId(`act-${s.code}-3`), date: d(2026, 8, 1).toISOString(), title: 'تکمیل سفارش فصل', type: 'task', description: 'تحویل ۴۰ قطعه پوشاک آماده‌سازی‌شده به انبار' },
            ];
            const [r] = await pool.query(
                `INSERT IGNORE INTO staff
                    (id, code, name, role, role_title, phones, national_code, hire_date,
                     salary_type, salary_amount, bank_accounts, status, notes,
                     tasks_completed_count, activity_history, created_at, updated_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    fixedId(`staff-${s.code}`), s.code, s.name, s.role, s.roleTitle,
                    JSON.stringify(s.phones), s.nat, s.hire,
                    s.type, s.amount, JSON.stringify([{ id: `${s.code}-bank-1`, ...s.bank, accountHolder: s.name }]),
                    'active', 'عضو ثابت تیم تولید پولاریس استایل',
                    40, JSON.stringify(activities), s.hire, d(2026, 8, 25), 0,
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ پرسنل: ${s.name} (${s.role})`); }
        }

        // ---- expenses ----
        for (const e of EXPENSES) {
            const costShares = e.allocation === 'shared_by_equity'
                ? OWNERS.map((o) => ({ recipientId: o.id, recipientName: o.name, shareUnits: 1, requiredAmount: Math.round(e.amount / 2), isPaid: false }))
                : [];
            const [r] = await pool.query(
                `INSERT IGNORE INTO expenses
                    (id, code, title, category, amount, date, paid_by, payment_method,
                     description, is_recurring, cost_allocation, cost_shares, created_at, updated_at, is_deleted)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    fixedId(`expense-${e.code}`), e.code, e.title, e.category, e.amount, e.date, e.paidBy, e.method,
                    e.desc, e.recurring, e.allocation, JSON.stringify(costShares), e.date, e.date, 0,
                ],
            );
            if (r.affectedRows > 0) { fresh = true; console.log(`+ هزینه: ${e.title} — ${e.amount.toLocaleString('fa-IR')} تومان`); }
        }

        // ---- profit distribution (5-part preset, units mode, approved) ----
        {
            const grossRevenue = 320_000_000;
            const totalExpenses = EXPENSES.reduce((s, e) => s + e.amount, 0);
            const reinvestmentReserve = Math.round(grossRevenue * 0.05);
            const netProfit = grossRevenue - totalExpenses - reinvestmentReserve;
            const totalShareUnits = 5;
            const assignedAmount = Math.round((netProfit * 1) / totalShareUnits);
            const recipients = [
                { id: 'rec-1', name: OWNERS[0].name, role: 'هم‌بنیان‌گذار و مدیر تولید', type: 'owner', shareUnits: 1, percentage: 20, bankCard: OWNERS[0].bankAccounts[0].cardNumber, bankSheba: OWNERS[0].bankAccounts[0].shebaNumber, phone: OWNERS[0].phones[0], assignedAmount },
                { id: 'rec-2', name: OWNERS[1].name, role: 'هم‌بنیان‌گذار و مدیر مالی و بازار', type: 'owner', shareUnits: 1, percentage: 20, bankCard: OWNERS[1].bankAccounts[0].cardNumber, bankSheba: OWNERS[1].bankAccounts[0].shebaNumber, phone: OWNERS[1].phones[0], assignedAmount },
                { id: 'rec-3', name: 'کادر دوزندگی، برش‌کاران و پاداش پرسنل', role: 'صندوق انگیزش و کارانه تولید', type: 'staff_pool', shareUnits: 1, percentage: 20, assignedAmount },
                { id: 'rec-4', name: 'صندوق بهسازی، نگهداری و متریال کارگاه', role: 'ذخیره توسعه تجهیزات و سرمایه در گردش', type: 'workshop_fund', shareUnits: 1, percentage: 20, assignedAmount },
                { id: 'rec-5', name: 'سرمایه‌گذار خارج از کارگاه (تامین پارچه)', role: 'سرمایه‌گذار مالی و بازدهی سرمایه', type: 'investor', shareUnits: 1, percentage: 20, assignedAmount },
            ];
            const [r] = await pool.query(
                `INSERT IGNORE INTO profit_distributions
                    (id, period_name, start_date, end_date, gross_revenue, total_expenses,
                     reinvestment_reserve, net_profit, distribution_mode, total_share_units,
                     recipients, status, calculated_at, notes, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    fixedId('profit-dist-1405-05'), 'سود دوره مرداد ۱۴۰۵', d(2026, 7, 1), d(2026, 8, 30),
                    grossRevenue, totalExpenses, reinvestmentReserve, netProfit,
                    'units', totalShareUnits, JSON.stringify(recipients),
                    'approved', d(2026, 8, 30), 'توزیع سود پنج‌سهمی مطابق مصوبه شرکا', d(2026, 8, 30),
                ],
            );
            if (r.affectedRows > 0) {
                fresh = true;
                console.log(`+ توزیع سود: سود دوره مرداد ۱۴۰۵ — سود خالص ${netProfit.toLocaleString('fa-IR')} تومان`);
            }
        }

        // ---- finalize: item stock + seller aggregates (only on a fresh run) ----
        if (fresh) {
            for (const it of ITEMS) {
                await pool.query('UPDATE items SET stock_quantity=? WHERE id=?', [itemStock(it.code), itemId(it.code)]);
            }
            for (const s of SELLERS) {
                const st = sellerState(s.code);
                await pool.query(
                    'UPDATE sellers SET current_debt=?, total_handovers_value=?, total_paid=?, status=?, updated_at=? WHERE id=?',
                    [st.debt, st.handovers, st.paid, st.status, d(2026, 8, 25), sellerId(s.code)],
                );
            }
            console.log('= موجودی کالاها و مانده فروشندگان بر اساس واگذاری، مرجوعی و پرداخت‌ها به‌روزرسانی شد');
        }

        if (!fresh) {
            console.log('= داده‌های کارگاه قبلاً ثبت شده‌اند؛ هیچ رکورد جدیدی اضافه نشد.');
        }
        console.log('✅ Seed داده‌های کارگاه با موفقیت انجام شد');
        await closePool();
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed کارگاه ناموفق بود:', err?.message ?? err);
        await closePool();
        process.exit(1);
    }
})();
