import axios from 'axios';
import type {
  AuditLog,
  BlogPost,
  BlogPostStatus,
  BlogSection,
  CompanyBranding,
  Consignment,
  ConsignmentReturn,
  DashboardStats,
  GarmentItem,
  Order,
  OrderPaymentMethod,
  OrderStatus,
  Owner,
  PaymentRecord,
  ProfitShareDistribution,
  PublicCatalogItem,
  PublicCompanyInfo,
  Seller,
  StaffMember,
  WorkshopExpense,
  WebsiteSettings,
} from '@/types';

/**
 * Central HTTP client.
 * In dev, `/api` is proxied by Vite to the backend (see vite.config.ts).
 * In production, the backend serves the built frontend on the same origin
 * (single domain, no API subdomain), so the relative base works as-is.
 * VITE_API_URL can still override for split-origin setups.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  headers: { 'Content-Type': 'application/json' },
});

export function getApiErrorMessage(err: unknown, fallback = 'خطا در ارتباط با سرور'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  return fallback;
}

// --- Health ---
export const healthApi = {
  check: () => api.get('/api/health').then((r) => r.data),
};

// --- Dashboard ---
export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/api/dashboard/stats').then((r) => r.data),
};

// --- Items & Categories ---
export const itemsApi = {
  list: () => api.get<GarmentItem[]>('/api/items').then((r) => r.data),
  create: (data: Partial<GarmentItem>) => api.post<GarmentItem>('/api/items', data).then((r) => r.data),
  update: (id: string, data: Partial<GarmentItem>) =>
    api.put<GarmentItem>(`/api/items/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/items/${id}`).then((r) => r.data),
};

export const categoriesApi = {
  list: () => api.get<{ id: string; label: string }[]>('/api/categories').then((r) => r.data),
  create: (label: string) =>
    api.post<{ id: string; label: string }>('/api/categories', { label }).then((r) => r.data),
};

// --- Sellers ---
export const sellersApi = {
  list: () => api.get<Seller[]>('/api/sellers').then((r) => r.data),
  get: (id: string) => api.get<Seller>(`/api/sellers/${id}`).then((r) => r.data),
  create: (data: Partial<Seller>) => api.post<Seller>('/api/sellers', data).then((r) => r.data),
  update: (id: string, data: Partial<Seller>) =>
    api.put<Seller>(`/api/sellers/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/sellers/${id}`).then((r) => r.data),
};

// --- Consignments (Handovers) ---
export interface HandoverPayload {
  sellerId: string;
  dueDate: string;
  notes?: string;
  itemsList: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    selectedSize?: string;
    selectedColor?: string;
  }[];
}

/**
 * One return line. Matches a consignment line by itemId + optional size/color
 * variant, so two lines of the same item with different sizes stay distinct.
 */
