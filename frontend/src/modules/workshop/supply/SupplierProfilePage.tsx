import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Phone,
  MapPin,
  Edit2,
  Calendar,
  ShoppingCart,
  Receipt,
  Tag,
  History,
  Truck,
} from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { formatToman, toJalaliDate, toPersianDigits } from '@/utils/persian';
import type { Supplier, PurchaseOrder, PurchaseReceipt, SupplyCost } from '@/types';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { SupplierFormModal } from './SupplierFormModal';
import type { SupplierPayload } from '@/lib/api';

/* ---------------------------------- StatBox ----------------------------------- */

const StatBox: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <div className={`p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1 ${className}`}>
    <span className="text-[10px] text-stone-500 dark:text-gray-400 block font-medium">{label}</span>
    <div className="font-black text-sm font-mono text-stone-800 dark:text-gray-300 break-all">
      {children}
    </div>
  </div>
);

/* ---------------------------------- Timeline ---------------------------------- */

type TimelineEntry = {
  id: string;
  at: number;
  title: string;
  description?: string;
  amount?: number;
  icon: React.ElementType;
  iconColor: string;
};

const safeTime = (value: string | number | Date | undefined): number => {
  const t = new Date(value ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/* --------------------------------- the page ---------------------------------- */

export const SupplierProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<Record<string, PurchaseReceipt[]>>({});
  const [costs, setCosts] = useState<Record<string, SupplyCost[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supplierRes = await supplyApi
          .getSupplierDetail(id ?? '')
          .catch(() => null);

        const ordersRes = await supplyApi
          .listOrders({ supplierId: id ?? '' })
          .catch(() => ({ rows: [] }));

        if (!cancelled) {
          setSupplier(supplierRes || null);
          setOrders(ordersRes.rows);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch receipts and costs for each order
  useEffect(() => {
    if (!supplier?.id || !orders.length) return;

    const orderIds = orders.map((o) => o.id);
    let cancelled = false;

    async function loadDetails() {
      const receiptsMap: Record<string, PurchaseReceipt[]> = {};
      const costsMap: Record<string, SupplyCost[]> = {};

      await Promise.all(
        orderIds.map(async (orderId) => {
          const [rRes, cRes] = await Promise.all([
            supplyApi.listReceipts(orderId).catch(() => []),
            supplyApi.listCosts(orderId).catch(() => []),
          ]);
          receiptsMap[orderId] = rRes;
          costsMap[orderId] = cRes;
        })
      );

      if (!cancelled) {
        setReceipts(receiptsMap);
        setCosts(costsMap);
      }
    }
    void loadDetails();
    return () => { cancelled = true; };
  }, [supplier?.id, orders]);

  // Stats
  const totalPurchases = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalReceived = orders
    .filter((o) => o.status === 'received' || o.status === 'partially_received')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCosts = Object.values(costs).flat().reduce((sum, c) => sum + (c.amount || 0), 0);
  const orderCount = orders.length;

  // Timeline entries (purchase orders + receipts + costs)
  const timelineEntries: TimelineEntry[] = useMemo(() => {
    const entries: TimelineEntry[] = [];

    orders.forEach((o) => {
      entries.push({
        id: `order-${o.id}`,
        at: safeTime(o.createdAt),
        title: `${o.code} — سفارش خرید`,
        description: `${o.items?.length ?? 0} کالا · ${formatToman(o.totalAmount || 0)}`,
        amount: o.totalAmount,
        icon: ShoppingCart,
        iconColor: 'text-sky-600',
      });

      const orderReceipts = receipts[o.id] || [];
      orderReceipts.forEach((r) => {
        entries.push({
          id: `receipt-${r.id}`,
          at: safeTime(r.receivedDate),
          title: `${r.code || 'دریافت'} — دریافت کالا`,
          description: `${r.items?.length ?? 0} کالا دریافت شد`,
          icon: Receipt,
          iconColor: 'text-emerald-600',
        });
      });

      const orderCosts = costs[o.id] || [];
      orderCosts.forEach((c) => {
        entries.push({
          id: `cost-${c.id}`,
          at: safeTime(c.costDate),
          title: `${c.description || 'هزینه'} — ${c.costType}`,
          description: c.notes,
          amount: c.amount,
          icon: Tag,
          iconColor: 'text-amber-600',
        });
      });
    });

    return entries.sort((a, b) => b.at - a.at);
  }, [orders, receipts, costs]);

  const handleSaveSupplier = async (data: SupplierPayload) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await supplyApi.updateSupplier(id, data);
      setSupplier(updated);
      setEditModalOpen(false);
      toast.success(`تأمین‌کننده ${updated.code} به‌روزرسانی شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="h-6 w-48 rounded bg-stone-200 dark:bg-stone-800 animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200" dir="rtl">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12" dir="rtl">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20 text-stone-400" />
        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-1">تأمین‌کننده یافت نشد</h3>
        <p className="text-xs text-stone-400">تأمین‌کننده مورد نظر یافت نشد. شاید حذف شده باشد.</p>
      </div>
    );
  }

  const isActive = supplier.isActive !== false;
  const allPhones = [
    ...(supplier.phones || []),
    ...(supplier.contactPersons?.map((c) => c.phone).filter(Boolean) || []),
  ];

  return (
    <div className="space-y-5 text-stone-900 dark:text-white max-w-5xl mx-auto" dir="rtl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-input text-xs font-bold text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      {/* Supplier Summary Card */}
      <section className="glass-panel p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-brand/20 shadow-md space-y-4">
        {/* Header: Shop Name + Code + Status + Edit */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-brand/10 dark:bg-brand/15 flex items-center justify-center shrink-0 overflow-hidden">
              {supplier.shopName ? (
                <span className="text-xl font-black text-brand">{supplier.shopName[0]}</span>
              ) : (
                <Truck className="w-6 h-6 text-brand/60" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base sm:text-lg text-stone-900 dark:text-white truncate">
                  {supplier.shopName}
                </h2>
                <Badge variant="neutral" className="font-mono text-[10px]">
                  {toPersianDigits(supplier.code)}
                </Badge>
              </div>
              <p className="text-[11px] text-brand font-bold mt-0.5">
                تأمین‌کننده
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={isActive ? 'success' : 'neutral'}>
              {isActive ? 'فعال' : 'غیرفعال'}
            </Badge>
            {canManage && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="p-2 rounded-xl glass-card hover:border-brand text-stone-600 hover:text-brand transition-all"
                title="ویرایش"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatBox label="کل سفارشات">
            <span className="text-sky-600 dark:text-sky-400">{toPersianDigits(orderCount)}</span>
          </StatBox>
          <StatBox label="کل خرید">
            <span dir="ltr">{formatToman(totalPurchases)}</span>
          </StatBox>
          <StatBox label="مجموع دریافتی‌ها">
            <span dir="ltr">{formatToman(totalReceived)}</span>
          </StatBox>
          <StatBox label="هزینه‌های ثبت‌شده">
            <span dir="ltr">{formatToman(totalCosts)}</span>
          </StatBox>
        </div>

        {/* Contact Info */}
        <div className="pt-2 space-y-2 border-t border-black/5 dark:border-white/5">
          {/* Contact Persons */}
          {supplier.contactPersons && supplier.contactPersons.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400 mb-1.5">افراد تماس:</p>
              <div className="flex flex-wrap gap-3">
                {supplier.contactPersons.map((contact, idx) => (
                  <div key={contact.id || idx} className="flex flex-col">
                    <span className="text-sm font-medium text-stone-800 dark:text-gray-200">{contact.name}</span>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        dir="ltr"
                        className="text-xs text-brand hover:underline font-mono"
                      >
                        {contact.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phones */}
          {allPhones.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400 mb-1.5">شماره تلویزیون:</p>
              <div className="flex flex-wrap gap-3">
                {allPhones.map((phone, idx) => (
                  <a
                    key={idx}
                    href={`tel:${phone}`}
                    dir="ltr"
                    className="text-sm font-mono text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{phone}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* City & Categories */}
          <div className="flex items-center gap-6 flex-wrap">
            {supplier.city && (
              <div className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                <span>{supplier.city}</span>
              </div>
            )}
            {supplier.categories && supplier.categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {supplier.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-brand/10 dark:bg-brand/15 text-brand text-[10px] font-black"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Address */}
          {supplier.address && (
            <div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400 mb-1">آدرس:</p>
              <p className="text-sm text-stone-600 dark:text-gray-300 leading-relaxed">
                {supplier.address}
              </p>
            </div>
          )}

          {/* Cooperation & Payment Terms */}
          {supplier.cooperationTerms && (
            <div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400">شرایط همکاری: </p>
              <p className="text-sm text-stone-600 dark:text-gray-300 inline">{supplier.cooperationTerms}</p>
            </div>
          )}
          {supplier.paymentTerms && (
            <div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400">شرایط پرداخت: </p>
              <p className="text-sm text-stone-600 dark:text-gray-300 inline">{supplier.paymentTerms}</p>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-gray-400 pt-1 border-t border-black/5 dark:border-white/5">
            <Calendar className="w-3.5 h-3.5" />
            <span>تاریخ ثبت: {toJalaliDate(supplier.createdAt)}</span>
          </div>
        </div>
      </section>

      {/* Purchase Orders List */}
      <section>
        <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-brand" />
          <span>سفارشات خرید ({toPersianDigits(orderCount)})</span>
        </h3>

        {orders.length === 0 ? (
          <div className="text-center py-8 rounded-2xl glass-panel border border-dashed border-stone-200 dark:border-white/10">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20 text-stone-400" />
            <p className="text-xs text-stone-400">هیچ سفارش خریدی ثبت نشده است</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-stone-200 dark:border-white/5 bg-white dark:bg-[#16161a] p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                      {o.code}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                      o.status === 'received'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : o.status === 'partially_received'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : o.status === 'ordered'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : o.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                        : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300'
                    }`}>
                      {o.status === 'partially_received' ? 'جزئی دریافت شده' :
                       o.status === 'ordered' ? 'سفارش داده شده' :
                       o.status === 'received' ? 'دریافت شده' :
                       o.status === 'cancelled' ? 'لغو شده' : 'پیش‌نویس'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300" dir="ltr">
                    {formatToman(o.totalAmount || 0)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {o.items?.length ?? 0} کالا · تاریخ: {toJalaliDate(o.createdAt)}
                </p>

                {/* Receipts for this order */}
                {receipts[o.id] && receipts[o.id].length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400">دریافت‌ها:</p>
                    {receipts[o.id].map((r) => (
                      <div key={r.id} className="text-[10px] text-stone-600 dark:text-stone-400 flex justify-between">
                        <span>{r.code || 'دریافت'} · {(r.items?.length ?? 0)} کالا</span>
                        <span>{toJalaliDate(r.receivedDate)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Costs for this order */}
                {costs[o.id] && costs[o.id].length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-stone-500 dark:text-gray-400">هزینه‌ها:</p>
                    {costs[o.id].map((c) => (
                      <div key={c.id} className="text-[10px] text-stone-600 dark:text-stone-400 flex justify-between">
                        <span>{c.description || c.costType} ({c.costType})</span>
                        <span dir="ltr">{formatToman(c.amount || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Timeline / History */}
      <section>
        <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-brand" />
          <span>تاریخچه فعالیت‌ها</span>
        </h3>

        {timelineEntries.length === 0 ? (
          <div className="text-center py-8 rounded-2xl glass-panel border border-dashed border-stone-200 dark:border-white/10">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20 text-stone-400" />
            <p className="text-xs text-stone-400">هیچ فعالیتی ثبت نشده است</p>
          </div>
        ) : (
          <ol className="relative space-y-4 pr-1">
            {timelineEntries.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.id} className="relative flex items-start gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center bg-stone-100 dark:bg-black/40">
                    <Icon className={`w-4 h-4 ${e.iconColor}`} />
                  </span>
                  <div className="flex-1 min-w-0 pb-1 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-gray-200">{e.title}</span>
                      {e.amount != null && e.amount > 0 && (
                        <span className="text-xs font-black font-mono text-stone-700 dark:text-gray-300 shrink-0" dir="ltr">
                          {formatToman(e.amount)}
                        </span>
                      )}
                    </div>
                    {e.description && (
                      <p className="mt-0.5 text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed break-words">
                        {e.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Edit Supplier Modal */}
      {editModalOpen && (
        <SupplierFormModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveSupplier}
          editSupplier={supplier}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SupplierProfilePage;
