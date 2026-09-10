import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardOverview } from '@/modules/workshop/dashboard/DashboardOverview';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useTheme } from '@/context/ThemeContext';
import { useComputedStats } from '@/modules/workshop/hooks/useComputedStats';
import { companyApi, getApiErrorMessage, ordersApi, analyticsApi } from '@/lib/api';
import type { AnalyticsResult } from '@/lib/api';
import type { DashboardLayout, Order } from '@/types';
import { normalizeLayout } from '@/modules/workshop/dashboard/dashboardLayout';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellers, consignments, payments, items, returns, workshopInfo, setWorkshopInfo } = useData();
  const { openQuickHandover, openQuickPayment, setSelectedConsignment } = useUI();
  const { isDarkMode } = useTheme();
  const stats = useComputedStats();
  const [orders, setOrders] = React.useState<Order[] | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsResult | null>(null);

  // Dashboard widgets read storefront orders + cross-channel analytics,
  // which live outside the shared DataContext entities.
  React.useEffect(() => {
    ordersApi
      .all()
      .then(setOrders)
      .catch(() => setOrders([]));
    analyticsApi
      .get()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, []);

  // Persist the v2 dashboard layout (order/hidden/collapsed/cols/presets)
  // into company_settings.dashboardPrefs. normalizeLayout already migrated
  // any legacy flat visibility map, so `prefs` is always a complete object
  // and the server-side shallow merge is safe.
  const handlePrefsChange = (prefs: DashboardLayout) => {
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
      orders={orders ?? []}
      returns={returns}
      analytics={analytics}
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
      dashboardPrefs={normalizeLayout(workshopInfo.dashboardPrefs)}
      onDashboardPrefsChange={handlePrefsChange}
    />
  );
};

export default DashboardPage;
