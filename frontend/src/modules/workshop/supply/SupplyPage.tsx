import React, { useEffect, useState } from 'react';
import { ShoppingCart, Receipt, Tag, Truck, Plus, Eye, Edit, Trash2, Check, X as XIcon, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier, PurchaseOrder, PurchaseOrderStatus } from '@/types';
import type { SupplierPayload, PurchaseOrderPayload } from '@/lib/api';
import { toPersianDigits, formatToman } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { SupplierFormModal } from './SupplierFormModal';
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal';

type SupplyTab = 'suppliers' | 'orders' | 'receipts' | 'costs';

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  partially_received: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  received: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'پیش‌نویس',
  ordered: 'سفارش داده شده',
  partially_received: 'جزئی دریافت شده',
  received: 'دریافت شده',
  cancelled: 'لغو شده',
};

const TABS: { id: SupplyTab; label: string; icon: React.ElementType }[] = [
  { id: 'suppliers', label: 'تأمین‌کنندگان', icon: Truck },
  { id: 'orders', label: 'سفارشات خرید', icon: ShoppingCart },
  { id: 'receipts', label: 'دریافت کالا', icon: Receipt },
  { id: 'costs', label: 'هزینه‌های حمل', icon: Tag },
];

/** Supply module — sophisticated supplier and purchase order management.
 *  Uses inline modals for CRUD (no separate route navigation). Mobile-first
 *  card-based list views with status badges and formatted amounts.
 */
