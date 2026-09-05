import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Globe, PackagePlus, RefreshCw, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage, itemsApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import type { GarmentItem } from '@/types';
import { toPersianDigits, formatToman } from '@/utils/persian';

/**
 * Shop channel allocation (admin only): decide which workshop items and
 * how many units of each go on the public online shop. Allocated units
 * are reserved away from the free warehouse pool (handovers can no
 * longer oversell shop-committed stock); zeroing the allocation returns
 * the units to the warehouse.
 */
export const ShopManagementPage: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [items, setItems] = useState<GarmentItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  /** Draft allocations being edited inline: itemId → qty. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  usePageMeta(
    'مدیریت فروشگاه',
    'تخصیص موجودی انبار به فروشگاه آنلاین پولاریس استایل.',
    '/controlpanel/shop'
  );

  const load = async () => {
    try {
      setLoading(true);
      const list = await itemsApi.list();
      setItems(list);
      setDrafts({});
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در بارگذاری موجودی انبار'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount (WebsiteSettingsPage pattern)
    if (isAdmin) void load();
  }, [isAdmin]);

  /** Candidate items for allocation: any active item with free warehouse units. */
  const poolItems = useMemo(
    () =>
      items.filter(
        (i) =>
          (i.stockQuantity || 0) > 0 &&
          ((i.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (i.code || '').toLowerCase().includes(search.toLowerCase()))
      ),
    [items, search]
  );

  if (isLoading) return null;
  // Authors must not touch allocations — send them to their own section.
  if (!user || !isAdmin)
    return <Navigate to={user ? '/controlpanel/blog' : '/login?next=%2Fcontrolpanel%2Fshop'} replace />;

  const allocatedItems = items.filter((i) => (i.websiteQuantity || 0) > 0);

  /** One allocation transaction per item, via the locked transfer endpoint. */
  const applyAllocation = async (item: GarmentItem, quantity: number) => {
    try {
      setSavingId(item.id);
      await itemsApi.setShopAllocation(item.id, quantity);
      // Server recomputed both pools; refetch to stay in sync (consignments etc.).
      await load();
      toast.success(
        quantity > 0
          ? `«${item.name}» با ${toPersianDigits(quantity)} عدد به فروشگاه آنلاین تخصیص یافت`
          : `تخصیص «${item.name}» لغو و موجودی به انبار بازگشت`
      );
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در تخصیص موجودی فروشگاه'));
      return false;
    } finally {
      setSavingId(null);
    }
  };
  const dropDraft = (id: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDraftSave = async (item: GarmentItem) => {
    const raw = drafts[item.id];
    const parsed = Number.parseInt(raw ?? '', 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('تعداد تخصیص باید عددی صحیح و بزرگ‌تر یا مساوی صفر باشد');
      return;
    }
    // Same value → no-op, just drop the draft.
    if (parsed === item.websiteQuantity) {
      dropDraft(item.id);
      return;
    }
    if (await applyAllocation(item, parsed)) dropDraft(item.id);
  };

  const handleRemove = (item: GarmentItem) => {
    void applyAllocation(item, 0);
  };

  const totalAllocatedUnits = allocatedItems.reduce((s, i) => s + (i.websiteQuantity || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" />
            مدیریت فروشگاه آنلاین
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            کالاهای انبار را به ویترین اینترنتی تخصیص دهید؛ واحدهای تخصیص‌یافته از انبار آزاد جدا می‌شوند.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            به‌روزرسانی
          </Button>
          <Button size="sm" onClick={() => setPickerOpen(true)} disabled={loading}>
            <PackagePlus className="w-4 h-4" />
            تخصیص کالای جدید
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl glass-card border border-stone-200 dark:border-white/8 p-4">
          <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold">کالاهای ویترین</p>
          <p className="text-xl font-black text-stone-900 dark:text-white mt-1">
            {toPersianDigits(allocatedItems.length)}
          </p>
        </div>
        <div className="rounded-2xl glass-card border border-stone-200 dark:border-white/8 p-4">
          <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold">واحدهای تخصیص‌یافته</p>
          <p className="text-xl font-black text-brand-ink mt-1">
            {toPersianDigits(totalAllocatedUnits)}
          </p>
        </div>
        <div className="rounded-2xl glass-card border border-stone-200 dark:border-white/8 p-4 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold">واحدهای آزاد انبار</p>
          <p className="text-xl font-black text-stone-900 dark:text-white mt-1">
            {toPersianDigits(items.reduce((s, i) => s + (i.stockQuantity || 0), 0))}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : allocatedItems.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl border border-stone-200 dark:border-white/5 p-6">
          <Globe className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <p className="font-bold text-stone-800 dark:text-gray-300 text-sm">
            هنوز کالایی به فروشگاه آنلاین تخصیص نیافته است
          </p>
          <p className="text-xs text-stone-500 dark:text-gray-500 mt-1">
            از دکمه «تخصیص کالای جدید» واحدهایی از انبار را به ویترین اینترنتی اختصاص دهید.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] divide-y divide-stone-200/70 dark:divide-white/5">
          {allocatedItems.map((item) => {
            const draft = drafts[item.id];
            const draftValue = draft !== undefined ? Number.parseInt(draft || '0', 10) : item.websiteQuantity;
            // Draft ceiling: current allocation + free warehouse units (server enforces the same).
            const max = item.websiteQuantity + item.stockQuantity;

            return (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-stone-500 dark:text-gray-400">
                      {item.code}
                    </span>
                    <span className="font-black text-sm text-stone-900 dark:text-white truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="default" size="sm" className="bg-stone-500/10 text-stone-600 dark:text-stone-300 border border-stone-500/20">
                      انبار: {toPersianDigits(item.stockQuantity || 0)}
                    </Badge>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-bold truncate">
                      {item.sizes.join(' • ')} — {formatToman(item.retailPrice)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    value={draft !== undefined ? draft : toPersianDigits(item.websiteQuantity)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      const clamped = raw === '' ? '' : String(Math.min(Number(raw), max));
                      setDrafts((prev) => ({ ...prev, [item.id]: clamped }));
                    }}
                    className="w-24 h-9 text-center font-black rounded-xl"
                    aria-label={`تعداد تخصیص ${item.name}`}
                    title={`حداکثر: ${toPersianDigits(max)} عدد (موجودی آزاد + تخصیص فعلی)`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={draft === undefined || draftValue === item.websiteQuantity || savingId === item.id}
                    onClick={() => void handleDraftSave(item)}
                  >
                    ذخیره
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item)}
                    disabled={savingId === item.id}
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title={`بازگرداندن ${toPersianDigits(item.websiteQuantity)} واحد به انبار`}
                    aria-label="لغو تخصیص"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inventory picker: allocate new items from the free warehouse pool */}
      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="تخصیص کالای جدید به فروشگاه آنلاین"
        subtitle="فقط کالاهای دارای موجودی آزاد انبار نمایش داده می‌شوند."
        maxWidth="3xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی کالا (نام یا کد)..."
              className="pr-9 rounded-xl"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pl-1">
            {poolItems.length === 0 ? (
              <p className="text-center text-xs text-stone-500 dark:text-stone-400 py-8">
                کالای آزادی برای تخصیص یافت نشد.
              </p>
            ) : (
              poolItems.map((item) => (
                <PoolRow
                  key={item.id}
                  item={item}
                  busy={savingId === item.id}
                  onAllocate={(qty) => applyAllocation(item, qty).then(() => undefined)}
                />
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

/** One pool row: item info + unit stepper capped at free warehouse stock. */
const PoolRow: React.FC<{
  item: GarmentItem;
  busy: boolean;
  onAllocate: (qty: number) => void;
}> = ({ item, busy, onAllocate }) => {
  const [qty, setQty] = useState(1);
  // Stepper ceiling: free warehouse units plus whatever is already allocated.
  const max = (item.stockQuantity || 0) + (item.websiteQuantity || 0);

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-stone-200 dark:border-white/8 hover:border-brand/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-stone-500 dark:text-gray-400">{item.code}</span>
          <span className="font-black text-xs text-stone-900 dark:text-white truncate">{item.name}</span>
        </div>
        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
          آزاد انبار: {toPersianDigits(item.stockQuantity || 0)} عدد
          {(item.websiteQuantity || 0) > 0 && ` • در فروشگاه: ${toPersianDigits(item.websiteQuantity)}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-7 h-7 rounded-lg glass-input font-black text-stone-700 dark:text-stone-200"
          aria-label="کاهش"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-black text-stone-900 dark:text-white">
          {toPersianDigits(qty)}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(Math.max(1, max), q + 1))}
          className="w-7 h-7 rounded-lg glass-input font-black text-stone-700 dark:text-stone-200"
          aria-label="افزایش"
        >
          +
        </button>
        <Button size="sm" disabled={busy || qty < 1} onClick={() => onAllocate(item.websiteQuantity + qty)}>
          تخصیص
        </Button>
      </div>
    </div>
  );
};

export default ShopManagementPage;
