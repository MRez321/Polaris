import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  Plus,
  Wrench,
  Trash2,
  PackageX,
  CheckCircle2,
  Loader2,
  Search,
  AlertTriangle,
  Store,
  Users,
  Truck,
  Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DamageRecord, GarmentItem, ConsignmentReturn } from '@/types';
import { damageApi, itemsApi, returnsApi, getApiErrorMessage } from '@/lib/api';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SelectMenu } from '@/components/ui/select-menu';
import { toPersianDigits, toJalaliDate, formatToman } from '@/utils/persian';

type SourceTab = 'all' | 'seller' | 'customer' | 'provider' | 'process' | 'consignment';

const SOURCE_LABELS: Record<DamageRecord['source'], string> = {
  seller: 'دست‌فروش',
  customer: 'مشتری',
  provider: 'تأمین‌کننده',
  process: 'حین کار در کارگاه',
};

const SOURCE_ICONS: Record<DamageRecord['source'], React.ReactNode> = {
  seller: <Users className="w-3.5 h-3.5" />,
  customer: <Store className="w-3.5 h-3.5" />,
  provider: <Truck className="w-3.5 h-3.5" />,
  process: <Scissors className="w-3.5 h-3.5" />,
};

const STATUS_LABELS: Record<DamageRecord['status'], string> = {
  damaged: 'خراب',
  fixed: 'ترمیم‌شده',
  disposed: 'اسقاط‌شده',
};

const STATUS_BADGE: Record<DamageRecord['status'], string> = {
  damaged: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
  fixed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  disposed: 'bg-stone-500/15 text-stone-500 dark:text-stone-400 border-stone-500/20',
};

