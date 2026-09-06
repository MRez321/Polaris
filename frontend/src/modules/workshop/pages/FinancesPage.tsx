import React from 'react';
import { useLocation } from 'react-router-dom';
import { FinancesManager } from '@/modules/workshop/finances/FinancesManager';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useComputedStats } from '@/modules/workshop/hooks/useComputedStats';

const FinancesPage: React.FC = () => {
  const location = useLocation();
  const { payments, sellers, consignments, owners, staffMembers, items, handleSubmitPayment, handleSubmitReturn } =
    useData();
  const { quickPaymentSellerId } = useUI();
  const stats = useComputedStats();

  const initialSubTab: 'payments' | 'costs' | 'income' | 'reports' = location.pathname.endsWith('/payments')
    ? 'payments'
    : location.pathname.endsWith('/costs') || location.pathname.endsWith('/workshop')
    ? 'costs'
    : location.pathname.endsWith('/income')
    ? 'income'
    : 'reports';

  return (
    <FinancesManager
      payments={payments}
      sellers={sellers}
      consignments={consignments}
      onSubmitPayment={handleSubmitPayment}
      onSubmitReturn={handleSubmitReturn}
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
