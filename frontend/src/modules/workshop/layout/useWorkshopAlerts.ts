/**
 * Real workshop operational alerts — counts shown as nav-item badges and in
 * the "نبض کارگاه" pulse card. Mirrors the low-stock and overdue rules used
 * everywhere else in the panel (never fabricated):
 *  - low stock: stockQuantity <= minStockThreshold
 *  - overdue: consignment with remainingAmount > 0 past its dueDate
 */
import { useMemo } from 'react';
import { useData } from '@/modules/workshop/context/DataContext';

export interface WorkshopAlerts {
  /** Consignments with outstanding debt past the due date. */
  overdueCount: number;
  /** Items at or below their low-stock threshold. */
  lowStockCount: number;
}

export function useWorkshopAlerts(): WorkshopAlerts {
  const { consignments, items } = useData();
  return useMemo<WorkshopAlerts>(
    () => ({
      overdueCount: consignments.filter(
        (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
      ).length,
      lowStockCount: items.filter(
        (i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)
      ).length,
    }),
    [consignments, items]
  );
}
