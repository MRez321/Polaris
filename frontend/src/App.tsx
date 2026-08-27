import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataProvider } from '@/context/DataContext';
import { UIProvider } from '@/context/UIContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
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
function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
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
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<RoleHome />} />
                    <Route element={<RequireAdmin />}>
                      <Route path="/inventory" element={<InventoryPage />} />
                      <Route path="/consignments" element={<ConsignmentsPage />} />
                      <Route path="/people" element={<PeoplePage />} />
                      <Route path="/people/staff" element={<PeoplePage />} />
                      <Route path="/finances" element={<FinancesPage />} />
                      <Route path="/finances/workshop" element={<FinancesPage />} />
                      <Route path="/finances/reports" element={<FinancesPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      {/* /profile/{items|sellers|staff|owners}/:id */}
                      <Route path="/profile/:type/:id" element={<EntityProfilePage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
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
