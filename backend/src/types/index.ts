/**
 * Shared DTO types mirroring frontend/src/types/index.ts.
 * The API must return these shapes exactly.
 */

export type UserRole = 'admin' | 'accountant' | 'supervisor' | 'tailor' | 'staff';

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
    stockQuantity: number;
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
    entity: 'item' | 'seller' | 'consignment' | 'payment' | 'return' | 'staff' | 'settings' | 'cost' | 'profit' | 'auth';
    details: string;
    ipAddress?: string;
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

export interface CompanyBranding extends WorkshopInfo {
    brandName: string;
    tagline: string;
    workshopAddress: string;
    workshopPhone: string;
    secondaryPhone?: string;
    establishedYear?: string;
    owners: Owner[];
}

export interface TrashData {
    items: GarmentItem[];
    sellers: Seller[];
    staff: StaffMember[];
    expenses: WorkshopExpense[];
    consignments: Consignment[];
}

export type TrashEntityType = 'item' | 'seller' | 'staff' | 'expense' | 'consignment';
