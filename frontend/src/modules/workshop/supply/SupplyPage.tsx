import React, { useEffect, useState } from 'react';
import { ShoppingCart, Receipt, Tag, Truck, Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import type { Supplier, PurchaseOrder } from '@/types';
import { toPersianDigits, formatNumber } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';

type SupplyTab = 'suppliers' | 'orders' | 'receipts' | 'costs';

const badge = (count: number) =>
  count > 0 ? (
    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-rose-100 text-rose-700">
      {toPersianDigits(count)}
    </span>
  ) : null;

const LoadingRow: React.FC = () => <p className="text-xs text-stone-500">در حال بارگذیری...</p>;

export const SupplyPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SupplyTab>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: { id: SupplyTab; label: string; icon: React.ElementType }[] = [
    { id: 'suppliers', label: 'تأمین‌کنندگان', icon: Truck },
    { id: 'orders', label: 'سفارشات خرید', icon: ShoppingCart },
    { id: 'receipts', label: 'دریافت کالا', icon: Receipt },
    { id: 'costs', label: 'هزینه‌های حمل', icon: Tag },
  ];

  const pendingReceipts = orders.filter((o) => o.status === 'ordered' || o.status === 'partially_received');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Tab Switcher Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 dark:bg-black/40 border border-black/5 dark:border-white/5 w-fit max-w-full">
        {tabs.map((tab) => {
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
        <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black">تأمین‌کنندگان فعال</h3>
            {canManage && (
              <button
                onClick={() => navigate('/console/supply/suppliers/new')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>جدید</span>
              </button>
            )}
          </div>
          {loading ? (
            <LoadingRow />
          ) : (
            <div className="grid gap-1">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/console/supply/suppliers/${s.id}`)}
                >
                  <div className="text-right">
                    <p className="text-sm font-bold">{s.name}</p>
                    <p className="text-[10px] text-stone-500">{s.code}</p>
                  </div>
                  {s.is_active === false && badge(1)}
                </div>
              ))}
              {suppliers.length === 0 && <p className="text-xs text-stone-400">تأمین‌کننده‌ای یافت نشد</p>}
            </div>
          )}
        </div>
      )}

      {/* Purchase orders */}
      {activeTab === 'orders' && (
        <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black">سفارشات خرید</h3>
            {canManage && (
              <button
                onClick={() => navigate('/console/supply/purchase-orders/new')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>جدید</span>
              </button>
            )}
          </div>
          {loading ? (
            <LoadingRow />
          ) : (
            <div className="grid gap-1">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/console/supply/purchase-orders/${o.id}`)}
                >
                  <div className="text-right">
                    <p className="text-sm font-bold">{o.code}</p>
                    <p className="text-[10px] text-stone-500">{o.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{formatNumber(o.totalAmount)}</span>
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-xs text-stone-400">سفارش خرید یافت نشد</p>}
            </div>
          )}
        </div>
      )}

      {/* Receipts tab — orders awaiting receiving */}
      {activeTab === 'receipts' && (
        <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5">
          <h3 className="text-sm font-black mb-3">سفارشات نیازمند دریافت</h3>
          {loading ? (
            <LoadingRow />
          ) : pendingReceipts.length === 0 ? (
            <p className="text-xs text-stone-400">سفارشی برای دریافت وجود ندارد</p>
          ) : (
            <div className="grid gap-1">
              {pendingReceipts.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/console/supply/purchase-orders/${o.id}`)}
                >
                  <div className="text-right">
                    <p className="text-sm font-bold">{o.code}</p>
                    <p className="text-[10px] text-stone-500">{o.status}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/console/supply/purchase-orders/${o.id}#receive`);
                    }}
                    className="px-2 py-1 rounded-lg bg-brand hover:bg-brand-hover text-brand-on font-black text-xs transition-all"
                  >
                    دریافت
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Costs tab */}
      {activeTab === 'costs' && (
        <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5">
          <h3 className="text-sm font-black mb-3">هزینه‌های ثبت‌شده</h3>
          <p className="text-xs text-stone-400">
            برای مدیریت هزینه‌ها و هزینه واردات، وارد جزئیات سفارش خرید شوید.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplyPage;
