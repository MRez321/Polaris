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
    SalesChannel,
    Customer,
    SalesOrder,
    SalesOrderLine,
    SellerSale,
    SellerSaleLine,
    SalesPayment,
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
type SalesChannelRow = typeof schema.salesChannels.$inferSelect;
type CustomerRow = typeof schema.customers.$inferSelect;
type SalesOrderRow = typeof schema.salesOrders.$inferSelect;
type SalesOrderLineRow = typeof schema.salesOrderLines.$inferSelect;
type SellerSaleRow = typeof schema.sellerSales.$inferSelect;
type SellerSaleLineRow = typeof schema.sellerSaleLines.$inferSelect;
type SalesPaymentRow = typeof schema.salesPayments.$inferSelect;

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
        ...(row.purchasePriceUsd !== null && row.purchasePriceUsd !== undefined
            ? { purchasePriceUsd: row.purchasePriceUsd }
            : {}),
        ...(row.costBreakdown ? { costBreakdown: row.costBreakdown } : {}),
        productionStatus: (row.productionStatus as GarmentItem['productionStatus']) ?? 'ready',
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
        // P0-D: seller commission + settlement scheduling.
        commissionType: (row.commissionType as Seller['commissionType']) ?? 'percentage',
        commissionRate: Number(row.commissionRate ?? 0),
        settlementCycleDays: row.settlementCycleDays ?? 7,
        ...(row.lastSettlementAt ? { lastSettlementAt: iso(row.lastSettlementAt) } : {}),
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
        deliveryStatus: (row.deliveryStatus as Consignment['deliveryStatus']) ?? 'delivered',
        deliveryDate: row.deliveryDate ? iso(row.deliveryDate) : row.deliveredAt ? iso(row.deliveredAt) : null,
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

// ---------------------------------------------------------------------------
// P0-D: Unified Sales DTOs

export function toSalesChannelDto(row: SalesChannelRow): SalesChannel {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type as SalesChannel['type'],
        ...(row.description ? { description: row.description } : {}),
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
    };
}

export function toCustomerDto(row: CustomerRow): Customer {
    return {
        id: row.id,
        code: row.code ?? '',
        name: row.name,
        ...(row.phone ? { phone: row.phone } : {}),
        ...(row.email ? { email: row.email } : {}),
        ...(row.province ? { province: row.province } : {}),
        ...(row.city ? { city: row.city } : {}),
        ...(row.address ? { address: row.address } : {}),
        ...(row.postalCode ? { postalCode: row.postalCode } : {}),
        creditLimit: row.creditLimit,
        currentDebt: row.currentDebt,
        totalPurchases: row.totalPurchases,
        orderCount: row.orderCount,
        ...(row.firstOrderAt ? { firstOrderAt: iso(row.firstOrderAt) } : {}),
        ...(row.lastOrderAt ? { lastOrderAt: iso(row.lastOrderAt) } : {}),
        ...(row.acquisitionChannelId ? { acquisitionChannelId: row.acquisitionChannelId } : {}),
        ...(row.tags ? { tags: row.tags } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
        isActive: row.isActive,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toSalesOrderDto(row: SalesOrderRow): SalesOrder {
    return {
        id: row.id,
        code: row.code ?? '',
        orderType: row.orderType as SalesOrder['orderType'],
        channelId: row.channelId,
        customerId: row.customerId ?? undefined,
        sellerId: row.sellerId ?? undefined,
        customerName: row.customerName ?? undefined,
        customerPhone: row.customerPhone ?? undefined,
        customerAddress: row.customerAddress ?? undefined,
        status: row.status as SalesOrder['status'],
        paymentStatus: row.paymentStatus as SalesOrder['paymentStatus'],
        subtotal: row.subtotal,
        discountAmount: row.discountAmount,
        shippingAmount: row.shippingAmount,
        taxAmount: row.taxAmount,
        totalAmount: row.totalAmount,
        paidAmount: row.paidAmount,
        remainingAmount: row.remainingAmount,
        currency: row.currency as SalesOrder['currency'],
        sourceReference: row.sourceReference ?? undefined,
        utmSource: row.utmSource ?? undefined,
        utmMedium: row.utmMedium ?? undefined,
        utmCampaign: row.utmCampaign ?? undefined,
        trackingCode: row.trackingCode ?? undefined,
        note: row.note ?? undefined,
        confirmedAt: row.confirmedAt ? iso(row.confirmedAt) : undefined,
        paidAt: row.paidAt ? iso(row.paidAt) : undefined,
        shippedAt: row.shippedAt ? iso(row.shippedAt) : undefined,
        deliveredAt: row.deliveredAt ? iso(row.deliveredAt) : undefined,
        cancelledAt: row.cancelledAt ? iso(row.cancelledAt) : undefined,
        createdBy: row.createdBy ?? undefined,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toSalesOrderLineDto(row: SalesOrderLineRow): SalesOrderLine {
    return {
        id: row.id,
        orderId: row.salesOrderId,
        itemId: row.itemId ?? undefined,
        sku: row.sku ?? undefined,
        itemCode: row.itemCode ?? undefined,
        itemName: row.itemName ?? undefined,
        size: row.size ?? undefined,
        color: row.color ?? undefined,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        discountAmount: row.discountAmount,
        lineTotal: row.lineTotal,
        ...(row.snapshot ? { snapshot: row.snapshot } : {}),
        createdAt: iso(row.createdAt),
    };
}

export function toSellerSaleDto(row: SellerSaleRow): SellerSale {
    return {
        id: row.id,
        code: row.code,
        sellerId: row.sellerId,
        channelId: row.channelId,
        saleDate: iso(row.saleDate),
        status: row.status as SellerSale['status'],
        subtotal: row.subtotal,
        commissionAmount: row.commissionAmount,
        netSettlementAmount: row.netSettlementAmount,
        settledAmount: row.settledAmount,
        remainingSettlement: row.remainingSettlement,
        ...(row.note ? { note: row.note } : {}),
        submittedBy: row.submittedBy ?? undefined,
        confirmedBy: row.confirmedBy ?? undefined,
        ...(row.confirmedAt ? { confirmedAt: iso(row.confirmedAt) } : {}),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}

export function toSellerSaleLineDto(row: SellerSaleLineRow): SellerSaleLine {
    return {
        id: row.id,
        sellerSaleId: row.sellerSaleId,
        itemId: row.itemId ?? undefined,
        itemCode: row.itemCode ?? undefined,
        itemName: row.itemName ?? undefined,
        size: row.size ?? undefined,
        color: row.color ?? undefined,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        lineTotal: row.lineTotal,
        createdAt: iso(row.createdAt),
    };
}

export function toSalesPaymentDto(row: SalesPaymentRow): SalesPayment {
    return {
        id: row.id,
        code: row.code ?? '',
        orderId: row.orderId ?? undefined,
        sellerSaleId: row.sellerSaleId ?? undefined,
        customerId: row.customerId ?? undefined,
        sellerId: row.sellerId ?? undefined,
        amount: row.amount,
        paymentMethod: (row.paymentMethod ?? 'cash') as SalesPayment['paymentMethod'],
        paymentDate: iso(row.paymentDate),
        ...(row.trackingNumber ? { trackingNumber: row.trackingNumber } : {}),
        status: (row.status ?? 'pending') as SalesPayment['status'],
        ...(row.note ? { note: row.note } : {}),
        createdBy: row.createdBy ?? undefined,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : {}),
    };
}
