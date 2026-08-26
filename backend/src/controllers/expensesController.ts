import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/inventoryService.js';
import { toExpenseDto, toProfitDto } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest, pathParam } from '../utils/apiError.js';
import { clientIdSchema } from '../schema/clientId.js';

const costShareSchema = z.object({
    recipientId: z.string(),
    recipientName: z.string(),
    shareUnits: z.number(),
    requiredAmount: z.number(),
    isPaid: z.boolean(),
});

const expenseSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    title: z.string().min(1),
    category: z.string().min(1).optional(),
    categoryLabel: z.string().optional(),
    amount: z.number().min(0),
    date: z.coerce.date().optional(),
    paidBy: z.string().optional(),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'cheque']).optional(),
    receiptImageUrl: z.string().optional(),
    description: z.string().optional(),
    isRecurring: z.boolean().optional(),
    costAllocation: z.enum(['shared_by_equity', 'workshop_fund', 'specific_payer', 'custom_split']).optional(),
    costShares: z.array(costShareSchema).optional(),
});

const createExpenseSchema = expenseSchema.extend({ id: clientIdSchema.optional() });

export async function listExpenses(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listExpenses();
    res.json(rows.map(toExpenseDto));
}

export async function createExpense(req: Request, res: Response): Promise<void> {
    const data = createExpenseSchema.parse(req.body);
    const row = await svc.createExpense(data);
    logAudit(req.auth ?? null, 'create', 'cost', `هزینه «${row.title}» به مبلغ ${row.amount} ثبت شد`);
    res.status(201).json(toExpenseDto(row));
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه هزینه');
    const data = expenseSchema.partial().parse(req.body);
    const row = await svc.updateExpense(id, data);
    logAudit(req.auth ?? null, 'update', 'cost', `هزینه «${row.title}» ویرایش شد`);
    res.json(toExpenseDto(row));
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه هزینه');
    await svc.softDeleteExpense(id);
    logAudit(req.auth ?? null, 'delete', 'cost', 'هزینه به سطل بازیافت منتقل شد');
    res.json({ message: 'هزینه به سطل بازیافت منتقل شد' });
}

// --- Profit distribution ---

const recipientSchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    type: z.enum(['owner', 'staff_pool', 'workshop_fund', 'investor', 'custom']).optional(),
    shareUnits: z.number(),
    percentage: z.number(),
    bankCard: z.string().optional(),
    bankSheba: z.string().optional(),
    phone: z.string().optional(),
    assignedAmount: z.number().optional(),
    costObligation: z.number().optional(),
    alreadyPaidForCosts: z.number().optional(),
    netSettlement: z.number().optional(),
    isSettled: z.boolean().optional(),
    isCustomRecipient: z.boolean().optional(),
});

const profitSchema = z.object({
    id: z.string().optional(),
    periodName: z.string().min(1),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    reinvestmentReserve: z.number().min(0).optional(),
    netProfit: z.number().min(0).optional(),
    distributionMode: z.enum(['units', 'percentage']).optional(),
    totalShareUnits: z.number().min(0).optional(),
    recipients: z.array(recipientSchema).optional(),
    status: z.enum(['draft', 'approved', 'paid']).optional(),
    notes: z.string().optional(),
    calculatedAt: z.coerce.date().optional(),
});

export async function listProfitDistributions(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listProfitDistributions();
    res.json(rows.map(toProfitDto));
}

export async function createProfitDistribution(req: Request, res: Response): Promise<void> {
    const data = profitSchema.parse(req.body);
    const row = await svc.createProfitDistribution(data);
    logAudit(req.auth ?? null, 'create', 'profit', `توزیع سود «${row.periodName}» ثبت شد`);
    res.status(201).json(toProfitDto(row));
}
