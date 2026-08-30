# Project Structure

Polaris Style — modular monorepo: Express/MySQL backend serving a React SPA on one origin.
Reorganized into feature modules (phases 1–5); the admin workshop app lives under
`frontend/src/modules/workshop/` and mounts at `/workshop`; its API lives under `/api/workshop/*`.

Key backend conventions:

- `backend/src/core/` — cross-cutting infrastructure shared by all modules (db, middleware, audit, socket, origins, utils).
- `backend/src/modules/{auth,cms,workshop}/` — feature modules; each owns its routes/controllers/services. The workshop router exports the chain mounted at `/api/workshop` (admin-only).
- `backend/src/{config,routes,schema,services,types,models,controllers}` — app-level wiring: db/drizzle config, `apiRoutes.ts` mounting shared surfaces, drizzle schema split per domain, and the customer-order surface.
- Migrations auto-run at startup (`core/db/runMigrations.ts`, 3 attempts × 5s backoff).

Key frontend conventions:

- `frontend/src/modules/workshop/` — the admin panel module (pages, managers, contexts `DataContext`/`UIContext`, layout, hooks, utils); routed at `/workshop/*` behind RequireAdmin.
- Shared code stays at the conventional roots: `components/` (ui, common, public), `context/`, `hooks/`, `lib/`, `pages/` (public storefront + controlpanel), `types/`, `utils/`.
- Path alias `@/` → `frontend/src/`; imports reference module files via `@/modules/workshop/…`.

Removed during the reorg: `docker-compose.yml`, `frontend/src/App.css`, `frontend/src/components/layout/Footer.tsx`, `temp/`, `companyApi` (unused API client group), and unused deps (`axios` backend; `socket.io-client`, `vite-plugin-pwa` frontend).


