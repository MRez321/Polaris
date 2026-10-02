import { v4 as uuid } from 'uuid';
import { eq, sql } from 'drizzle-orm';

import { db } from '../../config/drizzle.js';
import { financialTransactions, sellers } from '../../schema/index.js';
import type { FinancialTxnType } from '../../schema/index.js';
import type { DbTx } from './inventoryLedgerService.js';
import { entityActor, recordAudit } from './auditService.js';

// ---------------------------------------------------------------------------
// Financial service (P0-B item 26) — every money flow becomes a row.
// Legacy cache columns (sellers.currentDebt/totalPaid, consignments
// .paidAmount/remainingAmount/status) are maintained by the same functions,
// inside the same transaction, so the legacy UI keeps reading them unchanged.
// ---------------------------------------------------------------------------

export interface FinancialRef {
    type: 'seller' | 'supplier' | 'customer' | 'staff' | 'other';
    id?: string;
}

export interface RecordTxnInput {
    txnType: FinancialTxnType;
    direction: 1 | -1;
    amount: number;
    counterparty?: FinancialRef;
    reference?: { type: string; id: string };
    description?: string;
    actorId?: string;
    occurredAt?: Date;
}

/** Appends one financial_transactions row inside the caller's transaction. */
export async function recordTransaction(tx: DbTx, input: RecordTxnInput): Promise<string> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error('financial: amount must be positive');
    }
    const id = uuid();
    await tx.insert(financialTransactions).values({
        id,
        txnType: input.txnType,
        direction: input.direction,
        amount: input.amount,
        ...(input.counterparty
            ? {
                  counterpartyType: input.counterparty.type,
                  ...(input.counterparty.id !== undefined ? { counterpartyId: input.counterparty.id } : {}),
              }
            : {}),
        ...(input.reference
            ? { referenceType: input.reference.type, referenceId: input.reference.id }
            : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
    });
    // P0-B item 27: every money flow is audited on the caller's tx so the
    // row commits/rolls back with the financial write.
    recordAudit({
        actor: await entityActor(tx, input.actorId),
        action: 'update',
        entityType: 'financial-ledger',
        entityId: id.slice(0, 64),
        metadata: {
            txnType: input.txnType,
            direction: input.direction,
            amount: input.amount,
            ...(input.counterparty ? { counterparty: input.counterparty } : {}),
            ...(input.reference ? { reference: input.reference } : {}),
        },
        details: `${input.txnType} ${input.direction > 0 ? '+' : '-'}${input.amount.toLocaleString('en-US')}${input.description ? ` — ${input.description}` : ''}`,
        tx,
    });
    return id;
}

export interface DebtAllocationInput {
    consignmentId: string;
    consignmentCode: string;
    consignmentDate: string;
    allocatedAmount: number;
    remainingDebtBefore: number;
    remainingDebtAfter: number;
    isFullySettled: boolean;
}

export interface SettleDebtInput {
    sellerId: string;
    amount: number;
    /** FIFO allocations computed by createPayment (verbatim structure). */
    allocations: DebtAllocationInput[];
    paymentId: string;
    actorId?: string;
}

/**
 * Writes the PAYMENT (+ SETTLEMENT-per-allocation) rows for a seller payment
 * and maintains the legacy sellers cache. Called inside createPayment's
 * transaction after its FIFO pass over consignments (that pass keeps writing
 * the consignment caches itself — identical logic, unchanged behavior).
 */
export async function settleDebt(tx: DbTx, input: SettleDebtInput): Promise<void> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error('financial: settleDebt amount must be positive');
    }

    const unallocated = input.amount - input.allocations.reduce((s, a) => s + a.allocatedAmount, 0);

    // One PAYMENT row for the money in; SETTLEMENT rows for where it went.
    await recordTransaction(tx, {
        txnType: 'PAYMENT',
        direction: -1,
        amount: input.amount,
        counterparty: { type: 'seller', id: input.sellerId },
        reference: { type: 'payment', id: input.paymentId },
        description: 'پرداخت دست‌فروش' + (unallocated > 0 ? ' (دارای مبلغ بدون تخصیص)' : ''),
        ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
    });

    for (const alloc of input.allocations) {
        await recordTransaction(tx, {
            txnType: 'SETTLEMENT',
            direction: -1,
            amount: alloc.allocatedAmount,
            counterparty: { type: 'seller', id: input.sellerId },
            reference: { type: 'consignment', id: alloc.consignmentId },
            description: `تسویه ${alloc.consignmentCode}`,
            ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
        });
    }
}

