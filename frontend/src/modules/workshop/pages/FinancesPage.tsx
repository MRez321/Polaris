import React from 'react';
import { useLocation } from 'react-router-dom';
import { FinancesManager } from '@/modules/workshop/finances/FinancesManager';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useComputedStats } from '@/modules/workshop/hooks/useComputedStats';

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
