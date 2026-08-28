import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { useData } from '@/context/DataContext';
import { useUI } from '@/context/UIContext';
import { useTheme } from '@/context/ThemeContext';
import { useComputedStats } from '@/hooks/useComputedStats';

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
        navigate('/app/consignments');
      }}
      onSelectSeller={() => {
        navigate('/app/people');
      }}
      onGoToTab={(tab: string) => {
        if (tab === 'sellers' || tab === 'staff') {
          navigate('/app/people');
        } else if (tab === 'payments' || tab === 'workshop' || tab === 'analytics') {
          navigate('/app/finances');
        } else if (tab === 'audit') {
          navigate('/app/settings');
        } else {
          navigate(`/app/${tab}`);
        }
      }}
    />
  );
};

export default DashboardPage;
