import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Receipt,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import type { Seller, Consignment, PaymentRecord, ConsignmentReturn } from '../../types';
import { formatToman, toPersianDigits } from '../../utils/persian';
import { SellerFormModal } from './SellerFormModal';
import { SellerProfileDrawer } from './SellerProfileDrawer';
import { SelectMenu } from '../ui/select-menu';

interface SellersManagerProps {
  sellers: Seller[];
  consignments: Consignment[];
  payments: PaymentRecord[];
  returns: ConsignmentReturn[];
  onAddSeller: (sellerData: Partial<Seller>) => void;
  onUpdateSeller: (id: string, sellerData: Partial<Seller>) => void;
  onDeleteSeller: (id: string) => void;
  onQuickHandover?: (seller: Seller) => void;
  onQuickPayment?: (seller: Seller) => void;
  onSelectConsignment?: (c: Consignment) => void;
}

export const SellersManager: React.FC<SellersManagerProps> = ({
  sellers = [],
  consignments = [],
  payments = [],
  returns = [],
  onAddSeller,
  onUpdateSeller,
  onDeleteSeller,
  onQuickHandover = () => {},
  onQuickPayment = () => {},
  onSelectConsignment = () => {},
}) => {
  const safeSellers = sellers || [];
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'top_paid' | 'highest_debt' | 'turnover'>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [selectedProfileSeller, setSelectedProfileSeller] = useState<Seller | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/\s|-/g, ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const filteredSellers = safeSellers
    .filter((seller) => {
      const matchesSearch =
        (seller.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (seller.phone || '').includes(search) ||
        (seller.streetLocation || '').toLowerCase().includes(search.toLowerCase()) ||
        (seller.code || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'debtors' && (seller.currentDebt || 0) > 0) ||
        (statusFilter === 'settled' && (seller.currentDebt || 0) === 0) ||
        (statusFilter === 'active' && seller.status === 'active');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'top_paid') return (b.totalPaid || 0) - (a.totalPaid || 0);
      if (sortBy === 'highest_debt') return (b.currentDebt || 0) - (a.currentDebt || 0);
      if (sortBy === 'turnover') return (b.totalHandoversValue || 0) - (a.totalHandoversValue || 0);
      return 0;
    });

  const totalDebts = safeSellers.reduce((sum, s) => sum + (s.currentDebt || 0), 0);
  const totalPaidSum = safeSellers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);

  const handleEdit = (e: React.MouseEvent, seller: Seller) => {
    e.stopPropagation();
    setEditingSeller(seller);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, seller: Seller) => {
    e.stopPropagation();
    if (seller.currentDebt > 0) {
      alert('امکان حذف فروشنده دارای مانده بدهی وجود ندارد. ابتدا فاکتورها را تسویه فرمایید.');
      return;
    }
    if (
      confirm(
        `آیا از انتقال پرونده "${seller.name}" به سطل بازیافت اطمینان دارید؟ در بخش تنظیمات و سطل بازیافت قابل بازگردانی خواهد بود.`
      )
    ) {
      onDeleteSeller(seller.id);
    }
  };

  return (
    <div className="space-y-6 text-stone-900 dark:text-white">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">فروشندگان خیابانی و توزیع‌کنندگان امانی راسته بازار</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            {toPersianDigits(sellers.length)} بساط‌دار و توزیع‌کننده فعال • مجموع مانده طلب کارگاه:{' '}
            <span className="font-bold text-rose-500 dark:text-rose-400 font-mono" dir="ltr">
              {formatToman(totalDebts)}
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSeller(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 self-stretch sm:self-auto justify-center"
        >
          <UserPlus className="w-4 h-4 text-black" />
          <span>ثبت فروشنده و دست‌فروش جدید</span>
        </button>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-[#CEAE80]/30 space-y-1">
          <span className="text-xs text-stone-500 dark:text-gray-400 block">کل مطالبات وصول نشده:</span>
          <div className="text-lg font-black text-rose-500 dark:text-rose-400 font-mono" dir="ltr">
            {formatToman(totalDebts)}
          </div>
          <span className="text-[10px] text-stone-400">مانده حساب در دست فروشندگان</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 space-y-1">
          <span className="text-xs text-stone-500 dark:text-gray-400 block">مجموع کل تسویه‌های دریافتی:</span>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {formatToman(totalPaidSum)}
          </div>
          <span className="text-[10px] text-stone-400">مبالغ واریز شده به حساب کارگاه</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-blue-500/30 space-y-1">
          <span className="text-xs text-stone-500 dark:text-gray-400 block">فروشندگان تسویه کامل:</span>
          <div className="text-lg font-black text-blue-500 font-mono">
            {toPersianDigits(safeSellers.filter((s) => (s.currentDebt || 0) === 0).length)} نفر
          </div>
          <span className="text-[10px] text-stone-400">حساب صفر و آماده تحویل بار جدید</span>
        </div>
      </div>

      {/* Search, Filter & Ranking Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between shadow-md">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام فروشنده، شماره تماس، کد شناسایی، راسته بساط..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-black/40 p-1 rounded-xl border border-black/5 dark:border-white/5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              همه ({toPersianDigits(sellers.length)})
            </button>
            <button
              onClick={() => setStatusFilter('debtors')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'debtors'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              دارای بدهی
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'settled'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              تسویه کامل
            </button>
          </div>

          {/* Ranking & Sort */}
          <SelectMenu
            value={sortBy}
            onChange={(v) => setSortBy(v as 'default' | 'top_paid' | 'highest_debt' | 'turnover')}
            className="w-full sm:w-auto"
            options={[
              { value: 'default', label: 'مرتب‌سازی پیش‌فرض' },
              { value: 'top_paid', label: '🏆 رتبه‌بندی: بیشترین تسویه (فروشندگان برتر)' },
              { value: 'highest_debt', label: '⚠️ بیشترین مانده بدهی' },
              { value: 'turnover', label: '📦 بیشترین گردش بار تحویلی' },
            ]}
          />
        </div>
      </div>

      {/* Sellers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSellers.map((seller, index) => {
          const debtPercentage = Math.min(
            100,
            Math.round(((seller.currentDebt || 0) / (seller.creditLimit || 1)) * 100)
          );

          return (
            <div
              onClick={() => navigate(`/profile/sellers/${seller.id}`)}
              className="glass-card p-4 sm:p-5 rounded-2xl hover:border-[#CEAE80]/50 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3.5 group relative"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge if sorted by top paid */}
                    {sortBy === 'top_paid' && (
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          index === 0
                            ? 'bg-[#CEAE80] text-black shadow-md'
                            : 'bg-stone-200 dark:bg-black/50 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {toPersianDigits(index + 1)}
                      </div>
                    )}

                    {seller.avatarUrl ? (
                      <img
                        src={seller.avatarUrl}
                        alt={seller.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover border border-[#CEAE80]/40 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#CEAE80]/20 text-[#CEAE80] flex items-center justify-center font-black text-sm border border-[#CEAE80]/40 shrink-0">
                        {seller.name.slice(0, 1)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base truncate group-hover:text-[#CEAE80] transition-colors">
                          {seller.name}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-black/50 text-stone-600 dark:text-stone-400 font-mono">
                          {seller.code}
                        </span>
                      </div>

                      {/* Clickable Phone Number */}
                      <a
                        href={`tel:${seller.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#CEAE80] hover:underline font-mono inline-flex items-center gap-1 mt-0.5"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3 text-[#CEAE80]" />
                        <span>{seller.phone}</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleEdit(e, seller)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="ویرایش مشخصات فروشنده"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, seller)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="انتقال به سطل بازیافت"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="mt-2.5 flex items-start gap-1.5 text-xs text-stone-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-[#CEAE80] shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{seller.streetLocation}</span>
                </div>

                {/* Financial Boxes - Strictly enclosed inside cards */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">مانده بدهی جاری:</span>
                    <div className="font-black text-xs sm:text-sm font-mono text-rose-500 dark:text-rose-400 truncate text-left" dir="ltr">
                      {formatToman(seller.currentDebt || 0)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">کل تسویه‌ها:</span>
                    <div className="font-black text-xs sm:text-sm font-mono text-emerald-600 dark:text-emerald-400 truncate text-left" dir="ltr">
                      {formatToman(seller.totalPaid || 0)}
                    </div>
                  </div>
                </div>

                {/* Bank Card / Sheba Accounts with Full Container 1-Click Copy */}
                {seller.bankAccounts && seller.bankAccounts.length > 0 && (
                  <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    {seller.bankAccounts.slice(0, 2).map((acc, aIdx) => {
                      const cKey = `seller-${seller.id}-card-${aIdx}`;
                      const sKey = `seller-${seller.id}-sheba-${aIdx}`;
                      const isCardCopied = copiedKey === cKey;
                      const isShebaCopied = copiedKey === sKey;

                      return (
                        <div key={aIdx} className="space-y-1">
                          {acc.cardNumber && (
                            <div
                              onClick={(e) => handleCopy(acc.cardNumber, cKey, e)}
                              className="p-2 rounded-xl bg-stone-100 dark:bg-black/30 hover:bg-[#CEAE80]/15 dark:hover:bg-[#CEAE80]/15 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all group"
                              title="کلیک روی کل کادر برای کپی شماره کارت"
                            >
                              <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-mono" dir="ltr">
                                <CreditCard className="w-3.5 h-3.5 text-[#CEAE80]" />
                                <span className="text-[11px] font-bold tracking-wider">{acc.cardNumber}</span>
                              </div>
                              <span className="text-[10px] text-[#CEAE80] font-bold flex items-center gap-1">
                                {isCardCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                    <span>کپی کارت</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}

                          {!acc.cardNumber && acc.shebaNumber && (
                            <div
                              onClick={(e) => handleCopy(acc.shebaNumber, sKey, e)}
                              className="p-2 rounded-xl bg-stone-100 dark:bg-black/30 hover:bg-[#CEAE80]/15 dark:hover:bg-[#CEAE80]/15 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all group"
                              title="کلیک برای کپی شماره شبا"
                            >
                              <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-mono" dir="ltr">
                                <span className="text-[10px] text-stone-400 font-sans">شبا:</span>
                                <span className="text-[10px] truncate max-w-[170px]">{acc.shebaNumber}</span>
                              </div>
                              <span className="text-[10px] text-[#CEAE80] font-bold flex items-center gap-1">
                                {isShebaCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                    <span>کپی شبا</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {seller.bankAccounts.length > 2 && (
                      <div className="text-left">
                        <span className="text-[10px] text-stone-400 font-bold hover:text-[#CEAE80] cursor-pointer">
                          + {toPersianDigits(seller.bankAccounts.length - 2)} حساب دیگر در پرونده
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar for credit limit */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                    <span>مصرف سقف امانت: {toPersianDigits(debtPercentage)}٪</span>
                    <span>سقف: {formatToman(seller.creditLimit || 30000000)}</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-black/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        debtPercentage > 85
                          ? 'bg-rose-500'
                          : debtPercentage > 50
                          ? 'bg-amber-500'
                          : 'bg-[#CEAE80]'
                      }`}
                      style={{ width: `${debtPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action buttons */}
              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfileSeller(seller);
                  }}
                  className="p-2 rounded-xl glass-card hover:border-[#CEAE80] text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                  title="مشاهده پرونده و فاکتورها"
                >
                  <Eye className="w-4 h-4 text-[#CEAE80]" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickHandover(seller);
                  }}
                  className="flex-1 py-2 rounded-xl glass-card hover:border-[#CEAE80] text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#CEAE80]" />
                  <span>تحویل بار</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickPayment(seller);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Receipt className="w-3.5 h-3.5 text-black" />
                  <span>دریافت وجه</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seller Form Modal */}
      <SellerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSeller(null);
        }}
        onSave={(data) => {
          if (editingSeller) {
            onUpdateSeller(editingSeller.id, data);
          } else {
            onAddSeller(data);
          }
        }}
        editSeller={editingSeller}
      />

      {/* Seller Profile Drawer */}
      <SellerProfileDrawer
        seller={selectedProfileSeller}
        consignments={consignments}
        payments={payments}
        returns={returns}
        onClose={() => setSelectedProfileSeller(null)}
        onEditSeller={(s) => {
          setSelectedProfileSeller(null);
          setEditingSeller(s);
          setIsModalOpen(true);
        }}
        onNewHandover={(s) => {
          setSelectedProfileSeller(null);
          onQuickHandover(s);
        }}
        onNewPayment={(s) => {
          setSelectedProfileSeller(null);
          onQuickPayment(s);
        }}
        onSelectConsignment={(c) => {
          setSelectedProfileSeller(null);
          onSelectConsignment(c);
        }}
      />
    </div>
  );
};
