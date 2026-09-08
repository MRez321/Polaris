import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardOverview } from '@/modules/workshop/dashboard/DashboardOverview';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useTheme } from '@/context/ThemeContext';
import { useComputedStats } from '@/modules/workshop/hooks/useComputedStats';
import { companyApi, getApiErrorMessage } from '@/lib/api';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellers, consignments, payments, items, workshopInfo, setWorkshopInfo } = useData();
  const { openQuickHandover, openQuickPayment, setSelectedConsignment } = useUI();
  const { isDarkMode } = useTheme();
  const stats = useComputedStats();

  // Persist widget-visibility toggles into company_settings.dashboardPrefs.
  const handlePrefsChange = (prefs: { [widgetId: string]: boolean }) => {
    setWorkshopInfo({ ...workshopInfo, dashboardPrefs: prefs });
    companyApi
      .update({ dashboardPrefs: prefs })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, 'ذخیره تنظیمات نمایش داشبورد ناموفق بود'))
      );
  };

  return (
    <DashboardOverview
      stats={stats}
      sellers={sellers}
      consignments={consignments}
      payments={payments}
      items={items}
      darkMode={isDarkMode}
      onOpenHandover={() => openQuickHandover()}
      onOpenPayment={() => openQuickPayment()}
      onSelectConsignment={(c) => {
        setSelectedConsignment(c);
        navigate('/workshop/consignments');
      }}
      onSelectSeller={() => {
        navigate('/workshop/people');
      }}
      onGoToTab={(tab: string) => {
        if (tab === 'sellers' || tab === 'staff') {
          navigate('/workshop/people');
        } else if (tab === 'payments' || tab === 'workshop' || tab === 'analytics') {
          navigate('/workshop/finances/payments');
        } else if (tab === 'audit') {
          navigate('/workshop/settings');
        } else {
          navigate(`/workshop/${tab}`);
        }
      }}
      dashboardPrefs={workshopInfo.dashboardPrefs}
      onDashboardPrefsChange={handlePrefsChange}
    />
  );
};

export default DashboardPage;
