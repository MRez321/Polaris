import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Users, Plus, Edit2, Trash2, Search, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types';
import { getApiErrorMessage, customersApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CustomerFormModal } from '../components/CustomerFormModal';

const CUSTOMER_STATUS_LABELS = {
  active: 'فعال',
  inactive: 'غیرفعال',
};

/** Admin customer management: list, view, create, edit customers with credit/debt. */
export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuth();
  const canManage = hasPermission('customers.manage');

  const load = useCallback(async () => {
    try {
      const data = await customersApi.list();
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useCallback(() => {
    if (!customers) return [];
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone ?? '').toLowerCase().includes(term) ||
        (c.code ?? '').toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term),
    );
  }, [customers, searchTerm]);

  const handleToggleActive = async (customer: Customer) => {
    if (!canManage) return;
    try {
      await customersApi.update(customer.id, { isActive: !customer.isActive });
      setCustomers((prev) =>
        (prev ?? []).map((c) =>
          c.id === customer.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
      toast.success(
        `${customer.name} وضعیت‌اش به ${customer.isActive ? 'غیرفعال' : 'فعال'} تغییر یافت`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`آیا از حذف مشتری ${customer.name} مطمئن هستید؟`)) return;
    try {
      await customersApi.update(customer.id, { isActive: false });
      setCustomers((prev) => (prev ?? []).filter((c) => c.id !== customer.id));
      toast.success(`مشتری ${customer.name} حذف شد`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleSaved = (customer: Customer) => {
    if (editingCustomer) {
      setCustomers((prev) =>
        (prev ?? []).map((c) => (c.id === customer.id ? customer : c)),
      );
    } else {
      setCustomers((prev) => (prev ? [customer, ...prev] : [customer]));
    }
  };

  const activeCount = customers?.filter((c) => c.isActive).length ?? 0;
  const inactiveCount = customers ? customers.length - activeCount : 0;
  const totalDebt = customers?.reduce((sum, c) => sum + (c.currentDebt ?? 0), 0) ?? 0;
  const list = filtered();

  if (!customers) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">مشتریان</h1>
        </div>
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">کد</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">نام</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">تلفیحی</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">بدهی</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-stone-200 dark:border-stone-700">
                  <td className="py-2.5 px-3" colSpan={5}>
                    <div className="h-4 rounded bg-stone-100 dark:bg-stone-700 animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button onClick={load} className="mr-2 underline">
          <RefreshCw className="w-4 h-4 inline" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-stone-500" />
          <h1 className="text-xl font-bold">مشتریان</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
              className="px-3 py-1.5 text-xs font-medium bg-brand text-brand-on rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              مشتری جدید
            </button>
          )}
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {toPersianDigits(activeCount)} فعال
        </span>
        <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300">
          {toPersianDigits(inactiveCount)} غیرفعال
        </span>
        <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          مجموع بدهی: {toPersianDigits(totalDebt.toLocaleString('fa-IR'))} تومان
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="جستجو در مشتریان..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>مشتری یافت نشد</p>
        </div>
      ) : (
        <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">کد</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">نام</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">تلفیحی</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">بدهی</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">اعتبار</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">سفارشات</th>
                <th className="text-right py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">وضعیت</th>
                {canManage && (
                  <th className="text-center py-2.5 px-3 font-medium text-stone-600 dark:text-stone-400">عملیات</th>
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/30"
                >
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {customer.code ? toPersianDigits(customer.code) : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{customer.name}</td>
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {toPersianDigits(customer.phone ?? '-')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={cn(
                        'font-medium',
                        (customer.currentDebt ?? 0) > 0
                          ? 'text-red-600'
                          : 'text-green-600 dark:text-green-400',
                      )}
                    >
                      {toPersianDigits((customer.currentDebt ?? 0).toLocaleString('fa-IR'))} تومان
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {toPersianDigits((customer.creditLimit ?? 0).toLocaleString('fa-IR'))} تومان
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                    {toPersianDigits(customer.orderCount ?? 0)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        customer.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
                      )}
                    >
                      {customer.isActive
                        ? CUSTOMER_STATUS_LABELS.active
                        : CUSTOMER_STATUS_LABELS.inactive}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditingCustomer(customer); setModalOpen(true); }}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(customer)}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title={customer.isActive ? 'غیرفعال کنید' : 'فعال کنید'}
                        >
                          {customer.isActive ? (
                            <Edit2 className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
        onSaved={handleSaved}
        editCustomer={editingCustomer}
        saving={saving}
        onSavingChange={setSaving}
      />
    </div>
  );
};

export default CustomersPage;
