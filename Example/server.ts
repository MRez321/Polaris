import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  GarmentItem,
  Seller,
  Consignment,
  ConsignmentReturn,
  PaymentRecord,
  AuditLog,
  User,
  DashboardStats,
  Owner,
  StaffMember,
  CompanyBranding,
  WorkshopExpense,
  ProfitShareDistribution,
} from './src/types';
import { calculateFIFOAllocation } from './src/utils/fifo';

// --- In-Memory Persistent Database ---
let items: GarmentItem[] = [
  {
    id: 'item-1',
    code: 'PLR-101',
    name: 'کت اسپرت کتان مردانه (دو دکمه)',
    category: 'coats_jackets',
    categoryLabel: 'کت، کاپشن و پالتو',
    costPrice: 650000,
    consignmentPrice: 950000,
    retailPrice: 1450000,
    stockQuantity: 42,
    minStockThreshold: 10,
    sizes: ['M', 'L', 'XL', '2XL'],
    colors: ['مشکی', 'سرمه‌ای', 'کرم شتری'],
    fabric: 'کتان ترک ۳۸۰ گرم',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'item-2',
    code: 'PLR-102',
    name: 'شلوار کتان کش کلاسیک راسته',
    category: 'pants',
    categoryLabel: 'شلوار (کتان، جین، اسلش)',
    costPrice: 320000,
    consignmentPrice: 480000,
    retailPrice: 750000,
    stockQuantity: 6, // Low stock!
    minStockThreshold: 15,
    sizes: ['40', '42', '44', '46', '48'],
    colors: ['مشکی', 'طوسی تیره', 'کرم خاکی'],
    fabric: 'کتان پنبه بنگالین',
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-02T09:30:00Z',
    updatedAt: '2026-08-18T14:20:00Z',
  },
  {
    id: 'item-3',
    code: 'PLR-103',
    name: 'پیراهن آستین بلند نخی چهارخانه',
    category: 'shirts',
    categoryLabel: 'پیراهن مردانه',
    costPrice: 240000,
    consignmentPrice: 360000,
    retailPrice: 590000,
    stockQuantity: 58,
    minStockThreshold: 12,
    sizes: ['M', 'L', 'XL'],
    colors: ['زرشکی طوسی', 'آبی کاربنی', 'سبز یشمی'],
    fabric: 'نخ پنبه ۱۰۰٪ بروجرد',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-03T11:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
  },
  {
    id: 'item-4',
    code: 'PLR-104',
    name: 'مانتو عبایی پاییزه مغزی‌دوزی',
    category: 'women_clothing',
    categoryLabel: 'مانتو و پوشاک بانوان',
    costPrice: 520000,
    consignmentPrice: 790000,
    retailPrice: 1280000,
    stockQuantity: 8, // Low stock!
    minStockThreshold: 10,
    sizes: ['فری‌سایز (۳۸ تا ۴۶)'],
    colors: ['مشکی ذغالی', 'یشمی کهربایی', 'شکلاتی'],
    fabric: 'لنین ژاکارد گرم‌بالا',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-05T13:40:00Z',
    updatedAt: '2026-08-19T09:15:00Z',
  },
  {
    id: 'item-5',
    code: 'PLR-105',
    name: 'پالتو فوتر کوبیده زمستانه آستردار',
    category: 'coats_jackets',
    categoryLabel: 'کت، کاپشن و پالتو',
    costPrice: 980000,
    consignmentPrice: 1450000,
    retailPrice: 2300000,
    stockQuantity: 24,
    minStockThreshold: 8,
    sizes: ['L', 'XL', '2XL'],
    colors: ['شتری', 'طوسی ملانژ', 'مشکی'],
    fabric: 'فوتر ترک کوبیده درجه یک',
    imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-08T15:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'item-6',
    code: 'PLR-106',
    name: 'هودی بیسیک توکرک گرم زمستانه',
    category: 'men_clothing',
    categoryLabel: 'هودی و تیشرت',
    costPrice: 280000,
    consignmentPrice: 420000,
    retailPrice: 690000,
    stockQuantity: 35,
    minStockThreshold: 15,
    sizes: ['L', 'XL', '2XL'],
    colors: ['مشکی', 'کرم', 'زیتونی'],
    fabric: 'دورَس سه نخ خارخورده',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-08-10T16:00:00Z',
    updatedAt: '2026-08-21T08:00:00Z',
  },
];

let customCategories = [
  { id: 'coats_jackets', label: 'کت، کاپشن و پالتو' },
  { id: 'pants', label: 'شلوار (کتان، جین، اسلش)' },
  { id: 'shirts', label: 'پیراهن مردانه' },
  { id: 'women_clothing', label: 'مانتو و پوشاک بانوان' },
  { id: 'men_clothing', label: 'هودی، تیشرت و اسپرت' },
  { id: 'traditional', label: 'پوشاک سنتی و مجلسی' },
  { id: 'fabrics', label: 'طاقه پارچه و ملزومات دوخت' },
];

let sellers: Seller[] = [
  {
    id: 'seller-1',
    code: 'SLR-01',
    name: 'حسین احمدی (عمو حسین)',
    phone: '09123456781',
    additionalPhones: ['021-66442211', '09351112233'],
    nationalCode: '0078912345',
    streetLocation: 'میدان ولیعصر - ضلع شمال غربی روبروی سینما استقلال',
    hasGuarantee: true,
    guaranteeType: 'promissory_note',
    guaranteeAmount: 150000000,
    guaranteeDetails: 'سفته شماره ۹۸۴۵۱۱ به مبلغ ۱۵۰ میلیون تومان',
    creditLimit: 35000000,
    bankAccounts: [
      {
        bankName: 'بانک ملت',
        cardNumber: '6104-3378-9901-2345',
        shebaNumber: 'IR450120000000006104337899',
        payaNumber: '99012345',
      },
      {
        bankName: 'بانک صادرات',
        cardNumber: '6037-6919-4567-8901',
        shebaNumber: 'IR890190000000006037691945',
      }
    ],
    currentDebt: 18450000,
    totalHandoversValue: 48500000,
    totalPaid: 30050000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    notes: 'فروشنده پرانرژی و قدیمی راسته ولیعصر، روزهای پنج‌شنبه تسویه منظم دارد.',
    createdAt: '2026-07-10T10:00:00Z',
  },
  {
    id: 'seller-2',
    code: 'SLR-02',
    name: 'رضا میرزایی',
    phone: '09351234567',
    additionalPhones: ['09192223344'],
    nationalCode: '0459871234',
    streetLocation: 'بازار بزرگ تهران - راسته کوچه مروی و پامنار',
    hasGuarantee: true,
    guaranteeType: 'cheque',
    guaranteeAmount: 200000000,
    guaranteeDetails: 'چک صیادی بانک ملت شعبه بازار به شماره ۵۵۸۴۰۲',
    creditLimit: 50000000,
    bankAccounts: [
      {
        bankName: 'بانک سپه',
        cardNumber: '5892-1012-3344-5566',
        shebaNumber: 'IR770150000000005892101233',
      }
    ],
    currentDebt: 34200000,
    totalHandoversValue: 86000000,
    totalPaid: 51800000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    notes: 'حجم فروش بالا در پیراهن و شلوار، امانت‌های بالای ۳۰ میلیون دارد.',
    createdAt: '2026-07-12T12:00:00Z',
  },
  {
    id: 'seller-3',
    code: 'SLR-03',
    name: 'صادق شریفی',
    phone: '09198765432',
    additionalPhones: ['021-77889900'],
    nationalCode: '0012847561',
    streetLocation: 'میدان هفت حوض نارمک - روبروی پاساژ سون سنتر',
    hasGuarantee: true,
    guaranteeType: 'promissory_note',
    guaranteeAmount: 100000000,
    guaranteeDetails: 'سفته بانکی شماره ۱۱۴۴۷۸ به همراه کپی شناسنامه ضامن',
    creditLimit: 25000000,
    bankAccounts: [
      {
        bankName: 'بانک پاسارگاد',
        cardNumber: '5022-2910-8877-6655',
        shebaNumber: 'IR330570000000005022291088',
      }
    ],
    currentDebt: 21900000, // Overdue!
    totalHandoversValue: 32000000,
    totalPaid: 10100000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    notes: 'دو هفته است تسویه نکرده، پیگیری سررسید انجام شود.',
    createdAt: '2026-07-20T14:30:00Z',
  },
  {
    id: 'seller-4',
    code: 'SLR-04',
    name: 'بهزاد غلامی',
    phone: '09101112233',
    additionalPhones: ['09124445566'],
    nationalCode: '0067331902',
    streetLocation: 'تجریش - ابتدای خیابان شهرداری جنب ایستگاه مترو',
    hasGuarantee: true,
    guaranteeType: 'trusted_guarantor',
    guaranteeAmount: 80000000,
    guaranteeDetails: 'ضمانت حضوری حاج آقا تقوی (کاسب محل)',
    creditLimit: 20000000,
    bankAccounts: [
      {
        bankName: 'بانک ملی',
        cardNumber: '6037-9975-1234-5678',
        shebaNumber: 'IR170170000000006037997512',
      }
    ],
    currentDebt: 6500000,
    totalHandoversValue: 19500000,
    totalPaid: 13000000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    notes: 'بسیار خوش‌حساب، مانتو و پالتوهای زنانه را سریع می‌فروشد.',
    createdAt: '2026-07-25T09:00:00Z',
  },
  {
    id: 'seller-5',
    code: 'SLR-05',
    name: 'علیرضا کاظمی',
    phone: '09129998877',
    additionalPhones: [],
    nationalCode: '0034455667',
    streetLocation: 'نازی آباد - خیابان پارس بازار دوم',
    hasGuarantee: false,
    guaranteeType: 'promissory_note',
    guaranteeAmount: 0,
    guaranteeDetails: '',
    creditLimit: 15000000,
    bankAccounts: [
      {
        bankName: 'بانک تجارت',
        cardNumber: '5859-8310-7766-5544',
        shebaNumber: 'IR620180000000005859831077',
      }
    ],
    currentDebt: 0,
    totalHandoversValue: 15000000,
    totalPaid: 15000000,
    status: 'settled',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    notes: 'فعلاً تسویه کامل است و منتظر بار جدید هودی و کاپشن است.',
    createdAt: '2026-08-01T10:00:00Z',
  },
];

