import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  CreditCard,
  History,
  MapPin,
  PackagePlus,
  Palette,
  Phone,
  Receipt,
  RotateCcw,
  Ruler,
  ScrollText,
  SearchX,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  formatToman,
  toJalaliDate,
  toJalaliDateTime,
  toPersianDigits,
} from '@/utils/persian';
import { resolveVariantPrice, hasVariantPrices } from '@/utils/variantPrices';
import { useData } from '@/modules/workshop/context/DataContext';
import { auditApi } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';
import { SafeImage } from '@/components/common/SafeImage';
import type {
  AuditLog,
  ConsignmentItemLine,
  Consignment,
  ConsignmentReturn,
  GarmentItem,
  PaymentRecord,
  Seller,
  StaffMember,
  WorkshopExpense,
} from '@/types';

/* ---------------------------------- helpers ---------------------------------- */

type TimelineKind =
  | 'consignment'
  | 'item_line'
  | 'return_line'
  | 'payment'
  | 'return'
  | 'activity'
  | 'audit'
  | 'cost_share'
  | 'created';

interface TimelineEntry {
  id: string;
  at: number;
  kind: TimelineKind;
  title: string;
  description?: string;
  amount?: number;
}

const safeTime = (value: string | number | Date | undefined): number => {
  const t = new Date(value ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

const notDeleted = <T extends { isDeleted?: boolean }>(list: T[] | undefined): T[] =>
  (list || []).filter((x) => !x.isDeleted);

const PAYMENT_METHOD_LABELS: Record<PaymentRecord['paymentMethod'], string> = {
  cash: 'نقدی',
  card: 'کارتخوان',
  bank_transfer: 'حواله بانکی',
  pos: 'پایانه فروش',
};

const CONSIGNMENT_STATUS_LABELS: Record<Consignment['status'], string> = {
  active: 'در جریان',
  partially_settled: 'تسویه جزئی',
  settled: 'تسویه‌شده',
  overdue: 'سررسید گذشته',
};

const SALARY_TYPE_LABELS: Record<StaffMember['salaryType'], string> = {
  monthly: 'ماهانه',
  piecework: 'تکه‌ای / کنترات',
  hourly: 'ساعتی',
};

const ACTIVITY_TYPE_LABELS: Record<NonNullable<StaffMember['activityHistory']>[number]['type'], string> = {
  task: 'فعالیت',
  handover: 'واگذاری',
  payment: 'پرداخت',
  attendance: 'حضور و غیاب',
  note: 'یادداشت',
};

const GUARANTEE_TYPE_LABELS: Record<Seller['guaranteeType'], string> = {
  promissory_note: 'سفته بانکی',
  cheque: 'چک صیادی',
  trusted_guarantor: 'ضمانت معتمد محل',
  national_card: 'کارت ملی هوشمند',
};

const RETURN_CONDITION_LABELS: Record<ConsignmentReturn['items'][number]['condition'], string> = {
  healthy: 'سالم',
  damaged: 'آسیب‌دیده',
};

const KIND_META: Record<
  TimelineKind,
  { Icon: typeof Receipt; boxCls: string; iconCls: string }
> = {
  consignment: { Icon: ArrowLeftRight, boxCls: 'bg-brand/15 border-brand/30', iconCls: 'text-brand-ink dark:text-brand' },
  item_line: { Icon: ArrowLeftRight, boxCls: 'bg-brand/15 border-brand/30', iconCls: 'text-brand-ink dark:text-brand' },
  payment: { Icon: Receipt, boxCls: 'bg-emerald-500/15 border-emerald-500/30', iconCls: 'text-emerald-600 dark:text-emerald-400' },
  return: { Icon: RotateCcw, boxCls: 'bg-rose-500/15 border-rose-500/30', iconCls: 'text-rose-600 dark:text-rose-400' },
  return_line: { Icon: RotateCcw, boxCls: 'bg-rose-500/15 border-rose-500/30', iconCls: 'text-rose-600 dark:text-rose-400' },
  activity: { Icon: History, boxCls: 'bg-blue-500/15 border-blue-500/30', iconCls: 'text-blue-600 dark:text-blue-400' },
  audit: { Icon: ScrollText, boxCls: 'bg-stone-500/10 border-stone-400/30', iconCls: 'text-stone-500 dark:text-gray-400' },
  cost_share: { Icon: Wallet, boxCls: 'bg-violet-500/15 border-violet-500/30', iconCls: 'text-violet-600 dark:text-violet-400' },
  created: { Icon: PackagePlus, boxCls: 'bg-brand/15 border-brand/30', iconCls: 'text-brand' },
};

/**
 * Rows for the profile's variant price table: one row per size / color that
 * has at least one price differing from the item's base price.
 */
const collectVariantPriceRows = (item: GarmentItem) => {
  if (!hasVariantPrices(item)) return [];
  const rows: { key: string; cost: string; consignment: string; retail: string }[] = [];
  const build = (keys: string[], kind: 'sizes' | 'colors') => {
    for (const key of keys) {
      const cost = resolveVariantPrice(item, 'costPrice', kind === 'sizes' ? key : null, kind === 'colors' ? key : null);
      const consignment = resolveVariantPrice(item, 'consignmentPrice', kind === 'sizes' ? key : null, kind === 'colors' ? key : null);
      const retail = resolveVariantPrice(item, 'retailPrice', kind === 'sizes' ? key : null, kind === 'colors' ? key : null);
      if (cost !== item.costPrice || consignment !== item.consignmentPrice || retail !== item.retailPrice) {
        rows.push({
          key: `${kind === 'sizes' ? 'سایز' : 'رنگ'} ${key}`,
          cost: formatToman(cost),
          consignment: formatToman(consignment),
          retail: formatToman(retail),
        });
      }
    }
  };
  build(item.sizes || [], 'sizes');
  build(item.colors || [], 'colors');
  return rows;
};

/* ------------------------------- small pieces -------------------------------- */

const StatBox: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <div className={`p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1 ${className}`}>
    <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-gray-400 block">{label}</span>
    <div className="text-sm font-black text-stone-900 dark:text-white">{children}</div>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-bold text-stone-600 dark:text-gray-300">
    {children}
  </span>
);

const Avatar: React.FC<{ name: string; url?: string; sizeCls?: string }> = ({ name, url, sizeCls = 'w-12 h-12 sm:w-14 sm:h-14' }) => (
  <SafeImage
    src={url}
    alt={name}
    className={`${sizeCls} rounded-2xl object-cover border border-brand/50 shrink-0`}
  />
);

const ContactRow: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-gray-300">
    <span className="text-brand shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/**
 * Bank accounts for people profiles: each account gets its own cardNumber and
 * shebaNumber lines, both click-to-copy with «کپی شد» feedback + toast.
 */
const CopyableValue: React.FC<{ value: string; copiedKey: string; current: string | null; onCopy: (key: string, value: string) => void }> = ({
  value,
  copiedKey,
  current,
  onCopy,
}) => (
  <button
    type="button"
    dir="ltr"
    onClick={() => onCopy(copiedKey, value)}
    className="block w-fit font-mono text-[11px] text-stone-700 dark:text-gray-300 hover:text-brand transition-colors"
    title="کلیک برای کپی"
  >
    {current === copiedKey ? (
      <span className="text-emerald-600 dark:text-emerald-400">کپی شد ✓</span>
    ) : (
      value
    )}
  </button>
);

const BankAccountsBlock: React.FC<{ accounts: { id?: string; bankName: string; cardNumber: string; shebaNumber: string }[] }> = ({ accounts }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (copiedKey === null) return;
    const t = setTimeout(() => setCopiedKey(null), 2500);
    return () => clearTimeout(t);
  }, [copiedKey]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedKey(key);
        toast.success('کپی شد');
      })
      .catch(() => toast.error('کپی انجام نشد'));
  };

  return (
    <ContactRow icon={<CreditCard className="w-3.5 h-3.5" />}>
      <div className="space-y-2">
        {accounts.map((acc, i) => (
          <div key={acc.id || i} className="space-y-0.5">
            {acc.bankName && <p className="text-[10px] font-bold text-stone-400">{acc.bankName}</p>}
            {acc.cardNumber && <CopyableValue value={acc.cardNumber} copiedKey={`${acc.id || i}-card`} current={copiedKey} onCopy={handleCopy} />}
            {acc.shebaNumber && <CopyableValue value={acc.shebaNumber} copiedKey={`${acc.id || i}-sheba`} current={copiedKey} onCopy={handleCopy} />}
          </div>
        ))}
      </div>
    </ContactRow>
  );
};

