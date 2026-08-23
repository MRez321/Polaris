import React, { useState, useEffect } from 'react';
import {
  DashboardStats,
  Seller,
  Consignment,
  PaymentRecord,
  GarmentItem,
  ConsignmentReturn,
  StaffMember,
  Owner,
  AuditLog,
  WorkshopInfo,
} from './types';
import { calculateFIFOAllocation } from './utils/fifo';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { InventoryManager } from './components/inventory/InventoryManager';
import { HandoverManager } from './components/consignments/HandoverManager';
import { PeopleManager } from './components/people/PeopleManager';
import { FinancesManager } from './components/finances/FinancesManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { NewHandoverModal } from './components/consignments/NewHandoverModal';
import { NewPaymentModal } from './components/payments/NewPaymentModal';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ConnectionGuardian } from './components/pwa/ConnectionGuardian';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('polaris_theme') !== 'light';
  });

  // Real-time network and server connection status
  const networkStatus = useNetworkStatus();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);

  // Core Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<GarmentItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [returns, setReturns] = useState<ConsignmentReturn[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([
    { id: 'coats_jackets', label: 'کت، کاپشن و پالتو' },
    { id: 'pants', label: 'شلوار (کتان، جین، اسلش)' },
    { id: 'shirts', label: 'پیراهن مردانه' },
    { id: 'women_clothing', label: 'مانتو و پوشاک بانوان' },
    { id: 'men_clothing', label: 'هودی، تیشرت و اسپرت' },
    { id: 'traditional', label: 'پوشاک سنتی و مجلسی' },
    { id: 'fabrics', label: 'طاقه پارچه و ملزومات دوخت' },
  ]);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>({
    name: 'کارگاه دوزندگی و تولیدی پولاریس استایل',
    slogan: 'تولیدکننده تخصصی پوشاک زمستانه، پالتو و کاپشن‌های راسته بازار',
    website: 'https://polaris-style.ir',
    instagram: '@polaris_style_clothing',
    telegram: 't.me/polaris_style',
    address: 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸',
    postalCode: '۱۱۹۳۶۴۸۲۹۱',
    phone: '02155667788',
    emergencyPhone: '09121112233',
    registrationNumber: '۵۸۹۴۲۱',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Global Modal Triggers
  const [quickHandoverModalOpen, setQuickHandoverModalOpen] = useState(false);
  const [quickHandoverSeller, setQuickHandoverSeller] = useState<Seller | null>(null);
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [quickPaymentSellerId, setQuickPaymentSellerId] = useState<string | undefined>(undefined);
  const [selectedConsignmentForView, setSelectedConsignmentForView] = useState<Consignment | null>(null);

  // Dark / Light Mode Toggle Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.className =
        'bg-[#0A0A0A] text-stone-100 antialiased selection:bg-[#CEAE80]/30 selection:text-white min-h-screen';
      localStorage.setItem('polaris_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className =
        'bg-[#F8F7F4] text-stone-900 antialiased selection:bg-[#CEAE80]/30 selection:text-black min-h-screen';
      localStorage.setItem('polaris_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Data Fetch from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [
        statsRes,
        itemsRes,
        sellersRes,
        consignmentsRes,
        paymentsRes,
        staffRes,
        ownersRes,
        logsRes,
        catRes,
      ] = await Promise.all([
        fetch('/api/dashboard/stats').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/items').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/sellers').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/consignments').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/payments').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/staff').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/owners').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/audit-logs').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/categories').then((r) => (r.ok ? r.json() : [])),
      ]);

      if (statsRes) setStats(statsRes);
      if (itemsRes) setItems(itemsRes);
      if (sellersRes) setSellers(sellersRes);
      if (consignmentsRes) setConsignments(consignmentsRes);
      if (paymentsRes) setPayments(paymentsRes);
      if (staffRes) setStaffMembers(staffRes);
      if (ownersRes) setOwners(ownersRes);
      if (logsRes) setAuditLogs(logsRes);
      if (catRes && catRes.length > 0) setCategories(catRes);
    } catch (err) {
      console.error('Failed to fetch data from server, utilizing state fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category creation
  const handleCreateCategory = async (categoryLabel: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: categoryLabel }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
      }
    } catch (err) {
      console.error('Error creating category', err);
    }
  };

  // Handlers for Inventory
  const handleAddItem = async (itemData: Partial<GarmentItem>) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [newItem, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('Error creating item', err);
    }
  };

  const handleUpdateItem = async (id: string, itemData: Partial<GarmentItem>) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        fetchData();
      }
    } catch (err) {
      console.error('Error updating item', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting item', err);
    }
  };

  // Handlers for Sellers
  const handleAddSeller = async (sellerData: Partial<Seller>) => {
    try {
      const res = await fetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellerData),
      });
      if (res.ok) {
        const newSeller = await res.json();
        setSellers((prev) => [newSeller, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('Error creating seller', err);
    }
  };

  const handleUpdateSeller = async (id: string, sellerData: Partial<Seller>) => {
    try {
      const res = await fetch(`/api/sellers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellerData),
      });
      if (res.ok) {
        const updated = await res.json();
        setSellers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        fetchData();
      }
    } catch (err) {
      console.error('Error updating seller', err);
    }
  };

  const handleDeleteSeller = async (id: string) => {
    try {
      const res = await fetch(`/api/sellers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSellers((prev) => prev.filter((s) => s.id !== id));
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting seller', err);
    }
  };

  // Handlers for Consignments (Handovers)
  const handleSubmitHandover = async (handoverData: {
    sellerId: string;
    dueDate: string;
    itemsList: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      selectedSize?: string;
      selectedColor?: string;
    }[];
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: handoverData.sellerId,
          dueDate: handoverData.dueDate,
          notes: handoverData.notes,
          items: handoverData.itemsList,
        }),
      });

      if (res.ok) {
        const newConsignment = await res.json();
        setConsignments((prev) => [newConsignment, ...prev]);
        fetchData();
        setSelectedConsignmentForView(newConsignment);
      }
    } catch (err) {
      console.error('Error creating consignment', err);
    }
  };

  // Handlers for Returns
  const handleSubmitReturn = async (returnData: {
    consignmentId: string;
    returnItems: {
      itemId: string;
      quantity: number;
      condition: 'healthy' | 'damaged';
      reason?: string;
    }[];
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData),
      });

      if (res.ok) {
        const result = await res.json();
        setReturns((prev) => [result.returnRecord, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('Error processing return', err);
    }
  };

  // Handlers for Payments (Settlement Allocation)
  const handleSubmitPayment = async (paymentData: {
    sellerId: string;
    amount: number;
    paymentMethod: string;
    trackingNumber?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (res.ok) {
        const newPayment = await res.json();
        setPayments((prev) => [newPayment, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('Error creating payment', err);
    }
  };

  // Handlers for Staff
  const handleAddStaff = async (staffData: Partial<StaffMember>) => {
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      });
      if (res.ok) {
        const newStf = await res.json();
        setStaffMembers((prev) => [newStf, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('Error creating staff member', err);
    }
  };

  const handleUpdateStaff = async (id: string, staffData: Partial<StaffMember>) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      });
      if (res.ok) {
        const updated = await res.json();
        setStaffMembers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        fetchData();
      }
    } catch (err) {
      console.error('Error updating staff member', err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaffMembers((prev) => prev.filter((s) => s.id !== id));
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting staff member', err);
    }
  };

  const handleUpdateOwners = async (newOwners: Owner[]) => {
    setOwners(newOwners);
  };

  // Quick Action Modals Trigger
  const triggerQuickHandover = (seller?: Seller) => {
    setQuickHandoverSeller(seller || (sellers.length > 0 ? sellers[0] : null));
    setQuickHandoverModalOpen(true);
  };

  const triggerQuickPayment = (seller?: Seller | string) => {
    const sId = typeof seller === 'string' ? seller : seller?.id;
    setQuickPaymentSellerId(sId || (sellers.length > 0 ? sellers[0].id : undefined));
    setQuickPaymentModalOpen(true);
  };

  const computedStats: DashboardStats = stats || {
    totalActiveDebt: (consignments || []).reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
    totalOverdueDebt: (consignments || [])
      .filter((c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now())
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
    totalInventoryValue: (items || []).reduce(
      (sum, i) => sum + (i.stockQuantity || 0) * (i.consignmentPrice || 0),
      0
    ),
    todayPayments: (payments || [])
      .filter((p) => new Date(p.date).toDateString() === new Date().toDateString())
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    activeConsignmentsCount: (consignments || []).filter((c) => (c.remainingAmount || 0) > 0).length,
    overdueConsignmentsCount: (consignments || []).filter(
      (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
    ).length,
    lowStockItemsCount: (items || []).filter(
      (i) => (i.stockQuantity || 0) <= (i.minStockThreshold || 0)
    ).length,
    totalSellersCount: (sellers || []).length,
    totalOutstandingDebt: (consignments || []).reduce((sum, c) => sum + (c.remainingAmount || 0), 0),
  };

  const overdueCount = (consignments || []).filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

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
      <PwaInstallPrompt
        forceOpen={isPwaModalOpen}
        onCloseForceOpen={() => setIsPwaModalOpen(false)}
      />

      {/* Top Header with Theme Switcher & Connection Status */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onNewHandover={() => triggerQuickHandover()}
        onNewPayment={() => triggerQuickPayment()}
        overdueCount={overdueCount}
        networkStatus={networkStatus}
        onOpenPwaInstall={() => setIsPwaModalOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} overdueCount={overdueCount} />

        {/* Main Workspace Canvas */}
        <main className="flex-1 w-full pb-20 md:pb-6 overflow-hidden">
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                stats={computedStats}
                sellers={sellers}
                consignments={consignments}
                payments={payments}
                items={items}
                darkMode={isDarkMode}
                onOpenHandover={() => triggerQuickHandover()}
                onOpenPayment={() => triggerQuickPayment()}
                onSelectConsignment={(c) => {
                  setSelectedConsignmentForView(c);
                  setActiveTab('consignments');
                }}
                onSelectSeller={(s) => {
                  setActiveTab('people');
                }}
                onGoToTab={(tab) => {
                  if (tab === 'sellers' || tab === 'staff') {
                    setActiveTab('people');
                  } else if (tab === 'payments' || tab === 'workshop' || tab === 'analytics') {
                    setActiveTab('finances');
                  } else if (tab === 'audit') {
                    setActiveTab('settings');
                  } else {
                    setActiveTab(tab);
                  }
                }}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryManager
                items={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onQuickHandoverItem={(item) => triggerQuickHandover()}
                categories={categories}
                onCreateCategory={handleCreateCategory}
              />
            )}

            {activeTab === 'consignments' && (
              <HandoverManager
                consignments={consignments}
                sellers={sellers}
                items={items}
                onSubmitHandover={handleSubmitHandover}
                onSubmitReturn={handleSubmitReturn}
                onRecordPaymentForSeller={(sellerId) => triggerQuickPayment(sellerId)}
                selectedConsignmentForView={selectedConsignmentForView}
                onClearSelectedConsignment={() => setSelectedConsignmentForView(null)}
                onQuickCreateSeller={handleAddSeller}
                onQuickCreateItem={handleAddItem}
              />
            )}

            {(activeTab === 'people' || activeTab === 'sellers' || activeTab === 'staff') && (
              <PeopleManager
                sellers={sellers}
                consignments={consignments}
                payments={payments}
                returns={returns}
                onAddSeller={handleAddSeller}
                onUpdateSeller={handleUpdateSeller}
                onDeleteSeller={handleDeleteSeller}
                onQuickHandover={(s) => triggerQuickHandover(s)}
                onQuickPayment={(s) => triggerQuickPayment(s)}
                onSelectConsignment={(c) => {
                  setSelectedConsignmentForView(c);
                  setActiveTab('consignments');
                }}
                owners={owners}
                staff={staffMembers}
                onUpdateOwners={handleUpdateOwners}
                onAddStaff={handleAddStaff}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
                initialSubTab={activeTab === 'staff' ? 'staff' : 'sellers'}
              />
            )}

            {(activeTab === 'finances' || activeTab === 'payments' || activeTab === 'workshop' || activeTab === 'analytics') && (
              <FinancesManager
                payments={payments}
                sellers={sellers}
                consignments={consignments}
                onSubmitPayment={handleSubmitPayment}
                preSelectedSellerId={quickPaymentSellerId}
                owners={owners}
                staff={staffMembers}
                totalActiveDebt={computedStats?.totalActiveDebt || 0}
                todayPayments={computedStats?.todayPayments || 0}
                stats={computedStats}
                items={items}
                initialSubTab={activeTab === 'workshop' ? 'workshop' : activeTab === 'analytics' ? 'reports' : 'payments'}
              />
            )}

            {(activeTab === 'settings' || activeTab === 'audit') && (
              <SettingsManager
                workshopInfo={workshopInfo}
                owners={owners}
                onSaveWorkshopInfo={(info) => setWorkshopInfo(info)}
                onSaveOwners={(o) => setOwners(o)}
                networkStatus={networkStatus}
                onOpenPwaInstall={() => setIsPwaModalOpen(true)}
                auditLogs={auditLogs}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} overdueCount={overdueCount} />

      {/* Global Quick Handover Modal with inline instant creation */}
      {quickHandoverModalOpen && (
        <NewHandoverModal
          isOpen={quickHandoverModalOpen}
          onClose={() => {
            setQuickHandoverModalOpen(false);
            setQuickHandoverSeller(null);
          }}
          sellers={sellers}
          items={items}
          preSelectedSeller={quickHandoverSeller}
          onSubmitHandover={handleSubmitHandover}
          onQuickCreateSeller={handleAddSeller}
          onQuickCreateItem={handleAddItem}
        />
      )}

      {/* Global Quick Payment Modal */}
      {quickPaymentModalOpen && (
        <NewPaymentModal
          isOpen={quickPaymentModalOpen}
          onClose={() => {
            setQuickPaymentModalOpen(false);
            setQuickPaymentSellerId(undefined);
          }}
          sellers={sellers}
          consignments={consignments}
          preSelectedSellerId={quickPaymentSellerId}
          onSubmitPayment={handleSubmitPayment}
        />
      )}
    </div>
  );
}
