import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  X,
  Truck,
} from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier } from '@/types';
import type { SupplierPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierCard } from './SupplierCard';
import { SelectMenu } from '@/components/ui/select-menu';
import { Pagination } from '@/components/common/Pagination';

export const SuppliersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await supplyApi
          .listSuppliers({ limit: 100, search: searchQuery || undefined, city: cityFilter !== 'all' ? cityFilter : undefined, isActive: statusFilter !== 'all' ? statusFilter === 'active' : false })
          .catch(() => ({ rows: [], total: 0 }));
        if (!cancelled) {
          setSuppliers(res.rows);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [searchQuery, cityFilter, statusFilter]);


  // --- Derived data for filters ---
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    suppliers.forEach((s) => {
      if (s.city) cities.add(s.city);
    });
    return Array.from(cities).sort();
  }, [suppliers]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    suppliers.forEach((s) => {
      if (s.categories) {
        s.categories.forEach((c) => cats.add(c));
      }
    });
    return Array.from(cats).sort();
  }, [suppliers]);

  // --- Filtering ---
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesShop = s.shopName?.toLowerCase().includes(query);
        const matchesContact = s.contactPersons?.some((c) => c.name.toLowerCase().includes(query));
        const matchesCode = s.code?.toLowerCase().includes(query);
        if (!matchesShop && !matchesContact && !matchesCode) return false;
      }

      // City filter
      if (cityFilter !== 'all' && s.city !== cityFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && !(s.categories?.includes(categoryFilter))) return false;

      // Status filter
      if (statusFilter === 'active' && s.isActive === false) return false;
      if (statusFilter === 'inactive' && s.isActive !== false) return false;

      return true;
    });
  }, [suppliers, searchQuery, cityFilter, categoryFilter, statusFilter]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, cityFilter, categoryFilter, statusFilter]);

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  // --- CRUD handlers ---
  const handleCreateSupplier = async (data: SupplierPayload) => {
    setSaving(true);
    try {
      const created = await supplyApi.createSupplier(data);
      setSuppliers((prev) => [created, ...prev]);
      setSupplierModalOpen(false);
      toast.success(`تأمین‌کننده ${created.code} - ${created.shopName} ایجاد شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSupplier = async (data: SupplierPayload) => {
    if (!editingSupplier) return;
    setSaving(true);
    try {
      const updated = await supplyApi.updateSupplier(editingSupplier.id, data);
      setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? updated : s)));
      setSupplierModalOpen(false);
      setEditingSupplier(null);
      toast.success(`تأمین‌کننده ${updated.code} به‌روزرسانی شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`آیا از حذف تأمین‌کننده ${supplier.shopName} مطمئن هستید؟`)) return;
    try {
      await fetch(`/api/workshop/supply/suppliers/${supplier.id}`, { method: 'DELETE' });
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
      toast.success('تأمین‌کننده حذف شد');
    } catch {
      toast.error('خطا در حذف تأمین‌کننده');
    }
  };

  const toggleSupplierActive = async (supplier: Supplier) => {
    try {
      if (supplier.isActive === false) {
        const updated = await supplyApi.activateSupplier(supplier.id);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? updated : s)));
      } else {
        const updated = await supplyApi.deactivateSupplier(supplier.id);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? updated : s)));
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const activeCount = suppliers.filter((s) => s.isActive !== false).length;
  const inactiveCount = suppliers.length - activeCount;

  const clearFilters = () => {
    setSearchQuery('');
    setCityFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || cityFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6 text-stone-900 dark:text-white" dir="rtl">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand shadow-md shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
              تأمین‌کنندگان
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-gray-400 mt-1">
              {toPersianDigits(suppliers.length)} تأمین‌کننده ثبت شده —{' '}
              {toPersianDigits(activeCount)} فعال، {toPersianDigits(inactiveCount)} غیرفعال
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 self-stretch sm:self-auto justify-center"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>ثبت تأمین‌کننده جدید</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between shadow-md border border-black/5 dark:border-white/10">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام فروشگاه، کد، شخص تماس..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-brand outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* City Filter */}
          {availableCities.length > 0 && (
            <SelectMenu
              value={cityFilter}
              onChange={setCityFilter}
              options={[
                { value: 'all', label: 'همه شهرها' },
                ...availableCities.map((c) => ({ value: c, label: c })),
              ]}
              className="w-full sm:w-40"
              placeholder="شهر"
            />
          )}

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <SelectMenu
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'همه دسته‌بندی‌ها' },
                ...availableCategories.map((c) => ({ value: c, label: c })),
              ]}
              className="w-full sm:w-44"
              placeholder="دسته‌بندی"
            />
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-black/40 p-1 rounded-xl border border-black/5 dark:border-white/5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              همه ({toPersianDigits(suppliers.length)})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              فعال
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              غیرفعال
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-stone-500 hover:text-brand transition-colors flex items-center gap-1"
              title="پاک کردن فیلترها"
            >
              <X className="w-3 h-3" />
              <span>پاک کردن</span>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Suppliers Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl glass-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSuppliers.map((s) => (
            <SupplierCard
              key={s.id}
              supplier={s}
              canManage={canManage}
              onEdit={(supp) => { setEditingSupplier(supp); setSupplierModalOpen(true); }}
              onDelete={handleDeleteSupplier}
              onToggleActive={toggleSupplierActive}
            />
          ))}
          {paginatedSuppliers.length === 0 && !loading && !error && (
            <p className="text-xs text-stone-400 text-center py-10 col-span-full">
              {hasActiveFilters ? 'تأمین‌کننده‌ای با این فیلترها یافت نشد' : 'هنوز تأمین‌کننده‌ای ثبت نشده است'}
            </p>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredSuppliers.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={filteredSuppliers.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Supplier Form Modal */}
      {supplierModalOpen && (
        <SupplierFormModal
          isOpen={supplierModalOpen}
          onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
          onSave={editingSupplier ? handleEditSupplier : handleCreateSupplier}
          editSupplier={editingSupplier}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SuppliersPage;
