import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { BrandProvider } from '@/context/BrandContext';

import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { AppLayout } from '@/modules/workshop/layout/AppLayout';
import { PublicLayout } from '@/components/public/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import ShopPage from '@/pages/public/ShopPage';
import ContactPage from '@/pages/public/ContactPage';
import BlogPage from '@/pages/public/BlogPage';
import BlogPostPage from '@/pages/public/BlogPostPage';
import ProductPage from '@/pages/public/ProductPage';
import CheckoutPage from '@/pages/public/CheckoutPage';
import CustomerDashboardPage from '@/pages/public/CustomerDashboardPage';
import DashboardPage from '@/modules/workshop/pages/DashboardPage';
import OrdersPage from '@/modules/workshop/pages/OrdersPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import InventoryPage from '@/modules/workshop/pages/InventoryPage';
import ConsignmentsPage from '@/modules/workshop/pages/ConsignmentsPage';
import PeoplePage from '@/modules/workshop/pages/PeoplePage';
import FinancesPage from '@/modules/workshop/pages/FinancesPage';
import SettingsPage from '@/modules/workshop/pages/SettingsPage';
import EntityProfilePage from '@/modules/workshop/pages/EntityProfilePage';
import ControlPanelLayout, { ControlPanelIndexRedirect } from '@/pages/controlpanel/ControlPanelLayout';
import WebsiteSettingsPage from '@/pages/controlpanel/WebsiteSettingsPage';
import ThemeSettingsPage from '@/pages/controlpanel/ThemeSettingsPage';
import ShopManagementPage from '@/pages/controlpanel/ShopManagementPage';
import BlogManagerPage from '@/pages/controlpanel/BlogManagerPage';

// Guard for management routes: requires an authenticated admin.
// Anonymous visitors go to login; signed-in non-admins go to their account.
function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=%2Fworkshop" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function App() {
  return (
    <ThemeProvider>
      <BrandProvider>
        <NetworkProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <BrowserRouter>
                    <Routes>
                      {/* Public marketing site (no admin code paths) */}
                      <Route element={<PublicLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/shop" element={<ShopPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogPostPage />} />
                        <Route path="/product/:id" element={<ProductPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/dashboard" element={<CustomerDashboardPage />} />
                      </Route>

                      {/* Auth screens */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />

                      {/* Admin workshop panel, isolated under /app */}
                      <Route path="/workshop" element={<AppLayout />}>
                        <Route element={<RequireAdmin />}>
                          <Route index element={<DashboardPage />} />
                          <Route path="orders" element={<OrdersPage />} />
                          <Route path="inventory" element={<InventoryPage />} />
                          <Route path="consignments" element={<ConsignmentsPage />} />
                          <Route path="people" element={<PeoplePage />} />
                          <Route path="people/staff" element={<PeoplePage />} />
                          <Route path="finances" element={<FinancesPage />} />
                          <Route path="finances/workshop" element={<FinancesPage />} />
                          <Route path="finances/payments" element={<FinancesPage />} />
                          <Route path="finances/costs" element={<FinancesPage />} />
                          <Route path="finances/income" element={<FinancesPage />} />
                          <Route path="finances/reports" element={<FinancesPage />} />
                          <Route path="settings" element={<SettingsPage />} />
                          {/* /workshop/profile/{items|sellers|staff|owners}/:id */}
                          <Route path="profile/:type/:id" element={<EntityProfilePage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/workshop" replace />} />
                      </Route>

                      {/* Public website management (admin: settings+blog, author: blog) */}
                      <Route path="/controlpanel" element={<ControlPanelLayout />}>
                        <Route index element={<ControlPanelIndexRedirect />} />
                        <Route path="theme" element={<ThemeSettingsPage />} />
                        <Route path="website" element={<WebsiteSettingsPage />} />
                        <Route path="shop" element={<ShopManagementPage />} />
                        <Route path="blog" element={<BlogManagerPage />} />
                      </Route>

                      {/* Unknown URLs land on the public site */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </BrowserRouter>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
        </NetworkProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}

export default App;
