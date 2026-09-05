/**
 * Shared DTO types mirroring frontend/src/types/index.ts.
 * The API must return these shapes exactly.
 */

export type UserRole = 'admin' | 'author' | 'user' | 'accountant' | 'supervisor' | 'tailor' | 'staff';

export interface BankAccountInfo {
    id?: string;
    bankName: string;
    accountNumber?: string;
    cardNumber: string;
    shebaNumber: string;
    payaNumber?: string;
    accountHolder?: string;
}

export interface Owner {
    id: string;
    name: string;
    role: string;
    sharePercentage: number;
    sharesCount?: number;
    nationalCode: string;
    phones: string[];
    email?: string;
    bankAccounts: BankAccountInfo[];
    avatarUrl?: string;
    bio?: string;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface StaffActivity {
    id: string;
    date: string;
    title: string;
    type: 'task' | 'handover' | 'payment' | 'attendance' | 'note';
    description: string;
}

export interface StaffMember {
    id: string;
    code: string;
    name: string;
    role: string;
    roleTitle: string;
    phones: string[];
    nationalCode?: string;
    hireDate: string;
    salaryType: 'monthly' | 'piecework' | 'hourly';
    salaryAmount: number;
    bankAccounts: BankAccountInfo[];
    avatarUrl?: string;
    status: 'active' | 'leave' | 'inactive';
    notes?: string;
    resumeUrl?: string;
    resumeAttachmentName?: string;
    resumeAttachmentData?: string;
    tasksCompletedCount?: number;
    activityHistory?: StaffActivity[];
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface GarmentItem {
    id: string;
    code: string;
    name: string;
    category: string;
    categoryLabel?: string;
    costPrice: number;
    consignmentPrice: number;
    retailPrice: number;
    stockQuantity: number; // free warehouse pool
    websiteQuantity: number; // units allocated to the online shop
    sellerHeld?: number; // units out with street sellers (active consignments)
    minStockThreshold: number;
    sizes: string[];
    colors: string[];
    fabric: string;
    imageUrl?: string;
    images?: string[];
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface Seller {
    id: string;
    code: string;
    name: string;
    phone: string;
    additionalPhones?: string[];
    nationalCode: string;
    streetLocation: string;
    hasGuarantee?: boolean;
    guaranteeType: 'promissory_note' | 'cheque' | 'national_card' | 'trusted_guarantor';
    guaranteeAmount: number;
    guaranteeDetails: string;
    creditLimit: number;
    bankAccounts?: BankAccountInfo[];
    currentDebt: number;
    totalHandoversValue: number;
    totalPaid: number;
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
    quantity: number;
    returnedQuantity: number;
    soldQuantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedSize?: string;
    selectedColor?: string;
}

export interface Consignment {
    id: string;
    code: string;
    sellerId: string;
    sellerName: string;
    date: string;
    dueDate: string;
    status: 'active' | 'partially_settled' | 'settled' | 'overdue';
    items: ConsignmentItemLine[];
    totalAmount: number;
    returnedAmount: number;
    netAmount: number;
    paidAmount: number;
    remainingAmount: number;
    notes?: string;
    handedOverBy: string;
    createdAt: string;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface ReturnItemLine {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    condition: 'healthy' | 'damaged';
    reason?: string;
}

export interface ConsignmentReturn {
    id: string;
    consignmentId: string;
    consignmentCode: string;
    sellerId: string;
    sellerName: string;
    date: string;
    items: ReturnItemLine[];
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

export interface PaymentRecord {
    id: string;
    code: string;
    sellerId: string;
    sellerName: string;
    amount: number;
    date: string;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'pos';
    trackingNumber?: string;
    allocations: DebtAllocation[];
    unallocatedAmount: number;
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
    entity: 'item' | 'seller' | 'consignment' | 'payment' | 'return' | 'staff' | 'settings' | 'cost' | 'profit' | 'auth' | 'notifications';
    details: string;
    ipAddress: string | null;
}

export interface DashboardStats {
    totalActiveDebt: number;
    totalOverdueDebt: number;
    todayPayments: number;
    totalInventoryValue: number;
    totalItemsInHands?: number;
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

export interface CostShare {
    recipientId: string;
    recipientName: string;
    shareUnits: number;
    requiredAmount: number;
    isPaid: boolean;
}

export interface WorkshopExpense {
    id: string;
    code: string;
    title: string;
    category: string;
    categoryLabel?: string;
    amount: number;
    date: string;
    paidBy: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'cheque';
    receiptImageUrl?: string;
    description?: string;
    isRecurring?: boolean;
    costAllocation?: 'shared_by_equity' | 'workshop_fund' | 'specific_payer' | 'custom_split';
    costShares?: CostShare[];
    createdAt: string;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface ProfitShareRecipient {
    id: string;
    name: string;
    role: string;
    type?: 'owner' | 'staff_pool' | 'workshop_fund' | 'investor' | 'custom';
    shareUnits: number;
    percentage: number;
    bankCard?: string;
    bankSheba?: string;
    phone?: string;
    assignedAmount?: number;
    costObligation?: number;
    alreadyPaidForCosts?: number;
    netSettlement?: number;
    isSettled?: boolean;
    isCustomRecipient?: boolean;
}

export interface ProfitShareDistribution {
    id: string;
    periodName: string;
    startDate: string;
    endDate: string;
    grossRevenue: number;
    totalExpenses: number;
    reinvestmentReserve?: number;
    netProfit: number;
    distributionMode: 'units' | 'percentage';
    totalShareUnits: number;
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

/**
 * Site-wide appearance: default visitor mode + palette choice.
 * `palette.type === 'custom'` pins the whole site to one admin-picked
 * primary color; every derived role (hover, ink, deep, on-fill ink) is
 * computed from it. Stored inside `company_settings.data`.
 */
export interface CompanyTheme {
    defaultMode: 'dark' | 'light';
    palette: { type: 'default' } | { type: 'custom'; primary: string };
}

export interface CompanyBranding extends WorkshopInfo {
    brandName: string;
    tagline: string;
    workshopAddress: string;
    workshopPhone: string;
    secondaryPhone?: string;
    establishedYear?: string;
    theme?: CompanyTheme;
    owners: Owner[];
}

/**
 * Public website (marketing site) settings. Scaffolding for the future
 * storefront: visibility toggles + basic metadata. Products/blog content
 * management will extend this later.
 */
export interface WebsiteSettings {
    enabled: boolean;
    siteTitle: string;
    description: string;
    showPrices: boolean;
    showOutOfStock: boolean;
}

export interface TrashData {
    items: GarmentItem[];
    sellers: Seller[];
    staff: StaffMember[];
    expenses: WorkshopExpense[];
    consignments: Consignment[];
}

export type TrashEntityType = 'item' | 'seller' | 'staff' | 'expense' | 'consignment';

// ---------------------------------------------------------------------------
// Public website: blog posts & customer orders
// ---------------------------------------------------------------------------

export type BlogPostStatus = 'draft' | 'published';

export interface BlogSection {
    heading?: string;
    text: string;
}

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    image: string;
    imageAlt: string;
    /** Jalali display date set by the author, e.g. «۱۴۰۵/۰۶/۰۳». */
    date: string;
    readTime: string;
    tags: string[];
    body: BlogSection[];
    status: BlogPostStatus;
    authorId: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderPaymentMethod = 'cod' | 'card_transfer';

export interface OrderItemLine {
    itemId: string;
    code: string;
    name: string;
    /** Snapshot of retailPrice at order time (toman). */
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    imageUrl?: string;
}

export interface Order {
    id: string;
    code: string;
    userId: string;
    customerName: string;
    phone: string;
    city: string;
    province: string;
    postalCode: string;
    trackingCode: string;
    deliveredAt: string | null;
    address: string;
    note: string;
    paymentMethod: OrderPaymentMethod;
    status: OrderStatus;
    total: number;
    items: OrderItemLine[];
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Customer address book
// ---------------------------------------------------------------------------

export interface UserAddress {
    id: string;
    userId: string;
    label: string;
    receiverName: string;
    phone: string;
    province: string;
    city: string;
    postalCode: string;
    address: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Notifications: outbound Telegram / Melipayamak integrations
// ---------------------------------------------------------------------------

export interface TelegramNotificationSettings {
    enabled: boolean;
    /** Announce new storefront orders to the Telegram chat. */
    notifyNewOrder: boolean;
    /** Bot token from @BotFather (e.g. 8817538889:AA…). Empty → fall back to env. */
    botToken: string;
    /** Chat/group id the messages are delivered to. Empty → fall back to env. */
    chatId: string;
    /**
     * HTTP(S) proxy URL (http:// or https://) that server-side requests to
     * api.telegram.org are routed through — Telegram is blocked in Iran.
     * Empty → direct connection (or env TELEGRAM_PROXY_URL).
     */
    proxyUrl: string;
}

export interface SmsNotificationSettings {
    enabled: boolean;
    /** Announce new storefront orders by SMS. */
    notifyNewOrder: boolean;
    /** Melipayamak sender line, e.g. 9015867713 — required to send. */
    fromNumber: string;
    /** Melipayamak Console REST API key (GUID). Empty → fall back to env. */
    apiKey: string;
    /** Workshop manager mobiles (09xxxxxxxxx) receiving the notifications. */
    recipientPhones: string[];
}

export interface NotificationSettings {
    telegram: TelegramNotificationSettings;
    sms: SmsNotificationSettings;
}
