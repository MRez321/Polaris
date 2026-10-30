import React, { useEffect, useState } from 'react';
import { ShoppingCart, Receipt, Tag, Plus, Edit } from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier, PurchaseOrder } from '@/types';
import type { PurchaseOrderPayload } from '@/lib/api';
import { formatToman } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal';

type SupplyOrdersTab = 'orders' | 'receipts' | 'costs';

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

const TABS: { id: SupplyOrdersTab; label: string; icon: React.ElementType }[] = [
  { id: 'orders', label: 'سفارشات خرید', icon: ShoppingCart },
  { id: 'receipts', label: 'دریافت کالا', icon: Receipt },
  { id: 'costs', label: 'هزینه‌های حمل', icon: Tag },
];

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
    (o) => o.status === 'ordered' || o.status === 'partially_received',
  );

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
                          {supplier?.shopName ?? o.supplierId?.slice(0, 8) ?? '—'}
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

export default SupplyOrdersPage;
