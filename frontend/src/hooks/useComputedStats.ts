import { useMemo } from 'react';
import type { DashboardStats } from '@/types';
import { useData } from '@/context/DataContext';

/**
 * Server stats when available, otherwise derived client-side from loaded entities
 * (mirrors the fallback computation of the original single-page app).
 */
export function useComputedStats(): DashboardStats {
  const { stats, consignments, items, payments, sellers } = useData();

  return useMemo<DashboardStats>(() => {
    if (stats) return stats;

    return {
      totalActiveDebt: (consignments || []).reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
      totalOverdueDebt: (consignments || [])
        .filter((c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now())
        .reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
      totalInventoryValue: (items || []).reduce(
        (sum, i) => sum + (i.stockQuantity || 0) * (i.consignmentPrice || 0),
        0
      ),
      todayPayments: (payments || [])
        .filter((p) => new Date(p.date).toDateString() === new Date().toDateString())
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      activeConsignmentsCount: (consignments || []).filter((c) => (c.remainingAmount || 0) > 0).length,
      overdueConsignmentsCount: (consignments || []).filter(
        (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
      ).length,
      lowStockItemsCount: (items || []).filter(
        (i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)
      ).length,
      totalSellersCount: (sellers || []).length,
      totalOutstandingDebt: (consignments || []).reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
    };
  }, [stats, consignments, items, payments, sellers]);
}