let consignments: Consignment[] = [
  {
    id: 'con-1',
    code: 'HND-838',
    sellerId: 'seller-3',
    sellerName: 'صادق شریفی',
    date: '2026-08-05T10:00:00Z',
    dueDate: '2026-08-15T18:00:00Z', // Overdue!
    status: 'overdue',
    items: [
      {
        itemId: 'item-1',
        itemName: 'کت اسپرت کتان مردانه (دو دکمه)',
        itemCode: 'PLR-101',
        quantity: 12,
        returnedQuantity: 2,
        soldQuantity: 10,
        unitPrice: 950000,
        totalPrice: 11400000,
        selectedSize: 'XL',
        selectedColor: 'مشکی',
      },
      {
        itemId: 'item-3',
        itemName: 'پیراهن آستین بلند نخی چهارخانه',
        itemCode: 'PLR-103',
        quantity: 15,
        returnedQuantity: 0,
        soldQuantity: 15,
        unitPrice: 360000,
        totalPrice: 5400000,
        selectedSize: 'L',
        selectedColor: 'زرشکی طوسی',
      },
      {
        itemId: 'item-6',
        itemName: 'هودی بیسیک توکرک گرم زمستانه',
        itemCode: 'PLR-106',
        quantity: 12,
        returnedQuantity: 0,
        soldQuantity: 8,
        unitPrice: 420000,
        totalPrice: 5040000,
        selectedSize: 'XL',
        selectedColor: 'کرم',
      },
    ],
    totalAmount: 21840000,
    returnedAmount: 1900000, // 2 jackets returned
    netAmount: 19940000,
    paidAmount: 5000000,
    remainingAmount: 14940000,
    notes: 'تحویل بار در راسته هفت حوض با رسید دست‌نویس',
    handedOverBy: 'علی رضایی (مدیر کارگاه)',
    createdAt: '2026-08-05T10:00:00Z',
  },
  {
    id: 'con-2',
    code: 'HND-839',
    sellerId: 'seller-3',
    sellerName: 'صادق شریفی',
    date: '2026-08-16T11:00:00Z',
    dueDate: '2026-08-26T18:00:00Z',
    status: 'active',
    items: [
      {
        itemId: 'item-2',
        itemName: 'شلوار کتان کش کلاسیک راسته',
        itemCode: 'PLR-102',
        quantity: 8,
        returnedQuantity: 0,
        soldQuantity: 5,
        unitPrice: 480000,
        totalPrice: 3840000,
        selectedSize: '42',
        selectedColor: 'طوسی تیره',
      },
      {
        itemId: 'item-4',
        itemName: 'مانتو عبایی پاییزه مغزی‌دوزی',
        itemCode: 'PLR-104',
        quantity: 4,
        returnedQuantity: 0,
        soldQuantity: 2,
        unitPrice: 780000,
        totalPrice: 3120000,
        selectedSize: 'فری‌سایز',
        selectedColor: 'مشکی ذغالی',
      },
    ],
    totalAmount: 6960000,
    returnedAmount: 0,
    netAmount: 6960000,
    paidAmount: 0,
    remainingAmount: 6960000,
    notes: 'واگذاری دوم - جهت تکمیل موجودی سایزهای پرفروش',
    handedOverBy: 'علی رضایی (مدیر کارگاه)',
    createdAt: '2026-08-16T11:00:00Z',
  },
  {
    id: 'con-3',
    code: 'HND-840',
    sellerId: 'seller-1',
    sellerName: 'حسین احمدی (عمو حسین)',
    date: '2026-08-12T09:00:00Z',
    dueDate: '2026-08-22T18:00:00Z',
    status: 'active',
    items: [
      {
        itemId: 'item-1',
        itemName: 'کت اسپرت کتان مردانه (دو دکمه)',
        itemCode: 'PLR-101',
        quantity: 15,
        returnedQuantity: 0,
        soldQuantity: 12,
        unitPrice: 950000,
        totalPrice: 14250000,
        selectedSize: 'L',
        selectedColor: 'سرمه‌ای',
      },
      {
        itemId: 'item-2',
        itemName: 'شلوار کتان کش کلاسیک راسته',
        itemCode: 'PLR-102',
        quantity: 20,
        returnedQuantity: 2,
        soldQuantity: 15,
        unitPrice: 480000,
        totalPrice: 9600000,
        selectedSize: '44',
        selectedColor: 'طوسی تیره',
      },
    ],
    totalAmount: 23850000,
    returnedAmount: 960000,
    netAmount: 22890000,
    paidAmount: 15000000,
    remainingAmount: 7890000,
    notes: 'بار بساط ولیعصر تحویل داده شد.',
    handedOverBy: 'علی رضایی (مدیر کارگاه)',
    createdAt: '2026-08-12T09:00:00Z',
  },
  {
    id: 'con-4',
    code: 'HND-841',
    sellerId: 'seller-1',
    sellerName: 'حسین احمدی (عمو حسین)',
    date: '2026-08-18T14:00:00Z',
    dueDate: '2026-08-28T18:00:00Z',
    status: 'active',
    items: [
      {
        itemId: 'item-5',
        itemName: 'پالتو فوتر کوبیده زمستانه آستردار',
        itemCode: 'PLR-105',
        quantity: 6,
        returnedQuantity: 0,
        soldQuantity: 2,
        unitPrice: 1450000,
        totalPrice: 8700000,
        selectedSize: 'XL',
        selectedColor: 'شتری',
      },
      {
        itemId: 'item-3',
        itemName: 'پیراهن آستین بلند نخی چهارخانه',
        itemCode: 'PLR-103',
        quantity: 5,
        returnedQuantity: 0,
        soldQuantity: 1,
        unitPrice: 360000,
        totalPrice: 1860000,
        selectedSize: 'XL',
        selectedColor: 'آبی کاربنی',
      },
    ],
    totalAmount: 10560000,
    returnedAmount: 0,
    netAmount: 10560000,
    paidAmount: 0,
    remainingAmount: 10560000,
    notes: 'تحویل پالتو فوتر برای شروع فصل پاییز',
    handedOverBy: 'سارا تهرانی (حسابدار)',
    createdAt: '2026-08-18T14:00:00Z',
  },
  {
    id: 'con-5',
    code: 'HND-842',
    sellerId: 'seller-2',
    sellerName: 'رضا میرزایی',
    date: '2026-08-14T12:00:00Z',
    dueDate: '2026-08-24T18:00:00Z',
    status: 'active',
    items: [
      {
        itemId: 'item-1',
        itemName: 'کت اسپرت کتان مردانه (دو دکمه)',
        itemCode: 'PLR-101',
        quantity: 20,
        returnedQuantity: 0,
        soldQuantity: 18,
        unitPrice: 950000,
        totalPrice: 19000000,
      },
      {
        itemId: 'item-2',
        itemName: 'شلوار کتان کش کلاسیک راسته',
        itemCode: 'PLR-102',
        quantity: 25,
        returnedQuantity: 0,
        soldQuantity: 20,
        unitPrice: 480000,
        totalPrice: 12000000,
      },
      {
        itemId: 'item-3',
        itemName: 'پیراهن آستین بلند نخی چهارخانه',
        itemCode: 'PLR-103',
        quantity: 30,
        returnedQuantity: 0,
        soldQuantity: 22,
        unitPrice: 360000,
        totalPrice: 10800000,
      },
    ],
    totalAmount: 41800000,
    returnedAmount: 0,
    netAmount: 41800000,
    paidAmount: 7600000,
    remainingAmount: 34200000,
    notes: 'بار سنگین بازار بزرگ تهران',
    handedOverBy: 'علی رضایی (مدیر کارگاه)',
    createdAt: '2026-08-14T12:00:00Z',
  },
  {
    id: 'con-6',
    code: 'HND-843',
    sellerId: 'seller-4',
    sellerName: 'بهزاد غلامی',
    date: '2026-08-17T15:30:00Z',
    dueDate: '2026-08-27T18:00:00Z',
    status: 'active',
    items: [
      {
        itemId: 'item-4',
        itemName: 'مانتو عبایی پاییزه مغزی‌دوزی',
        itemCode: 'PLR-104',
        quantity: 10,
        returnedQuantity: 0,
        soldQuantity: 6,
        unitPrice: 790000,
        totalPrice: 7900000,
      },
    ],
    totalAmount: 7900000,
    returnedAmount: 0,
    netAmount: 7900000,
    paidAmount: 1400000,
    remainingAmount: 6500000,
    notes: 'مانتوهای عبایی راسته تجریش',
    handedOverBy: 'سارا تهرانی (حسابدار)',
    createdAt: '2026-08-17T15:30:00Z',
  },
];

