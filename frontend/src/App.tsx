import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataProvider } from '@/context/DataContext';
import { UIProvider } from '@/context/UIContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { AppLayout } from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import InventoryPage from '@/pages/InventoryPage';
import ConsignmentsPage from '@/pages/ConsignmentsPage';
import PeoplePage from '@/pages/PeoplePage';
import FinancesPage from '@/pages/FinancesPage';
import SettingsPage from '@/pages/SettingsPage';
import EntityProfilePage from '@/pages/EntityProfilePage';

function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <DataProvider>
          <UIProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </DataProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;
