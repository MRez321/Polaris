import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier } from '@/types';
import type { SupplierPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierCard } from './SupplierCard';
import { SelectMenu } from '@/components/ui/select-menu';

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

  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await supplyApi.listSuppliers({ limit: 200 }).catch(() => ({ rows: [], total: 0 }));
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
  }, []);

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
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900 dark:text-white">تأمین‌کنندگان</h2>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            {toPersianDigits(suppliers.length)} تأمین‌کننده ثبت شده — {toPersianDigits(activeCount)} فعال، {toPersianDigits(inactiveCount)} غیرفعال
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            تأمین‌کننده جدید
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#16161a] rounded-2xl p-3 border border-stone-200 dark:border-white/5">
        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام فروشگاه، کد یا تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-8 pl-2 py-1.5 rounded-lg bg-stone-100 dark:bg-black/40 text-xs text-stone-800 dark:text-gray-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* City Filter */}
        {availableCities.length > 0 && (
          <SelectMenu
            value={cityFilter}
            onChange={setCityFilter}
            options={[
              { value: 'all', label: 'همه شهرها' },
              ...availableCities.map((c) => ({ value: c, label: c })),
            ]}
            className="w-32"
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
            className="w-36"
          />
        )}

        {/* Status Filter */}
        <SelectMenu
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
          options={[
            { value: 'all', label: 'همه وضعیت‌ها' },
            { value: 'active', label: 'فعال' },
            { value: 'inactive', label: 'غیرفعال' },
          ]}
          className="w-32"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-brand transition-colors"
            title="پاک کردن فیلترها"
          >
            <X className="w-3 h-3" />
            پاک کردن
          </button>
        )}
      </div>

      {/* Suppliers Grid */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <SupplierCard
              key={s.id}
              supplier={s}
              canManage={canManage}
              onEdit={(supp) => { setEditingSupplier(supp); setSupplierModalOpen(true); }}
              onDelete={handleDeleteSupplier}
              onToggleActive={toggleSupplierActive}
            />
          ))}
          {filteredSuppliers.length === 0 && !loading && !error && (
            <p className="text-xs text-stone-400 text-center py-10 col-span-full">
              {hasActiveFilters ? 'تأمین‌کننده‌ای با این فیلترها یافت نشد' : 'تأمین‌کننده‌ای یافت نشد'}
            </p>
          )}
        </div>
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
