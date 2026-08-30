import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardOverview } from '@/modules/workshop/dashboard/DashboardOverview';
import { useData } from '@/modules/workshop/context/DataContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useTheme } from '@/context/ThemeContext';
import { useComputedStats } from '@/modules/workshop/hooks/useComputedStats';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellers, consignments, payments, items } = useData();
  const { openQuickHandover, openQuickPayment, setSelectedConsignment } = useUI();
  const { isDarkMode } = useTheme();
  const stats = useComputedStats();

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
          navigate('/workshop/finances');
        } else if (tab === 'audit') {
          navigate('/workshop/settings');
        } else {
          navigate(`/workshop/${tab}`);
        }
      }}
    />
  );
};

export default DashboardPage;
