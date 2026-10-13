/**
 * GlobalSearch — a Spotlight-style overlay for the unified console.
 *
 * Triggered from the Header (search trigger button + Ctrl/Cmd+K) and rendered
 * inside a <Modal>. Hits come only from the in-memory DataContext entities
 * (already fetched from real backend endpoints by DataProvider) — nothing is
 * fabricated. Results deep-link to the entity profile / relevant list page.
 *
 * Scope filter lets the user narrow to one concern; badges show live match
 * counts per scope. Escape / backdrop / close button dismiss; Enter on a
 * highlighted result navigates and closes.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  User,
  FileText,
  CreditCard,
  History,
  Shield,
  Landmark,
} from 'lucide-react';
import type { Consignment, ConsignmentReturn, GarmentItem, PaymentRecord, Seller, StaffMember, Owner } from '@/types';
import { useData } from '@/modules/workshop/context/DataContext';
import { toPersianDigits } from '@/utils/persian';
import { Modal } from '@/components/common/Modal';

type Scope = 'all' | 'items' | 'sellers' | 'consignments' | 'payments' | 'returns' | 'staff' | 'owners';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  path: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCOPE_OPTIONS: { value: Scope; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'همه', icon: <Search className="w-3.5 h-3.5" /> },
  { value: 'items', label: 'کالاها', icon: <Package className="w-3.5 h-3.5" /> },
  { value: 'sellers', label: 'فروشندگان', icon: <User className="w-3.5 h-3.5" /> },
  { value: 'consignments', label: 'امانات', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'payments', label: 'دریافت‌ها', icon: <CreditCard className="w-3.5 h-3.5" /> },
  { value: 'returns', label: 'مرجوعی', icon: <History className="w-3.5 h-3.5" /> },
  { value: 'staff', label: 'پرسنل', icon: <Shield className="w-3.5 h-3.5" /> },
  { value: 'owners', label: 'هم‌بنیان‌گذاران', icon: <Landmark className="w-3.5 h-3.5" /> },
];

const PER_SCOPE_LIMIT = 6;

const match = (q: string, ...fields: (string | undefined | null)[]) => {
  if (!q) return false;
  const hay = fields.map((f) => String(f ?? '')).join(' ').toLowerCase();
  return hay.includes(q);
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onOpenChange }) => {
  const { items, sellers, consignments, payments, returns, staffMembers, owners } = useData();
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState<Scope>('all');

  // Global Ctrl/Cmd+K opener (console-only, since this component mounts in the Header).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  // Focus the input whenever the overlay opens.
  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  const close = () => {
    setQuery('');
    setScope('all');
    onOpenChange(false);
  };

  const navigateTo = (path: string) => {
    close();
    navigate(path);
  };

  const q = query.trim().toLowerCase();

  const resultsByScope: Record<Exclude<Scope, 'all'>, SearchResult[]> = {
    items: [],
    sellers: [],
    consignments: [],
    payments: [],
    returns: [],
    staff: [],
    owners: [],
  };

  if (q) {
    resultsByScope.items = items
      .filter((i) => match(q, i.name, i.code, i.categoryLabel))
      .slice(0, PER_SCOPE_LIMIT)
      .map((i: GarmentItem) => ({
        id: i.id,
        title: i.name,
        subtitle: `کد ${i.code} • ${i.categoryLabel || 'بدون دسته'}`,
        icon: <Package className="w-4 h-4 text-amber-500" />,
        path: `/console/profile/items/${i.id}`,
      }));

    resultsByScope.sellers = sellers
      .filter((s) => match(q, s.name, s.code, s.phone))
      .slice(0, PER_SCOPE_LIMIT)
      .map((s: Seller) => ({
        id: s.id,
        title: s.name,
        subtitle: `کد ${s.code} • ${s.phone || ''}`,
        icon: <User className="w-4 h-4 text-blue-500" />,
        path: `/console/profile/sellers/${s.id}`,
      }));

    resultsByScope.consignments = consignments
      .filter((c) => match(q, c.code, c.sellerName))
      .slice(0, PER_SCOPE_LIMIT)
      .map((c: Consignment) => ({
        id: c.id,
        title: c.sellerName,
        subtitle: `کد امانی ${c.code} • موعد ${c.dueDate}`,
        icon: <FileText className="w-4 h-4 text-brand" />,
        path: '/console/consignments',
      }));

    resultsByScope.payments = payments
      .filter((p) => match(q, p.code, p.sellerName))
      .slice(0, PER_SCOPE_LIMIT)
      .map((p: PaymentRecord) => ({
        id: p.id,
        title: p.sellerName,
        subtitle: `کد دریافت ${p.code} • ${p.date}`,
        icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
        path: '/console/finances/payments',
      }));

    resultsByScope.returns = returns
      .filter((r) => match(q, r.sellerName, r.consignmentCode, r.id))
      .slice(0, PER_SCOPE_LIMIT)
      .map((r: ConsignmentReturn) => ({
        id: r.id,
        title: r.sellerName,
        subtitle: `مرجوعی ${r.consignmentCode || '—'} • ${r.date}`,
        icon: <History className="w-4 h-4 text-rose-500" />,
        path: '/console/returns',
      }));

    resultsByScope.staff = staffMembers
      .filter((s) => match(q, s.name, s.code, s.roleTitle, ...s.phones))
      .slice(0, PER_SCOPE_LIMIT)
      .map((s: StaffMember) => ({
        id: s.id,
        title: s.name,
        subtitle: `کد ${s.code} • ${s.roleTitle || s.role}`,
        icon: <Shield className="w-4 h-4 text-orange-500" />,
        path: `/console/profile/staff/${s.id}`,
      }));

    resultsByScope.owners = owners
      .filter((o) => match(q, o.name, o.nationalCode, ...o.phones))
      .slice(0, PER_SCOPE_LIMIT)
      .map((o: Owner) => ({
        id: o.id,
        title: o.name,
        subtitle: o.role,
        icon: <Landmark className="w-4 h-4 text-violet-500" />,
        path: `/console/profile/owners/${o.id}`,
      }));
  }

  const activeScopes = scope === 'all' ? (Object.keys(resultsByScope) as Exclude<Scope, 'all'>[]) : [scope];
  const totalResults = activeScopes.reduce((sum, s) => sum + resultsByScope[s].length, 0);

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="جستجوی سریع"
      subtitle="جستجو در کالاها، فروشندگان، امانات، دریافت‌ها و پرسنل. کلید ترکیبی Ctrl/Cmd+K."
      maxWidth="2xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && open && totalResults > 0) {
                const first = activeScopes
                  .flatMap((s) => resultsByScope[s])
                  .slice(0, 1)[0];
                if (first) navigateTo(first.path);
              }
            }}
            placeholder="جستجو در کد، نام یا شماره موبایل..."
            className="w-full px-3 py-2 pl-9 rounded-xl glass-input text-sm outline-none"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SCOPE_OPTIONS.map((opt) => {
            const matches = resultsByScope[opt.value as Exclude<Scope, 'all'>]?.length ?? 0;
            const selected = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all ${
                  selected
                    ? 'bg-brand text-brand-on shadow-sm'
                    : 'glass-card text-stone-700 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/10'
                }`}
              >
                {opt.icon}
                {opt.label}
                {opt.value !== 'all' && matches > 0 ? (
                  <span className="bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-gray-300 rounded-full px-1.5 py-0.5">
                    {toPersianDigits(matches)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-1 max-h-[420px] overflow-y-auto">
          {!q ? (
            <p className="text-[11px] text-stone-500 dark:text-gray-400 py-6 text-center">
              متن خود را برای جستجو بنویسید.
            </p>
          ) : totalResults === 0 ? (
            <p className="text-[11px] text-stone-500 dark:text-gray-400 py-6 text-center">
              نتیجه‌ای یافت نشد.
            </p>
          ) : (
            activeScopes.map((s) => {
              const list = resultsByScope[s];
              if (!list.length) return null;
              return (
                <div key={s} className="space-y-0.5">
                  <p className="text-[10px] font-black tracking-wide text-stone-400 dark:text-gray-500">
                    {SCOPE_OPTIONS.find((o) => o.value === s)?.label ?? s}
                  </p>
                  {list.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => navigateTo(r.path)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl glass-card hover:border-brand/40 text-right transition-all"
                    >
                      <span className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#1E1E1E] flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                        {r.icon}
                      </span>
                      <div className="min-w-0 text-right">
                        <p className="font-black text-xs text-stone-900 dark:text-white truncate">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-gray-400 truncate">
                          {r.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
