import { z } from 'zod';
import * as svc from '../services/inventoryService.js';
import { toSellerDto } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
import { badRequest, pathParam } from '../utils/apiError.js';
const bankAccountSchema = z.object({
    id: z.string().optional(),
    bankName: z.string(),
    accountNumber: z.string().optional(),
    cardNumber: z.string(),
    shebaNumber: z.string(),
    payaNumber: z.string().optional(),
    accountHolder: z.string().optional(),
});
const sellerSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().min(1),
    additionalPhones: z.array(z.string()).optional(),
    nationalCode: z.string().optional(),
    streetLocation: z.string().optional(),
    hasGuarantee: z.boolean().optional(),
    guaranteeType: z.enum(['promissory_note', 'cheque', 'national_card', 'trusted_guarantor']).optional(),
    guaranteeAmount: z.number().min(0).optional(),
    guaranteeDetails: z.string().optional(),
    creditLimit: z.number().min(0).optional(),
    bankAccounts: z.array(bankAccountSchema).optional(),
    currentDebt: z.number().optional(),
    totalHandoversValue: z.number().optional(),
    totalPaid: z.number().optional(),
    status: z.enum(['active', 'suspended', 'settled']).optional(),
    avatarUrl: z.string().optional(),
    notes: z.string().optional(),
});
export async function listSellers(_req, res) {
    const rows = await svc.listSellers();
    res.json(rows.map(toSellerDto));
}
export async function getSeller(req, res) {
    const id = pathParam(req, 'id', 'شناسه دست‌فروش');
    const row = await svc.getSeller(id);
    res.json(toSellerDto(row));
}
export async function createSeller(req, res) {
    const data = sellerSchema.parse(req.body);
    const row = await svc.createSeller(data);
    logAudit(req.auth ?? null, 'create', 'seller', `دست‌فروش «${row.name}» با کد ${row.code} ایجاد شد`);
    res.status(201).json(toSellerDto(row));
}
export async function updateSeller(req, res) {
    const id = pathParam(req, 'id', 'شناسه دست‌فروش');
    const data = sellerSchema.partial().parse(req.body);
    const row = await svc.updateSeller(id, data);
    logAudit(req.auth ?? null, 'update', 'seller', `دست‌فروش «${row.name}» ویرایش شد`);
    res.json(toSellerDto(row));
}
export async function deleteSeller(req, res) {
    const id = pathParam(req, 'id', 'شناسه دست‌فروش');
    await svc.softDeleteSeller(id);
    logAudit(req.auth ?? null, 'delete', 'seller', 'دست‌فروش به سطل بازیافت منتقل شد');
    res.json({ message: 'دست‌فروش به سطل بازیافت منتقل شد' });
}
//# sourceMappingURL=sellersController.js.map