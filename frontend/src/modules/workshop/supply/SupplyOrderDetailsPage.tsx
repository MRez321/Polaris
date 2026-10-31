import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Edit,
  Calendar,
  ShoppingCart,
  Receipt,
  Package,
  Tag,
  Clock,
  Truck,
  MapPin,
} from 'lucide-react';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { toast } from 'sonner';
import { formatToman, toJalaliDate, toPersianDigits } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';
import type { Supplier, PurchaseOrder } from '@/types';
import { Pagination } from '@/components/common/Pagination';

const STATUS_LABEL: Record<string, string> = {
  draft: 'پیش‌نویس',
  ordered: 'سفارش داده شده',
  partially_received: 'جزئی دریافت شده',
  received: 'دریافت شده',
  cancelled: 'لغو شده',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  partially_received: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  received: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

/** Resolve a user ID to a display name via the auth admin list. */
async function resolveUserName(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await authClient.admin.listUsers({ query: { limit: 100 } });
    const user = data?.users?.find((u) => u.id === userId);
    return user?.name ?? user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * SupplyOrderDetailsPage — shows full details of a single purchase order.
 * Route: /console/supply-orders/:id
 *
 * Displays:
 * - Order header (code, supplier, status, dates, totals)
 * - Line items with received/remaining quantities
 * - Receipts with date + received-by (user name)
 * - Supply costs
 * - Timeline (audit trail)
 * - "Mark as Received" button for orders in ordered/partially_received status
 *
 * Pagination is applied to items, receipts, and costs tables (default 10).
 */
export const SupplyOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingReceived, setMarkingReceived] = useState(false);

  // Pagination state for sub-tables
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize] = useState(10);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [receiptsPageSize] = useState(10);
  const [costsPage, setCostsPage] = useState(1);
  const [costsPageSize] = useState(10);

  // Resolved user names for receipts (userId → name)
  const [receiptNames, setReceiptNames] = useState<Record<string, string | null>>({});

  const isReceivable = order?.status === 'ordered' || order?.status === 'partially_received';

  useEffect(() => {
    if (!id) return;
    const orderId = id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const orderRes = await supplyApi.getOrder(orderId);
        setOrder(orderRes);

        if (orderRes.supplierId) {
          const supRes = await supplyApi.getSupplier(orderRes.supplierId).catch(() => null);
          if (!cancelled) setSupplier(supRes);
        }
        if (!cancelled) setLoading(false);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(e));
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  // Resolve user names for receipt receivedBy fields
  useEffect(() => {
    if (!order?.receipts || order.receipts.length === 0) return;
    const userIds = new Set<string>();
    order.receipts.forEach((r) => {
      if (r.receivedBy) userIds.add(r.receivedBy);
    });
    if (userIds.size === 0) return;

    let cancelled = false;
    userIds.forEach(async (uid) => {
      if (cancelled || receiptNames[uid] !== undefined) return;
      const name = await resolveUserName(uid);
      if (!cancelled && name) {
        setReceiptNames((prev) => ({ ...prev, [uid]: name }));
      }
    });
    return () => { cancelled = true; };
  }, [order?.receipts]);

  // Paginated subsets
  const paginatedItems = useMemo(() => {
    const start = (itemsPage - 1) * itemsPageSize;
    return (order?.items ?? []).slice(start, start + itemsPageSize);
  }, [order?.items, itemsPage, itemsPageSize]);

  const paginatedReceipts = useMemo(() => {
    const start = (receiptsPage - 1) * receiptsPageSize;
    return (order?.receipts ?? []).slice(start, start + receiptsPageSize);
  }, [order?.receipts, receiptsPage, receiptsPageSize]);

  const paginatedCosts = useMemo(() => {
    const start = (costsPage - 1) * costsPageSize;
    return (order?.costs ?? []).slice(start, start + costsPageSize);
  }, [order?.costs, costsPage, costsPageSize]);

  // --- Handlers ---
  const handleMarkAsReceived = async () => {
    if (!order || !isReceivable) return;
    const remainingItems = order.items.filter(
      (item) => (item.remaining ?? item.quantity - (item.receivedQuantity ?? 0)) > 0
    );
    if (remainingItems.length === 0) {
      toast.info('تمام کالاها قبلاً دریافت شده‌اند');
      return;
    }

    setMarkingReceived(true);
    try {
      const receiptItems = remainingItems.map((item) => ({
        purchaseItemId: item.id,
        quantity: item.remaining ?? item.quantity - (item.receivedQuantity ?? 0),
      }));

      await supplyApi.createReceipt(order.id, { items: receiptItems });
      toast.success(`سفارش ${order.code} به‌روزرسانی شد — دریافت ثبت شد`);

      // Refetch order
      const updated = await supplyApi.getOrder(order.id);
      setOrder(updated);
      setReceiptNames({});

      if (updated.supplierId) {
        const sup = await supplyApi.getSupplier(updated.supplierId).catch(() => null);
        if (sup) setSupplier(sup);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setMarkingReceived(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    return toJalaliDate(dateStr);
  };

  const renderStatusBadge = (status: string) => (
    <span
      className={`px-1.5 py-0.25 text-[9px] rounded-full font-bold ${STATUS_COLOR[status] || STATUS_COLOR.draft}`}
      title={STATUS_LABEL[status] || status}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="h-8 w-48 rounded bg-stone-200 dark:bg-stone-800 animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl glass-card animate-pulse" />
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

  if (!order) {
    return (
      <div className="text-center py-12" dir="rtl">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20 text-stone-400" />
        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-1">سفارش یافت نشد</h3>
        <p className="text-xs text-stone-400">سفارش مورد نظر یافت نشد. شاید حذف شده باشد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-stone-900 dark:text-white max-w-5xl mx-auto" dir="rtl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-400 hover:text-brand transition-colors"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>بازگشت</span>
      </button>

      {/* Order Header */}
      <div className="glass-panel p-5 rounded-2xl shadow-xl border border-black/5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900 dark:text-white">{order.code}</h1>
              <div className="flex items-center gap-2 mt-1">
                {renderStatusBadge(order.status)}
                {order.trackingCode && (
                  <span className="text-[10px] text-stone-500 dark:text-gray-400">
                    کد رهگیری: {order.trackingCode}
                  </span>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => {}} // TODO: open edit modal
              className="p-2 rounded-xl text-stone-500 hover:text-brand hover:bg-brand/10 transition-colors"
              title="ویرایش"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Supplier Info */}
        {supplier && (
          <div className="mb-3">
            <span className="text-sm font-bold text-stone-800 dark:text-gray-200">
              {supplier.shopName}
            </span>
            {supplier.city && (
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{supplier.city}</span>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block font-medium">تاریخ سفارش</span>
            <div className="font-black text-sm mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-stone-400" />
              {formatDate(order.orderDate || order.createdAt)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block font-medium">تاریخ تحویل مورد انتظار</span>
            <div className="font-black text-sm mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-stone-400" />
              {formatDate(order.expectedDate)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block font-medium">وضعیت دریافت</span>
            <div className="font-medium text-sm mt-0.5">
              {STATUS_LABEL[order.status] || order.status}
            </div>
          </div>
          {order.receipts && order.receipts.length > 0 && order.receipts[0]?.receivedDate && (
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5">
              <span className="text-[10px] text-stone-500 dark:text-gray-400 block font-medium">تاریخ دریافت</span>
              <div className="font-black text-sm mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {formatDate(order.receipts[0].receivedDate)}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-black/5 dark:border-white/10">
          <div className="text-center">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block">جمع جزئیات</span>
            <div className="font-mono text-sm font-black">{formatToman(order.subtotal)}</div>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block">هزینه‌های افزوده</span>
            <div className="font-mono text-sm font-black">{formatToman(order.additionalCosts)}</div>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-stone-500 dark:text-gray-400 block">مجموع کل</span>
            <div className="font-mono text-lg font-black text-brand">{formatToman(order.totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* Mark as Received Button */}
      {isReceivable && canManage && (
        <div className="flex justify-end">
          <button
            onClick={handleMarkAsReceived}
            disabled={markingReceived}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
          >
            {markingReceived ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال ثبت دریافت...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>ثبت دریافت کالا</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Line Items */}
      <div className="glass-panel p-4 rounded-2xl shadow-xl border border-black/5 dark:border-white/10">
        <h3 className="text-sm font-black text-stone-900 dark:text-white mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          کالاها ({toPersianDigits(order.items?.length ?? 0)})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">ردیف</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">نام کالا</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">SKU</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">تعداد</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">دریافت شده</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">باقیمانده</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">قیمت واحد</th>
                <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">مجموع</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{toPersianDigits((itemsPage - 1) * itemsPageSize + idx + 1)}</td>
                  <td className="py-2 font-medium">{item.name || item.skuId}</td>
                  <td className="py-2 font-mono" dir="ltr">{item.skuId}</td>
                  <td className="py-2">{toPersianDigits(item.quantity)}</td>
                  <td className="py-2">{toPersianDigits(item.receivedQuantity ?? 0)}</td>
                  <td className="py-2 text-amber-600">{toPersianDigits(item.quantity - (item.receivedQuantity ?? 0))}</td>
                  <td className="py-2 font-mono" dir="ltr">{formatToman(item.unitCost)}</td>
                  <td className="py-2 font-mono" dir="ltr">{formatToman(item.quantity * item.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(order.items?.length ?? 0) > itemsPageSize && (
          <Pagination
            currentPage={itemsPage}
            totalItems={order.items?.length ?? 0}
            pageSize={itemsPageSize}
            onPageChange={setItemsPage}
          />
        )}
      </div>

      {/* Receipts */}
      {order.receipts && order.receipts.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl shadow-xl border border-black/5 dark:border-white/10">
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            دریافت‌ها ({toPersianDigits(order.receipts.length)})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10">
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">کد</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">تاریخ دریافت</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">دریافت‌کننده</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">کالاها</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReceipts.map((r) => (
                  <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2 font-mono" dir="ltr">{r.code}</td>
                    <td className="py-2">{formatDate(r.receivedDate)}</td>
                    <td className="py-2">
                      {r.receivedBy
                        ? (receiptNames[r.receivedBy] ?? `کاربر: ${r.receivedBy}`)
                        : '—'}
                    </td>
                    <td className="py-2">{toPersianDigits(r.items?.length ?? 0)} قلم</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.receipts.length > receiptsPageSize && (
            <Pagination
              currentPage={receiptsPage}
              totalItems={order.receipts.length}
              pageSize={receiptsPageSize}
              onPageChange={setReceiptsPage}
            />
          )}
        </div>
      )}

      {/* Costs */}
      {order.costs && order.costs.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl shadow-xl border border-black/5 dark:border-white/10">
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            هزینه‌های حمل ({toPersianDigits(order.costs.length)})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10">
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">نوع</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">توضیحات</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">مبلغ</th>
                  <th className="text-right py-2 font-black text-stone-500 dark:text-gray-400">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCosts.map((c) => (
                  <tr key={c.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2">{c.costType}</td>
                    <td className="py-2">{c.description || '—'}</td>
                    <td className="py-2 font-mono" dir="ltr">{formatToman(c.amount)}</td>
                    <td className="py-2">{formatDate(c.costDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.costs.length > costsPageSize && (
            <Pagination
              currentPage={costsPage}
              totalItems={order.costs.length}
              pageSize={costsPageSize}
              onPageChange={setCostsPage}
            />
          )}
        </div>
      )}

      {/* Timeline (audit trail) */}
      {order.timeline && order.timeline.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl shadow-xl border border-black/5 dark:border-white/10">
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            سابقه فعالیت‌ها
          </h3>
          <div className="space-y-2">
            {order.timeline.map((entry) => (
              <div key={`${entry.entityType}-${entry.entityId}-${entry.createdAt}`} className="flex items-start gap-2 text-xs">
                <span className="text-stone-500 dark:text-gray-400 min-w-[80px] text-right">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="text-stone-600 dark:text-gray-300">
                  {entry.action}: {entry.details}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyOrderDetailsPage;
