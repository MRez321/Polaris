import React from 'react';
import { toast } from 'sonner';
import { SettingsManager } from '@/modules/workshop/settings/SettingsManager';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useNetwork } from '@/context/NetworkContext';
import { companyApi, getApiErrorMessage } from '@/lib/api';

const SettingsPage: React.FC = () => {
  const { workshopInfo, setWorkshopInfo, fetchData } = useData();
  const { setPwaModalOpen } = useUI();
  const networkStatus = useNetwork();

  return (
    <SettingsManager
      workshopInfo={workshopInfo}
      onSaveWorkshopInfo={(info) => {
        // Optimistic local update; persisted to company_settings on the server.
        setWorkshopInfo(info);
        companyApi
          .update(info)
          .catch((err) =>
            toast.error(getApiErrorMessage(err, 'ذخیره اطلاعات کارگاه در سرور ناموفق بود'))
          );
      }}
      onRefreshData={fetchData}
      networkStatus={networkStatus}
      onOpenPwaInstall={() => setPwaModalOpen(true)}
    />
  );
};

export default SettingsPage;