let returns: ConsignmentReturn[] = [
  {
    id: 'ret-1',
    consignmentId: 'con-1',
    consignmentCode: 'HND-838',
    sellerId: 'seller-3',
    sellerName: 'صادق شریفی',
    date: '2026-08-10T16:00:00Z',
    items: [
      {
        itemId: 'item-1',
        itemName: 'کت اسپرت کتان مردانه (دو دکمه)',
        quantity: 2,
        unitPrice: 950000,
        totalAmount: 1900000,
        condition: 'healthy',
        reason: 'عدم استقبال از سایز مدیوم در آن نقطه',
      },
    ],
    totalReturnAmount: 1900000,
    processedBy: 'علی رضایی (مدیر کارگاه)',
    createdAt: '2026-08-10T16:00:00Z',
  },
  {
    id: 'ret-2',
    consignmentId: 'con-3',
    consignmentCode: 'HND-840',
    sellerId: 'seller-1',
    sellerName: 'حسین احمدی (عمو حسین)',
    date: '2026-08-15T11:00:00Z',
    items: [
      {
        itemId: 'item-2',
        itemName: 'شلوار کتان کش کلاسیک راسته',
        quantity: 2,
        unitPrice: 480000,
        totalAmount: 960000,
        condition: 'healthy',
        reason: 'تعویض سایز',
      },
    ],
    totalReturnAmount: 960000,
    processedBy: 'سارا تهرانی (حسابدار)',
    createdAt: '2026-08-15T11:00:00Z',
  },
];

let payments: PaymentRecord[] = [
  {
    id: 'pay-1',
    code: 'PAY-401',
    sellerId: 'seller-1',
    sellerName: 'حسین احمدی (عمو حسین)',
    amount: 15000000,
    date: '2026-08-15T18:00:00Z',
    paymentMethod: 'cash',
    trackingNumber: 'نقدی - دریافتی حضوری سر بساط',
    allocations: [
      {
        consignmentId: 'con-3',
        consignmentCode: 'HND-840',
        consignmentDate: '2026-08-12T09:00:00Z',
        allocatedAmount: 15000000,
        remainingDebtBefore: 22890000,
        remainingDebtAfter: 7890000,
        isFullySettled: false,
      },
    ],
    unallocatedAmount: 0,
    recordedBy: 'علی رضایی (مدیر کارگاه)',
    notes: 'دریافت نقدی آخر هفته',
    createdAt: '2026-08-15T18:00:00Z',
  },
  {
    id: 'pay-2',
    code: 'PAY-402',
    sellerId: 'seller-2',
    sellerName: 'رضا میرزایی',
    amount: 7600000,
    date: '2026-08-17T13:20:00Z',
    paymentMethod: 'bank_transfer',
    trackingNumber: 'پایا ۹۸۷۱۴۲۰۲۵',
    allocations: [
      {
        consignmentId: 'con-5',
        consignmentCode: 'HND-842',
        consignmentDate: '2026-08-14T12:00:00Z',
        allocatedAmount: 7600000,
        remainingDebtBefore: 41800000,
        remainingDebtAfter: 34200000,
        isFullySettled: false,
      },
    ],
    unallocatedAmount: 0,
    recordedBy: 'سارا تهرانی (حسابدار)',
    notes: 'واریز پایا از سود فروش راسته بازار',
    createdAt: '2026-08-17T13:20:00Z',
  },
  {
    id: 'pay-3',
    code: 'PAY-403',
    sellerId: 'seller-3',
    sellerName: 'صادق شریفی',
    amount: 5000000,
    date: '2026-08-09T17:00:00Z',
    paymentMethod: 'pos',
    trackingNumber: 'رسید پوز ۶۳۸۲۰',
    allocations: [
      {
        consignmentId: 'con-1',
        consignmentCode: 'HND-838',
        consignmentDate: '2026-08-05T10:00:00Z',
        allocatedAmount: 5000000,
        remainingDebtBefore: 19940000,
        remainingDebtAfter: 14940000,
        isFullySettled: false,
      },
    ],
    unallocatedAmount: 0,
    recordedBy: 'علی رضایی (مدیر کارگاه)',
    notes: 'کارت‌خوان همراه کارگاه',
    createdAt: '2026-08-09T17:00:00Z',
  },
  {
    id: 'pay-4',
    code: 'PAY-404',
    sellerId: 'seller-4',
    sellerName: 'بهزاد غلامی',
    amount: 1400000,
    date: '2026-08-19T20:00:00Z',
    paymentMethod: 'cash',
    trackingNumber: 'نقدی',
    allocations: [
      {
        consignmentId: 'con-6',
        consignmentCode: 'HND-843',
        consignmentDate: '2026-08-17T15:30:00Z',
        allocatedAmount: 1400000,
        remainingDebtBefore: 7900000,
        remainingDebtAfter: 6500000,
        isFullySettled: false,
      },
    ],
    unallocatedAmount: 0,
    recordedBy: 'سارا تهرانی (حسابدار)',
    notes: 'تسویه علی‌الحساب مانتوها',
    createdAt: '2026-08-19T20:00:00Z',
  },
];

// --- 2 Company Owners ---
let owners: Owner[] = [
  {
    id: 'owner-1',
    name: 'محمد',
    role: 'هم‌بنیان‌گذار و مدیر اجرایی و تولید کارگاه',
    sharePercentage: 50,
    sharesCount: 1,
    nationalCode: '0078912345',
    phones: ['09121112233', '021-66778811'],
    email: 'mohammad@polaris-style.ir',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'مدیریت اجرایی، نظارت بر خطوط دوخت صنعتی و الگوهای تولیدی پوشاک در بازار بزرگ تهران.',
    bankAccounts: [
      {
        id: 'ba-1',
        bankName: 'بانک ملت (حساب کارگاه)',
        accountHolder: 'محمد',
        cardNumber: '6104-3378-9012-3456',
        shebaNumber: 'IR120120000000006104337890',
        payaNumber: '90123456',
      },
    ],
  },
  {
    id: 'owner-2',
    name: 'امین',
    role: 'هم‌بنیان‌گذار و مدیر مالی، فروش و راسته بازار',
    sharePercentage: 50,
    sharesCount: 1,
    nationalCode: '0019988776',
    phones: ['09122223344', '09355556677'],
    email: 'amin@polaris-style.ir',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'سرپرست بازاریابی میدانی، مدیریت حسابداری امانی و هماهنگی شبکه فروشندگان و بساط‌ها.',
    bankAccounts: [
      {
        id: 'ba-3',
        bankName: 'بانک پاسارگاد (حساب جاری)',
        accountHolder: 'امین',
        cardNumber: '5022-2910-1234-9876',
        shebaNumber: 'IR330570000000005022291012',
        payaNumber: '12349876',
      },
    ],
  },
];

