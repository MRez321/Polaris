/**
 * P0-D: Sales order lifecycle state machine.
 *
 * The status field tracks operational progress; `paymentStatus` is a separate
 * dimension (client-facing payment state) updated by salesPaymentService.
 *
 * Lifecycle:
 *   draft → pending → confirmed → paid → picking → packed → shipped → delivered
 *   any pre-delivery state → returned (customer returned the goods)
 *   returned → refunded
 *   any state → cancelled (before shipping)
 *
 * Stock integration happens on transitions:
 *   confirmed → SALE out of shop pool (retail) / seller custody (consignment)
 *   returned / cancelled-after-confirmed → RETURN_IN to the originating pool
 */
import type { SalesOrderStatus } from '../../../schema/sales.js';
export type { SalesOrderStatus };

export const ORDER_STATUSES: SalesOrderStatus[] = [
    'draft',
    'pending',
    'confirmed',
    'paid',
    'picking',
    'packed',
    'shipped',
    'delivered',
    'returned',
    'refunded',
    'cancelled',
];

/** Allowed next-states per current state. */
export const TRANSITION_TABLE: Record<SalesOrderStatus, SalesOrderStatus[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['paid', 'picking', 'cancelled', 'returned'],
    paid: ['picking', 'cancelled', 'refunded'],
    picking: ['packed', 'cancelled'],
    packed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'returned', 'cancelled'],
    delivered: ['returned', 'refunded'],
    returned: ['refunded'],
    refunded: [],
    cancelled: [],
};

/** True when the lifecycle allows moving `from` → `to`. */
export function canTransition(from: SalesOrderStatus, to: SalesOrderStatus): boolean {
    if (from === to) return false;
    return TRANSITION_TABLE[from]?.includes(to) ?? false;
}

/** Next states the UI should offer for the current status. */
export function availableTransitions(from: SalesOrderStatus): SalesOrderStatus[] {
    return TRANSITION_TABLE[from] ?? [];
}