/**
 * Derived seller balance = Σ(PAYABLE) − Σ(PAYMENT) + Σ(REFUND) − Σ(SETTLEMENT
 * rows whose reference is not a payment). One mechanism: debt reduction is a
 * negative-direction PAYABLE (see submitReturn), so the simple sum below
 * stays correct without a REFUND branch.
 */
export async function getSellerBalance(sellerId: string): Promise<number> {
    const [row] = await db
        .select({
            payable: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.txnType} = 'PAYABLE' THEN ${financialTransactions.amount} * ${financialTransactions.direction} ELSE 0 END), 0)`,
            paid: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.txnType} = 'PAYMENT' THEN ${financialTransactions.amount} ELSE 0 END), 0)`,
        })
        .from(financialTransactions)
        .where(
            sql`${financialTransactions.counterpartyType} = 'seller' AND ${financialTransactions.counterpartyId} = ${sellerId}`,
        );
    return Number(row?.payable ?? 0) - Number(row?.paid ?? 0);
}

/**
 * Opens a seller liability (markDelivered / createHandover immediate mode /
 * restoreEntity). Writes a PAYABLE row and bumps the legacy currentDebt +
 * totalHandoversValue caches in the same transaction.
 */
export async function openSellerPayable(
    tx: DbTx,
    params: {
        sellerId: string;
        amount: number;
        reference: { type: string; id: string };
        description?: string;
        actorId?: string;
    },
): Promise<void> {
    await recordTransaction(tx, {
        txnType: 'PAYABLE',
        direction: 1,
        amount: params.amount,
        counterparty: { type: 'seller', id: params.sellerId },
        reference: params.reference,
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.actorId !== undefined ? { actorId: params.actorId } : {}),
    });

    const rows = await tx.select().from(sellers).where(eq(sellers.id, params.sellerId)).for('update');
    const seller = rows[0];
    if (seller) {
        await tx
            .update(sellers)
            .set({
                currentDebt: seller.currentDebt + params.amount,
                totalHandoversValue: seller.totalHandoversValue + params.amount,
                status: seller.status === 'settled' ? 'active' : seller.status,
                updatedAt: new Date(),
            })
            .where(eq(sellers.id, params.sellerId));
    }
}

/**
 * Reduces a seller liability (submitReturn value / softDeleteConsignment
 * debt release). Writes a negative-direction PAYABLE row — one mechanism,
 * no REFUND alternative — and maintains the legacy currentDebt cache.
 */
export async function reduceSellerPayable(
    tx: DbTx,
    params: {
        sellerId: string;
        amount: number;
        reference: { type: string; id: string };
        description?: string;
        actorId?: string;
    },
): Promise<void> {
    await recordTransaction(tx, {
        txnType: 'PAYABLE',
        direction: -1,
        amount: params.amount,
        counterparty: { type: 'seller', id: params.sellerId },
        reference: params.reference,
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.actorId !== undefined ? { actorId: params.actorId } : {}),
    });

    const rows = await tx.select().from(sellers).where(eq(sellers.id, params.sellerId)).for('update');
    const seller = rows[0];
    if (seller) {
        const newDebt = Math.max(0, seller.currentDebt - params.amount);
        await tx
            .update(sellers)
            .set({
                currentDebt: newDebt,
                status: newDebt === 0 ? 'settled' : seller.status,
                updatedAt: new Date(),
            })
            .where(eq(sellers.id, params.sellerId));
    }
}
