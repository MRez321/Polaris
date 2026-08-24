import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db } from '../config/drizzle.js';
import { items, sellers, consignments, consignmentReturns, payments, staff, expenses, profitDistributions, categories, } from '../schema/index.js';
import { badRequest, notFound } from '../utils/apiError.js';
import { nextCode } from '../utils/code.js';
import { emitDataChanged } from './socketService.js';
// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
export async function listItems(includeDeleted = false) {
    const rows = includeDeleted
        ? await db.select().from(items)
        : await db.select().from(items).where(eq(items.isDeleted, false));
    return rows;
}
export async function createItem(data) {
    if (!data.name || !data.category)
        throw badRequest('نام و دسته‌بندی کالا الزامی است');
    const codes = await db.select({ code: items.code }).from(items);
    const id = uuid();
    await db
        .insert(items)
        .values({
        id,
        code: data.code || nextCode('PLR', codes.map((c) => c.code)),
        name: data.name,
        category: data.category,
        costPrice: data.costPrice ?? 0,
        consignmentPrice: data.consignmentPrice ?? 0,
        retailPrice: data.retailPrice ?? 0,
        stockQuantity: data.stockQuantity ?? 0,
        minStockThreshold: data.minStockThreshold ?? 5,
        sizes: data.sizes ?? [],
        colors: data.colors ?? [],
        fabric: data.fabric ?? '',
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        images: data.images ?? [],
    });
    const inserted = await db.select().from(items).where(eq(items.id, id));
    emitDataChanged('item', 'create');
    return inserted[0];
}
export async function updateItem(id, data) {
    const existing = await db.select().from(items).where(eq(items.id, id));
    if (!existing[0])
        throw notFound('کالا یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    await db
        .update(items)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(items.id, id));
    const updated = await db.select().from(items).where(eq(items.id, id));
    emitDataChanged('item', 'update');
    return updated[0];
}
export async function softDeleteItem(id) {
    const existing = await db.select().from(items).where(eq(items.id, id));
    if (!existing[0])
        throw notFound('کالا یافت نشد');
    await db.update(items).set({ isDeleted: true, deletedAt: new Date() }).where(eq(items.id, id));
    emitDataChanged('item', 'delete');
}
// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories() {
    return db.select().from(categories).orderBy(asc(categories.label));
}
export async function createCategory(label) {
    if (!label.trim())
        throw badRequest('عنوان دسته‌بندی الزامی است');
    const id = uuid();
    await db.insert(categories).values({ id, label: label.trim() });
    return { id, label: label.trim() };
}
// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------
export async function listSellers(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(sellers)
        : db.select().from(sellers).where(eq(sellers.isDeleted, false));
}
export async function getSeller(id) {
    const rows = await db.select().from(sellers).where(eq(sellers.id, id));
    if (!rows[0])
        throw notFound('دست‌فروش یافت نشد');
    return rows[0];
}
export async function createSeller(data) {
    if (!data.name || !data.phone)
        throw badRequest('نام و شماره تماس دست‌فروش الزامی است');
    const codes = await db.select({ code: sellers.code }).from(sellers);
    const id = uuid();
    await db.insert(sellers).values({
        id,
        code: data.code || nextCode('SLR', codes.map((c) => c.code)),
        name: data.name,
        phone: data.phone,
        additionalPhones: data.additionalPhones ?? [],
        nationalCode: data.nationalCode ?? '',
        streetLocation: data.streetLocation ?? '',
        hasGuarantee: data.hasGuarantee ?? false,
        guaranteeType: data.guaranteeType ?? 'promissory_note',
        guaranteeAmount: data.guaranteeAmount ?? 0,
        guaranteeDetails: data.guaranteeDetails ?? '',
        creditLimit: data.creditLimit ?? 0,
        bankAccounts: data.bankAccounts ?? [],
        currentDebt: 0,
        totalHandoversValue: 0,
        totalPaid: 0,
        status: data.status ?? 'active',
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
    emitDataChanged('seller', 'create');
    return getSeller(id);
}
export async function updateSeller(id, data) {
    const existing = await db.select().from(sellers).where(eq(sellers.id, id));
    if (!existing[0])
        throw notFound('دست‌فروش یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    await db
        .update(sellers)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(sellers.id, id));
    emitDataChanged('seller', 'update');
    return getSeller(id);
}
export async function softDeleteSeller(id) {
    const existing = await db.select().from(sellers).where(eq(sellers.id, id));
    if (!existing[0])
        throw notFound('دست‌فروش یافت نشد');
    await db.update(sellers).set({ isDeleted: true, deletedAt: new Date() }).where(eq(sellers.id, id));
    emitDataChanged('seller', 'delete');
}
export async function listConsignments(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(consignments)
        : db.select().from(consignments).where(eq(consignments.isDeleted, false));
}
export async function createHandover(input, actorName) {
    const due = new Date(input.dueDate);
    if (Number.isNaN(due.getTime()))
        throw badRequest('تاریخ سررسید معتبر نیست');
    if (!input.itemsList || input.itemsList.length === 0)
        throw badRequest('حداقل یک کالا برای تحویل انتخاب کنید');
    return db.transaction(async (tx) => {
        const sellerRows = await tx
            .select()
            .from(sellers)
            .where(and(eq(sellers.id, input.sellerId), eq(sellers.isDeleted, false)));
        const seller = sellerRows[0];
        if (!seller)
            throw notFound('دست‌فروش یافت نشد');
        const lines = [];
        let totalAmount = 0;
        for (const line of input.itemsList) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw badRequest('تعداد کالا باید بزرگ‌تر از صفر باشد');
            }
            if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
                throw badRequest('قیمت واحد معتبر نیست');
            }
            const itemRows = await tx
                .select()
                .from(items)
                .where(and(eq(items.id, line.itemId), eq(items.isDeleted, false)))
                .for('update');
            const item = itemRows[0];
            if (!item)
                throw notFound(`کالای ${line.itemId} یافت نشد`);
            if (item.stockQuantity < line.quantity) {
                throw badRequest(`موجودی «${item.name}» کافی نیست (موجودی: ${item.stockQuantity}، درخواستی: ${line.quantity})`);
            }
            await tx
                .update(items)
                .set({ stockQuantity: item.stockQuantity - line.quantity, updatedAt: new Date() })
                .where(eq(items.id, item.id));
            const totalPrice = line.quantity * line.unitPrice;
            totalAmount += totalPrice;
            lines.push({
                itemId: item.id,
                itemName: item.name,
                itemCode: item.code,
                quantity: line.quantity,
                returnedQuantity: 0,
                soldQuantity: 0,
                unitPrice: line.unitPrice,
                totalPrice,
                ...(line.selectedSize !== undefined ? { selectedSize: line.selectedSize } : {}),
                ...(line.selectedColor !== undefined ? { selectedColor: line.selectedColor } : {}),
            });
        }
        const codes = await tx.select({ code: consignments.code }).from(consignments);
        const id = uuid();
        const now = new Date();
        await tx.insert(consignments).values({
            id,
            code: nextCode('HND', codes.map((c) => c.code)),
            sellerId: seller.id,
            sellerName: seller.name,
            date: now,
            dueDate: due,
            status: 'active',
            items: lines,
            totalAmount,
            returnedAmount: 0,
            netAmount: totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            handedOverBy: actorName,
        });
        await tx
            .update(sellers)
            .set({
            currentDebt: seller.currentDebt + totalAmount,
            totalHandoversValue: seller.totalHandoversValue + totalAmount,
            status: seller.status === 'settled' ? 'active' : seller.status,
            updatedAt: new Date(),
        })
            .where(eq(sellers.id, seller.id));
        const created = await tx.select().from(consignments).where(eq(consignments.id, id));
        emitDataChanged('consignment', 'create');
        return created[0];
    });
}
export async function softDeleteConsignment(id) {
    await db.transaction(async (tx) => {
        const rows = await tx.select().from(consignments).where(eq(consignments.id, id)).for('update');
        const consignment = rows[0];
        if (!consignment)
            throw notFound('واگذاری یافت نشد');
        // Release the outstanding debt back off the seller while in trash.
        if (consignment.remainingAmount > 0) {
            const sellerRows = await tx.select().from(sellers).where(eq(sellers.id, consignment.sellerId)).for('update');
            const seller = sellerRows[0];
            if (seller) {
                const newDebt = Math.max(0, seller.currentDebt - consignment.remainingAmount);
                await tx
                    .update(sellers)
                    .set({ currentDebt: newDebt, status: newDebt === 0 ? 'settled' : seller.status, updatedAt: new Date() })
                    .where(eq(sellers.id, seller.id));
            }
        }
        await tx
            .update(consignments)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(consignments.id, id));
    });
    emitDataChanged('consignment', 'delete');
}
export async function submitReturn(input, actorName) {
    if (!input.returnItems || input.returnItems.length === 0) {
        throw badRequest('حداقل یک کالا برای مرجوعی انتخاب کنید');
    }
    return db.transaction(async (tx) => {
        const consignmentRows = await tx
            .select()
            .from(consignments)
            .where(and(eq(consignments.id, input.consignmentId), eq(consignments.isDeleted, false)))
            .for('update');
        const consignment = consignmentRows[0];
        if (!consignment)
            throw notFound('واگذاری یافت نشد');
        if (consignment.status === 'settled') {
            throw badRequest('این واگذاری کاملاً تسویه شده و امکان مرجوعی ندارد');
        }
        const updatedLines = consignment.items.map((l) => ({ ...l }));
        const returnLines = [];
        let totalValue = 0;
        let healthyCount = 0;
        let damagedCount = 0;
        for (const ret of input.returnItems) {
            if (!Number.isFinite(ret.quantity) || ret.quantity <= 0) {
                throw badRequest('تعداد کالای مرجوعی باید بزرگ‌تر از صفر باشد');
            }
            const line = updatedLines.find((l) => l.itemId === ret.itemId);
            if (!line)
                throw badRequest('این کالا در واگذاری موردنظر وجود ندارد');
            const available = line.quantity - line.returnedQuantity;
            if (ret.quantity > available) {
                throw badRequest(`تعداد مرجوعی «${line.itemName}» بیش از حد مجاز است (قابل مرجوع: ${available})`);
            }
            const value = ret.quantity * line.unitPrice;
            totalValue += value;
            line.returnedQuantity += ret.quantity;
            if (ret.condition === 'healthy')
                healthyCount += ret.quantity;
            else
                damagedCount += ret.quantity;
            // Healthy items go back to warehouse stock.
            if (ret.condition === 'healthy') {
                const itemRows = await tx.select().from(items).where(eq(items.id, ret.itemId)).for('update');
                const item = itemRows[0];
                if (item) {
                    await tx
                        .update(items)
                        .set({ stockQuantity: item.stockQuantity + ret.quantity, updatedAt: new Date() })
                        .where(eq(items.id, item.id));
                }
            }
            returnLines.push({
                itemId: ret.itemId,
                itemName: line.itemName,
                quantity: ret.quantity,
                unitPrice: line.unitPrice,
                totalAmount: value,
                condition: ret.condition,
                ...(ret.reason !== undefined ? { reason: ret.reason } : {}),
            });
        }
        const newReturnedAmount = consignment.returnedAmount + totalValue;
        const newNetAmount = consignment.totalAmount - newReturnedAmount;
        const newRemaining = Math.max(0, newNetAmount - consignment.paidAmount);
        const newStatus = newRemaining <= 0 ? 'settled' : consignment.paidAmount > 0 ? 'partially_settled' : 'active';
        await tx
            .update(consignments)
            .set({
            items: updatedLines,
            returnedAmount: newReturnedAmount,
            netAmount: newNetAmount,
            remainingAmount: newRemaining,
            status: newStatus,
            updatedAt: new Date(),
        })
            .where(eq(consignments.id, consignment.id));
        // Reduce seller debt by the returned value.
        const sellerRows = await tx.select().from(sellers).where(eq(sellers.id, consignment.sellerId)).for('update');
        const seller = sellerRows[0];
        if (seller) {
            const newDebt = Math.max(0, seller.currentDebt - totalValue);
            await tx
                .update(sellers)
                .set({ currentDebt: newDebt, status: newDebt === 0 ? 'settled' : seller.status, updatedAt: new Date() })
                .where(eq(sellers.id, seller.id));
        }
        const returnId = uuid();
        await tx.insert(consignmentReturns).values({
            id: returnId,
            consignmentId: consignment.id,
            consignmentCode: consignment.code,
            sellerId: consignment.sellerId,
            sellerName: consignment.sellerName,
            date: new Date(),
            items: returnLines,
            totalReturnAmount: totalValue,
            processedBy: actorName,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        });
        const [returnRecord] = await tx.select().from(consignmentReturns).where(eq(consignmentReturns.id, returnId));
        const [updatedConsignment] = await tx.select().from(consignments).where(eq(consignments.id, consignment.id));
        emitDataChanged('return', 'create');
        return { returnRecord: returnRecord, updatedConsignment: updatedConsignment };
    });
}
export async function listPayments() {
    return db.select().from(payments).where(eq(payments.isDeleted, false)).orderBy(asc(payments.date));
}
export async function createPayment(input, actorName) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw badRequest('مبلغ پرداختی باید بزرگ‌تر از صفر باشد');
    }
    return db.transaction(async (tx) => {
        const sellerRows = await tx
            .select()
            .from(sellers)
            .where(and(eq(sellers.id, input.sellerId), eq(sellers.isDeleted, false)))
            .for('update');
        const seller = sellerRows[0];
        if (!seller)
            throw notFound('دست‌فروش یافت نشد');
        // Oldest outstanding consignments first (FIFO), locked for update.
        const outstanding = await tx
            .select()
            .from(consignments)
            .where(and(eq(consignments.sellerId, seller.id), eq(consignments.isDeleted, false), gt(consignments.remainingAmount, 0)))
            .orderBy(asc(consignments.date))
            .for('update');
        let remainingPayment = input.amount;
        const allocations = [];
        for (const c of outstanding) {
            if (remainingPayment <= 0)
                break;
            const remainingDebtBefore = c.remainingAmount;
            const allocate = Math.min(remainingPayment, remainingDebtBefore);
            const remainingDebtAfter = remainingDebtBefore - allocate;
            const isFullySettled = remainingDebtAfter <= 0;
            allocations.push({
                consignmentId: c.id,
                consignmentCode: c.code,
                consignmentDate: c.date.toISOString(),
                allocatedAmount: allocate,
                remainingDebtBefore,
                remainingDebtAfter,
                isFullySettled,
            });
            const newPaid = c.paidAmount + allocate;
            const newRemaining = Math.max(0, remainingDebtAfter);
            const newStatus = isFullySettled ? 'settled' : newPaid > 0 ? 'partially_settled' : c.status;
            await tx
                .update(consignments)
                .set({ paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus, updatedAt: new Date() })
                .where(eq(consignments.id, c.id));
            remainingPayment -= allocate;
        }
        const allocatedTotal = input.amount - remainingPayment;
        const newDebt = Math.max(0, seller.currentDebt - allocatedTotal);
        await tx
            .update(sellers)
            .set({
            currentDebt: newDebt,
            totalPaid: seller.totalPaid + input.amount,
            status: newDebt === 0 && seller.status !== 'suspended' ? 'settled' : seller.status,
            updatedAt: new Date(),
        })
            .where(eq(sellers.id, seller.id));
        const codes = await tx.select({ code: payments.code }).from(payments);
        const id = uuid();
        await tx.insert(payments).values({
            id,
            code: nextCode('PAY', codes.map((c) => c.code)),
            sellerId: seller.id,
            sellerName: seller.name,
            amount: input.amount,
            date: new Date(),
            paymentMethod: input.paymentMethod,
            ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
            allocations,
            unallocatedAmount: remainingPayment,
            recordedBy: actorName,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        });
        const created = await tx.select().from(payments).where(eq(payments.id, id));
        emitDataChanged('payment', 'create');
        return created[0];
    });
}
// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export async function listStaff(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(staff)
        : db.select().from(staff).where(eq(staff.isDeleted, false));
}
export async function createStaff(data) {
    if (!data.name || !data.role)
        throw badRequest('نام و نقش پرسنل الزامی است');
    const codes = await db.select({ code: staff.code }).from(staff);
    const id = uuid();
    await db.insert(staff).values({
        id,
        code: data.code || nextCode('STF', codes.map((c) => c.code)),
        name: data.name,
        role: data.role,
        roleTitle: data.roleTitle ?? '',
        phones: data.phones ?? [],
        ...(data.nationalCode !== undefined ? { nationalCode: data.nationalCode } : {}),
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        salaryType: data.salaryType ?? 'monthly',
        salaryAmount: data.salaryAmount ?? 0,
        bankAccounts: data.bankAccounts ?? [],
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        status: data.status ?? 'active',
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.resumeUrl !== undefined ? { resumeUrl: data.resumeUrl } : {}),
        ...(data.resumeAttachmentName !== undefined ? { resumeAttachmentName: data.resumeAttachmentName } : {}),
        ...(data.resumeAttachmentData !== undefined ? { resumeAttachmentData: data.resumeAttachmentData } : {}),
        tasksCompletedCount: data.tasksCompletedCount ?? 0,
        activityHistory: data.activityHistory ?? [],
    });
    const rows = await db.select().from(staff).where(eq(staff.id, id));
    emitDataChanged('staff', 'create');
    return rows[0];
}
export async function updateStaff(id, data) {
    const existing = await db.select().from(staff).where(eq(staff.id, id));
    if (!existing[0])
        throw notFound('پرسنل یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    if (typeof data.hireDate === 'string')
        patch.hireDate = new Date(data.hireDate);
    await db.update(staff).set(patch).where(eq(staff.id, id));
    const rows = await db.select().from(staff).where(eq(staff.id, id));
    emitDataChanged('staff', 'update');
    return rows[0];
}
export async function softDeleteStaff(id) {
    const existing = await db.select().from(staff).where(eq(staff.id, id));
    if (!existing[0])
        throw notFound('پرسنل یافت نشد');
    await db.update(staff).set({ isDeleted: true, deletedAt: new Date() }).where(eq(staff.id, id));
    emitDataChanged('staff', 'delete');
}
// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export async function listExpenses(includeDeleted = false) {
    return includeDeleted
        ? db.select().from(expenses)
        : db.select().from(expenses).where(eq(expenses.isDeleted, false));
}
export async function createExpense(data) {
    if (!data.title || data.amount === undefined)
        throw badRequest('عنوان و مبلغ هزینه الزامی است');
    const codes = await db.select({ code: expenses.code }).from(expenses);
    const id = uuid();
    await db.insert(expenses).values({
        id,
        code: data.code || nextCode('CST', codes.map((c) => c.code)),
        title: data.title,
        category: data.category ?? 'other',
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        paidBy: data.paidBy ?? 'صندوق کارگاه',
        paymentMethod: data.paymentMethod ?? 'cash',
        ...(data.receiptImageUrl !== undefined ? { receiptImageUrl: data.receiptImageUrl } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        isRecurring: data.isRecurring ?? false,
        costAllocation: data.costAllocation ?? 'workshop_fund',
        costShares: data.costShares ?? [],
    });
    const rows = await db.select().from(expenses).where(eq(expenses.id, id));
    emitDataChanged('cost', 'create');
    return rows[0];
}
export async function updateExpense(id, data) {
    const existing = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing[0])
        throw notFound('هزینه یافت نشد');
    const { id: _id, code: _code, ...patch } = data;
    if (typeof data.date === 'string')
        patch.date = new Date(data.date);
    await db.update(expenses).set(patch).where(eq(expenses.id, id));
    const rows = await db.select().from(expenses).where(eq(expenses.id, id));
    emitDataChanged('cost', 'update');
    return rows[0];
}
export async function softDeleteExpense(id) {
    const existing = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing[0])
        throw notFound('هزینه یافت نشد');
    await db.update(expenses).set({ isDeleted: true, deletedAt: new Date() }).where(eq(expenses.id, id));
    emitDataChanged('cost', 'delete');
}
// ---------------------------------------------------------------------------
// Profit distributions
// ---------------------------------------------------------------------------
export async function listProfitDistributions() {
    return db.select().from(profitDistributions);
}
export async function createProfitDistribution(data) {
    if (!data.periodName)
        throw badRequest('عنوان دوره تسویه الزامی است');
    const id = uuid();
    await db.insert(profitDistributions).values({
        id,
        periodName: data.periodName,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        grossRevenue: data.grossRevenue ?? 0,
        totalExpenses: data.totalExpenses ?? 0,
        reinvestmentReserve: data.reinvestmentReserve ?? 0,
        netProfit: data.netProfit ?? 0,
        distributionMode: data.distributionMode ?? 'units',
        totalShareUnits: data.totalShareUnits ?? 0,
        recipients: data.recipients ?? [],
        status: data.status ?? 'draft',
        calculatedAt: data.calculatedAt ? new Date(data.calculatedAt) : new Date(),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
    const rows = await db.select().from(profitDistributions).where(eq(profitDistributions.id, id));
    emitDataChanged('profit', 'create');
    return rows[0];
}
const trashTables = {
    item: items,
    seller: sellers,
    staff: staff,
    expense: expenses,
    consignment: consignments,
};
export async function listTrash() {
    const [deletedItems, deletedSellers, deletedStaff, deletedExpenses, deletedConsignments] = await Promise.all([
        db.select().from(items).where(eq(items.isDeleted, true)),
        db.select().from(sellers).where(eq(sellers.isDeleted, true)),
        db.select().from(staff).where(eq(staff.isDeleted, true)),
        db.select().from(expenses).where(eq(expenses.isDeleted, true)),
        db.select().from(consignments).where(eq(consignments.isDeleted, true)),
    ]);
    return { deletedItems, deletedSellers, deletedStaff, deletedExpenses, deletedConsignments };
}
export async function restoreEntity(type, id, patch) {
    const table = trashTables[type];
    if (!table)
        throw badRequest('نوع موجودیت نامعتبر است');
    return db.transaction(async (tx) => {
        const rows = await tx.select().from(table).where(eq(table.id, id)).for('update');
        const row = rows[0];
        if (!row)
            throw notFound('مورد یافت نشد');
        if (!row.isDeleted)
            throw badRequest('این مورد در سطل بازیافت نیست');
        const setPayload = {
            ...(patch ?? {}),
            isDeleted: false,
            deletedAt: null,
            updatedAt: new Date(),
        };
        delete setPayload.id;
        delete setPayload.code;
        await tx.update(table).set(setPayload).where(eq(table.id, id));
        // Restoring a consignment re-applies its outstanding debt to the seller.
        if (type === 'consignment') {
            const consignmentRows = await tx.select().from(consignments).where(eq(consignments.id, id));
            const consignment = consignmentRows[0];
            if (consignment && consignment.remainingAmount > 0) {
                const sellerRows = await tx.select().from(sellers).where(eq(sellers.id, consignment.sellerId)).for('update');
                const seller = sellerRows[0];
                if (seller) {
                    await tx
                        .update(sellers)
                        .set({
                        currentDebt: seller.currentDebt + consignment.remainingAmount,
                        status: seller.status === 'settled' ? 'active' : seller.status,
                        updatedAt: new Date(),
                    })
                        .where(eq(sellers.id, seller.id));
                }
            }
        }
        const restored = await tx.select().from(table).where(eq(table.id, id));
        emitDataChanged(type, 'restore');
        return restored[0];
    });
}
export async function permanentDeleteEntity(type, id) {
    const table = trashTables[type];
    if (!table)
        throw badRequest('نوع موجودیت نامعتبر است');
    const rows = await db.select().from(table).where(eq(table.id, id));
    const row = rows[0];
    if (!row)
        throw notFound('مورد یافت نشد');
    await db.delete(table).where(eq(table.id, id));
    emitDataChanged(type, 'permanent-delete');
}
// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [activeSellers, activeItems, activeConsignments, todayPaymentRows, allExpenses, allPayments] = await Promise.all([
        db.select().from(sellers).where(eq(sellers.isDeleted, false)),
        db.select().from(items).where(eq(items.isDeleted, false)),
        db.select().from(consignments).where(eq(consignments.isDeleted, false)),
        db.select().from(payments).where(and(eq(payments.isDeleted, false), sql `${payments.date} >= ${startOfToday}`)),
        db.select({ amount: expenses.amount }).from(expenses).where(eq(expenses.isDeleted, false)),
        db.select({ amount: payments.amount }).from(payments).where(eq(payments.isDeleted, false)),
    ]);
    const totalActiveDebt = activeSellers.reduce((s, r) => s + r.currentDebt, 0);
    const overdueConsignments = activeConsignments.filter((c) => c.dueDate < now && c.status !== 'settled');
    const totalOverdueDebt = overdueConsignments.reduce((s, c) => s + c.remainingAmount, 0);
    const todayPayments = todayPaymentRows.reduce((s, p) => s + p.amount, 0);
    const totalInventoryValue = activeItems.reduce((s, i) => s + i.stockQuantity * i.costPrice, 0);
    const totalItemsInHands = activeConsignments
        .filter((c) => c.status !== 'settled')
        .reduce((s, c) => s + c.items.reduce((ls, l) => ls + (l.quantity - l.returnedQuantity - l.soldQuantity), 0), 0);
    const activeConsignmentsCount = activeConsignments.filter((c) => c.remainingAmount > 0).length;
    const lowStockItemsCount = activeItems.filter((i) => i.stockQuantity <= i.minStockThreshold).length;
    const totalWorkshopCosts = allExpenses.reduce((s, e) => s + e.amount, 0);
    const totalCollected = allPayments.reduce((s, p) => s + p.amount, 0);
    const totalConsignmentValue = activeConsignments.reduce((s, c) => s + c.netAmount, 0);
    return {
        totalActiveDebt,
        totalOverdueDebt,
        todayPayments,
        totalInventoryValue,
        totalItemsInHands,
        activeConsignmentsCount,
        overdueConsignmentsCount: overdueConsignments.length,
        lowStockItemsCount,
        totalSellersCount: activeSellers.length,
        activeSellersCount: activeSellers.filter((s) => s.status === 'active').length,
        totalOutstandingDebt: totalActiveDebt,
        totalWorkshopCosts,
        netWorkshopProfit: totalCollected - totalWorkshopCosts,
        totalConsignmentValue,
        totalCollected,
    };
}
//# sourceMappingURL=inventoryService.js.map