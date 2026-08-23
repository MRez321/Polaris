import {
  mysqlTable,
  varchar,
  text,
  longtext,
  int,
  bigint,
  boolean,
  datetime,
  timestamp,
  json,
  index,
} from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Shared JSON shapes (mirror frontend/src/types)
// ---------------------------------------------------------------------------

export interface BankAccountInfo {
  id?: string;
  bankName: string;
  accountNumber?: string;
  cardNumber: string;
  shebaNumber: string;
  payaNumber?: string;
  accountHolder?: string;
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

export interface ReturnItemLine {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  condition: 'healthy' | 'damaged';
  reason?: string;
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

export interface CostShare {
  recipientId: string;
  recipientName: string;
  shareUnits: number;
  requiredAmount: number;
  isPaid: boolean;
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

export interface OwnerRecord {
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

// ---------------------------------------------------------------------------
// better-auth core tables (admin plugin adds role/banned fields to user)
// ---------------------------------------------------------------------------

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: varchar('image', { length: 512 }),
  role: varchar('role', { length: 32 }),
  banned: boolean('banned').notNull().default(false),
  banReason: varchar('ban_reason', { length: 255 }),
  banExpires: datetime('ban_expires'),
  createdAt: datetime('created_at').notNull().defaultNow(),
  updatedAt: datetime('updated_at').notNull().defaultNow(),
});

export const session = mysqlTable(
  'session',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: datetime('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = mysqlTable(
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
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = mysqlTable(
  'verification',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: text('value').notNull(),
    expiresAt: datetime('expires_at').notNull(),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Business tables
// ---------------------------------------------------------------------------

export const categories = mysqlTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  label: varchar('label', { length: 128 }).notNull(),
  createdAt: datetime('created_at').notNull().defaultNow(),
});

export const items = mysqlTable(
  'items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 128 }).notNull(),
    costPrice: bigint('cost_price', { mode: 'number' }).notNull().default(0),
    consignmentPrice: bigint('consignment_price', { mode: 'number' }).notNull().default(0),
    retailPrice: bigint('retail_price', { mode: 'number' }).notNull().default(0),
    stockQuantity: int('stock_quantity').notNull().default(0),
    minStockThreshold: int('min_stock_threshold').notNull().default(5),
    sizes: json('sizes').$type<string[]>().notNull(),
    colors: json('colors').$type<string[]>().notNull(),
    fabric: varchar('fabric', { length: 255 }).notNull().default(''),
    imageUrl: varchar('image_url', { length: 512 }),
    images: json('images').$type<string[]>().notNull(),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('items_category_idx').on(t.category), index('items_is_deleted_idx').on(t.isDeleted)],
);

export const sellers = mysqlTable(
  'sellers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    additionalPhones: json('additional_phones').$type<string[]>().notNull(),
    nationalCode: varchar('national_code', { length: 32 }).notNull().default(''),
    streetLocation: varchar('street_location', { length: 512 }).notNull().default(''),
    hasGuarantee: boolean('has_guarantee').notNull().default(false),
    guaranteeType: varchar('guarantee_type', { length: 32 }).notNull().default('promissory_note'),
    guaranteeAmount: bigint('guarantee_amount', { mode: 'number' }).notNull().default(0),
    guaranteeDetails: varchar('guarantee_details', { length: 255 }).notNull().default(''),
    creditLimit: bigint('credit_limit', { mode: 'number' }).notNull().default(0),
    bankAccounts: json('bank_accounts').$type<BankAccountInfo[]>().notNull(),
    currentDebt: bigint('current_debt', { mode: 'number' }).notNull().default(0),
    totalHandoversValue: bigint('total_handovers_value', { mode: 'number' }).notNull().default(0),
    totalPaid: bigint('total_paid', { mode: 'number' }).notNull().default(0),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    notes: text('notes'),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('sellers_is_deleted_idx').on(t.isDeleted)],
);

export const consignments = mysqlTable(
  'consignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    sellerId: varchar('seller_id', { length: 36 }).notNull(),
    sellerName: varchar('seller_name', { length: 255 }).notNull(),
    date: datetime('date').notNull().defaultNow(),
    dueDate: datetime('due_date').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    items: json('items').$type<ConsignmentItemLine[]>().notNull(),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    returnedAmount: bigint('returned_amount', { mode: 'number' }).notNull().default(0),
    netAmount: bigint('net_amount', { mode: 'number' }).notNull(),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
    remainingAmount: bigint('remaining_amount', { mode: 'number' }).notNull(),
    notes: text('notes'),
    handedOverBy: varchar('handed_over_by', { length: 255 }).notNull().default(''),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [
    index('consignments_seller_id_idx').on(t.sellerId),
    index('consignments_status_idx').on(t.status),
    index('consignments_is_deleted_idx').on(t.isDeleted),
  ],
);

export const consignmentReturns = mysqlTable(
  'consignment_returns',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    consignmentId: varchar('consignment_id', { length: 36 }).notNull(),
    consignmentCode: varchar('consignment_code', { length: 32 }).notNull(),
    sellerId: varchar('seller_id', { length: 36 }).notNull(),
    sellerName: varchar('seller_name', { length: 255 }).notNull(),
    date: datetime('date').notNull().defaultNow(),
    items: json('items').$type<ReturnItemLine[]>().notNull(),
    totalReturnAmount: bigint('total_return_amount', { mode: 'number' }).notNull(),
    processedBy: varchar('processed_by', { length: 255 }).notNull().default(''),
    notes: text('notes'),
    createdAt: datetime('created_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('returns_consignment_id_idx').on(t.consignmentId), index('returns_seller_id_idx').on(t.sellerId)],
);

export const payments = mysqlTable(
  'payments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    sellerId: varchar('seller_id', { length: 36 }).notNull(),
    sellerName: varchar('seller_name', { length: 255 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    date: datetime('date').notNull().defaultNow(),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull(),
    trackingNumber: varchar('tracking_number', { length: 128 }),
    allocations: json('allocations').$type<DebtAllocation[]>().notNull(),
    unallocatedAmount: bigint('unallocated_amount', { mode: 'number' }).notNull().default(0),
    recordedBy: varchar('recorded_by', { length: 255 }).notNull().default(''),
    notes: text('notes'),
    createdAt: datetime('created_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('payments_seller_id_idx').on(t.sellerId), index('payments_date_idx').on(t.date)],
);

export const staff = mysqlTable(
  'staff',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 64 }).notNull(),
    roleTitle: varchar('role_title', { length: 255 }).notNull().default(''),
    phones: json('phones').$type<string[]>().notNull(),
    nationalCode: varchar('national_code', { length: 32 }),
    hireDate: datetime('hire_date').notNull().defaultNow(),
    salaryType: varchar('salary_type', { length: 32 }).notNull().default('monthly'),
    salaryAmount: bigint('salary_amount', { mode: 'number' }).notNull().default(0),
    bankAccounts: json('bank_accounts').$type<BankAccountInfo[]>().notNull(),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    notes: text('notes'),
    resumeUrl: varchar('resume_url', { length: 512 }),
    resumeAttachmentName: varchar('resume_attachment_name', { length: 255 }),
    resumeAttachmentData: longtext('resume_attachment_data'),
    tasksCompletedCount: int('tasks_completed_count').notNull().default(0),
    activityHistory: json('activity_history').$type<StaffActivity[]>().notNull(),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('staff_is_deleted_idx').on(t.isDeleted)],
);

export const owners = mysqlTable('owners', {
  id: varchar('id', { length: 36 }).primaryKey(),
  data: json('data').$type<OwnerRecord[]>().notNull(),
  updatedAt: datetime('updated_at').notNull().defaultNow(),
});

export const expenses = mysqlTable(
  'expenses',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    date: datetime('date').notNull().defaultNow(),
    paidBy: varchar('paid_by', { length: 128 }).notNull().default('صندوق کارگاه'),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('cash'),
    receiptImageUrl: varchar('receipt_image_url', { length: 512 }),
    description: text('description'),
    isRecurring: boolean('is_recurring').notNull().default(false),
    costAllocation: varchar('cost_allocation', { length: 32 }).notNull().default('workshop_fund'),
    costShares: json('cost_shares').$type<CostShare[]>().notNull(),
    createdAt: datetime('created_at').notNull().defaultNow(),
    updatedAt: datetime('updated_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: datetime('deleted_at'),
  },
  (t) => [index('expenses_is_deleted_idx').on(t.isDeleted)],
);

export const profitDistributions = mysqlTable('profit_distributions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  periodName: varchar('period_name', { length: 255 }).notNull(),
  startDate: datetime('start_date').notNull(),
  endDate: datetime('end_date').notNull(),
  grossRevenue: bigint('gross_revenue', { mode: 'number' }).notNull().default(0),
  totalExpenses: bigint('total_expenses', { mode: 'number' }).notNull().default(0),
  reinvestmentReserve: bigint('reinvestment_reserve', { mode: 'number' }).notNull().default(0),
  netProfit: bigint('net_profit', { mode: 'number' }).notNull().default(0),
  distributionMode: varchar('distribution_mode', { length: 16 }).notNull().default('units'),
  totalShareUnits: int('total_share_units').notNull().default(0),
  recipients: json('recipients').$type<ProfitShareRecipient[]>().notNull(),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  calculatedAt: datetime('calculated_at').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: datetime('created_at').notNull().defaultNow(),
});

export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().default(''),
    userName: varchar('user_name', { length: 255 }).notNull().default(''),
    userRole: varchar('user_role', { length: 32 }),
    action: varchar('action', { length: 64 }).notNull(),
    entity: varchar('entity', { length: 32 }).notNull(),
    details: text('details').notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('audit_logs_created_at_idx').on(t.createdAt)],
);

export const companySettings = mysqlTable('company_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  data: json('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: datetime('updated_at').notNull().defaultNow(),
});
