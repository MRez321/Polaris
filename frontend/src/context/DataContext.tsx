import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type {
  AuditLog,
  Consignment,
  ConsignmentReturn,
  DashboardStats,
  GarmentItem,
  Owner,
  PaymentRecord,
  Seller,
  StaffMember,
  WorkshopInfo,
} from '@/types';
import {
  auditApi,
  categoriesApi,
  consignmentsApi,
  dashboardApi,
  getApiErrorMessage,
  itemsApi,
  ownersApi,
  paymentsApi,
  sellersApi,
  staffApi,
  type HandoverPayload,
  type PaymentPayload,
  type ReturnPayload,
} from '@/lib/api';

interface DataContextValue {
  isLoading: boolean;
  stats: DashboardStats | null;
  items: GarmentItem[];
  sellers: Seller[];
  consignments: Consignment[];
  payments: PaymentRecord[];
  returns: ConsignmentReturn[];
  staffMembers: StaffMember[];
  owners: Owner[];
  auditLogs: AuditLog[];
  categories: { id: string; label: string }[];
  workshopInfo: WorkshopInfo;
  setWorkshopInfo: (info: WorkshopInfo) => void;

  fetchData: () => Promise<void>;

  // Inventory
  handleAddItem: (itemData: Partial<GarmentItem>) => Promise<void>;
  handleUpdateItem: (id: string, itemData: Partial<GarmentItem>) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleCreateCategory: (label: string) => Promise<void>;

  // Sellers
  handleAddSeller: (sellerData: Partial<Seller>) => Promise<void>;
  handleUpdateSeller: (id: string, sellerData: Partial<Seller>) => Promise<void>;
  handleDeleteSeller: (id: string) => Promise<void>;

  // Consignments & Returns
  handleSubmitHandover: (handoverData: HandoverPayload) => Promise<void>;
  handleSubmitReturn: (returnData: ReturnPayload) => Promise<void>;

  // Payments
  handleSubmitPayment: (paymentData: PaymentPayload) => Promise<void>;

  // Staff & Owners
  handleAddStaff: (staffData: Partial<StaffMember>) => Promise<void>;
  handleUpdateStaff: (id: string, staffData: Partial<StaffMember>) => Promise<void>;
  handleDeleteStaff: (id: string) => Promise<void>;
  handleUpdateOwners: (newOwners: Owner[]) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  { id: 'coats_jackets', label: 'کت، کاپشن و پالتو' },
  { id: 'pants', label: 'شلوار (کتان، جین، اسلش)' },
  { id: 'shirts', label: 'پیراهن مردانه' },
  { id: 'women_clothing', label: 'مانتو و پوشاک بانوان' },
  { id: 'men_clothing', label: 'هودی، تیشرت و اسپرت' },
  { id: 'traditional', label: 'پوشاک سنتی و مجلسی' },
  { id: 'fabrics', label: 'طاقه پارچه و ملزومات دوخت' },
];

