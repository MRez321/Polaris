import { z } from 'zod';
import * as svc from '../services/inventoryService.js';
import { toPaymentDto } from '../models/mappers.js';
import { logAudit } from '../services/auditService.js';
const paymentSchema = z.object({
    sellerId: z.string().min(1),
    amount: z.number().positive(),
    paymentMethod: z.string().min(1),
    trackingNumber: z.string().optional(),
    notes: z.string().optional(),
});
export async function listPayments(_req, res) {
    const rows = await svc.listPayments();
    res.json(rows.map(toPaymentDto));
}
export async function createPayment(req, res) {
    const data = paymentSchema.parse(req.body);
    const actor = req.auth?.user.name ?? 'سیستم';
    const row = await svc.createPayment(data, actor);
    logAudit(req.auth ?? null, 'create', 'payment', `پرداخت ${row.code} به مبلغ ${row.amount} برای ${row.sellerName} ثبت شد`);
    res.status(201).json(toPaymentDto(row));
}
//# sourceMappingURL=paymentsController.js.map