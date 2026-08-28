import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataProvider } from '@/context/DataContext';
import { UIProvider } from '@/context/UIContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/public/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import ShopPage from '@/pages/public/ShopPage';
import ServicesPage from '@/pages/public/ServicesPage';
import ContactPage from '@/pages/public/ContactPage';
import DashboardPage from '@/pages/DashboardPage';
import UserDashboardPage from '@/pages/UserDashboardPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import InventoryPage from '@/pages/InventoryPage';
import ConsignmentsPage from '@/pages/ConsignmentsPage';
import PeoplePage from '@/pages/PeoplePage';
import FinancesPage from '@/pages/FinancesPage';
import SettingsPage from '@/pages/SettingsPage';
import EntityProfilePage from '@/pages/EntityProfilePage';

// Role-aware home: admins get the full dashboard, regular users the read-only one.
function RoleHome() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading || !user) return null;
  return isAdmin ? <DashboardPage /> : <UserDashboardPage />;
}

// Guard for management routes: requires an authenticated admin.
// Anonymous visitors go to login; signed-in non-admins stay inside the app home.
function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <DataProvider>
          <UIProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public marketing site (no admin code paths) */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                  </Route>

                  {/* Auth screens */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Admin app, isolated under /app */}
                  <Route path="/app" element={<AppLayout />}>
                    <Route index element={<RoleHome />} />
                    <Route element={<RequireAdmin />}>
                      <Route path="inventory" element={<InventoryPage />} />
                      <Route path="consignments" element={<ConsignmentsPage />} />
                      <Route path="people" element={<PeoplePage />} />
                      <Route path="people/staff" element={<PeoplePage />} />
                      <Route path="finances" element={<FinancesPage />} />
                      <Route path="finances/workshop" element={<FinancesPage />} />
                      <Route path="finances/reports" element={<FinancesPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      {/* /app/profile/{items|sellers|staff|owners}/:id */}
                      <Route path="profile/:type/:id" element={<EntityProfilePage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/app" replace />} />
                  </Route>

                  {/* Unknown URLs land on the public site */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </UIProvider>
        </DataProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;