const DEFAULT_WORKSHOP_INFO: WorkshopInfo = {
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
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<GarmentItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [returns, setReturns] = useState<ConsignmentReturn[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(DEFAULT_CATEGORIES);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>(DEFAULT_WORKSHOP_INFO);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
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
        dashboardApi.stats().catch(() => null),
        itemsApi.list().catch(() => []),
        sellersApi.list().catch(() => []),
        consignmentsApi.list().catch(() => []),
        paymentsApi.list().catch(() => []),
        staffApi.list().catch(() => []),
        ownersApi.list().catch(() => []),
        auditApi.list().catch(() => []),
        categoriesApi.list().catch(() => []),
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Categories ---
  const handleCreateCategory = useCallback(async (categoryLabel: string) => {
    try {
      const newCat = await categoriesApi.create(categoryLabel);
      setCategories((prev) => [...prev, newCat]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در ایجاد دسته‌بندی'));
    }
  }, []);

  // --- Inventory ---
  const handleAddItem = useCallback(
    async (itemData: Partial<GarmentItem>) => {
      try {
        const newItem = await itemsApi.create(itemData);
        setItems((prev) => [newItem, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ایجاد کالا'));
      }
    },
    [fetchData]
  );

  const handleUpdateItem = useCallback(
    async (id: string, itemData: Partial<GarmentItem>) => {
      try {
        const updated = await itemsApi.update(id, itemData);
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در به‌روزرسانی کالا'));
      }
    },
    [fetchData]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      try {
        await itemsApi.remove(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در حذف کالا'));
      }
    },
    [fetchData]
  );

  // --- Sellers ---
  const handleAddSeller = useCallback(
    async (sellerData: Partial<Seller>) => {
      try {
        const newSeller = await sellersApi.create(sellerData);
        setSellers((prev) => [newSeller, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ایجاد فروشنده'));
      }
    },
    [fetchData]
  );

  const handleUpdateSeller = useCallback(
    async (id: string, sellerData: Partial<Seller>) => {
      try {
        const updated = await sellersApi.update(id, sellerData);
        setSellers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در به‌روزرسانی فروشنده'));
      }
    },
    [fetchData]
  );

  const handleDeleteSeller = useCallback(
    async (id: string) => {
      try {
        await sellersApi.remove(id);
        setSellers((prev) => prev.filter((s) => s.id !== id));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در حذف فروشنده'));
      }
    },
    [fetchData]
  );

  // --- Consignments (Handovers) ---
  const handleSubmitHandover = useCallback(
    async (handoverData: HandoverPayload) => {
      try {
        const newConsignment = await consignmentsApi.create(handoverData);
        setConsignments((prev) => [newConsignment, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ثبت واگذاری امانی'));
      }
    },
    [fetchData]
  );

  // --- Returns ---
  const handleSubmitReturn = useCallback(
    async (returnData: ReturnPayload) => {
      try {
        const result = await consignmentsApi.submitReturn(returnData);
        setReturns((prev) => [result.returnRecord, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ثبت مرجوعی'));
      }
    },
    [fetchData]
  );

  // --- Payments ---
  const handleSubmitPayment = useCallback(
    async (paymentData: PaymentPayload) => {
      try {
        const newPayment = await paymentsApi.create(paymentData);
        setPayments((prev) => [newPayment, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ثبت دریافتی'));
      }
    },
    [fetchData]
  );

  // --- Staff ---
  const handleAddStaff = useCallback(
    async (staffData: Partial<StaffMember>) => {
      try {
        const newStf = await staffApi.create(staffData);
        setStaffMembers((prev) => [newStf, ...prev]);
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در ایجاد پرسنل'));
      }
    },
    [fetchData]
  );

  const handleUpdateStaff = useCallback(
    async (id: string, staffData: Partial<StaffMember>) => {
      try {
        const updated = await staffApi.update(id, staffData);
        setStaffMembers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در به‌روزرسانی پرسنل'));
      }
    },
    [fetchData]
  );

  const handleDeleteStaff = useCallback(
    async (id: string) => {
      try {
        await staffApi.remove(id);
        setStaffMembers((prev) => prev.filter((s) => s.id !== id));
        fetchData();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'خطا در حذف پرسنل'));
      }
    },
    [fetchData]
  );

  // --- Owners ---
  const handleUpdateOwners = useCallback(async (newOwners: Owner[]) => {
    try {
      await ownersApi.updateAll(newOwners);
      setOwners(newOwners);
    } catch (err) {
      // Keep optimistic local update even if server sync fails
      setOwners(newOwners);
      toast.error(getApiErrorMessage(err, 'خطا در ذخیره صاحبان کارگاه'));
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        isLoading,
        stats,
        items,
        sellers,
        consignments,
        payments,
        returns,
        staffMembers,
        owners,
        auditLogs,
        categories,
        workshopInfo,
        setWorkshopInfo,
        fetchData,
        handleAddItem,
        handleUpdateItem,
        handleDeleteItem,
        handleCreateCategory,
        handleAddSeller,
        handleUpdateSeller,
        handleDeleteSeller,
        handleSubmitHandover,
        handleSubmitReturn,
        handleSubmitPayment,
        handleAddStaff,
        handleUpdateStaff,
        handleDeleteStaff,
        handleUpdateOwners,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