export interface ReturnLinePayload {
  itemId: string;
  quantity: number; // must be > 0
  condition: 'healthy' | 'damaged';
  reason?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface ReturnPayload {
  consignmentId: string;
  returnItems: ReturnLinePayload[];
  notes?: string;
}

export const consignmentsApi = {
  list: () => api.get<Consignment[]>('/api/consignments').then((r) => r.data),
  create: (data: HandoverPayload) => api.post<Consignment>('/api/consignments', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/consignments/${id}`).then((r) => r.data),
  submitReturn: (data: ReturnPayload) =>
    api
      .post<{ message: string; returnRecord: ConsignmentReturn; updatedConsignment: Consignment }>(
        '/api/consignments/return',
        data
      )
      .then((r) => r.data),
};

// --- Returns ---
export const returnsApi = {
  list: () => api.get<ConsignmentReturn[]>('/api/consignments/returns').then((r) => r.data),
};

// --- Payments ---
export interface PaymentPayload {
  sellerId: string;

  amount: number;
  paymentMethod: string;
  trackingNumber?: string;
  notes?: string;
}

export const paymentsApi = {
  list: () => api.get<PaymentRecord[]>('/api/payments').then((r) => r.data),
  create: (data: PaymentPayload) => api.post<PaymentRecord>('/api/payments', data).then((r) => r.data),
};

// --- Staff & Owners ---
export const staffApi = {
  list: () => api.get<StaffMember[]>('/api/staff').then((r) => r.data),
  create: (data: Partial<StaffMember>) => api.post<StaffMember>('/api/staff', data).then((r) => r.data),
  update: (id: string, data: Partial<StaffMember>) =>
    api.put<StaffMember>(`/api/staff/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/staff/${id}`).then((r) => r.data),
};

export const ownersApi = {
  list: () => api.get<Owner[]>('/api/owners').then((r) => r.data),
  updateAll: (owners: Owner[]) => api.put('/api/owners', { owners }).then((r) => r.data),
};

// --- Workshop Expenses & Profit Distribution ---
export const expensesApi = {
  list: () => api.get<WorkshopExpense[]>('/api/expenses').then((r) => r.data),
  create: (data: Partial<WorkshopExpense>) =>
    api.post<WorkshopExpense>('/api/expenses', data).then((r) => r.data),
  update: (id: string, data: Partial<WorkshopExpense>) =>
    api.put<WorkshopExpense>(`/api/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/expenses/${id}`).then((r) => r.data),
};

export const profitApi = {
  list: () => api.get<ProfitShareDistribution[]>('/api/profit-distribution').then((r) => r.data),
  create: (data: Partial<ProfitShareDistribution>) =>
    api.post<ProfitShareDistribution>('/api/profit-distribution', data).then((r) => r.data),
};

// --- Trash / Recycle Bin ---
export interface TrashData {
  items: GarmentItem[];
  sellers: Seller[];
  staff: StaffMember[];
  expenses: WorkshopExpense[];
  consignments: Consignment[];
}

export type TrashEntityType = 'item' | 'seller' | 'staff' | 'expense' | 'consignment';

export const trashApi = {
  list: () => api.get<TrashData>('/api/trash').then((r) => r.data),
  restore: (type: TrashEntityType, id: string) =>
    api.post(`/api/trash/restore/${type}/${id}`).then((r) => r.data),
  editAndRestore: (type: TrashEntityType, id: string, data: Record<string, unknown>) =>
    api.put(`/api/trash/edit-and-restore/${type}/${id}`, data).then((r) => r.data),
  permanentDelete: (type: TrashEntityType, id: string) =>
    api.delete(`/api/trash/permanent/${type}/${id}`).then((r) => r.data),
};

// --- Company Branding ---
export const companyApi = {
  get: () => api.get<CompanyBranding>('/api/company').then((r) => r.data),
  update: (data: Partial<CompanyBranding>) => api.put<CompanyBranding>('/api/company', data).then((r) => r.data),
};

// --- Public Website Settings ---
export const websiteApi = {
  get: () => api.get<WebsiteSettings>('/api/website/settings').then((r) => r.data),
  update: (data: Partial<WebsiteSettings>) =>
    api.put<WebsiteSettings>('/api/website/settings', data).then((r) => r.data),
};

// --- Audit Logs ---
export const auditApi = {
  list: (limit = 20, offset = 0) =>
    api
      .get('/api/audit-logs', { params: { limit, offset } })
      .then((r) => r.data as { logs: AuditLog[]; total: number }),
};

// --- Public Storefront ---
// Anonymous-readable catalog + brand info for the marketing site.
// The backend filters these responses to marketing-safe fields only.
export const publicApi = {
  items: () => api.get<PublicCatalogItem[]>('/api/public/items').then((r) => r.data),
  categories: () =>
    api.get<{ id: string; label: string }[]>('/api/public/categories').then((r) => r.data),
  company: () => api.get<PublicCompanyInfo>('/api/public/company').then((r) => r.data),
  blog: {
    list: () => api.get<BlogPost[]>('/api/public/blog').then((r) => r.data),
    bySlug: (slug: string) => api.get<BlogPost>(`/api/public/blog/${slug}`).then((r) => r.data),
  },
};

// --- Blog CMS (admin + author) ---
export interface BlogPostPayload {
  slug: string;
  title: string;
  excerpt: string;
  image?: string;
  imageAlt?: string;
  date?: string;
  readTime?: string;
  tags?: string[];
  body: BlogSection[];
  status?: BlogPostStatus;
}

export const blogApi = {
  list: () => api.get<BlogPost[]>('/api/blog').then((r) => r.data),
  create: (data: BlogPostPayload) => api.post<BlogPost>('/api/blog', data).then((r) => r.data),
  update: (id: string, data: Partial<BlogPostPayload>) =>
    api.put<BlogPost>(`/api/blog/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete<{ message: string }>(`/api/blog/${id}`).then((r) => r.data),
};

// --- Customer Orders ---
export interface OrderPayload {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  paymentMethod: OrderPaymentMethod;
  lines: { itemId: string; quantity: number; size?: string; color?: string }[];
}

export const ordersApi = {
  create: (data: OrderPayload) => api.post<Order>('/api/orders', data).then((r) => r.data),
  mine: () => api.get<Order[]>('/api/orders/mine').then((r) => r.data),
  // Admin
  all: () => api.get<Order[]>('/api/orders').then((r) => r.data),
  updateStatus: (id: string, status: OrderStatus) =>
    api.put<Order>(`/api/orders/${id}`, { status }).then((r) => r.data),
};
