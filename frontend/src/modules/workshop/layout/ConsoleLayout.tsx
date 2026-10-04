import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
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
import DashboardPage from '@/modules/workshop/pages/DashboardPage';
import { CONSOLE_ACCESS, type Permission } from '@/lib/permissions';

/**
 * The single management surface — merged from the former /workshop (AppLayout)
 * and /controlpanel (ControlPanelLayout). Same header/glass sidebar structure,
 * but access is role-based instead of admin-only: authors hold blog.manage and
 * staff a view-level subset, so nav items and routes are permission-gated.
 *
 * Data/UI context live here — not at the app root — so anonymous public
 * visitors never trigger the admin-only API calls DataContext makes on mount.
 * ConsoleLayout's own guard rejects plain users before these providers mount.
 */
export const ConsoleLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Route protection: once the session has settled, unauthenticated visitors
  // are bounced to the login page and plain users to their account.
  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=%2Fconsole" replace />;
  if (!CONSOLE_ACCESS.some((role) => role === user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DataProvider>
      <UIProvider>
        <ConsoleShell />
      </UIProvider>
    </DataProvider>
  );
};

/**
 * Per-page gate for console routes. Hides pages the role cannot read
 * (authors reaching for /console/inventory land back on the console index
 * instead of an empty, 403-filled table). API-level gating lands with the
 * P0-C/D services.
 */
export const RequirePermission: React.FC<{ permission: Permission }> = ({
  permission,
}) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <Navigate to="/console" replace />;
  return <Outlet />;
};

/** Entity profiles are readable only through the section that owns them. */
const PROFILE_PERMISSIONS: Record<string, Permission> = {
  items: 'inventory.view',
  sellers: 'people.view',
  staff: 'people.view',
  owners: 'people.view',
};

export const RequireProfilePermission: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const { hasPermission } = useAuth();
  const permission = PROFILE_PERMISSIONS[type || ''];
  // Unknown types fall through so EntityProfilePage renders its own
  // «یافت نشد» card rather than silently redirecting.
  if (permission && !hasPermission(permission)) return <Navigate to="/console" replace />;
  return <Outlet />;
};

/**
 * Console index (spec: admin → dashboard, author → blog). Dashboard is the
 * analytics surface, so the same permission that gates /console/analytics
 * decides the landing target; authors have blog.manage and land on the blog.
 */
export const ConsoleIndex: React.FC = () => {
  const { hasPermission } = useAuth();
  if (hasPermission('analytics.view')) return <DashboardPage />;
  if (hasPermission('blog.manage')) return <Navigate to="/console/website/blog" replace />;
  return <Navigate to="/dashboard" replace />;
};

const ConsoleShell: React.FC = () => {
  const location = useLocation();

  // Reset scroll on every route change: tab switches inside pages keep the
  // previous scroll offset without this, landing users mid-page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
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

  const networkStatus = useNetwork();

  return (
    <div className="relative min-h-screen flex flex-col font-sans transition-colors duration-200 overflow-x-clip" dir="rtl">
      {/* Subtle Ambient Glow Light Orbs for Glassmorphism depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-brand rounded-full blur-[140px] opacity-[0.14] dark:opacity-[0.12] transition-opacity" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-brand-deep rounded-full blur-[130px] opacity-[0.10] dark:opacity-[0.09] transition-opacity" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-deep rounded-full blur-[150px] opacity-[0.10] dark:opacity-[0.08] transition-opacity" />
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