export const SupplyPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SupplyTab>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sRes, oRes] = await Promise.all([
          supplyApi.listSuppliers({ limit: 100 }).catch(() => ({ rows: [], total: 0 })),
          supplyApi.listOrders({ limit: 100 }).catch(() => ({ rows: [], total: 0 })),
        ]);
        if (!cancelled) {
          setSuppliers(sRes.rows);
          setOrders(oRes.rows);
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

  const reload = () => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [sRes, oRes] = await Promise.all([
          supplyApi.listSuppliers({ limit: 100 }).catch(() => ({ rows: [], total: 0 })),
          supplyApi.listOrders({ limit: 100 }).catch(() => ({ rows: [], total: 0 })),
        ]);
        if (!cancelled) {
          setSuppliers(sRes.rows);
          setOrders(oRes.rows);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
  };

  // --- Supplier CRUD ---
  const handleCreateSupplier = async (data: SupplierPayload) => {
    setSaving(true);
    try {
      const created = await supplyApi.createSupplier(data);
      setSuppliers((prev) => [created, ...prev]);
      setSupplierModalOpen(false);
      toast.success(`تأمین‌کننده ${created.code} - ${created.name} ایجاد شد`);
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
    if (!confirm(`آیا از حذف تأمین‌کننده ${supplier.name} مطمئن هستید؟`)) return;
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
      if (supplier.is_active === false) {
        await supplyApi.activateSupplier(supplier.id);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_active: true } : s)));
      } else {
        await supplyApi.deactivateSupplier(supplier.id);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_active: false } : s)));
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  // --- Purchase Order CRUD ---
  const handleCreateOrder = async (data: PurchaseOrderPayload) => {
    setSaving(true);
    try {
      const created = await supplyApi.createOrder(data);
      setOrders((prev) => [created, ...prev]);
      setPoModalOpen(false);
      toast.success(`سفارش خرید ${created.code} ایجاد شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrder = async (data: PurchaseOrderPayload) => {
    if (!editingOrder) return;
    setSaving(true);
    try {
      const updated = await supplyApi.updateOrder(editingOrder.id, data);
      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updated : o)));
      setPoModalOpen(false);
      setEditingOrder(null);
      toast.success(`سفارش ${updated.code} به‌روزرسانی شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const pendingReceipts = orders.filter(
    (o) => o.status === 'ordered' || o.status === 'partially_received' || o.status === 'confirmed'
  );

  const activeSuppliers = suppliers.filter((s) => s.is_active !== false).length;
  const inactiveSuppliers = suppliers.length - activeSuppliers;

  // ---- Render helpers ----
  const renderStatusBadge = (status: string) => {
    const cls = STATUS_COLOR[status] ?? 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300';
    const label = STATUS_LABEL[status] ?? status;
    return (
      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 dark:bg-black/40 border border-black/5 dark:border-white/5 w-fit max-w-full">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-brand text-brand-on shadow-md font-black'
                  : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-brand-ink'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Suppliers */}
      {activeTab === 'suppliers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-stone-900 dark:text-white">تأمین‌کنندگان</h3>
              <div className="flex gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {toPersianDigits(activeSuppliers)} فعال
                </span>
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300">
                  {toPersianDigits(inactiveSuppliers)} غیرفعال
                </span>
              </div>
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

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-stone-200 dark:border-white/5 bg-white dark:bg-[#16161a] p-3 sm:p-4 flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="text-right min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-stone-900 dark:text-white truncate">{s.name}</p>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500" dir="ltr">
                        {s.code}
                      </span>
                      {s.is_active === false && (
                        <span className="px-1.5 py-0.25 text-[9px] rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          غیرفعال
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                      {s.contactPerson && <span>تماس: {s.contactPerson}</span>}
                      {s.phone && <span dir="ltr">{s.phone}</span>}
                      {s.email && <span dir="ltr">{s.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canManage && (
                      <>
                        <button
                          onClick={() => { setEditingSupplier(s); setSupplierModalOpen(true); }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-brand hover:bg-brand/10 transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleSupplierActive(s)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.is_active === false
                              ? 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                              : 'text-stone-500 hover:text-rose-600 hover:bg-rose-500/10'
                          }`}
                          title={s.is_active === false ? 'فعال کنید' : 'غیرفعال کنید'}
                        >
                          {s.is_active === false ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && !loading && (
                <p className="text-xs text-stone-400 text-center py-6">تأمین‌کننده‌ای یافت نشد</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 dark:text-white">سفارشات خرید</h3>
            {canManage && (
              <button
                onClick={() => { setEditingOrder(null); setPoModalOpen(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                سفارش جدید
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {orders.map((o) => {
                const supplier = suppliers.find((s) => s.id === o.supplierId);
                return (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-stone-200 dark:border-white/5 bg-white dark:bg-[#16161a] p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                          {o.code}
                        </span>
                        {renderStatusBadge(o.status)}
                      </div>
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                        {formatToman(o.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        تأمین‌کننده: <span className="font-medium text-stone-600 dark:text-stone-300">
                          {supplier?.name ?? o.supplierId?.slice(0, 8) ?? '—'}
                        </span>
                        {' · '}
                        {o.items?.length ?? 0} کالا
                      </div>
                      <div className="flex gap-1">
                        {canManage && (
                          <button
                            onClick={() => { setEditingOrder(o); setPoModalOpen(true); }}
                            className="p-1 rounded-lg text-stone-500 hover:text-brand hover:bg-brand/10 transition-colors"
                            title="ویرایش"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 && !loading && (
                <p className="text-xs text-stone-400 text-center py-6">سفارش خریدی یافت نشد</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Receipts — orders awaiting receiving */}
      {activeTab === 'receipts' && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-stone-900 dark:text-white">سفارشات نیازمند دریافت</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : pendingReceipts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-8 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30 text-stone-400" />
              <p className="text-xs text-stone-400">سفارشی برای دریافت وجود ندارد</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {pendingReceipts.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-stone-200 dark:border-white/5 bg-white dark:bg-[#16161a] p-3 sm:p-4 flex items-center justify-between gap-2"
                >
                  <div className="text-right min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                        {o.code}
                      </span>
                      {renderStatusBadge(o.status)}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {o.items?.length ?? 0} کالا · {formatToman(o.totalAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingOrder(o); setPoModalOpen(true); }}
                    className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all shrink-0"
                  >
                    دریافت
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Costs — managed within purchase order detail */}
      {activeTab === 'costs' && (
        <div className="rounded-3xl border border-dashed border-stone-200 dark:border-white/10 bg-white dark:bg-[#16161a] p-6 sm:p-8 text-center">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30 text-stone-400" />
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-2">هزینه‌های ثبت‌شده</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            هزینه‌ها به ازای هر سفارش خرید ثبت می‌شوند؛ برای مدیریت هزینه‌های
            حمل و واردات وارد جزئیات سفارش خرید شوید.
          </p>
        </div>
      )}

      {/* --- Supplier Form Modal --- */}
      {supplierModalOpen && (
        <SupplierFormModal
          isOpen={supplierModalOpen}
          onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
          onSave={editingSupplier ? handleEditSupplier : handleCreateSupplier}
          editSupplier={editingSupplier}
          saving={saving}
        />
      )}

      {/* --- Purchase Order Form Modal --- */}
      {poModalOpen && (
        <PurchaseOrderFormModal
          isOpen={poModalOpen}
          onClose={() => { setPoModalOpen(false); setEditingOrder(null); }}
          onSave={editingOrder ? handleEditOrder : handleCreateOrder}
          editOrder={editingOrder}
          suppliers={suppliers}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SupplyPage;
