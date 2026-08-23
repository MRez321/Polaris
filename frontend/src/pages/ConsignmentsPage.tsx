import React from 'react';
import { HandoverManager } from '@/components/consignments/HandoverManager';
import { useData } from '@/context/DataContext';
import { useUI } from '@/context/UIContext';

const ConsignmentsPage: React.FC = () => {
  const {
    consignments,
    sellers,
    items,
    handleSubmitHandover,
    handleSubmitReturn,
    handleAddSeller,
    handleAddItem,
  } = useData();
  const { openQuickPayment, selectedConsignment, setSelectedConsignment } = useUI();

  return (
    <HandoverManager
      consignments={consignments}
      sellers={sellers}
      items={items}
      onSubmitHandover={handleSubmitHandover}
      onSubmitReturn={handleSubmitReturn}
      onRecordPaymentForSeller={(sellerId) => openQuickPayment(sellerId)}
      selectedConsignmentForView={selectedConsignment}
      onClearSelectedConsignment={() => setSelectedConsignment(null)}
      onQuickCreateSeller={handleAddSeller}
      onQuickCreateItem={handleAddItem}
    />
  );
};

export default ConsignmentsPage;