```text
├── backend/
│   ├── public/
│   │   └── index.html
│   ├── scripts/
│   │   ├── blog-seed.json
│   │   ├── copy-public.js
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   ├── smoke-phase2.mjs
│   │   └── smoke.mjs
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── drizzle.ts
│   │   ├── controllers/
│   │   │   ├── healthController.ts
│   │   │   └── ordersController.ts
│   │   ├── core/
│   │   │   ├── db/
│   │   │   │   └── runMigrations.ts
│   │   │   ├── middleware/
│   │   │   │   └── errorHandler.ts
│   │   │   ├── services/
│   │   │   │   ├── auditService.ts
│   │   │   │   └── socketService.ts
│   │   │   ├── utils/
│   │   │   │   ├── apiError.ts
│   │   │   │   └── code.ts
│   │   │   └── origins.ts
│   │   ├── models/
│   │   │   └── mappers.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── middleware.ts
│   │   │   │   ├── routes.ts
│   │   │   │   └── service.ts
│   │   │   ├── cms/
│   │   │   │   ├── services/
│   │   │   │   │   ├── blogService.ts
│   │   │   │   │   ├── galleryService.ts
│   │   │   │   │   ├── settingsService.ts
│   │   │   │   │   └── websiteService.ts
│   │   │   │   ├── blogController.ts
│   │   │   │   ├── companyController.ts
│   │   │   │   ├── galleryController.ts
│   │   │   │   └── websiteController.ts
│   │   │   └── workshop/
│   │   │       ├── controllers/
│   │   │       │   ├── consignmentsController.ts
│   │   │       │   ├── dashboardController.ts
│   │   │       │   ├── expensesController.ts
│   │   │       │   ├── itemsController.ts
│   │   │       │   ├── ordersController.ts
│   │   │       │   ├── paymentsController.ts
│   │   │       │   ├── publicController.ts
│   │   │       │   ├── sellersController.ts
│   │   │       │   ├── staffController.ts
│   │   │       │   └── trashController.ts
│   │   │       ├── services/
│   │   │       ├── inventoryService.ts
│   │   │       └── router.ts
│   │   ├── routes/
│   │   │   └── apiRoutes.ts
│   │   ├── schema/
│   │   │   ├── audit.ts
│   │   │   ├── auth.ts
│   │   │   ├── clientId.ts
│   │   │   ├── cms.ts
│   │   │   ├── company.ts
│   │   │   ├── index.ts
│   │   │   ├── orders.ts
│   │   │   └── workshop.ts
│   │   ├── services/
│   │   │   └── ordersService.ts
│   │   ├── types/
│   │   │   ├── express.d.ts
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── startup.ts
│   ├── .env.example
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── server.ts
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   ├── blog/
│   │   │   ├── autumn-1405-trends.jpg
│   │   │   ├── capsule-wardrobe.jpg
│   │   │   ├── ket-size-guide.jpg
│   │   │   └── wool-garment-care.jpg
│   │   ├── icons/
│   │   │   └── icon.svg
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── manifest.json
│   │   ├── og-image.jpg
│   │   ├── robots.txt
│   │   ├── site.webmanifest
│   │   └── sitemap.xml
│   ├── src/
│   │   ├── assets/
│   │   │   ├── grok-image-5af6fc97-55e6-4d59-8676-f0fe2e37619b.jpg
│   │   │   ├── hero-shop.jpg
│   │   │   ├── hero.png
│   │   │   ├── logo-with-bg.png
│   │   │   ├── logo.png
│   │   │   ├── logo.webp
│   │   │   ├── mannequin.jpg
│   │   │   ├── racks.jpg
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── BankInput.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── FormattedNumberInput.tsx
│   │   │   │   ├── GoogleSignInButton.tsx
│   │   │   │   ├── ImagePicker.tsx
│   │   │   │   ├── ImagePickerModal.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── SafeImage.tsx
│   │   │   ├── public/
│   │   │   │   ├── CartDrawer.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── PublicFooter.tsx
│   │   │   │   ├── PublicHeader.tsx
│   │   │   │   ├── PublicLayout.tsx
│   │   │   │   ├── Reveal.tsx
│   │   │   │   └── SectionHeading.tsx
│   │   │   └── ui/
│   │   │       ├── accordion.tsx
│   │   │       ├── avatar.tsx
│   │   │       ├── badge.tsx
│   │   │       ├── breadcrumb.tsx
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── city-selector.tsx
│   │   │       ├── combobox.tsx
│   │   │       ├── drawer.tsx
│   │   │       ├── dropdown-menu.tsx
│   │   │       ├── empty.tsx
│   │   │       ├── field.tsx
│   │   │       ├── hitbox.tsx
│   │   │       ├── input-group.tsx
│   │   │       ├── input.tsx
│   │   │       ├── label.tsx
│   │   │       ├── mobile-number-input.tsx
│   │   │       ├── price-input.tsx
│   │   │       ├── scroll-area.tsx
│   │   │       ├── select-menu.tsx
│   │   │       ├── separator.tsx
│   │   │       ├── sheet.tsx
│   │   │       ├── skeleton.tsx
│   │   │       ├── spinner.tsx
│   │   │       ├── tabs.tsx
│   │   │       ├── textarea.tsx
│   │   │       └── toman-icon.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── CartContext.tsx
│   │   │   ├── FavoritesContext.tsx
│   │   │   ├── NetworkContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── data/
│   │   │   └── blogPosts.ts
│   │   ├── hooks/
│   │   │   ├── use-controllable-state.ts
│   │   │   └── useNetworkStatus.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── galleryApi.ts
│   │   │   ├── iranian-mobile.ts
│   │   │   ├── normalize-persian-digits.ts
│   │   │   ├── persian-provinces.ts
│   │   │   ├── usePageMeta.ts
│   │   │   └── utils.ts
│   │   ├── modules/
│   │   │   └── workshop/
│   │   │       ├── analytics/
│   │   │       │   └── FinancialReports.tsx
│   │   │       ├── audit/
│   │   │       │   └── AuditLogsManager.tsx
│   │   │       ├── consignments/
│   │   │       │   ├── ConsignmentReceipt.tsx
│   │   │       │   ├── HandoverManager.tsx
│   │   │       │   ├── NewHandoverModal.tsx
│   │   │       │   ├── ReturnModal.tsx
│   │   │       │   └── ReturnsSection.tsx
│   │   │       ├── context/
│   │   │       │   ├── DataContext.tsx
│   │   │       │   └── UIContext.tsx
│   │   │       ├── dashboard/
│   │   │       │   ├── DashboardOverview.tsx
│   │   │       │   ├── OverdueAlertBanner.tsx
│   │   │       │   ├── SalesDebtChart.tsx
│   │   │       │   ├── StatsCard.tsx
│   │   │       │   └── TopSellersCard.tsx
│   │   │       ├── finances/
│   │   │       │   └── FinancesManager.tsx
│   │   │       ├── hooks/
│   │   │       │   └── useComputedStats.ts
│   │   │       ├── inventory/
│   │   │       │   ├── InventoryManager.tsx
│   │   │       │   └── ItemFormModal.tsx
│   │   │       ├── layout/
│   │   │       │   ├── AppLayout.tsx
│   │   │       │   ├── Header.tsx
│   │   │       │   ├── MobileNav.tsx
│   │   │       │   └── Sidebar.tsx
│   │   │       ├── pages/
│   │   │       │   ├── ConsignmentsPage.tsx
│   │   │       │   ├── DashboardPage.tsx
│   │   │       │   ├── EntityProfilePage.tsx
│   │   │       │   ├── FinancesPage.tsx
│   │   │       │   ├── InventoryPage.tsx
│   │   │       │   ├── OrdersPage.tsx
│   │   │       │   ├── PeoplePage.tsx
│   │   │       │   └── SettingsPage.tsx
│   │   │       ├── payments/
│   │   │       │   ├── NewPaymentModal.tsx
│   │   │       │   └── PaymentsManager.tsx
│   │   │       ├── people/
│   │   │       │   └── PeopleManager.tsx
│   │   │       ├── pwa/
│   │   │       │   ├── ConnectionGuardian.tsx
│   │   │       │   └── PwaInstallPrompt.tsx
│   │   │       ├── sellers/
│   │   │       │   ├── SellerFormModal.tsx
│   │   │       │   ├── SellerProfileDrawer.tsx
│   │   │       │   └── SellersManager.tsx
│   │   │       ├── settings/
│   │   │       │   ├── GalleryManager.tsx
│   │   │       │   ├── OwnerCard.tsx
│   │   │       │   ├── OwnerFormModal.tsx
│   │   │       │   ├── SettingsManager.tsx
│   │   │       │   └── UsersManager.tsx
│   │   │       ├── staff/
│   │   │       │   └── StaffManager.tsx
│   │   │       ├── utils/
│   │   │       │   ├── fifo.ts
│   │   │       │   ├── imageFile.ts
│   │   │       │   └── validation.ts
│   │   │       └── workshop/
│   │   │           └── WorkshopManager.tsx
│   │   ├── pages/
│   │   │   ├── controlpanel/
│   │   │   │   ├── BlogManagerPage.tsx
│   │   │   │   ├── ControlPanelLayout.tsx
│   │   │   │   └── WebsiteSettingsPage.tsx
│   │   │   ├── public/
│   │   │   │   ├── BlogPage.tsx
│   │   │   │   ├── BlogPostPage.tsx
│   │   │   │   ├── CheckoutPage.tsx
│   │   │   │   ├── ContactPage.tsx
│   │   │   │   ├── CustomerDashboardPage.tsx
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── ProductPage.tsx
│   │   │   │   └── ShopPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── persian.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── markdown/
│   ├── API.md
│   ├── CMS.md
│   ├── GUIDE.md
│   └── STRUCTURE.md
├── .gitignore
├── CONTEXT.md
├── LICENSE
├── package.json
└── README.md
```
