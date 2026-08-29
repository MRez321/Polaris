├── .agents/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .omp/
│   ├── context/
│   │   └── PolarisStyle.md
│   └── config.yml
├── backend/
│   ├── drizzle/
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
│   │   │   ├── auth.ts
│   │   │   ├── db.ts
│   │   │   ├── drizzle.ts
│   │   │   └── test-db.js
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── blogController.ts
│   │   │   ├── companyController.ts
│   │   │   ├── consignmentsController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── expensesController.ts
│   │   │   ├── galleryController.ts
│   │   │   ├── itemsController.ts
│   │   │   ├── ordersController.ts
│   │   │   ├── paymentsController.ts
│   │   │   ├── publicController.ts
│   │   │   ├── sellersController.ts
│   │   │   ├── staffController.ts
│   │   │   ├── trashController.ts
│   │   │   └── websiteController.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   └── errorHandler.ts
│   │   ├── models/
│   │   │   ├── authModel.ts
│   │   │   └── mappers.ts
│   │   ├── routes/
│   │   │   ├── apiRoutes.ts
│   │   │   └── authRoutes.ts
│   │   ├── schema/
│   │   │   ├── auth.ts
│   │   │   ├── clientId.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── auditService.ts
│   │   │   ├── blogService.ts
│   │   │   ├── galleryService.ts
│   │   │   ├── inventoryService.ts
│   │   │   ├── ordersService.ts
│   │   │   ├── settingsService.ts
│   │   │   ├── socketService.ts
│   │   │   └── websiteService.ts
│   │   ├── types/
│   │   │   ├── express.d.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── apiError.ts
│   │   │   └── code.ts
│   │   ├── app.ts
│   │   └── startup.ts
│   ├── .env.example
│   ├── drizzle.config.ts
│   ├── package-lock.json
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
│   │   │   ├── analytics/
│   │   │   │   └── FinancialReports.tsx
│   │   │   ├── audit/
│   │   │   │   └── AuditLogsManager.tsx
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
│   │   │   ├── consignments/
│   │   │   │   ├── ConsignmentReceipt.tsx
│   │   │   │   ├── HandoverManager.tsx
│   │   │   │   ├── NewHandoverModal.tsx
│   │   │   │   ├── ReturnModal.tsx
│   │   │   │   └── ReturnsSection.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardOverview.tsx
│   │   │   │   ├── OverdueAlertBanner.tsx
│   │   │   │   ├── SalesDebtChart.tsx
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   └── TopSellersCard.tsx
│   │   │   ├── finances/
│   │   │   │   └── FinancesManager.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── InventoryManager.tsx
│   │   │   │   └── ItemFormModal.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── payments/
│   │   │   │   ├── NewPaymentModal.tsx
│   │   │   │   └── PaymentsManager.tsx
│   │   │   ├── people/
│   │   │   │   └── PeopleManager.tsx
│   │   │   ├── public/
│   │   │   │   ├── CartDrawer.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── PublicFooter.tsx
│   │   │   │   ├── PublicHeader.tsx
│   │   │   │   ├── PublicLayout.tsx
│   │   │   │   ├── Reveal.tsx
│   │   │   │   └── SectionHeading.tsx
│   │   │   ├── pwa/
│   │   │   │   ├── ConnectionGuardian.tsx
│   │   │   │   └── PwaInstallPrompt.tsx
│   │   │   ├── sellers/
│   │   │   │   ├── SellerFormModal.tsx
│   │   │   │   ├── SellerProfileDrawer.tsx
│   │   │   │   └── SellersManager.tsx
│   │   │   ├── settings/
│   │   │   │   ├── GalleryManager.tsx
│   │   │   │   ├── OwnerCard.tsx
│   │   │   │   ├── OwnerFormModal.tsx
│   │   │   │   ├── SettingsManager.tsx
│   │   │   │   └── UsersManager.tsx
│   │   │   ├── staff/
│   │   │   │   └── StaffManager.tsx
│   │   │   ├── ui/
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── breadcrumb.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── city-selector.tsx
│   │   │   │   ├── combobox.tsx
│   │   │   │   ├── drawer.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── empty.tsx
│   │   │   │   ├── field.tsx
│   │   │   │   ├── hitbox.tsx
│   │   │   │   ├── input-group.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── mobile-number-input.tsx
│   │   │   │   ├── price-input.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select-menu.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── spinner.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   └── toman-icon.tsx
│   │   │   └── workshop/
│   │   │       └── WorkshopManager.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── CartContext.tsx
│   │   │   ├── DataContext.tsx
│   │   │   ├── FavoritesContext.tsx
│   │   │   ├── NetworkContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── UIContext.tsx
│   │   ├── data/
│   │   │   └── blogPosts.ts
│   │   ├── hooks/
│   │   │   ├── use-controllable-state.ts
│   │   │   ├── useComputedStats.ts
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
│   │   │   ├── ConsignmentsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EntityProfilePage.tsx
│   │   │   ├── FinancesPage.tsx
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── PeoplePage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── fifo.ts
│   │   │   ├── imageFile.ts
│   │   │   ├── persian.ts
│   │   │   └── validation.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── src/
│   └── hooks/
│       └── use-controllable-state.ts
├── temp/
│   ├── 1
│   ├── endpoints
│   └── oldscrap.md
├── .gitignore
├── API.md
├── docker-compose.yml
├── GUIDE.md
├── LICENSE
├── package.json
├── README.md
├── skills-lock.json
└── STRUCTURE.md
