import type { Consignment, FIFOAllocation } from '@/types';

/**
 * Calculates FIFO (First-In, First-Out) debt allocation for a seller's payment.
 * Automatically attributes incoming cash/transfer to the oldest outstanding consignments first.
 */
export function calculateFIFOAllocation(
  consignments: Consignment[],
  paymentAmount: number
): {
  allocations: FIFOAllocation[];
  unallocatedAmount: number;
  updatedConsignments: Consignment[];
} {
  let remainingPayment = Math.max(0, paymentAmount);
  const allocations: FIFOAllocation[] = [];

  // Sort by date ascending (oldest first)
  const sortedConsignments = [...consignments]
    .filter((c) => c.remainingAmount > 0 && c.status !== 'settled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const updatedConsignmentsMap = new Map<string, Consignment>();

  for (const c of sortedConsignments) {
    if (remainingPayment <= 0) break;

    const remainingDebtBefore = c.remainingAmount;
    const allocate = Math.min(remainingPayment, remainingDebtBefore);
    const remainingDebtAfter = remainingDebtBefore - allocate;
    const isFullySettled = remainingDebtAfter <= 0;

    allocations.push({
      consignmentId: c.id,
      consignmentCode: c.code,
      consignmentDate: c.date,
      allocatedAmount: allocate,
      remainingDebtBefore,
      remainingDebtAfter,
      isFullySettled,
    });

    const newPaidAmount = c.paidAmount + allocate;
    const newRemainingAmount = Math.max(0, remainingDebtAfter);
    const newStatus = isFullySettled
      ? 'settled'
      : newPaidAmount > 0
      ? 'partially_settled'
      : c.status;

    updatedConsignmentsMap.set(c.id, {
      ...c,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
    });

    remainingPayment -= allocate;
  }

  // Combine updated consignments with untouched consignments
  const updatedConsignments = consignments.map((c) =>
    updatedConsignmentsMap.has(c.id) ? updatedConsignmentsMap.get(c.id)! : c
  );

  return {
    allocations,
    unallocatedAmount: remainingPayment,
    updatedConsignments,
  };
}