// --- Workshop Staff & Tailors ---
let staffMembers: StaffMember[] = [
  {
    id: 'stf-1',
    code: 'STF-01',
    name: 'استاد رحیم کاظمی',
    role: 'tailor',
    roleTitle: 'دوزنده ارشد کت، پالتو و اورکت',
    phones: ['09127778899'],
    nationalCode: '0054321987',
    hireDate: '2024-03-10',
    salaryType: 'piecework',
    salaryAmount: 18000000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    tasksCompletedCount: 340,
    bankAccounts: [
      {
        bankName: 'بانک ملت',
        cardNumber: '6104-3375-1122-3344',
        shebaNumber: 'IR450120000000006104337511',
      },
    ],
    notes: 'مسئول خط دوخت کت‌های کتان ترک و پالتوهای فوتر زمستانه.',
    activityHistory: [
      {
        id: 'act-1',
        date: '2026-08-20T11:00:00Z',
        title: 'تکمیل دوخت ۲۴ عدد پالتو فوتر (PLR-105)',
        type: 'task',
        description: 'تحویل به انبار و کنترل کیفیت بدون ایراد دوخت',
      },
      {
        id: 'act-2',
        date: '2026-08-15T09:30:00Z',
        title: 'دوخت ۴۰ عدد کت تک کتان ترک',
        type: 'task',
        description: 'تحویل سری اول دکمه‌دوزی شده به انبار مرکزی',
      },
    ],
  },
  {
    id: 'stf-2',
    code: 'STF-02',
    name: 'سارا تهرانی',
    role: 'accountant',
    roleTitle: 'حسابدار و مسئول تخصیص مطالبات FIFO',
    phones: ['09193334455', '021-66778822'],
    nationalCode: '0451122334',
    hireDate: '2025-01-15',
    salaryType: 'monthly',
    salaryAmount: 22000000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    tasksCompletedCount: 195,
    bankAccounts: [
      {
        bankName: 'بانک سامان',
        cardNumber: '6219-8610-5566-7788',
        shebaNumber: 'IR920560000000006219861055',
      },
    ],
    notes: 'مدیریت دریافتی‌ها، مغایرت‌گیری سفته‌ها و گزارش‌های مالی.',
    activityHistory: [
      {
        id: 'act-3',
        date: '2026-08-21T09:00:00Z',
        title: 'بررسی فاکتورهای سررسید گذشته',
        type: 'handover',
        description: 'صدور اخطار پیگیری برای صادق شریفی به مبلغ ۲۱.۹ میلیون تومان',
      },
      {
        id: 'act-4',
        date: '2026-08-19T20:00:00Z',
        title: 'ثبت دریافت وجه ۱,۴۰۰,۰۰۰ تومان',
        type: 'payment',
        description: 'ثبت فاکتور نقدی بهزاد غلامی با تخصیص خودکار FIFO',
      },
    ],
  },
  {
    id: 'stf-3',
    code: 'STF-03',
    name: 'داوود حیدری',
    role: 'cutter',
    roleTitle: 'برش‌کار صنعتی و الگوساز کامپیوتری',
    phones: ['09361119988'],
    nationalCode: '0029988771',
    hireDate: '2024-08-01',
    salaryType: 'piecework',
    salaryAmount: 16500000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    tasksCompletedCount: 410,
    bankAccounts: [
      {
        bankName: 'بانک تجارت',
        cardNumber: '5859-8310-9900-1122',
        shebaNumber: 'IR620180000000005859831099',
      },
    ],
    notes: 'برش طاقه‌های پارچه کتان ترک، بنگالین و فوتر با دستگاه برش عمودی.',
    activityHistory: [
      {
        id: 'act-5',
        date: '2026-08-18T16:00:00Z',
        title: 'برش ۵ طاقه پارچه کتان کش',
        type: 'task',
        description: 'تولید قطعات شلوار سایزهای ۴۰ تا ۴۸ برای خط دوخت',
      },
    ],
  },
  {
    id: 'stf-4',
    code: 'STF-04',
    name: 'مهدی مرادی',
    role: 'buyer',
    roleTitle: 'مسئول تامین پارچه و خرج‌کار کارگاه',
    phones: ['09126665544'],
    nationalCode: '0018877665',
    hireDate: '2025-04-01',
    salaryType: 'monthly',
    salaryAmount: 17000000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    tasksCompletedCount: 88,
    bankAccounts: [
      {
        bankName: 'بانک رفاه کارگران',
        cardNumber: '5894-6311-2233-4455',
        shebaNumber: 'IR250130000000005894631122',
      },
    ],
    notes: 'خرید مستقیم از بازارهای طاقه‌فروشی مولوی، خیام و پاچنار.',
    activityHistory: [
      {
        id: 'act-6',
        date: '2026-08-17T11:00:00Z',
        title: 'خرید طاقه فوتر کوبیده زمستانه',
        type: 'task',
        description: 'تامین ۶ طاقه رنگ شتری و مشکی از بازار خیام',
      },
    ],
  },
];

let companyBranding: CompanyBranding = {
  name: 'کارگاه دوزندگی و تولیدی پولاریس استایل',
  brandName: 'Polaris Style (پولاریس استایل)',
  tagline: 'سیستم جامع مدیریت امانت، تولیدی پوشاک و تسویه بر خط دست‌فروشان خیابانی',
  slogan: 'تولیدکننده تخصصی پوشاک زمستانه، پالتو و کاپشن‌های راسته بازار',
  website: 'https://polaris-style.ir',
  instagram: '@polaris_style_official',
  telegram: 't.me/polaris_style_tailoring',
  address: 'تهران، بازار بزرگ، سرای دوزندگان، طبقه ۲، پلاک ۸۴',
  workshopAddress: 'تهران، بازار بزرگ، سرای دوزندگان، طبقه ۲، پلاک ۸۴',
  phone: '021-66778899',
  workshopPhone: '021-66778899',
  emergencyPhone: '09121112233',
  secondaryPhone: '021-66778800',
  registrationNumber: '۹۸۴۳۲۱/ت',
  postalCode: '۱۱۶۷۸۹۴۳۲۱',
  establishedYear: '۱۳۹۹ (۲۰۲۰)',
  logoUrl: '',
  owners: owners,
};

let expenses: WorkshopExpense[] = [
  {
    id: 'cst-1',
    code: 'CST-101',
    title: 'اجاره ماهانه سالن دوخت و انبار سرای دوزندگان',
    category: 'rent',
    categoryLabel: 'اجاره‌بهای سالن دوخت و انبار',
    amount: 35000000,
    date: '2026-08-01',
    paidBy: 'محمد (هم‌بنیان‌گذار)',
    paymentMethod: 'bank_transfer',
    description: 'پرداخت اجاره ماه مرداد کارگاه سرای دوزندگان پلاک ۸۴',
    isRecurring: true,
    costAllocation: 'shared_by_equity',
    createdAt: '2026-08-01T09:00:00Z',
  },
  {
    id: 'cst-2',
    code: 'CST-102',
    title: 'سرویس، روغن‌کاری، تعویض تیغ و تسمه چرخ‌های راسته و میان‌دوز',
    category: 'machinery_maintenance',
    categoryLabel: 'تعمیرات و استهلاک چرخ‌ها و تجهیزات',
    amount: 6800000,
    date: '2026-08-10',
    paidBy: 'صندوق کارگاه',
    paymentMethod: 'cash',
    description: 'سرویس دوره‌ای ۴ دستگاه چرخ صنعتی جک، تعویض روغن و تنظیم شاتون',
    costAllocation: 'workshop_fund',
    createdAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 'cst-3',
    code: 'CST-103',
    title: 'خرید دوک نخ پلی‌استر، لایی پرشیا، دکمه فلزی و زیپ استخوانی',
    category: 'materials_supplies',
    categoryLabel: 'ملزومات، خرج‌کار و پارچه مصرفی',
    amount: 14200000,
    date: '2026-08-14',
    paidBy: 'امین (هم‌بنیان‌گذار)',
    paymentMethod: 'card',
    description: 'تامین متریال و خرج‌کار مصرفی خط دوخت شلوار کتان و پالتو',
    costAllocation: 'shared_by_equity',
    createdAt: '2026-08-14T11:20:00Z',
  },
  {
    id: 'cst-4',
    code: 'CST-104',
    title: 'بهسازی سیستم روشنایی LED و قفسه‌بندی فلزی انبار پارچه',
    category: 'workshop_improvement',
    categoryLabel: 'توسعه، تجهیز و بهسازی کارگاه',
    amount: 18500000,
    date: '2026-08-15',
    paidBy: 'محمد (هم‌بنیان‌گذار)',
    paymentMethod: 'bank_transfer',
    description: 'نصب رگال‌های صنعتی، نورپردازی استاندارد میز برش و قفسه‌بندی پارچه‌ها',
    costAllocation: 'shared_by_equity',
    createdAt: '2026-08-15T16:00:00Z',
  },
  {
    id: 'cst-5',
    code: 'CST-105',
    title: 'قبض برق صنعتی ۳ فاز و گاز کارگاه',
    category: 'utilities',
    categoryLabel: 'قبوض آب، برق صنعتی و گاز',
    amount: 3900000,
    date: '2026-08-16',
    paidBy: 'صندوق کارگاه',
    paymentMethod: 'bank_transfer',
    description: 'قبض برق دوره‌ای کولرها، مکش اتوها و موتورهای چرخ خیاطی',
    costAllocation: 'workshop_fund',
    createdAt: '2026-08-16T18:00:00Z',
  },
  {
    id: 'cst-6',
    code: 'CST-106',
    title: 'خرید قیچی برقی عمودی ۱۰ اینچ و سنباده اتوماتیک',
    category: 'tools_equipment',
    categoryLabel: 'ابزارآلات و تجهیزات دوخت و برش',
    amount: 9500000,
    date: '2026-08-19',
    paidBy: 'امین (هم‌بنیان‌گذار)',
    paymentMethod: 'card',
    description: 'تجهیز میز برش به دستگاه برش لایه‌ای با ظرفیت ۱۰۰ لایه پارچه',
    costAllocation: 'shared_by_equity',
    createdAt: '2026-08-19T10:30:00Z',
  },
];

