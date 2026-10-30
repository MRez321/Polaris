import React, { useEffect, useState } from 'react';
import { ShoppingCart, Receipt, Tag, Plus, Edit } from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier, PurchaseOrder } from '@/types';
import type { PurchaseOrderPayload } from '@/lib/api';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal';
import { SupplierFormModal } from './SupplierFormModal';

type SupplyOrdersTab = 'orders' | 'receipts' | 'costs';

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  partially_received: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  received: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'پیش‌نویس',
  ordered: 'سفارش داده شده',
  partially_received: 'جزئی دریافت شده',
  received: 'دریافت شده',
  cancelled: 'لغو شده',
};

const TABS: { id: SupplyOrdersTab; label: string; icon: React.ElementType }[] = [
  { id: 'orders', label: 'سفارشات خرید', icon: ShoppingCart },
  { id: 'receipts', label: 'دریافت کالا', icon: Receipt },
  { id: 'costs', label: 'هزینه‌های حمل', icon: Tag },
];

const renderStatusBadge = (status: string) => (
  <span
    className={`px-1.5 py-0.25 text-[9px] rounded-full font-bold ${STATUS_COLOR[status] || STATUS_COLOR.draft}`}
    title={STATUS_LABEL[status] || status}
  >
    {STATUS_LABEL[status] || status}
  </span>
);

/** SupplyOrdersPage — purchase order management as a standalone page view.
 *  Shows purchase orders, pending receipts, and costs. Uses inline modals for CRUD.
 */
export const SupplyOrdersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SupplyOrdersTab>('orders');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [createSupplierModalOpen, setCreateSupplierModalOpen] = useState(false);

  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [supRes, orderRes] = await Promise.all([
          supplyApi.listSuppliers({ limit: 100 }).catch(() => ({ rows: [] as Supplier[], total: 0 })),
          supplyApi.listOrders({ limit: 100 }).catch(() => ({ rows: [] as PurchaseOrder[], total: 0 })),
        ]);
        if (!cancelled) {
          setSuppliers(supRes.rows);
          setOrders(orderRes.rows);
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

  const pendingReceipts = orders.filter(
    (o) => o.status === 'ordered' || o.status === 'partially_received'
  );

  // --- CRUD handlers ---
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
      toast.success(`سفارش خرید ${updated.code} به‌روزرسانی شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const renderSupplierBadge = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return null;
    return (
      <span className="text-xs text-stone-400">
        {supplier.shopName}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-stone-900 dark:text-white" dir="rtl">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand shadow-md shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
              سفارشات خرید
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-gray-400 mt-1">
              {toPersianDigits(orders.length)} سفارش ثبت شده —{' '}
              {toPersianDigits(pendingReceipts.length)} در انتظار دریافت
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingOrder(null);
              setPoModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 self-stretch sm:self-auto justify-center"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>سفارش خرید جدید</span>
          </button>
        )}
      </div>

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

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-stone-900 dark:text-white">سفارشات خرید</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl glass-card animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {orders.map((o) => {
                const supplier = suppliers.find((s) => s.id === o.supplierId);
                return (
                  <div
                    key={o.id}
                    className="rounded-2xl glass-card p-3 sm:p-4 flex items-center justify-between gap-2 shadow-md"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                          {o.code}
                        </span>
                        {renderStatusBadge(o.status)}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                        <span>
                          {supplier ? `تأمین‌کننده: ${supplier.shopName}` : 'تأمین‌کننده: —'}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>{o.items?.length ?? 0} کالا</span>
                        <span className="text-stone-300">•</span>
                        <span className="font-mono" dir="ltr">
                          {formatToman(o.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {canManage && (
                        <button
                          onClick={() => { setEditingOrder(o); setPoModalOpen(true); }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-brand hover:bg-brand/10 transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                <div key={i} className="h-16 rounded-2xl glass-card animate-pulse" />
              ))}
            </div>
          ) : pendingReceipts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 dark:border-white/10 glass-card p-8 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30 text-stone-400" />
              <p className="text-xs text-stone-400">سفارشی برای دریافت وجود ندارد</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {pendingReceipts.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl glass-card p-3 sm:p-4 flex items-center justify-between gap-2 shadow-md"
                >
                  <div className="text-right min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                        {o.code}
                      </span>
                      {renderStatusBadge(o.status)}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      <span>{renderSupplierBadge(o.supplierId)}</span>
                      <span className="text-stone-300">•</span>
                      <span>{o.items?.length ?? 0} کالا</span>
                      <span className="text-stone-300">•</span>
                      <span className="font-mono" dir="ltr">{formatToman(o.totalAmount)}</span>
                    </div>
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
        <div className="rounded-3xl border border-dashed border-stone-200 dark:border-white/10 glass-card p-6 sm:p-8 text-center">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30 text-stone-400" />
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-2">هزینه‌های ثبت‌شده</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            هزینه‌ها به ازای هر سفارش خرید ثبت می‌شوند؛ برای مدیریت هزینه‌های
            حمل و واردات وارد جزئیات سفارش خرید شوید.
          </p>
        </div>
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
          onRequestAddSupplier={() => setCreateSupplierModalOpen(true)}
        />
      )}

      {/* --- Supplier Creation Modal (triggered from PO form) --- */}
      {createSupplierModalOpen && (
        <SupplierFormModal
          isOpen={createSupplierModalOpen}
          onClose={() => setCreateSupplierModalOpen(false)}
          onSave={async (data) => {
            setSaving(true);
            try {
              const created = await supplyApi.createSupplier(data);
              setSuppliers((prev) => [created, ...prev]);
              setCreateSupplierModalOpen(false);
              toast.success(`تأمین‌کننده ${created.code} - ${created.shopName} ایجاد شد`);
            } catch (e) {
              toast.error(getApiErrorMessage(e));
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SupplyOrdersPage;
