import React from 'react';
import { SettingsManager } from '@/components/settings/SettingsManager';
import { useData } from '@/context/DataContext';
import { useUI } from '@/context/UIContext';
import { useNetwork } from '@/context/NetworkContext';

const SettingsPage: React.FC = () => {
  const { workshopInfo, setWorkshopInfo, auditLogs, fetchData } = useData();
  const { setPwaModalOpen } = useUI();
  const networkStatus = useNetwork();

  return (
    <SettingsManager
      workshopInfo={workshopInfo}
      onSaveWorkshopInfo={(info) => setWorkshopInfo(info)}
      onRefreshData={fetchData}
      networkStatus={networkStatus}
      onOpenPwaInstall={() => setPwaModalOpen(true)}
      auditLogs={auditLogs}
    />
  );
};

export default SettingsPage;
