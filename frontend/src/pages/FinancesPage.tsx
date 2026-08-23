import React from 'react';
import { useLocation } from 'react-router-dom';
import { FinancesManager } from '@/components/finances/FinancesManager';
import { useData } from '@/context/DataContext';
import { useUI } from '@/context/UIContext';
import { useComputedStats } from '@/hooks/useComputedStats';

const FinancesPage: React.FC = () => {
  const location = useLocation();
  const { payments, sellers, consignments, owners, staffMembers, items, handleSubmitPayment } = useData();
  const { quickPaymentSellerId } = useUI();
  const stats = useComputedStats();

  const initialSubTab: 'payments' | 'workshop' | 'reports' = location.pathname.endsWith('/workshop')
    ? 'workshop'
    : location.pathname.endsWith('/reports')
    ? 'reports'
    : 'payments';

  return (
    <FinancesManager
      payments={payments}
      sellers={sellers}
      consignments={consignments}
      onSubmitPayment={handleSubmitPayment}
      preSelectedSellerId={quickPaymentSellerId}
      owners={owners}
      staff={staffMembers}
      totalActiveDebt={stats.totalActiveDebt || 0}
      todayPayments={stats.todayPayments || 0}
      stats={stats}
      items={items}
      initialSubTab={initialSubTab}
    />
  );
};

export default FinancesPage;
