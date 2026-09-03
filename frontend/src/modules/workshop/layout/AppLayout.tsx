import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Header } from '@/modules/workshop/layout/Header';
import { Sidebar } from '@/modules/workshop/layout/Sidebar';
import { MobileNav } from '@/modules/workshop/layout/MobileNav';
import { ConnectionGuardian } from '@/modules/workshop/pwa/ConnectionGuardian';
import { PwaInstallPrompt } from '@/modules/workshop/pwa/PwaInstallPrompt';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NewHandoverModal } from '@/modules/workshop/consignments/NewHandoverModal';
import { NewPaymentModal } from '@/modules/workshop/payments/NewPaymentModal';
import { useNetwork } from '@/context/NetworkContext';
import { useUI } from '@/modules/workshop/context/UIContext';
import { useData } from '@/modules/workshop/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/modules/workshop/context/DataContext';
import { UIProvider } from '@/modules/workshop/context/UIContext';

/**
 * Workshop chrome + the workshop-scoped providers. Data/UI context live here
 * — not at the app root — so anonymous public visitors never trigger the
 * admin-only API calls DataContext makes on mount. App.tsx mounts this
 * component at /workshop and RequireAdmin keeps non-admins out, so by the
 * time these providers mount there is a settled admin session.
 */
export const AppLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Route protection: once the session has settled, unauthenticated visitors
  // are bounced to the login page.
  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=%2Fworkshop" replace />;

  return (
    <DataProvider>
      <UIProvider>
        <WorkshopShell />
      </UIProvider>
    </DataProvider>
  );
};

const WorkshopShell: React.FC = () => {
  const networkStatus = useNetwork();
  const {
    quickHandoverOpen,
    quickHandoverSeller,
    closeQuickHandover,
    quickPaymentOpen,
    quickPaymentSellerId,
    closeQuickPayment,
    pwaModalOpen,
    setPwaModalOpen,
  } = useUI();
  const {
    sellers,
    items,
    consignments,
    handleSubmitHandover,
    handleAddSeller,
    handleAddItem,
    handleSubmitPayment,
    handleSubmitReturn,
    handleUpdateSeller,
  } = useData();

  return (
    <div className="relative min-h-screen flex flex-col font-sans transition-colors duration-200 overflow-x-hidden" dir="rtl">
      {/* Subtle Ambient Glow Light Orbs for Glassmorphism depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#CEAE80] rounded-full blur-[140px] opacity-[0.14] dark:opacity-[0.12] transition-opacity" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-amber-600 rounded-full blur-[130px] opacity-[0.10] dark:opacity-[0.09] transition-opacity" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#A67C38] rounded-full blur-[150px] opacity-[0.10] dark:opacity-[0.08] transition-opacity" />
      </div>

      {/* Network & Offline Safe Data Entry Guardian */}
      <ConnectionGuardian networkStatus={networkStatus} />

      {/* PWA Install Modal / Banner */}
      <PwaInstallPrompt forceOpen={pwaModalOpen} onCloseForceOpen={() => setPwaModalOpen(false)} />

      {/* Top Header with Theme Switcher & Connection Status */}
      <Header />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Workspace Canvas */}
        <main className="flex-1 w-full pb-20 md:pb-6 overflow-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />

      {/* Global Quick Handover Modal with inline instant creation */}
      {quickHandoverOpen && (
        <NewHandoverModal
          isOpen={quickHandoverOpen}
          onClose={closeQuickHandover}
          sellers={sellers}
          items={items}
          preSelectedSeller={quickHandoverSeller}
          onSubmitHandover={handleSubmitHandover}
          onUpdateSeller={handleUpdateSeller}
          onQuickCreateSeller={handleAddSeller}
          onQuickCreateItem={handleAddItem}
        />
      )}

      {/* Global Quick Payment Modal */}
      {quickPaymentOpen && (
        <NewPaymentModal
          isOpen={quickPaymentOpen}
          onClose={closeQuickPayment}
          sellers={sellers}
          consignments={consignments}
          preSelectedSellerId={quickPaymentSellerId}
          onSubmitPayment={handleSubmitPayment}
          onSubmitReturn={handleSubmitReturn}
        />
      )}
    </div>
  );
};
