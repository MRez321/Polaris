/**
 * Row → DTO mappers. Each function converts a database row into the exact
 * shape defined in frontend/src/types/index.ts. Dates become ISO strings;
 * JSON columns arrive already parsed from mysql2.
 */
import type * as schema from '../schema/index.js';
import type {
    GarmentItem,
    Seller,
    Consignment,
    ConsignmentReturn,
    PaymentRecord,
    StaffMember,
    WorkshopExpense,
    ProfitShareDistribution,
    AuditLog,
} from '../types/index.js';

type ItemRow = typeof schema.items.$inferSelect;
type SellerRow = typeof schema.sellers.$inferSelect;
type ConsignmentRow = typeof schema.consignments.$inferSelect;
type ReturnRow = typeof schema.consignmentReturns.$inferSelect;
type PaymentRow = typeof schema.payments.$inferSelect;
type StaffRow = typeof schema.staff.$inferSelect;
type ExpenseRow = typeof schema.expenses.$inferSelect;
type ProfitRow = typeof schema.profitDistributions.$inferSelect;
type AuditRow = typeof schema.auditLogs.$inferSelect;

const iso = (d: Date | string | null | undefined): string =>
    d instanceof Date ? d.toISOString() : (d ?? '');

export function toItemDto(row: ItemRow & { sellerHeld?: number }, categoryLabel?: string): GarmentItem {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        ...(categoryLabel !== undefined ? { categoryLabel } : {}),
        costPrice: row.costPrice,
        consignmentPrice: row.consignmentPrice,
        retailPrice: row.retailPrice,
        stockQuantity: row.stockQuantity,
        websiteQuantity: row.websiteQuantity,
        ...(row.sellerHeld !== undefined ? { sellerHeld: row.sellerHeld } : {}),
        minStockThreshold: row.minStockThreshold,
        sizes: row.sizes,
        colors: row.colors,
        fabric: row.fabric,
        ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
        images: row.images,
        ...(row.description ? { description: row.description } : {}),
        ...(row.variantPrices ? { variantPrices: row.variantPrices } : {}),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toSellerDto(row: SellerRow): Seller {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        additionalPhones: row.additionalPhones,
        nationalCode: row.nationalCode,
        streetLocation: row.streetLocation,
        hasGuarantee: row.hasGuarantee,
        guaranteeType: row.guaranteeType as Seller['guaranteeType'],
        guaranteeAmount: row.guaranteeAmount,
        guaranteeDetails: row.guaranteeDetails,
        creditLimit: row.creditLimit,
        bankAccounts: row.bankAccounts,
        currentDebt: row.currentDebt,
        totalHandoversValue: row.totalHandoversValue,
        totalPaid: row.totalPaid,
        status: row.status as Seller['status'],
        ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
        createdAt: iso(row.createdAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toConsignmentDto(row: ConsignmentRow): Consignment {
    return {
        id: row.id,
        code: row.code,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        date: iso(row.date),
        dueDate: iso(row.dueDate),
        status: row.status as Consignment['status'],
        items: row.items,
        totalAmount: row.totalAmount,
        returnedAmount: row.returnedAmount,
        netAmount: row.netAmount,
        paidAmount: row.paidAmount,
        remainingAmount: row.remainingAmount,
        ...(row.notes ? { notes: row.notes } : {}),
        handedOverBy: row.handedOverBy,
        createdAt: iso(row.createdAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toReturnDto(row: ReturnRow): ConsignmentReturn {
    return {
        id: row.id,
        consignmentId: row.consignmentId,
        consignmentCode: row.consignmentCode,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        date: iso(row.date),
        items: row.items,
        totalReturnAmount: row.totalReturnAmount,
        processedBy: row.processedBy,
        createdAt: iso(row.createdAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toPaymentDto(row: PaymentRow): PaymentRecord {
    return {
        id: row.id,
        code: row.code,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        amount: row.amount,
        date: iso(row.date),
        paymentMethod: row.paymentMethod as PaymentRecord['paymentMethod'],
        ...(row.trackingNumber ? { trackingNumber: row.trackingNumber } : {}),
        allocations: row.allocations,
        unallocatedAmount: row.unallocatedAmount,
        recordedBy: row.recordedBy,
        ...(row.notes ? { notes: row.notes } : {}),
        createdAt: iso(row.createdAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toStaffDto(row: StaffRow): StaffMember {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        role: row.role,
        roleTitle: row.roleTitle,
        phones: row.phones,
        ...(row.address ? { address: row.address } : {}),
        ...(row.nationalCode ? { nationalCode: row.nationalCode } : {}),
        hireDate: iso(row.hireDate),
        salaryType: row.salaryType as StaffMember['salaryType'],
        salaryAmount: row.salaryAmount,
        bankAccounts: row.bankAccounts,
        ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
        status: row.status as StaffMember['status'],
        ...(row.notes ? { notes: row.notes } : {}),
        ...(row.resumeUrl ? { resumeUrl: row.resumeUrl } : {}),
        ...(row.resumeAttachmentName ? { resumeAttachmentName: row.resumeAttachmentName } : {}),
        ...(row.resumeAttachmentData ? { resumeAttachmentData: row.resumeAttachmentData } : {}),
        tasksCompletedCount: row.tasksCompletedCount,
        activityHistory: row.activityHistory,
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}


export function toExpenseDto(row: ExpenseRow): WorkshopExpense {
    return {
        id: row.id,
        code: row.code,
        title: row.title,
        category: row.category,
        amount: row.amount,
        date: iso(row.date),
        paidBy: row.paidBy,
        paymentMethod: row.paymentMethod as WorkshopExpense['paymentMethod'],
        ...(row.receiptImageUrl ? { receiptImageUrl: row.receiptImageUrl } : {}),
        ...(row.description ? { description: row.description } : {}),
        isRecurring: row.isRecurring,
        costAllocation: row.costAllocation as NonNullable<WorkshopExpense['costAllocation']>,
        costShares: row.costShares,
        createdAt: iso(row.createdAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toProfitDto(row: ProfitRow): ProfitShareDistribution {
    return {
        id: row.id,
        periodName: row.periodName,
        startDate: iso(row.startDate),
        endDate: iso(row.endDate),
        grossRevenue: row.grossRevenue,
        totalExpenses: row.totalExpenses,
        reinvestmentReserve: row.reinvestmentReserve,
        netProfit: row.netProfit,
        distributionMode: row.distributionMode as ProfitShareDistribution['distributionMode'],
        totalShareUnits: row.totalShareUnits,
        recipients: row.recipients,
        status: row.status as ProfitShareDistribution['status'],
        calculatedAt: iso(row.calculatedAt),
        ...(row.notes ? { notes: row.notes } : {}),
    };
}

export function toAuditDto(row: AuditRow): AuditLog {
    return {
        id: row.id,
        timestamp: iso(row.createdAt),
        userId: row.userId,
        userName: row.userName,
        ...(row.userRole ? { userRole: row.userRole } : {}),
        action: row.action,
        entity: row.entity as AuditLog['entity'],
        details: row.details,
        ipAddress: row.ipAddress ?? null,
    };
}