export const ReturnsPage: React.FC = () => {
  const [records, setRecords] = useState<DamageRecord[]>([]);
  const [consignmentReturns, setConsignmentReturns] = useState<ConsignmentReturn[]>([]);
  const [items, setItems] = useState<GarmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SourceTab>('all');
  const [search, setSearch] = useState('');

  // Create-damage modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemId, setItemId] = useState('');
  const [source, setSource] = useState<DamageRecord['source']>('customer');
  const [sourceName, setSourceName] = useState('');
  const [quantity, setQuantity] = useState<number | null>(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [currentLocation, setCurrentLocation] = useState('کارگاه');
  const [notes, setNotes] = useState('');

  // Action targets
  const [fixTarget, setFixTarget] = useState<DamageRecord | null>(null);
  const [fixBy, setFixBy] = useState('');
  const [disposeTarget, setDisposeTarget] = useState<DamageRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DamageRecord | null>(null);

  const load = useCallback(async () => {
    try {
      const [dmg, rets, its] = await Promise.all([
        damageApi.list(),
        returnsApi.list().catch(() => [] as ConsignmentReturn[]),
        itemsApi.list(),
      ]);
      setRecords(dmg);
      setConsignmentReturns(rets);
      setItems(its);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'بارگذاری مرجوعی‌ها ناموفق بود'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItem = items.find((i) => i.id === itemId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !sourceName.trim() || !quantity) {
      toast.error('کالا، منبع و تعداد الزامی است');
      return;
    }
    setSaving(true);
    try {
      await damageApi.create({
        itemId,
        source,
        sourceName: sourceName.trim(),
        quantity,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
        damageReason: damageReason.trim() || undefined,
        currentLocation: currentLocation.trim() || 'کارگاه',
        notes: notes.trim() || undefined,
      });
      toast.success('رکورد مرجوعی/خرابی ثبت شد و موجودی کالا کاهش یافت');
      setIsModalOpen(false);
      setItemId('');
      setSourceName('');
      setQuantity(1);
      setSelectedSize('');
      setSelectedColor('');
      setDamageReason('');
      setNotes('');
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ثبت مرجوعی ناموفق بود'));
    } finally {
      setSaving(false);
    }
  };

  const handleFix = async () => {
    if (!fixTarget) return;
    const target = fixTarget;
    setFixTarget(null);
    try {
      await damageApi.fix(target.id, fixBy.trim() || undefined);
      toast.success(`«${target.itemName}» ترمیم شد و ${toPersianDigits(target.quantity)} عدد به موجودی برگشت`);
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ترمیم ناموفق بود'));
    }
  };

  const handleDispose = async () => {
    if (!disposeTarget) return;
    const target = disposeTarget;
    setDisposeTarget(null);
    try {
      await damageApi.dispose(target.id);
      toast.success(`«${target.itemName}» اسقاط شد (برگشتی به موجودی ندارد)`);
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'اسقاط ناموفق بود'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await damageApi.remove(target.id);
      toast.success('رکورد حذف شد');
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف ناموفق بود'));
    }
  };

  const filtered = useMemo(() => {
    let list = records;
    if (activeTab !== 'all' && activeTab !== 'consignment') {
      list = list.filter((r) => r.source === activeTab);
    }
    const q = search.trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.itemName.includes(q) ||
          r.itemCode.includes(q) ||
          r.code.includes(q) ||
          (r.sourceName && r.sourceName.includes(q))
      );
    }
    return list;
  }, [records, activeTab, search]);

  const filteredReturns = useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'consignment') return [];
    const q = search.trim();
    if (!q) return consignmentReturns;
    return consignmentReturns.filter(
      (r) =>
        r.sellerName.includes(q) ||
        r.consignmentCode.includes(q) ||
        r.items.some((it) => it.itemName.includes(q))
    );
  }, [consignmentReturns, activeTab, search]);

  const tabs: { key: SourceTab; label: string; count: number }[] = [
    { key: 'all', label: 'همه', count: records.length + consignmentReturns.length },
    { key: 'seller', label: 'دست‌فروش', count: records.filter((r) => r.source === 'seller').length },
    { key: 'customer', label: 'مشتری', count: records.filter((r) => r.source === 'customer').length },
    { key: 'provider', label: 'تأمین‌کننده', count: records.filter((r) => r.source === 'provider').length },
    { key: 'process', label: 'حین کار', count: records.filter((r) => r.source === 'process').length },
    { key: 'consignment', label: 'مرجوعی امانی', count: consignmentReturns.length },
  ];

  const stats = useMemo(() => {
    const damaged = records.filter((r) => r.status === 'damaged');
    return {
      damagedCount: damaged.length,
      fixedCount: records.filter((r) => r.status === 'fixed').length,
      disposedCount: records.filter((r) => r.status === 'disposed').length,
    };
  }, [records]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-stone-900 dark:text-white">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <RotateCcw className="w-5 h-5 text-brand-ink" />
            مرجوعی‌ها و خرابی‌ها
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            ثبت و پیگیری مرجوعی از مشتری، دست‌فروش، تأمین‌کننده و خرابی حین تولید
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          ثبت مرجوعی/خرابی جدید
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-stone-500 block">در انتظار رسیدگی (خراب):</span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
            {toPersianDigits(stats.damagedCount)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-stone-500 block">ترمیم‌شده (برگشتی به موجودی):</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {toPersianDigits(stats.fixedCount)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-stone-500 block">اسقاط‌شده:</span>
          <p className="text-xl font-black text-stone-500 font-mono" dir="ltr">
            {toPersianDigits(stats.disposedCount)}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-stone-500 block">مرجوعی امانی ثبت‌شده:</span>
          <p className="text-xl font-black text-brand-ink dark:text-brand font-mono" dir="ltr">
            {toPersianDigits(consignmentReturns.length)}
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-stone-200 dark:bg-black/40 border border-black/5 dark:border-white/5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  activeTab === t.key ? 'bg-black/10' : 'bg-black/5 dark:bg-white/10'
                }`}
              >
                {toPersianDigits(t.count)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس کالا، کد، منبع…"
            className="w-full pr-10 pl-3 py-2 rounded-xl glass-input text-xs outline-none"
          />
        </div>
      </div>

      {/* Damage records list */}
      {(activeTab !== 'consignment' || isLoading) && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="glass-panel p-10 rounded-2xl flex items-center justify-center text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl text-center text-stone-400 text-sm">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              رکوردی یافت نشد
            </div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black">{r.itemName}</span>
                      <span className="text-[10px] font-mono text-stone-400">{r.code} • {r.itemCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                          STATUS_BADGE[r.status]
                        }`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-300 flex items-center gap-1">
                        {SOURCE_ICONS[r.source]}
                        {SOURCE_LABELS[r.source]}: {r.sourceName}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2 flex-wrap">
                      <span>تعداد: <b className="font-mono">{toPersianDigits(r.quantity)}</b></span>
                      {r.selectedSize && <span>سایز: {r.selectedSize}</span>}
                      {r.selectedColor && <span>رنگ: {r.selectedColor}</span>}
                      <span>محل فعلی: {r.currentLocation}</span>
                      <span>• ثبت: {toJalaliDate(r.reportedAt)}</span>
                      {r.status === 'fixed' && r.fixedAt && (
                        <span className="text-emerald-500">• ترمیم: {toJalaliDate(r.fixedAt)}</span>
                      )}
                    </div>
                    {r.damageReason && (
                      <p className="text-[11px] text-rose-500/90">علت: {r.damageReason}</p>
                    )}
                    {r.notes && <p className="text-[11px] text-stone-400">{r.notes}</p>}
                  </div>
                  {r.status === 'damaged' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setFixTarget(r);
                          setFixBy('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="ترمیم و برگشت به موجودی"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        ترمیم
                      </button>
                      <button
                        onClick={() => setDisposeTarget(r)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-500/15 text-stone-500 hover:bg-stone-500/25 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="اسقاط — بدون برگشت به موجودی"
                      >
                        <PackageX className="w-3.5 h-3.5" />
                        اسقاط
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                    title="حذف رکورد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Consignment returns list */}
      {(activeTab === 'all' || activeTab === 'consignment') && (
        <div className="space-y-3">
          {activeTab === 'all' && filteredReturns.length > 0 && (
            <h3 className="text-xs font-black text-stone-400 pt-2">مرجوعی‌های امانی (تحویل دست‌فروش):</h3>
          )}
          {filteredReturns.map((r) => (
            <div key={r.id} className="glass-panel p-4 rounded-2xl space-y-2 border-r-4 border-r-sky-500/40">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black">{r.sellerName || 'دست‌فروش'}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      مرجوعی امانی
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap gap-2">
                    <span className="font-mono">{formatToman(r.totalReturnAmount || 0)}</span>
                    <span>• کد واگذاری: {r.consignmentCode}</span>
                    <span>• ثبت: {toJalaliDate(r.date || r.createdAt)}</span>
                    <span>• پردازش: {r.processedBy}</span>
                  </div>
                  {r.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.items.map((it, i) => (
                        <span
                          key={`${r.id}-${i}`}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-300"
                        >
                          {it.itemName} × {toPersianDigits(it.quantity)}
                          {it.selectedSize ? ` — سایز ${it.selectedSize}` : ''}
                          {it.selectedColor ? ` — رنگ ${it.selectedColor}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="ثبت مرجوعی/خرابی جدید"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold mb-1">کالا * (موجودی کاهش می‌یابد)</label>
            <SelectMenu
              value={itemId}
              onChange={setItemId}
              placeholder="انتخاب کالا"
              options={items.map((i) => ({
                value: i.id,
                label: `${i.name} (${i.code}) — موجودی: ${toPersianDigits(i.stockQuantity)}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">منبع خرابی *</label>
              <SelectMenu
                value={source}
                onChange={(v) => setSource(v as DamageRecord['source'])}
                options={[
                  { value: 'customer', label: 'مشتری' },
                  { value: 'seller', label: 'دست‌فروش' },
                  { value: 'provider', label: 'تأمین‌کننده' },
                  { value: 'process', label: 'حین کار در کارگاه' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">نام منبع *</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="نام مشتری / دست‌فروش / تأمین‌کننده"
                className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">تعداد *</label>
              <input
                type="number"
                min={1}
                value={quantity ?? ''}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">سایز</label>
              <SelectMenu
                value={selectedSize}
                onChange={setSelectedSize}
                placeholder="—"
                options={(selectedItem?.sizes || []).map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">رنگ</label>
              <SelectMenu
                value={selectedColor}
                onChange={setSelectedColor}
                placeholder="—"
                options={(selectedItem?.colors || []).map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">محل فعلی کالا</label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="کارگاه / نزد مشتری / …"
                className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">علت خرابی</label>
              <input
                type="text"
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value)}
                placeholder="مثال: پارگی درز آستین هنگام پست"
                className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">توضیحات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/10 text-xs sm:text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              ثبت مرجوعی
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={fixTarget !== null} onClose={() => setFixTarget(null)} title="ترمیم‌کننده">
        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold mb-1">نام ترمیم‌کننده (اختیاری)</label>
            <input
              type="text"
              value={fixBy}
              onChange={(e) => setFixBy(e.target.value)}
              placeholder="مثال: استاد کریم"
              className="w-full px-3 py-2 rounded-xl glass-input outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setFixTarget(null)}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/10 text-xs sm:text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => void handleFix()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              تایید ترمیم و برگشت به موجودی
            </button>
          </div>
        </div>
      </Modal>

      {/* Dispose dialog */}
      <ConfirmDialog
        open={disposeTarget !== null}
        onOpenChange={(open) => !open && setDisposeTarget(null)}
        title="اسقاط کالای خراب"
        description={`کالای «${disposeTarget?.itemName ?? ''}» اسقاط شود؟ این کالا به موجودی برنمی‌گردد.`}
        confirmLabel="اسقاط"
        destructive
        onConfirm={() => void handleDispose()}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف رکورد خرابی"
        description={`رکورد «${deleteTarget?.code ?? ''} — ${deleteTarget?.itemName ?? ''}» حذف شود؟`}
        confirmLabel="حذف"
        destructive
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default ReturnsPage;