let profitDistributions: ProfitShareDistribution[] = [
  {
    id: 'prd-1',
    periodName: 'دوره تسویه و تقسیم سود جامع (مدل تسهیم ۵ قسمتی)',
    startDate: '2026-07-22',
    endDate: '2026-08-21',
    grossRevenue: 125000000,
    totalExpenses: 50000000,
    reinvestmentReserve: 15000000,
    netProfit: 60000000,
    distributionMode: 'units',
    totalShareUnits: 5,
    recipients: [
      {
        id: 'rec-1',
        name: 'محمد',
        role: 'هم‌بنیان‌گذار و مدیر تولید',
        type: 'owner',
        shareUnits: 1,
        percentage: 20,
        assignedAmount: 12000000,
        costObligation: 10000000,
        alreadyPaidForCosts: 53500000,
        netSettlement: 55500000,
        bankCard: '6104-3378-9012-3456',
        bankSheba: 'IR120120000000006104337890',
        phone: '09121112233',
        isSettled: false,
      },
      {
        id: 'rec-2',
        name: 'امین',
        role: 'هم‌بنیان‌گذار و مدیر مالی و بازار',
        type: 'owner',
        shareUnits: 1,
        percentage: 20,
        assignedAmount: 12000000,
        costObligation: 10000000,
        alreadyPaidForCosts: 23700000,
        netSettlement: 25700000,
        bankCard: '5022-2910-1234-9876',
        bankSheba: 'IR330570000000005022291012',
        phone: '09122223344',
        isSettled: false,
      },
      {
        id: 'rec-3',
        name: 'کادر دوزندگی، برش‌کاران و پاداش پرسنل',
        role: 'صندوق انگیزش و کارانه تولید',
        type: 'staff_pool',
        shareUnits: 1,
        percentage: 20,
        assignedAmount: 12000000,
        costObligation: 0,
        alreadyPaidForCosts: 0,
        netSettlement: 12000000,
        bankCard: '6104-3375-1122-3344',
        phone: '09127778899',
        isSettled: true,
      },
      {
        id: 'rec-4',
        name: 'صندوق بهسازی، نگهداری و متریال کارگاه',
        role: 'ذخیره توسعه تجهیزات و سرمایه در گردش',
        type: 'workshop_fund',
        shareUnits: 1,
        percentage: 20,
        assignedAmount: 12000000,
        costObligation: 0,
        alreadyPaidForCosts: 0,
        netSettlement: 12000000,
        isSettled: true,
      },
      {
        id: 'rec-5',
        name: 'سرمایه‌گذار خارج از کارگاه (تامین پارچه)',
        role: 'سرمایه‌گذار مالی و بازدهی سرمایه',
        type: 'investor',
        shareUnits: 1,
        percentage: 20,
        assignedAmount: 12000000,
        costObligation: 0,
        alreadyPaidForCosts: 0,
        netSettlement: 12000000,
        bankCard: '6219-8610-9988-7766',
        bankSheba: 'IR980560000000006219861099',
        phone: '09123456780',
        isSettled: false,
      },
    ],
    status: 'approved',
    calculatedAt: '2026-08-21T12:00:00Z',
    notes: 'تسهیم ۵ قسمتی: ۲ سهم شرکا (محمد و امین)، ۱ سهم پاداش دوزندگان، ۱ سهم صندوق توسعه کارگاه، ۱ سهم سرمایه‌گذار.',
  },
];

let auditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-21T09:10:00Z',
    userId: 'user-admin',
    userName: 'علی رضایی (مدیر کارگاه)',
    userRole: 'مدیر ارشد',
    action: 'بررسی وضعیت طلب‌ها',
    entity: 'consignment',
    details: 'مشاهده لیست سررسیدهای گذشته و صدور یادآوری برای صادق شریفی',
    ipAddress: '192.168.1.102',
  },
  {
    id: 'log-2',
    timestamp: '2026-08-19T20:00:00Z',
    userId: 'user-acc',
    userName: 'سارا تهرانی (حسابدار)',
    userRole: 'حسابدار',
    action: 'ثبت دریافت وجه FIFO',
    entity: 'payment',
    details: 'ثبت دریافتی مبلغ ۱,۴۰۰,۰۰۰ تومان از بهزاد غلامی و تخصیص خودکار به فاکتور HND-843',
    ipAddress: '192.168.1.108',
  },
  {
    id: 'log-3',
    timestamp: '2026-08-18T14:00:00Z',
    userId: 'user-admin',
    userName: 'علی رضایی (مدیر کارگاه)',
    userRole: 'مدیر ارشد',
    action: 'واگذاری امانی کالا',
    entity: 'consignment',
    details: 'واگذاری ۱۱ قلم کالا (پالتو و پیراهن) به مبلغ ۱۰,۵۶۰,۰۰۰ تومان به حسین احمدی',
    ipAddress: '192.168.1.102',
  },
  {
    id: 'log-4',
    timestamp: '2026-08-17T13:20:00Z',
    userId: 'user-acc',
    userName: 'سارا تهرانی (حسابدار)',
    userRole: 'حسابدار',
    action: 'ثبت واریز پایا',
    entity: 'payment',
    details: 'ثبت مبلغ ۷,۶۰۰,۰۰۰ تومان دریافتی از رضا میرزایی با شناسه پایا ۹۸۷۱۴۲۰۲۵',
    ipAddress: '192.168.1.108',
  },
  {
    id: 'log-5',
    timestamp: '2026-08-15T11:00:00Z',
    userId: 'user-acc',
    userName: 'سارا تهرانی (حسابدار)',
    userRole: 'حسابدار',
    action: 'ثبت مرجوعی کالا',
    entity: 'return',
    details: 'مرجوعی ۲ عدد شلوار کتان کش از فاکتور HND-840 به دلیل تعویض سایز',
    ipAddress: '192.168.1.108',
  },
];

let currentUser: User = {
  id: 'user-admin',
  name: 'علی رضایی',
  email: 'mrez321@gmail.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  mfaEnabled: true,
  linkedGoogle: true,
  lastLogin: '2026-08-21T11:14:00Z',
};