/** Gallery for the item profile: main image + thumbnail strip (hidden for a single image). */
const ItemGallery: React.FC<{ item: GarmentItem }> = ({ item }) => {
  const images = item.images && item.images.length > 0 ? item.images : item.imageUrl ? [item.imageUrl] : [];
  const [selected, setSelected] = useState<string | null>(images[0] ?? null);
  if (images.length === 0) return null;
  return (
    <section className="glass-panel p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-white/5 shadow-md space-y-3">
      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
        <Boxes className="w-5 h-5 text-brand" />
        <span>گالری تصاویر کالا</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SafeImage
          src={selected ?? images[0]!}
          alt={item.name}
          className="w-full aspect-[4/3] rounded-2xl object-cover border border-brand/30"
        />
        {images.length > 1 && (
          <div className="flex md:justify-end">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelected(img)}
                  className={`shrink-0 rounded-xl overflow-hidden border transition-all ${
                    (selected ?? images[0]) === img
                      ? 'border-brand ring-2 ring-brand/50'
                      : 'border-black/10 dark:border-white/10 hover:border-brand/50'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${item.name} — ${toPersianDigits(idx + 1)}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
/* --------------------------------- the page ---------------------------------- */

export const EntityProfilePage: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { items, sellers, consignments, payments, returns, staffMembers, owners, categories } = useData();

  // Expenses live outside DataContext (see WorkshopManager); fetched directly for owner profiles.
  const [ownerExpenses, setOwnerExpenses] = useState<WorkshopExpense[] | null>(null);

  useEffect(() => {
    if (type !== 'owners') return;
    let active = true;
    setOwnerExpenses(null);
    fetch('/api/workshop/expenses')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => {
        if (active) setOwnerExpenses(Array.isArray(list) ? (list as WorkshopExpense[]) : []);
      })
      .catch(() => {
        if (active) setOwnerExpenses([]);
      });
    return () => {
      active = false;
    };
  }, [type]);

  // Audit logs live outside DataContext (paginated server-side); fetched directly for staff/owner timelines.
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (type !== 'staff' && type !== 'owners') return;
    let active = true;
    auditApi
      .list(200, 0)
      .then((data) => {
        if (active) setAuditLogs(data.logs);
      })
      .catch(() => {
        if (active) setAuditLogs([]);
      });
    return () => {
      active = false;
    };
  }, [type]);


  /* ------------------------------- item profile ------------------------------ */

  const itemView = useMemo(() => {
    if (type !== 'items') return null;
    const item = items.find((i) => i.id === id);
    if (!item) return { missing: true as const };
    const categoryLabel =
      item.categoryLabel || categories.find((c) => c.id === item.category)?.label || item.category;

    const entries: TimelineEntry[] = [];
    for (const c of notDeleted<Consignment>(consignments)) {
      c.items.forEach((line: ConsignmentItemLine, idx: number) => {
        if (line.itemId !== item.id) return;
        const bits = [
          `فاکتور ${c.code}`,
          `سایز ${line.selectedSize || '—'} / رنگ ${line.selectedColor || '—'}`,
          `${toPersianDigits(line.quantity)} عدد`,
        ];
        const extras: string[] = [];
        if (line.soldQuantity > 0) extras.push(`فروش ${toPersianDigits(line.soldQuantity)} عدد`);
        if (line.returnedQuantity > 0) extras.push(`مرجوعی ${toPersianDigits(line.returnedQuantity)} عدد`);
        entries.push({
          id: `${c.id}-line-${idx}`,
          at: safeTime(c.date),
          kind: 'item_line',
          title: `واگذاری به ${c.sellerName}`,
          description: bits.join(' — ') + (extras.length ? ` • ${extras.join(' • ')}` : ''),
          amount: line.totalPrice,
        });
      });
    }
    for (const r of notDeleted<ConsignmentReturn>(returns)) {
      r.items.forEach((line, idx) => {
        if (line.itemId !== item.id) return;
        entries.push({
          id: `${r.id}-line-${idx}`,
          at: safeTime(r.date),
          kind: 'return_line',
          title: `بازگشت از ${r.sellerName}`,
          description: [
            `فاکتور ${r.consignmentCode}`,
            `${toPersianDigits(line.quantity)} عدد (${RETURN_CONDITION_LABELS[line.condition]})`,
            line.reason || '',
          ]
            .filter(Boolean)
            .join(' — '),
          amount: line.totalAmount,
        });
      });
    }
    entries.push({
      id: `${item.id}-created`,
      at: safeTime(item.createdAt),
      kind: 'created',
      title: 'ثبت کالا در انبار',
      description: `قیمت تمام‌شده کارگاه: ${formatToman(item.costPrice)}`,
    });

    return { missing: false as const, item, categoryLabel, entries };
  }, [type, id, items, consignments, returns, categories]);

  /* ------------------------------ seller profile ----------------------------- */

  const sellerView = useMemo(() => {
    if (type !== 'sellers') return null;
    const seller = sellers.find((s) => s.id === id);
    if (!seller) return { missing: true as const };

    const entries: TimelineEntry[] = [
      ...notDeleted<Consignment>(consignments)
        .filter((c) => c.sellerId === seller.id)
        .map(
          (c): TimelineEntry => ({
            id: c.id,
            at: safeTime(c.date),
            kind: 'consignment',
            title: 'فاکتور واگذاری',
            description: [
              `شماره ${c.code}`,
              `${toPersianDigits(c.items.length)} قلم کالا`,
              `وضعیت: ${CONSIGNMENT_STATUS_LABELS[c.status]}`,
              `مانده: ${formatToman(c.remainingAmount)}`,
              `موعد تسویه: ${toJalaliDate(c.dueDate)}`,
            ].join(' • '),
            amount: c.totalAmount,
          })
        ),
      ...notDeleted<PaymentRecord>(payments)
        .filter((p) => p.sellerId === seller.id)
        .map(
          (p): TimelineEntry => ({
            id: p.id,
            at: safeTime(p.date),
            kind: 'payment',
            title: 'دریافت وجه',
            description: [
              `رسید ${p.code}`,
              `روش: ${PAYMENT_METHOD_LABELS[p.paymentMethod]}`,
              p.trackingNumber ? `پیگیری: ${p.trackingNumber}` : '',
              p.notes || '',
            ]
              .filter(Boolean)
              .join(' • '),
            amount: p.amount,
          })
        ),
      ...notDeleted<ConsignmentReturn>(returns)
        .filter((r) => r.sellerId === seller.id)
        .map(
          (r): TimelineEntry => ({
            id: r.id,
            at: safeTime(r.date),
            kind: 'return',
            title: 'مرجوعی کالا',
            description: [`فاکتور ${r.consignmentCode}`, `${toPersianDigits(r.items.length)} قلم`, `تحویل‌گیرنده: ${r.processedBy}`].join(' • '),
            amount: r.totalReturnAmount,
          })
        ),
    ];
    return { missing: false as const, seller, entries };
  }, [type, id, sellers, consignments, payments, returns]);

  /* ------------------------------ staff profile ------------------------------ */

  const staffView = useMemo(() => {
    if (type !== 'staff') return null;
    const member = staffMembers.find((s) => s.id === id);
    if (!member) return { missing: true as const };

    const activityEntries: TimelineEntry[] = (member.activityHistory || []).map((a) => ({
      id: a.id,
      at: safeTime(a.date),
      kind: 'activity',
      title: a.title,
      description: [ACTIVITY_TYPE_LABELS[a.type], a.description].filter(Boolean).join(' • '),
    }));

    const name = member.name.trim();
    const auditEntries: TimelineEntry[] = auditLogs
      .filter(
        (log: AuditLog) =>
          (log.details || '').includes(name) || (log.action || '').includes(name)
      )
      .map((log) => ({
        id: log.id,
        at: safeTime(log.timestamp),
        kind: 'audit' as const,
        title: 'در لاگ سیستم',
        description: [log.action, log.details].filter(Boolean).join(' — '),
      }));

    return { missing: false as const, member, entries: [...activityEntries, ...auditEntries] };
  }, [type, id, staffMembers, auditLogs]);

  /* ------------------------------ owner profile ------------------------------ */

  const ownerView = useMemo(() => {
    if (type !== 'owners') return null;
    const owner = owners.find((o) => o.id === id);
    if (!owner) return { missing: true as const };

    const expenseList = ownerExpenses || [];
    const shareEntries: TimelineEntry[] = [];
    for (const exp of expenseList) {
      if (exp.isDeleted) continue;
      (exp.costShares || []).forEach((share, idx) => {
        if (share.recipientId !== owner.id) return;
        shareEntries.push({
          id: `${exp.id}-share-${idx}`,
          at: safeTime(exp.date),
          kind: 'cost_share',
          title: `سهم هزینه — ${exp.title}`,
          description: [
            exp.code ? `کد ${exp.code}` : '',
            `پرداخت‌کننده: ${exp.paidBy}`,
            share.isPaid ? 'تسویه‌شده' : 'پرداخت‌نشده',
          ]
            .filter(Boolean)
            .join(' • '),
          amount: share.requiredAmount,
        });
      });
    }

    const name = owner.name.trim();
    const auditEntries: TimelineEntry[] = auditLogs
      .filter((log) => (log.details || '').includes(name) || (log.action || '').includes(name))
      .map((log) => ({
        id: log.id,
        at: safeTime(log.timestamp),
        kind: 'audit' as const,
        title: 'در لاگ سیستم',
        description: [log.action, log.details].filter(Boolean).join(' — '),
      }));

    return {
      missing: false as const,
      owner,
      entries: [...shareEntries, ...auditEntries],
      sharesLoading: ownerExpenses === null,
    };
  }, [type, id, owners, ownerExpenses, auditLogs]);

  /* --------------------------------- renders --------------------------------- */

  const activeView = itemView || sellerView || staffView || ownerView;

  if (!['items', 'sellers', 'staff', 'owners'].includes(type || '') || !activeView || activeView.missing) {
    return (
      <div className="max-w-xl mx-auto mt-10 glass-panel rounded-2xl border border-stone-200 dark:border-white/5 p-8 text-center space-y-4">
        <SearchX className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-black text-stone-900 dark:text-white">پرونده مورد نظر پیدا نشد</h2>
        <p className="text-xs text-stone-500 dark:text-gray-400 leading-relaxed">
          ممکن است این پرونده حذف شده باشد یا آدرس اشتباه وارد شده است. از فهرست مربوطه دوباره انتخاب کنید.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on text-xs font-black transition-all active:scale-95"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت</span>
        </button>
      </div>
    );
  }

  const sortedEntries = [...activeView.entries].sort((a, b) => b.at - a.at);

  const headerBlock = (() => {

    if ('item' in activeView) {
      const { item, categoryLabel } = activeView;
      const isLowStock = item.stockQuantity <= item.minStockThreshold;
      const variantRows = collectVariantPriceRows(item);
      return (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={item.name} url={item.imageUrl} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-base sm:text-lg text-stone-900 dark:text-white truncate">{item.name}</h2>
                  <Badge variant="neutral">{item.code}</Badge>
                </div>
                <p className="text-[11px] text-brand font-bold mt-0.5">{categoryLabel}</p>
              </div>
            </div>
            <Badge variant={isLowStock ? 'warning' : 'success'}>
              {isLowStock ? 'کسری موجودی' : 'موجود'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatBox label="موجودی انبار">
              <span className={isLowStock ? 'text-amber-600 dark:text-amber-400' : ''}>
                {toPersianDigits(item.stockQuantity)} عدد
              </span>
            </StatBox>
            <StatBox label="ارزش موجودی (امانی)">
              <span className="font-mono">{formatToman(item.stockQuantity * item.consignmentPrice)}</span>
            </StatBox>
            <StatBox label="جنس پارچه">{item.fabric}</StatBox>
            <StatBox label="حد هشدار کسری">{toPersianDigits(item.minStockThreshold)} عدد</StatBox>
          </div>

          {/* Three-column price block */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-gray-400 block">
                قیمت تمام شده کارگاه
              </span>
              <div className="text-sm font-black font-mono text-stone-900 dark:text-white" dir="ltr">
                {formatToman(item.costPrice)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-brand/10 border border-brand/40 space-y-1">
              <span className="text-[10px] sm:text-[11px] text-brand font-bold block">
                قیمت امانی به دست‌فروش
              </span>
              <div className="text-sm font-black font-mono text-brand-ink dark:text-brand" dir="ltr">
                {formatToman(item.consignmentPrice)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-gray-400 block">
                قیمت فروشگاه سایت
              </span>
              <div className="text-sm font-black font-mono text-stone-900 dark:text-white" dir="ltr">
                {formatToman(item.retailPrice)}
              </div>
            </div>
          </div>

          {/* Sizes / colors labeled rows */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400 shrink-0">سایزها:</span>
              {(item.sizes || []).length === 0 ? (
                <span className="text-[11px] text-stone-400">—</span>
              ) : (
                (item.sizes || []).map((s) => <Chip key={`sz-${s}`}>سایز {s}</Chip>)
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400 shrink-0">رنگ‌ها:</span>
              {(item.colors || []).length === 0 ? (
                <span className="text-[11px] text-stone-400">—</span>
              ) : (
                (item.colors || []).map((c) => <Chip key={`cl-${c}`}>{c}</Chip>)
              )}
            </div>
          </div>

          {/* Variant price table */}
          {variantRows.length > 0 && (
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-3 space-y-2">
              <p className="text-[11px] font-bold text-brand">قیمت متغیر سایز / رنگ (متمایز از قیمت پایه)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-stone-500 dark:text-gray-400 border-b border-black/10 dark:border-white/10">
                      <th className="text-right py-1.5 px-2 font-bold">سایز / رنگ</th>
                      <th className="text-right py-1.5 px-2 font-bold">کارگاه</th>
                      <th className="text-right py-1.5 px-2 font-bold">امانی</th>
                      <th className="text-right py-1.5 px-2 font-bold">فروشگاه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantRows.map((row) => (
                      <tr key={row.key} className="border-b border-black/5 dark:border-white/5 last:border-0">
                        <td className="py-1.5 px-2 font-bold text-stone-800 dark:text-gray-200">{row.key}</td>
                        <td className="py-1.5 px-2 font-mono text-stone-600 dark:text-gray-300" dir="ltr">{row.cost}</td>
                        <td className="py-1.5 px-2 font-mono text-brand-ink dark:text-brand font-bold" dir="ltr">{row.consignment}</td>
                        <td className="py-1.5 px-2 font-mono text-stone-600 dark:text-gray-300" dir="ltr">{row.retail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Storefront description */}
          {item.description && (
            <div className="rounded-xl bg-stone-100/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
              <p className="text-[11px] font-bold text-brand mb-1">توضیحات کالا (فروشگاه سایت)</p>
              <p className="text-xs text-stone-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          )}
        </>
      );
    }

    if ('seller' in activeView) {
      const s = activeView.seller;
      const statusMeta =
        s.status === 'active'
          ? { label: 'فعال', variant: 'success' as const }
          : s.status === 'suspended'
            ? { label: 'معلق', variant: 'danger' as const }
            : { label: 'تسویه‌شده', variant: 'default' as const };
      return (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={s.name} url={s.avatarUrl} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-base sm:text-lg text-stone-900 dark:text-white truncate">{s.name}</h2>
                  <Badge variant="neutral">{s.code}</Badge>
                </div>
                <p className="text-[11px] text-brand font-bold mt-0.5">فروشنده امانی</p>
              </div>
            </div>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatBox label="بدهی فعلی">
              <span className="font-mono text-rose-500 dark:text-rose-400">{formatToman(s.currentDebt)}</span>
            </StatBox>
            <StatBox label="کل واگذاری‌ها">
              <span className="font-mono">{formatToman(s.totalHandoversValue)}</span>
            </StatBox>
            <StatBox label="کل دریافتی">
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatToman(s.totalPaid)}</span>
            </StatBox>
            <StatBox label="سقف اعتبار">
              <span className="font-mono">{formatToman(s.creditLimit)}</span>
            </StatBox>
          </div>

          <div className="pt-1 space-y-2 border-t border-black/5 dark:border-white/5">
            <ContactRow icon={<Phone className="w-3.5 h-3.5" />}>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[s.phone, ...(s.additionalPhones || [])].filter(Boolean).map((ph) => (
                  <a key={ph} href={`tel:${ph}`} dir="ltr" className="font-mono text-brand hover:underline">
                    {ph}
                  </a>
                ))}
              </div>
            </ContactRow>
            <ContactRow icon={<MapPin className="w-3.5 h-3.5" />}>
              <span>{s.streetLocation}</span>
            </ContactRow>
            {s.hasGuarantee ? (
              <ContactRow icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                <span>
                  {GUARANTEE_TYPE_LABELS[s.guaranteeType]} — {formatToman(s.guaranteeAmount)}
                  {s.guaranteeDetails ? ` (${s.guaranteeDetails})` : ''}
                </span>
              </ContactRow>
            ) : (
              <ContactRow icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                <span className="text-stone-400 dark:text-gray-500">بدون ضمانت ثبت‌شده</span>
              </ContactRow>
            )}
            {(s.bankAccounts || []).length > 0 && (
              <div className="pt-1 border-t border-black/5 dark:border-white/5">
                <BankAccountsBlock accounts={s.bankAccounts || []} />
              </div>
            )}
          </div>
        </>
      );
    }

    if ('member' in activeView) {
      const m = activeView.member;
      const statusMeta =
        m.status === 'active'
          ? { label: 'فعال', variant: 'success' as const }
          : m.status === 'leave'
            ? { label: 'مرخصی', variant: 'warning' as const }
            : { label: 'غیرفعال', variant: 'neutral' as const };
      return (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={m.name} url={m.avatarUrl} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-base sm:text-lg text-stone-900 dark:text-white truncate">{m.name}</h2>
                  <Badge variant="neutral">{m.code}</Badge>
                </div>
                <p className="text-[11px] text-brand font-bold mt-0.5">{m.roleTitle}</p>
              </div>
            </div>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatBox label="تاریخ استخدام">
              <span>{toJalaliDate(m.hireDate)}</span>
            </StatBox>
            <StatBox label="نوع حقوق">
              <span>{SALARY_TYPE_LABELS[m.salaryType]}</span>
            </StatBox>
            <StatBox label="مبلغ حقوق">
              <span className="font-mono">{formatToman(m.salaryAmount)}</span>
            </StatBox>
            <StatBox label="فعالیت‌های ثبت‌شده">
              <span>{toPersianDigits(m.activityHistory?.length || 0)} مورد</span>
            </StatBox>
          </div>

          {(m.phones || []).length > 0 && (
            <div className="pt-1 border-t border-black/5 dark:border-white/5 space-y-2">
              <ContactRow icon={<Phone className="w-3.5 h-3.5" />}>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {m.phones.map((ph) => (
                    <a key={ph} href={`tel:${ph}`} dir="ltr" className="font-mono text-brand hover:underline">
                      {ph}
                    </a>
                  ))}
                </div>
              </ContactRow>
              {m.address && (
                <ContactRow icon={<MapPin className="w-3.5 h-3.5" />}>
                  <span>{m.address}</span>
                </ContactRow>
              )}
              {(m.bankAccounts || []).length > 0 && <BankAccountsBlock accounts={m.bankAccounts || []} />}
            </div>
          )}
        </>
      );
    }

    // owner
    const o = activeView.owner;
    return (
      <>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={o.name} url={o.avatarUrl} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base sm:text-lg text-stone-900 dark:text-white truncate">{o.name}</h2>
                <Badge variant="gold">مالک و هم‌بنیان‌گذار</Badge>
              </div>
              <p className="text-[11px] text-brand font-bold mt-0.5">{o.role}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatBox label="سهم از کارگاه">
            <span className="text-brand">{toPersianDigits(o.sharePercentage)}٪</span>
          </StatBox>
          <StatBox label="تعداد دنگ">
            <span>{o.sharesCount != null ? `${toPersianDigits(o.sharesCount)} دنگ` : '—'}</span>
          </StatBox>
          <StatBox label="کد ملی">
            <span className="font-mono" dir="ltr">
              {o.nationalCode ? toPersianDigits(o.nationalCode) : '—'}
            </span>
          </StatBox>
          <StatBox label="تلفن‌ها">
            <div className="space-y-0.5">
              {(o.phones || []).map((ph) => (
                <a key={ph} href={`tel:${ph}`} dir="ltr" className="block font-mono text-[11px] text-brand hover:underline">
                  {ph}
                </a>
              ))}
            </div>
          </StatBox>
        </div>

        {o.bio && (
          <p className="text-xs text-stone-500 dark:text-gray-400 leading-relaxed border-t border-black/5 dark:border-white/5 pt-2">
            {o.bio}
          </p>
        )}

        {(o.bankAccounts || []).length > 0 && (
          <div className="pt-1 border-t border-black/5 dark:border-white/5">
            <BankAccountsBlock accounts={o.bankAccounts || []} />
          </div>
        )}
      </>
    );
  })();

  const historyTitle =
    type === 'staff' ? 'تاریخچه فعالیت‌ها و رخدادها' : type === 'owners' ? 'تاریخچه رویدادها و سهم هزینه‌ها' : 'تاریخچه رویدادها';

  return (
    <div className="space-y-5 text-stone-900 dark:text-white max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-input text-xs font-bold text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      {/* Summary card */}
      <section className="glass-panel p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-brand/20 shadow-md space-y-4">
        {headerBlock}
      </section>

      {'item' in activeView && <ItemGallery item={activeView.item} />}

      {/* History timeline */}
      <section className="glass-panel p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-white/5 shadow-md">
        <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-brand" />
          <span>{historyTitle}</span>
        </h3>

        {'sharesLoading' in activeView && activeView.sharesLoading ? (
          <p className="py-8 text-center text-xs text-stone-400">در حال دریافت تاریخچه هزینه‌ها…</p>
        ) : sortedEntries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CalendarClock className="w-10 h-10 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-500 dark:text-gray-400">رویدادی ثبت نشده است</p>
          </div>
        ) : (
          <ol className="relative space-y-4 pr-1">
            {sortedEntries.map((e) => {
              const meta = KIND_META[e.kind];
              const { Icon } = meta;
              return (
                <li key={e.id} className="relative flex items-start gap-3">
                  <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${meta.boxCls}`}>
                    <Icon className={`w-4 h-4 ${meta.iconCls}`} />
                  </span>
                  <div className="flex-1 min-w-0 pb-1 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-gray-200">{e.title}</span>
                      {e.amount != null && (
                        <span
                          className={`text-xs font-black font-mono shrink-0 ${
                            e.kind === 'payment'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : e.kind === 'return' || e.kind === 'return_line'
                                ? 'text-rose-500 dark:text-rose-400'
                                : 'text-stone-700 dark:text-gray-300'
                          }`}
                          dir="ltr"
                        >
                          {formatToman(e.amount)}
                        </span>
                      )}
                    </div>
                    {e.description && (
                      <p className="mt-0.5 text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed break-words">
                        {e.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-stone-400 dark:text-gray-500 font-mono" dir="rtl">
                      {toJalaliDateTime(e.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
};

export default EntityProfilePage;

