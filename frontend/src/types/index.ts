export type UserRole = 'admin' | 'accountant' | 'supervisor' | 'tailor' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  mfaEnabled: boolean;
  linkedGoogle: boolean;
  lastLogin: string;
}

export interface BankAccountInfo {
  id?: string;
  bankName: string; // e.g. "بانک ملت", "بانک صادرات"
  accountNumber?: string;
  cardNumber: string; // e.g. "6104-3378-1234-5678"
  shebaNumber: string; // e.g. "IR120120000000001234567890"
  payaNumber?: string;
  accountHolder?: string;
}

export interface Owner {
  id: string;
  name: string;
  role: string; // e.g. "هم‌بنیان‌گذار و مدیر اجرایی", "هم‌بنیان‌گذار و مدیر طراحی و دوخت"
  sharePercentage: number; // e.g. 50 (or custom ratio)
  sharesCount?: number; // e.g. 1 share out of 5
  nationalCode: string;
  phones: string[]; // multiple phones
  email?: string;
  bankAccounts: BankAccountInfo[];
  avatarUrl?: string;
  bio?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface StaffMember {
  id: string;
  code: string; // e.g. "STF-01"
  name: string;
  role: string; // 'tailor' | 'cutter' | 'buyer' | 'accountant' | 'quality_control' | 'workshop_manager' | 'driver' | 'assistant' or custom role
  roleTitle: string; // e.g. "دوزنده ارشد کت و پالتو"
  phones: string[];
  nationalCode?: string;
  hireDate: string;
  salaryType: 'monthly' | 'piecework' | 'hourly'; // ماهانه، کنترات / تکه‌ای، ساعتی
  salaryAmount: number;
  bankAccounts: BankAccountInfo[];
  avatarUrl?: string;
  status: 'active' | 'leave' | 'inactive';
  notes?: string;
  resumeUrl?: string; // online resume / portfolio link
  resumeAttachmentName?: string; // uploaded PDF or file name
  resumeAttachmentData?: string; // base64 or URL
  tasksCompletedCount?: number;
  activityHistory?: {
    id: string;
    date: string;
    title: string;
    type: 'task' | 'handover' | 'payment' | 'attendance' | 'note';
    description: string;
  }[];
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface GarmentItem {
  id: string;
  code: string; // e.g. "PLR-101"
  name: string; // e.g. "کت اسپرت کتان مردانه"
  category: string; // category id or custom name
  categoryLabel?: string;
  costPrice: number; // قیمت تمام شده دوخت
  consignmentPrice: number; // قیمت امانی به دست‌فروش
  retailPrice: number; // قیمت فروش به مشتری نهایی
  stockQuantity: number; // موجودی انبار
  minStockThreshold: number; // حداقل موجودی هشدار
  sizes: string[]; // ['M', 'L', 'XL', '2XL'] or ['38', '40', '42']
  colors: string[]; // ['مشکی', 'سرمه‌ای', 'کرم']
  fabric: string; // 'کتان ترک', 'فاستونی مطهری', 'نخ پنبه'
  imageUrl?: string;
  images?: string[]; // multiple images support
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Seller {
  id: string;
  code: string; // e.g. "SLR-04"
  name: string; // e.g. "رضا مرادی"
  phone: string; // e.g. "09123456789"
  additionalPhones?: string[]; // multiple phone numbers
  nationalCode: string; // e.g. "0012345678"
  streetLocation: string; // e.g. "میدان ولیعصر - روبروی سینما قدس"
  hasGuarantee?: boolean; // toggle for guarantee settings (default false)
  guaranteeType: 'promissory_note' | 'cheque' | 'national_card' | 'trusted_guarantor'; // نوع ضمانت
  guaranteeAmount: number; // مبلغ ضمانت (سفته یا چک)
  guaranteeDetails: string; // شماره سفته یا صیادی
  creditLimit: number; // سقف امانت ریالی مجاز
  bankAccounts?: BankAccountInfo[]; // Card and Sheba numbers
  currentDebt: number; // مانده بدهی فعلی
  totalHandoversValue: number; // کل مبلغ کالاهای تحویل داده شده
  totalPaid: number; // کل دریافتی
  status: 'active' | 'suspended' | 'settled';
  avatarUrl?: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ConsignmentItemLine {
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number; // تعداد واگذار شده
  returnedQuantity: number; // تعداد برگشتی
  soldQuantity: number; // تعداد فروش رفته
  unitPrice: number; // قیمت واحد امانی
  totalPrice: number; // مبلغ کل این ردیف
  selectedSize?: string;
  selectedColor?: string;
}

export interface Consignment {
  id: string;
  code: string; // e.g. "HND-840"
  sellerId: string;
  sellerName: string;
  date: string; // تاریخ واگذاری
  dueDate: string; // تاریخ موعد تسویه
  status: 'active' | 'partially_settled' | 'settled' | 'overdue';
  items: ConsignmentItemLine[];
  totalAmount: number; // مبلغ کل واگذاری
  returnedAmount: number; // ارزش کالاهای برگشتی
  netAmount: number; // مبلغ خالص پس از کسر مرجوعی
  paidAmount: number; // مبلغ پرداخت شده تا کنون
  remainingAmount: number; // مانده بدهی این واگذاری
  notes?: string;
  handedOverBy: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ConsignmentReturn {
  id: string;
  consignmentId: string;
  consignmentCode: string;
  sellerId: string;
  sellerName: string;
  date: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    condition: 'healthy' | 'damaged'; // وضعیت کالا
    reason?: string;
  }[];
  totalReturnAmount: number;
  processedBy: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface DebtAllocation {
  consignmentId: string;
  consignmentCode: string;
  consignmentDate: string;
  allocatedAmount: number;
  remainingDebtBefore: number;
  remainingDebtAfter: number;
  isFullySettled: boolean;
}

// Backward compatibility alias
export type FIFOAllocation = DebtAllocation;

export interface PaymentRecord {
  id: string;
  code: string; // e.g. "PAY-304"
  sellerId: string;
  sellerName: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'pos';
  trackingNumber?: string;
  allocations: DebtAllocation[];
  unallocatedAmount: number; // در صورتی که پرداختی بیش از کل بدهی باشد
  recordedBy: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  entity: 'item' | 'seller' | 'consignment' | 'payment' | 'return' | 'staff' | 'settings' | 'cost' | 'profit' | 'auth';
  details: string;
  ipAddress?: string | null;
}

export interface DashboardStats {
  totalActiveDebt: number; // کل طلب از دست‌فروشان
  totalOverdueDebt: number; // طلب‌های سررسید گذشته
  todayPayments: number; // دریافتی‌های امروز
  totalInventoryValue: number; // ارزش موجودی انبار
  totalItemsInHands?: number; // تعداد اقلام دست فروشندگان
  activeConsignmentsCount: number;
  overdueConsignmentsCount?: number;
  lowStockItemsCount: number;
  totalSellersCount?: number;
  activeSellersCount?: number;
  totalOutstandingDebt?: number;
  totalWorkshopCosts?: number;
  netWorkshopProfit?: number;
  totalConsignmentValue?: number;
  totalCollected?: number;
}

export interface WorkshopExpense {
  id: string;
  code: string; // e.g. "CST-101"
  title: string; // e.g. "اجاره ماهانه کارگاه دوزندگی", "خرید قیچی برقی و چرخ سردوز ۵ نخ", "بهسازی و قفسه‌بندی سالن تولید"
  category:
    | 'materials_supplies'
    | 'machinery_maintenance'
    | 'workshop_improvement'
    | 'rent'
    | 'utilities'
    | 'staff_bonus'
    | 'tools_equipment'
    | 'logistics'
    | 'depreciation'
    | 'other';
  categoryLabel?: string;
  amount: number;
  date: string;
  paidBy: string; // e.g. "صندوق کارگاه", "محمد (هم‌بنیان‌گذار)", "امین (هم‌بنیان‌گذار)", "سرمایه‌گذار"
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'cheque';
  receiptImageUrl?: string;
  description?: string;
  isRecurring?: boolean;
  costAllocation?: 'shared_by_equity' | 'workshop_fund' | 'specific_payer' | 'custom_split';
  costShares?: {
    recipientId: string;
    recipientName: string;
    shareUnits: number;
    requiredAmount: number;
    isPaid: boolean;
  }[];
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ProfitShareRecipient {
  id: string;
  name: string; // e.g. "محمد", "امین", "صندوق ذخیره و توسعه کارگاه", "پاداش و کارانه پرسنل دوزندگی", "سرمایه‌گذار خارج از کارگاه"
  role: string; // e.g. "هم‌بنیان‌گذار و مدیر تولید", "صندوق بهسازی و نگهداری", "پرسنل و دوزندگان"
  type?: 'owner' | 'staff_pool' | 'workshop_fund' | 'investor' | 'custom';
  shareUnits: number; // e.g. 1 out of 5 parts
  percentage: number; // e.g. 20%
  bankCard?: string;
  bankSheba?: string;
  phone?: string;
  assignedAmount?: number; // سهم سود دریافتی
  costObligation?: number; // سهم پرداختی بابت هزینه‌ها و بهسازی کارگاه
  alreadyPaidForCosts?: number; // مبالغ پرداخت شده قبلی از جیب شخصی
  netSettlement?: number; // تراز خالص تسویه (سود منهای سهم هزینه + پرداختی قبلی)
  isSettled?: boolean;
  isCustomRecipient?: boolean;
}

export interface ProfitShareDistribution {
  id: string;
  periodName: string; // e.g. "دوره تسویه مرداد و شهریور ۱۴۰۵"
  startDate: string;
  endDate: string;
  grossRevenue: number; // کل وصولی‌های نقدی از دست‌فروشان و فروش
  totalExpenses: number; // کل مخارج، اجاره و استهلاک
  reinvestmentReserve?: number; // صندوق ذخیره بهسازی و خرید متریال کارگاه
  netProfit: number; // سود خالص توزیع شده
  distributionMode: 'units' | 'percentage'; // تقسیم به نسبت دنگ/سهم (مثلاً ۵ قسمت) یا درصد
  totalShareUnits: number; // مثلاً ۵ قسمت: ۱ محمد، ۱ امین، ۳ پرسنل/بهسازی/سرمایه‌گذار
  recipients: ProfitShareRecipient[];
  status: 'draft' | 'approved' | 'paid';
  calculatedAt: string;
  notes?: string;
}

export interface WorkshopInfo {
  name: string;
  slogan: string;
  website: string;
  instagram: string;
  telegram: string;
  address: string;
  postalCode: string;
  phone: string;
  emergencyPhone: string;
  registrationNumber: string;
  logoUrl?: string;
  logoText?: string;
}

export interface CompanyBranding extends WorkshopInfo {
  brandName: string;
  tagline: string;
  workshopAddress: string;
  workshopPhone: string;
  secondaryPhone?: string;
  establishedYear?: string;
  owners: Owner[];
}


