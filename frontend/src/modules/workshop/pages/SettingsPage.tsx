import React from 'react';
import { SettingsManager } from '@/modules/workshop/settings/SettingsManager';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useNetwork } from '@/context/NetworkContext';

const SettingsPage: React.FC = () => {
  const { workshopInfo, setWorkshopInfo, fetchData } = useData();
  const { setPwaModalOpen } = useUI();
  const networkStatus = useNetwork();

  return (
    <SettingsManager
      workshopInfo={workshopInfo}
      onSaveWorkshopInfo={(info) => setWorkshopInfo(info)}
      onRefreshData={fetchData}
      networkStatus={networkStatus}
      onOpenPwaInstall={() => setPwaModalOpen(true)}
    />
  );
};

export default SettingsPage;
