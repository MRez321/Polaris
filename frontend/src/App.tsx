import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { BrandProvider } from '@/context/BrandContext';

import { NetworkProvider } from '@/context/NetworkContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import {
  ConsoleLayout,
  ConsoleIndex,
  RequirePermission,
  RequireProfilePermission,
} from '@/modules/workshop/layout/ConsoleLayout';
import { PublicLayout } from '@/components/public/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import ShopPage from '@/pages/public/ShopPage';
import ContactPage from '@/pages/public/ContactPage';
import BlogPage from '@/pages/public/BlogPage';
import BlogPostPage from '@/pages/public/BlogPostPage';
import ProductPage from '@/pages/public/ProductPage';
import CheckoutPage from '@/pages/public/CheckoutPage';
import CustomerDashboardPage from '@/pages/public/CustomerDashboardPage';
import OrdersPage from '@/modules/workshop/pages/OrdersPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import InventoryPage from '@/modules/workshop/pages/InventoryPage';
import ConsignmentsPage from '@/modules/workshop/pages/ConsignmentsPage';
import PeoplePage from '@/modules/workshop/pages/PeoplePage';
import FinancesPage from '@/modules/workshop/pages/FinancesPage';
import SettingsPage from '@/modules/workshop/pages/SettingsPage';
import ReturnsPage from '@/modules/workshop/returns/ReturnsPage';
import AnalyticsPage from '@/modules/workshop/analytics/AnalyticsPage';
import EntityProfilePage from '@/modules/workshop/pages/EntityProfilePage';
import WebsiteSettingsPage from '@/pages/controlpanel/WebsiteSettingsPage';
import ThemeSettingsPage from '@/pages/controlpanel/ThemeSettingsPage';
import ShopManagementPage from '@/pages/controlpanel/ShopManagementPage';
import BlogManagerPage from '@/pages/controlpanel/BlogManagerPage';

// Legacy /workshop subpaths map 1:1 onto /console (same page names).
function WorkshopLegacyRedirect() {
  const location = useLocation();
  return <Navigate to={`/console${location.pathname.slice('/workshop'.length)}`} replace />;
}

// Legacy /controlpanel pages now live under /console/website/*; the bare
// /console index decides dashboard vs blog per role.
const CONTROL_PANEL_TARGETS: Record<string, string> = {
  '/theme': '/console/website/theme',
  '/website': '/console/website/website',
  '/shop': '/console/website/shop',
  '/blog': '/console/website/blog',
};

function ControlPanelLegacyRedirect() {
  const location = useLocation();
  const subpath = location.pathname.slice('/controlpanel'.length);
  return <Navigate to={CONTROL_PANEL_TARGETS[subpath] ?? '/console'} replace />;
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

                      {/* Unified console: workshop + website pages, permission-gated */}
                      <Route path="/console" element={<ConsoleLayout />}>
                        <Route index element={<ConsoleIndex />} />
                        <Route element={<RequirePermission permission="orders.view" />}>
                          <Route path="orders" element={<OrdersPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="inventory.view" />}>
                          <Route path="inventory" element={<InventoryPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="consignments.view" />}>
                          <Route path="consignments" element={<ConsignmentsPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="people.view" />}>
                          <Route path="people" element={<PeoplePage />} />
                          <Route path="people/staff" element={<PeoplePage />} />
                        </Route>
                        <Route element={<RequirePermission permission="finances.view" />}>
                          <Route path="finances" element={<FinancesPage />} />
                          <Route path="finances/workshop" element={<FinancesPage />} />
                          <Route path="finances/payments" element={<FinancesPage />} />
                          <Route path="finances/costs" element={<FinancesPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="reports.view" />}>
                          <Route path="finances/reports" element={<FinancesPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="settings.manage" />}>
                          <Route path="settings" element={<SettingsPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="returns.view" />}>
                          <Route path="returns" element={<ReturnsPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="analytics.view" />}>
                          <Route path="analytics" element={<AnalyticsPage />} />
                        </Route>
                        <Route element={<RequireProfilePermission />}>
                          {/* /console/profile/{items|sellers|staff|owners}/:id */}
                          <Route path="profile/:type/:id" element={<EntityProfilePage />} />
                        </Route>
                        <Route element={<RequirePermission permission="website.manage" />}>
                          <Route path="website/theme" element={<ThemeSettingsPage />} />
                          <Route path="website/website" element={<WebsiteSettingsPage />} />
                          <Route path="website/shop" element={<ShopManagementPage />} />
                        </Route>
                        <Route element={<RequirePermission permission="blog.manage" />}>
                          <Route path="website/blog" element={<BlogManagerPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/console" replace />} />
                      </Route>

                      {/* Legacy surfaces — client-side replace redirects (SPA) */}
                      <Route path="/workshop" element={<Navigate to="/console" replace />} />
                      <Route path="/workshop/*" element={<WorkshopLegacyRedirect />} />
                      <Route path="/controlpanel" element={<Navigate to="/console" replace />} />
                      <Route path="/controlpanel/*" element={<ControlPanelLegacyRedirect />} />

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