// Helper to update seller summary debts
function recalculateSellerDebt(sellerId: string) {
  const sellerConsignments = consignments.filter((c) => c.sellerId === sellerId);
  const totalHandovers = sellerConsignments.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const currentDebt = sellerConsignments.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);
  const sellerPayments = payments.filter((p) => p.sellerId === sellerId);
  const totalPaid = sellerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const sellerIndex = sellers.findIndex((s) => s.id === sellerId);
  if (sellerIndex !== -1) {
    sellers[sellerIndex] = {
      ...sellers[sellerIndex],
      currentDebt,
      totalHandoversValue: totalHandovers,
      totalPaid,
      status: currentDebt === 0 ? 'settled' : sellers[sellerIndex].status === 'suspended' ? 'suspended' : 'active',
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'OK',
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      brand: 'Polaris Style (پولاریس استایل)',
    });
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
    const totalActiveDebt = sellers.reduce((sum, s) => sum + (s.currentDebt || 0), 0);
    const now = new Date().getTime();

    // Check overdue consignments
    const overdueConsignments = consignments.filter(
      (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < now
    );
    const totalOverdueDebt = overdueConsignments.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    // Today's payments
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPayments = payments
      .filter((p) => p.date.startsWith(todayStr))
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Total Inventory value
    const totalInventoryValue = items.reduce(
      (sum, item) => sum + (item.stockQuantity || 0) * (item.consignmentPrice || 0),
      0
    );

    // Total items currently in hands of sellers
    let totalItemsInHands = 0;
    consignments
      .filter((c) => c.status !== 'settled')
      .forEach((c) => {
        (c.items || []).forEach((it) => {
          totalItemsInHands += (it.quantity || 0) - (it.returnedQuantity || 0);
        });
      });

    const lowStockItemsCount = items.filter((i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)).length;

    const stats: DashboardStats = {
      totalActiveDebt,
      totalOverdueDebt,
      todayPayments,
      totalInventoryValue,
      totalItemsInHands,
      activeConsignmentsCount: consignments.filter((c) => c.status !== 'settled').length,
      overdueConsignmentsCount: overdueConsignments.length,
      lowStockItemsCount,
      totalSellersCount: sellers.length,
      activeSellersCount: sellers.filter((s) => s.status === 'active').length,
      totalOutstandingDebt: totalActiveDebt,
    };

    res.json(stats);
  });

  // --- 1. Items & Categories (انبار کالا و دسته‌بندی‌ها) ---
  app.get('/api/items', (req: Request, res: Response) => {
    res.json(items.filter((i) => !i.isDeleted));
  });

  app.get('/api/categories', (req: Request, res: Response) => {
    res.json(customCategories);
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const { label } = req.body;
    if (!label) return res.status(400).json({ error: 'نام دسته الزامی است' });

    const newId = `cat_${Date.now()}`;
    const newCat = { id: newId, label: label.trim() };
    customCategories.push(newCat);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role === 'admin' ? 'مدیر ارشد' : 'حسابدار',
      action: 'افزودن دسته‌بندی جدید',
      entity: 'item',
      details: `دسته‌بندی جدید "${newCat.label}" ایجاد گردید.`,
    });

    res.status(201).json(newCat);
  });

  app.post('/api/items', (req: Request, res: Response) => {
    const images = Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images
      : req.body.imageUrl
      ? [req.body.imageUrl]
      : [];

    const newItem: GarmentItem = {
      id: `item-${Date.now()}`,
      code: req.body.code || `PLR-${Math.floor(100 + Math.random() * 900)}`,
      name: req.body.name,
      category: req.body.category || 'coats_jackets',
      categoryLabel: req.body.categoryLabel,
      costPrice: Number(req.body.costPrice) || 0,
      consignmentPrice: Number(req.body.consignmentPrice) || 0,
      retailPrice: Number(req.body.retailPrice) || 0,
      stockQuantity: Number(req.body.stockQuantity) || 0,
      minStockThreshold: Number(req.body.minStockThreshold) || 10,
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : ['M', 'L', 'XL'],
      colors: Array.isArray(req.body.colors) ? req.body.colors : ['مشکی'],
      fabric: req.body.fabric || 'پارچه با کیفیت کارگاه',
      imageUrl: images[0] || '',
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    items.unshift(newItem);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'افزودن کالای جدید به انبار',
      entity: 'item',
      details: `کالای جدید "${newItem.name}" با کد ${newItem.code} و موجودی ${newItem.stockQuantity} عدد افزوده شد.`,
    });

    res.status(201).json(newItem);
  });

  app.put('/api/items/:id', (req: Request, res: Response) => {
    const index = items.findIndex((i) => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'کالا یافت نشد' });

    const prevItem = items[index];
    const images = Array.isArray(req.body.images) ? req.body.images : req.body.imageUrl ? [req.body.imageUrl] : prevItem.images;

    items[index] = {
      ...items[index],
      ...req.body,
      imageUrl: images?.[0] || prevItem.imageUrl,
      images,
      costPrice: req.body.costPrice !== undefined ? Number(req.body.costPrice) : items[index].costPrice,
      consignmentPrice: req.body.consignmentPrice !== undefined ? Number(req.body.consignmentPrice) : items[index].consignmentPrice,
      retailPrice: req.body.retailPrice !== undefined ? Number(req.body.retailPrice) : items[index].retailPrice,
      stockQuantity: req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : items[index].stockQuantity,
      minStockThreshold: req.body.minStockThreshold !== undefined ? Number(req.body.minStockThreshold) : items[index].minStockThreshold,
      updatedAt: new Date().toISOString(),
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'ویرایش مشخصات کالا',
      entity: 'item',
      details: `مشخصات کالای "${items[index].name}" (${items[index].code}) ویرایش شد.`,
    });

    res.json(items[index]);
  });

  app.delete('/api/items/:id', (req: Request, res: Response) => {
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'کالا یافت نشد' });

    // Soft delete
    item.isDeleted = true;
    item.deletedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'انتقال کالا به سطل بازیافت (Soft Delete)',
      entity: 'item',
      details: `کالای "${item.name}" با کد ${item.code} به سطل بازیافت منتقل گردید.`,
    });

    res.json({ message: 'کالا به سطل بازیافت منتقل شد', item });
  });

  // --- 2. Sellers (فروشندگان خیابانی و بساط‌ها) ---
  app.get('/api/sellers', (req: Request, res: Response) => {
    res.json(sellers.filter((s) => !s.isDeleted));
  });

  app.get('/api/sellers/:id', (req: Request, res: Response) => {
    const seller = sellers.find((s) => s.id === req.params.id && !s.isDeleted);
    if (!seller) return res.status(404).json({ error: 'فروشنده یافت نشد' });
    res.json(seller);
  });

  app.post('/api/sellers', (req: Request, res: Response) => {
    const newSeller: Seller = {
      id: `seller-${Date.now()}`,
      code: req.body.code || `SLR-0${sellers.length + 1}`,
      name: req.body.name,
      phone: req.body.phone,
      additionalPhones: Array.isArray(req.body.additionalPhones) ? req.body.additionalPhones : [],
      nationalCode: req.body.nationalCode || '',
      streetLocation: req.body.streetLocation || 'نامشخص',
      hasGuarantee: Boolean(req.body.hasGuarantee),
      guaranteeType: req.body.guaranteeType || 'promissory_note',
      guaranteeAmount: req.body.hasGuarantee ? Number(req.body.guaranteeAmount) || 50000000 : 0,
      guaranteeDetails: req.body.hasGuarantee ? req.body.guaranteeDetails || '' : '',
      creditLimit: Number(req.body.creditLimit) || 30000000,
      bankAccounts: Array.isArray(req.body.bankAccounts) ? req.body.bankAccounts : [],
      currentDebt: 0,
      totalHandoversValue: 0,
      totalPaid: 0,
      status: 'active',
      avatarUrl: req.body.avatarUrl || '',
      notes: req.body.notes,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    sellers.unshift(newSeller);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'ثبت فروشنده و دست‌فروش جدید',
      entity: 'seller',
      details: `فروشنده جدید "${newSeller.name}" (${newSeller.code}) مستقر در "${newSeller.streetLocation}" با سقف اعتبار ${newSeller.creditLimit.toLocaleString('fa-IR')} تومان ثبت گردید.`,
    });

    res.status(201).json(newSeller);
  });

  app.put('/api/sellers/:id', (req: Request, res: Response) => {
    const index = sellers.findIndex((s) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'فروشنده یافت نشد' });

    sellers[index] = {
      ...sellers[index],
      ...req.body,
      guaranteeAmount: req.body.guaranteeAmount !== undefined ? Number(req.body.guaranteeAmount) : sellers[index].guaranteeAmount,
      creditLimit: req.body.creditLimit !== undefined ? Number(req.body.creditLimit) : sellers[index].creditLimit,
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'ویرایش اطلاعات فروشنده',
      entity: 'seller',
      details: `اطلاعات فروشنده "${sellers[index].name}" به‌روزرسانی شد.`,
    });

    res.json(sellers[index]);
  });

  app.delete('/api/sellers/:id', (req: Request, res: Response) => {
    const seller = sellers.find((s) => s.id === req.params.id);
    if (!seller) return res.status(404).json({ error: 'فروشنده یافت نشد' });

    if ((seller.currentDebt || 0) > 0) {
      return res.status(400).json({ error: 'امکان حذف فروشنده با مانده بدهی تسویه نشده وجود ندارد.' });
    }

    // Soft delete
    seller.isDeleted = true;
    seller.deletedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر سیستم',
      action: 'انتقال فروشنده به سطل بازیافت (Soft Delete)',
      entity: 'seller',
      details: `پرونده فروشنده "${seller.name}" (${seller.code}) به سطل بازیافت منتقل شد.`,
    });

    res.json({ message: 'فروشنده به سطل بازیافت منتقل شد', seller });
  });

  // --- 3. Consignments (واگذاری امانی و تحویل بار) ---
  app.get('/api/consignments', (req: Request, res: Response) => {
    const now = new Date().getTime();
    consignments.forEach((c) => {
      if ((c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < now) {
        c.status = 'overdue';
      }
    });
    res.json(consignments.filter((c) => !c.isDeleted));
  });

  app.delete('/api/consignments/:id', (req: Request, res: Response) => {
    const consignment = consignments.find((c) => c.id === req.params.id);
    if (!consignment) return res.status(404).json({ error: 'فاکتور امانی یافت نشد' });

    consignment.isDeleted = true;
    consignment.deletedAt = new Date().toISOString();
    recalculateSellerDebt(consignment.sellerId);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر کارگاه',
      action: 'حذف فاکتور امانی (Soft Delete)',
      entity: 'consignment',
      details: `فاکتور امانی ${consignment.code} به سطل بازیافت منتقل گردید.`,
    });

    res.json({ message: 'فاکتور با موفقیت حذف شد' });
  });

  app.post('/api/consignments', (req: Request, res: Response) => {
    const { sellerId, itemsList, dueDate, notes } = req.body;

    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return res.status(404).json({ error: 'فروشنده یافت نشد' });

    if (!Array.isArray(itemsList) || itemsList.length === 0) {
      return res.status(400).json({ error: 'لیست کالاهای واگذاری خالی است' });
    }

    let totalAmount = 0;
    const formattedLines = [];

    for (const itemReq of itemsList) {
      const invItem = items.find((i) => i.id === itemReq.itemId);
      if (!invItem) continue;

      const qty = Number(itemReq.quantity) || 1;
      const unitPrice = Number(itemReq.unitPrice) || invItem.consignmentPrice;
      const lineTotal = qty * unitPrice;
      totalAmount += lineTotal;

      // Deduct stock from inventory
      invItem.stockQuantity = Math.max(0, (invItem.stockQuantity || 0) - qty);

      formattedLines.push({
        itemId: invItem.id,
        itemName: invItem.name,
        itemCode: invItem.code,
        quantity: qty,
        returnedQuantity: 0,
        soldQuantity: 0,
        unitPrice,
        totalPrice: lineTotal,
        selectedSize: itemReq.selectedSize || invItem.sizes[0] || 'L',
        selectedColor: itemReq.selectedColor || invItem.colors[0] || 'مشکی',
      });
    }

    const newConsignment: Consignment = {
      id: `con-${Date.now()}`,
      code: `HND-${Math.floor(840 + consignments.length + 1)}`,
      sellerId: seller.id,
      sellerName: seller.name,
      date: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      items: formattedLines,
      totalAmount,
      returnedAmount: 0,
      netAmount: totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      notes,
      handedOverBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    consignments.unshift(newConsignment);
    recalculateSellerDebt(seller.id);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر کارگاه',
      action: 'ثبت واگذاری امانی (تحویل بار)',
      entity: 'consignment',
      details: `تحویل فاکتور امانی ${newConsignment.code} به ${seller.name} به مبلغ ${totalAmount.toLocaleString('fa-IR')} تومان شامل ${formattedLines.length} ردیف کالا`,
    });

    res.status(201).json(newConsignment);
  });

  app.post('/api/consignments/return', (req: Request, res: Response) => {
    const { consignmentId, returnItems, notes } = req.body;

    const consignment = consignments.find((c) => c.id === consignmentId);
    if (!consignment) return res.status(404).json({ error: 'فاکتور امانی یافت نشد' });

    let totalReturnAmount = 0;
    const processedReturnLines = [];

    for (const ret of returnItems) {
      const lineItem = consignment.items.find((it) => it.itemId === ret.itemId);
      if (!lineItem) continue;

      const returnQty = Math.min(Number(ret.quantity) || 0, lineItem.quantity - lineItem.returnedQuantity);
      if (returnQty <= 0) continue;

      lineItem.returnedQuantity += returnQty;
      const lineReturnAmount = returnQty * lineItem.unitPrice;
      totalReturnAmount += lineReturnAmount;

      const invItem = items.find((i) => i.id === ret.itemId);
      if (invItem && ret.condition !== 'damaged') {
        invItem.stockQuantity += returnQty;
      }

      processedReturnLines.push({
        itemId: lineItem.itemId,
        itemName: lineItem.itemName,
        quantity: returnQty,
        unitPrice: lineItem.unitPrice,
        totalAmount: lineReturnAmount,
        condition: ret.condition || 'healthy',
        reason: ret.reason || 'مرجوعی کالای فروش نرفته',
      });
    }

    if (processedReturnLines.length === 0) {
      return res.status(400).json({ error: 'هیچ کالای معتبری برای مرجوعی ثبت نشد' });
    }

    consignment.returnedAmount += totalReturnAmount;
    consignment.netAmount = Math.max(0, consignment.totalAmount - consignment.returnedAmount);
    consignment.remainingAmount = Math.max(0, consignment.netAmount - consignment.paidAmount);

    if (consignment.remainingAmount === 0 && consignment.netAmount > 0) {
      consignment.status = 'settled';
    } else if (consignment.paidAmount > 0) {
      consignment.status = 'partially_settled';
    }

    const returnRecord: ConsignmentReturn = {
      id: `ret-${Date.now()}`,
      consignmentId: consignment.id,
      consignmentCode: consignment.code,
      sellerId: consignment.sellerId,
      sellerName: consignment.sellerName,
      date: new Date().toISOString(),
      items: processedReturnLines,
      totalReturnAmount,
      processedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    returns.unshift(returnRecord);
    recalculateSellerDebt(consignment.sellerId);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر کارگاه',
      action: 'ثبت مرجوعی کالا',
      entity: 'return',
      details: `ثبت مرجوعی برای فاکتور ${consignment.code} به ارزش ${totalReturnAmount.toLocaleString('fa-IR')} تومان و کسر از بدهی ${consignment.sellerName}`,
    });

    res.json({
      message: 'مرجوعی با موفقیت ثبت شد',
      returnRecord,
      updatedConsignment: consignment,
    });
  });

  // --- 4. Payments (دریافت‌ها و تسویه FIFO) ---
  app.get('/api/payments', (req: Request, res: Response) => {
    res.json(payments);
  });

  app.post('/api/payments', (req: Request, res: Response) => {
    const { sellerId, amount, paymentMethod, trackingNumber, notes } = req.body;

    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return res.status(404).json({ error: 'فروشنده یافت نشد' });

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'مبلغ پرداختی معتبر نیست' });
    }

    const sellerConsignments = consignments.filter((c) => c.sellerId === seller.id);
    const fifoResult = calculateFIFOAllocation(sellerConsignments, numAmount);

    fifoResult.updatedConsignments.forEach((updatedC) => {
      const idx = consignments.findIndex((c) => c.id === updatedC.id);
      if (idx !== -1) {
        consignments[idx] = updatedC;
      }
    });

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      code: `PAY-${Math.floor(400 + payments.length + 1)}`,
      sellerId: seller.id,
      sellerName: seller.name,
      amount: numAmount,
      date: new Date().toISOString(),
      paymentMethod: paymentMethod || 'cash',
      trackingNumber,
      allocations: fifoResult.allocations,
      unallocatedAmount: fifoResult.unallocatedAmount,
      recordedBy: currentUser.name,
      notes,
      createdAt: new Date().toISOString(),
    };

    payments.unshift(newPayment);
    recalculateSellerDebt(seller.id);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'حسابدار',
      action: 'ثبت دریافت وجه (تخصیص FIFO)',
      entity: 'payment',
      details: `ثبت دریافتی ${numAmount.toLocaleString('fa-IR')} تومان از ${seller.name}، تخصیص یافته به ${fifoResult.allocations.length} فاکتور قدیمی‌تر به روش FIFO`,
    });

    res.status(201).json({
      payment: newPayment,
      seller: sellers.find((s) => s.id === seller.id),
      allocations: fifoResult.allocations,
    });
  });

  // --- 5. Staff & Owners (کارکنان و صاحبان کارگاه) ---
  app.get('/api/owners', (req: Request, res: Response) => {
    res.json(owners);
  });

  app.put('/api/owners', (req: Request, res: Response) => {
    if (Array.isArray(req.body.owners)) {
      owners = req.body.owners;
      companyBranding.owners = owners;
    }
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'ویرایش اطلاعات صاحبان کارگاه',
      entity: 'staff',
      details: 'اطلاعات بانکی، شماره تماس و مشخصات هم‌بنیان‌گذاران به‌روزرسانی شد.',
    });
    res.json(owners);
  });

  app.get('/api/staff', (req: Request, res: Response) => {
    res.json(staffMembers.filter((s) => !s.isDeleted));
  });

  app.post('/api/staff', (req: Request, res: Response) => {
    const newStaff: StaffMember = {
      id: `stf-${Date.now()}`,
      code: `STF-0${staffMembers.length + 1}`,
      name: req.body.name,
      role: req.body.role || 'tailor',
      roleTitle: req.body.roleTitle || 'عضو تیم تولید',
      phones: Array.isArray(req.body.phones) ? req.body.phones : [req.body.phone || ''],
      nationalCode: req.body.nationalCode || '',
      hireDate: req.body.hireDate || new Date().toISOString().split('T')[0],
      salaryType: req.body.salaryType || 'monthly',
      salaryAmount: Number(req.body.salaryAmount) || 0,
      bankAccounts: Array.isArray(req.body.bankAccounts) ? req.body.bankAccounts : [],
      avatarUrl: req.body.avatarUrl || '',
      resumeUrl: req.body.resumeUrl || '',
      resumeAttachmentName: req.body.resumeAttachmentName || '',
      resumeAttachmentData: req.body.resumeAttachmentData || '',
      status: req.body.status || 'active',
      notes: req.body.notes || '',
      tasksCompletedCount: 0,
      isDeleted: false,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          date: new Date().toISOString(),
          title: 'عضویت در تیم کارگاه دوزندگی',
          type: 'attendance',
          description: `ثبت نام با سمت "${req.body.roleTitle || 'عضو تیم'}"`,
        },
      ],
    };

    staffMembers.push(newStaff);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'افزودن عضو جدید به کارکنان',
      entity: 'staff',
      details: `پرسنل جدید "${newStaff.name}" با نقش "${newStaff.roleTitle}" ثبت گردید.`,
    });

    res.status(201).json(newStaff);
  });

  app.put('/api/staff/:id', (req: Request, res: Response) => {
    const index = staffMembers.findIndex((s) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'عضو پرسنل یافت نشد' });

    staffMembers[index] = {
      ...staffMembers[index],
      ...req.body,
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'ویرایش پرونده پرسنل',
      entity: 'staff',
      details: `پرونده پرسنل "${staffMembers[index].name}" به‌روزرسانی شد.`,
    });

    res.json(staffMembers[index]);
  });

  app.delete('/api/staff/:id', (req: Request, res: Response) => {
    const staff = staffMembers.find((s) => s.id === req.params.id);
    if (!staff) return res.status(404).json({ error: 'عضو پرسنل یافت نشد' });

    // Soft delete
    staff.isDeleted = true;
    staff.deletedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'انتقال پرسنل به سطل بازیافت (Soft Delete)',
      entity: 'staff',
      details: `پرسنل "${staff.name}" (${staff.roleTitle}) به سطل بازیافت منتقل شد.`,
    });

    res.json({ message: 'پرسنل به سطل بازیافت منتقل شد', staff });
  });

  // --- Workshop Expenses & Costs (هزینه‌ها و نگهداری کارگاه) ---
  app.get('/api/expenses', (req: Request, res: Response) => {
    res.json(expenses.filter((e) => !e.isDeleted));
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    const newExpense: WorkshopExpense = {
      id: `cst-${Date.now()}`,
      code: req.body.code || `CST-${Math.floor(100 + expenses.length + 1)}`,
      title: req.body.title,
      category: req.body.category || 'other',
      categoryLabel: req.body.categoryLabel || 'سایر هزینه‌ها',
      amount: Number(req.body.amount) || 0,
      date: req.body.date || new Date().toISOString().split('T')[0],
      paidBy: req.body.paidBy || 'صندوق کارگاه',
      paymentMethod: req.body.paymentMethod || 'cash',
      receiptImageUrl: req.body.receiptImageUrl || '',
      description: req.body.description || '',
      isRecurring: Boolean(req.body.isRecurring),
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    expenses.unshift(newExpense);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'حسابدار',
      action: 'ثبت هزینه و مخارج کارگاه',
      entity: 'cost',
      details: `ثبت هزینه "${newExpense.title}" به مبلغ ${newExpense.amount.toLocaleString('fa-IR')} تومان پرداختی توسط ${newExpense.paidBy}`,
    });

    res.status(201).json(newExpense);
  });

  app.put('/api/expenses/:id', (req: Request, res: Response) => {
    const index = expenses.findIndex((e) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'هزینه یافت نشد' });

    expenses[index] = {
      ...expenses[index],
      ...req.body,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : expenses[index].amount,
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'حسابدار',
      action: 'ویرایش هزینه کارگاه',
      entity: 'cost',
      details: `هزینه "${expenses[index].title}" به‌روزرسانی شد.`,
    });

    res.json(expenses[index]);
  });

  app.delete('/api/expenses/:id', (req: Request, res: Response) => {
    const expense = expenses.find((e) => e.id === req.params.id);
    if (!expense) return res.status(404).json({ error: 'هزینه یافت نشد' });

    expense.isDeleted = true;
    expense.deletedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'حسابدار',
      action: 'انتقال هزینه به سطل بازیافت (Soft Delete)',
      entity: 'cost',
      details: `هزینه "${expense.title}" به سطل بازیافت منتقل گردید.`,
    });

    res.json({ message: 'هزینه به سطل بازیافت منتقل شد', expense });
  });

  // --- Profit Distribution (تقسیم سود شرکا و کارگاه) ---
  app.get('/api/profit-distribution', (req: Request, res: Response) => {
    res.json(profitDistributions);
  });

  app.post('/api/profit-distribution', (req: Request, res: Response) => {
    const newDist: ProfitShareDistribution = {
      id: `prd-${Date.now()}`,
      periodName: req.body.periodName || 'دوره تسویه جدید',
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || new Date().toISOString().split('T')[0],
      grossRevenue: Number(req.body.grossRevenue) || 0,
      totalExpenses: Number(req.body.totalExpenses) || 0,
      netProfit: Number(req.body.netProfit) || 0,
      totalShareUnits: Number(req.body.totalShareUnits) || 2,
      distributionMode: req.body.distributionMode || 'parts',
      reinvestmentReserve: Number(req.body.reinvestmentReserve) || 0,
      recipients: Array.isArray(req.body.recipients) ? req.body.recipients : [],
      status: req.body.status || 'draft',
      calculatedAt: new Date().toISOString(),
      notes: req.body.notes || '',
    };

    profitDistributions.unshift(newDist);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'ثبت و محاسبه تقسیم سود کارگاه',
      entity: 'profit',
      details: `محاسبه دوره "${newDist.periodName}" با سود خالص ${newDist.netProfit.toLocaleString('fa-IR')} تومان`,
    });

    res.status(201).json(newDist);
  });

  // --- Trash / Recycle Bin (سطل بازیافت و بازگردانی Soft Delete) ---
  app.get('/api/trash', (req: Request, res: Response) => {
    res.json({
      items: items.filter((i) => i.isDeleted),
      sellers: sellers.filter((s) => s.isDeleted),
      staff: staffMembers.filter((st) => st.isDeleted),
      expenses: expenses.filter((e) => e.isDeleted),
      consignments: consignments.filter((c) => c.isDeleted),
    });
  });

  app.post('/api/trash/restore/:type/:id', (req: Request, res: Response) => {
    const { type, id } = req.params;

    if (type === 'item') {
      const item = items.find((i) => i.id === id);
      if (!item) return res.status(404).json({ error: 'کالا در سطل بازیافت یافت نشد' });
      item.isDeleted = false;
      delete item.deletedAt;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'مدیر سیستم',
        action: 'بازگردانی کالا از سطل بازیافت',
        entity: 'item',
        details: `کالای "${item.name}" با موفقیت بازیابی شد.`,
      });
      return res.json({ message: 'کالا با موفقیت بازیابی شد', item });
    }

    if (type === 'seller') {
      const seller = sellers.find((s) => s.id === id);
      if (!seller) return res.status(404).json({ error: 'فروشنده در سطل بازیافت یافت نشد' });
      seller.isDeleted = false;
      delete seller.deletedAt;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'مدیر سیستم',
        action: 'بازگردانی فروشنده از سطل بازیافت',
        entity: 'seller',
        details: `پرونده فروشنده "${seller.name}" با موفقیت بازیابی شد.`,
      });
      return res.json({ message: 'فروشنده با موفقیت بازیابی شد', seller });
    }

    if (type === 'staff') {
      const staff = staffMembers.find((st) => st.id === id);
      if (!staff) return res.status(404).json({ error: 'پرسنل در سطل بازیافت یافت نشد' });
      staff.isDeleted = false;
      delete staff.deletedAt;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'مدیر ارشد',
        action: 'بازگردانی پرسنل از سطل بازیافت',
        entity: 'staff',
        details: `پرسنل "${staff.name}" با موفقیت بازیابی شد.`,
      });
      return res.json({ message: 'پرسنل با موفقیت بازیابی شد', staff });
    }

    if (type === 'expense') {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return res.status(404).json({ error: 'هزینه در سطل بازیافت یافت نشد' });
      expense.isDeleted = false;
      delete expense.deletedAt;
      return res.json({ message: 'هزینه با موفقیت بازیابی شد', expense });
    }

    if (type === 'consignment') {
      const c = consignments.find((con) => con.id === id);
      if (!c) return res.status(404).json({ error: 'فاکتور یافت نشد' });
      c.isDeleted = false;
      delete c.deletedAt;
      recalculateSellerDebt(c.sellerId);
      return res.json({ message: 'فاکتور با موفقیت بازیابی شد', consignment: c });
    }

    res.status(400).json({ error: 'نوع موجودیت نامعتبر است' });
  });

  app.put('/api/trash/edit-and-restore/:type/:id', (req: Request, res: Response) => {
    const { type, id } = req.params;

    if (type === 'item') {
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) return res.status(404).json({ error: 'کالا یافت نشد' });
      items[index] = {
        ...items[index],
        ...req.body,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      };
      delete items[index].deletedAt;
      return res.json({ message: 'کالا با ویرایش بازیابی شد', item: items[index] });
    }

    if (type === 'seller') {
      const index = sellers.findIndex((s) => s.id === id);
      if (index === -1) return res.status(404).json({ error: 'فروشنده یافت نشد' });
      sellers[index] = {
        ...sellers[index],
        ...req.body,
        isDeleted: false,
      };
      delete sellers[index].deletedAt;
      return res.json({ message: 'فروشنده با ویرایش بازیابی شد', seller: sellers[index] });
    }

    if (type === 'staff') {
      const index = staffMembers.findIndex((st) => st.id === id);
      if (index === -1) return res.status(404).json({ error: 'پرسنل یافت نشد' });
      staffMembers[index] = {
        ...staffMembers[index],
        ...req.body,
        isDeleted: false,
      };
      delete staffMembers[index].deletedAt;
      return res.json({ message: 'پرسنل با ویرایش بازیابی شد', staff: staffMembers[index] });
    }

    res.status(400).json({ error: 'نوع موجودیت نامعتبر است' });
  });

  app.delete('/api/trash/permanent/:type/:id', (req: Request, res: Response) => {
    const { type, id } = req.params;

    if (type === 'item') {
      items = items.filter((i) => i.id !== id);
      return res.json({ message: 'کالا به صورت دائمی از سامانه حذف شد' });
    }
    if (type === 'seller') {
      sellers = sellers.filter((s) => s.id !== id);
      return res.json({ message: 'فروشنده به صورت دائمی از سامانه حذف شد' });
    }
    if (type === 'staff') {
      staffMembers = staffMembers.filter((s) => s.id !== id);
      return res.json({ message: 'پرسنل به صورت دائمی از سامانه حذف شد' });
    }
    if (type === 'expense') {
      expenses = expenses.filter((e) => e.id !== id);
      return res.json({ message: 'هزینه به صورت دائمی حذف شد' });
    }

    res.status(400).json({ error: 'نوع موجودیت نامعتبر است' });
  });

  // --- 6. Company Branding & Settings ---
  app.get('/api/company', (req: Request, res: Response) => {
    res.json(companyBranding);
  });

  app.put('/api/company', (req: Request, res: Response) => {
    companyBranding = {
      ...companyBranding,
      ...req.body,
      owners: req.body.owners || companyBranding.owners,
    };
    if (req.body.owners) {
      owners = req.body.owners;
    }

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'ویرایش تنظیمات و برندینگ کارگاه',
      entity: 'settings',
      details: 'اطلاعات برندینگ، وب‌سایت، نشانی و مشخصات ثبتی کارگاه به‌روز شد.',
    });

    res.json(companyBranding);
  });

  // --- 7. Audit Logs (ممیزی و لاگ‌های رویدادها) ---
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    res.json(auditLogs);
  });

  app.post('/api/audit-logs', (req: Request, res: Response) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role === 'admin' ? 'مدیر ارشد' : 'حسابدار',
      action: req.body.action || 'عملیات سیستمی',
      entity: req.body.entity || 'settings',
      details: req.body.details || '',
      ipAddress: req.ip || '127.0.0.1',
    };
    auditLogs.unshift(newLog);
    res.status(201).json(newLog);
  });

  // --- 8. Auth ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, role } = req.body;
    if (!email) return res.status(400).json({ error: 'ایمیل الزامی است' });

    currentUser = {
      ...currentUser,
      email,
      name: email.split('@')[0] === 'mrez321' ? 'محمدرضا پولاریس' : email.split('@')[0],
      role: (role as any) || currentUser.role,
      lastLogin: new Date().toISOString(),
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role === 'admin' ? 'مدیر ارشد' : 'حسابدار',
      action: 'ورود موفق به سامانه',
      entity: 'auth',
      details: `ورود با شناسه ${email} و نقش ${currentUser.role}`,
    });

    res.json({
      user: currentUser,
      requiresMfa: currentUser.mfaEnabled,
      token: 'jwt-simulated-token-polaristyle-2026',
    });
  });

  app.post('/api/auth/google', (req: Request, res: Response) => {
    const { googleEmail, name } = req.body;
    currentUser = {
      ...currentUser,
      email: googleEmail || 'mrez321@gmail.com',
      name: name || 'محمدرضا پولاریس (Google)',
      linkedGoogle: true,
      lastLogin: new Date().toISOString(),
    };

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'مدیر ارشد',
      action: 'ورود با حساب گوگل',
      entity: 'auth',
      details: `ورود و اتصال حساب گوگل برای ${currentUser.email}`,
    });

    res.json({
      user: currentUser,
      token: 'jwt-google-linked-polaristyle-2026',
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Polaris Style Tailor & Consignment Server running on port ${PORT}`);
  });
}

startServer();
