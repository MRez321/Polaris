import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Eye,
  Clock,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { Consignment, Seller, GarmentItem } from '../../types';
import { formatToman, toPersianDigits, toJalaliDate, getDaysDifference } from '../../utils/persian';
import { Badge } from '../common/Badge';
import { NewHandoverModal } from './NewHandoverModal';
import { ReturnModal } from './ReturnModal';
import { ConsignmentReceipt } from './ConsignmentReceipt';

interface HandoverManagerProps {
  consignments: Consignment[];
  sellers: Seller[];
  items: GarmentItem[];
  onSubmitHandover: (data: any) => void;
  onSubmitReturn: (data: any) => void;
  onRecordPaymentForSeller: (sellerId: string) => void;
  selectedConsignmentForView?: Consignment | null;
  onClearSelectedConsignment?: () => void;
  onQuickCreateSeller?: (seller: Partial<Seller>) => void;
  onQuickCreateItem?: (item: Partial<GarmentItem>) => void;
}

export const HandoverManager: React.FC<HandoverManagerProps> = ({
  consignments = [],
  sellers = [],
  items = [],
  onSubmitHandover,
  onSubmitReturn,
  onRecordPaymentForSeller,
  selectedConsignmentForView,
  onClearSelectedConsignment,
  onQuickCreateSeller,
  onQuickCreateItem,
}) => {
  const safeConsignments = consignments || [];
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'overdue' | 'settled'>('all');
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [returnModalConsignment, setReturnModalConsignment] = useState<Consignment | null>(null);
  const [receiptConsignment, setReceiptConsignment] = useState<Consignment | null>(
    selectedConsignmentForView || null
  );

  React.useEffect(() => {
    if (selectedConsignmentForView) {
      setReceiptConsignment(selectedConsignmentForView);
    }
  }, [selectedConsignmentForView]);

  const filteredConsignments = safeConsignments.filter((c) => {
    const matchesSearch =
      (c.sellerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(search.toLowerCase());

    const isOverdue = (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now();

    if (tabFilter === 'active') return matchesSearch && (c.remainingAmount || 0) > 0 && !isOverdue;
    if (tabFilter === 'overdue') return matchesSearch && isOverdue;
    if (tabFilter === 'settled') return matchesSearch && (c.remainingAmount || 0) === 0;
    return matchesSearch;
  });

  const overdueCount = safeConsignments.filter(
    (c) => (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now()
  ).length;

  const totalActiveDebt = safeConsignments.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

  return (
    <div className="space-y-6 text-stone-900 dark:text-white">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-stone-200 dark:border-[#CEAE80]/20 shadow-md">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#CEAE80]" />
            <span className="text-amber-800 dark:text-[#CEAE80] font-black">مدیریت فاکتورهای واگذاری امانی به دست‌فروشان</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            {toPersianDigits(consignments.length)} فاکتور ثبت شده • کل مانده امانت نزد فروشندگان:{' '}
            <span className="font-black text-amber-800 dark:text-[#CEAE80] font-mono">
              {formatToman(totalActiveDebt)}
            </span>
          </p>
        </div>

        <button
          onClick={() => setIsHandoverModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>واگذاری امانی جدید (تحویل بار)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-stone-200 dark:border-white/5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی شماره فاکتور (HND) یا نام فروشنده..."
            className="w-full pl-4 pr-9 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tabFilter === 'all'
                ? 'bg-[#CEAE80] text-black shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            همه فاکتورها ({toPersianDigits(consignments.length)})
          </button>
          <button
            onClick={() => setTabFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tabFilter === 'active'
                ? 'bg-[#CEAE80] text-black shadow-md'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            جاری و در جریان
          </button>
          <button
            onClick={() => setTabFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tabFilter === 'overdue'
                ? 'bg-rose-500/20 text-rose-700 dark:text-red-300 border border-rose-500/40 font-black'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            سررسید گذشته ({toPersianDigits(overdueCount)})
          </button>
          <button
            onClick={() => setTabFilter('settled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tabFilter === 'settled'
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-green-300 border border-emerald-500/40 font-black'
                : 'bg-stone-100 dark:bg-[#1A1A1E] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-white/5'
            }`}
          >
            تسویه شده کامل
          </button>
        </div>
      </div>

      {/* Consignments List Table */}
      <div className="glass-panel rounded-2xl border border-stone-200 dark:border-white/5 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100 dark:bg-[#1A1A1E] text-stone-700 dark:text-gray-300 font-bold border-b border-stone-200 dark:border-white/10">
              <tr>
                <th className="p-3.5">شماره فاکتور</th>
                <th className="p-3.5">فروشنده</th>
                <th className="p-3.5">اقلام و تعداد</th>
                <th className="p-3.5">تاریخ واگذاری</th>
                <th className="p-3.5">موعد تسویه</th>
                <th className="p-3.5">مبلغ کل</th>
                <th className="p-3.5">مانده بدهی</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-white/5">
              {filteredConsignments.map((c) => {
                const isOverdue =
                  (c.remainingAmount || 0) > 0 && new Date(c.dueDate).getTime() < Date.now();
                const totalItemsCount = (c.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-3.5 font-mono font-black text-amber-800 dark:text-[#CEAE80]">
                      {c.code}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-stone-900 dark:text-white block">
                        {c.sellerName}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-stone-800 dark:text-gray-300">{toPersianDigits(totalItemsCount)} قلم لباس</span>
                      <span className="text-[10px] text-stone-500 dark:text-gray-400 block truncate max-w-[150px]">
                        {c.items.map((i) => i.itemName).join('، ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-500 dark:text-gray-400">{toJalaliDate(c.date)}</td>
                    <td className="p-3.5">
                      <span
                        className={`font-bold ${
                          isOverdue
                            ? 'text-rose-600 dark:text-red-400'
                            : 'text-stone-700 dark:text-gray-300'
                        }`}
                      >
                        {toJalaliDate(c.dueDate)}
                      </span>
                      {isOverdue && (
                        <span className="block text-[10px] text-rose-600 dark:text-red-400 font-bold">
                          {toPersianDigits(Math.abs(getDaysDifference(c.dueDate)))} روز تاخیر
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-stone-700 dark:text-gray-300">{formatToman(c.totalAmount)}</td>
                    <td className="p-3.5 font-bold font-mono text-stone-900 dark:text-white">
                      {c.remainingAmount === 0 ? (
                        <span className="text-emerald-600 dark:text-green-400 font-bold">۰ (تسویه)</span>
                      ) : (
                        <span className="text-amber-800 dark:text-[#CEAE80] font-black">{formatToman(c.remainingAmount)}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          c.remainingAmount === 0
                            ? 'success'
                            : isOverdue
                            ? 'danger'
                            : c.paidAmount > 0
                            ? 'gold'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {c.remainingAmount === 0
                          ? 'تسویه کامل'
                          : isOverdue
                          ? 'سررسید گذشته'
                          : c.paidAmount > 0
                          ? 'تسویه جزیی'
                          : 'در انتظار پرداخت'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setReceiptConsignment(c)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-white/5 hover:bg-[#CEAE80]/20 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-[#CEAE80] border border-stone-200 dark:border-white/10 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          title="مشاهده و چاپ رسید فاکتور"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-700 dark:text-[#CEAE80]" />
                          <span>رسید فاکتور</span>
                        </button>
                        {c.remainingAmount > 0 && (
                          <>
                            <button
                              onClick={() => setReturnModalConsignment(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                              title="ثبت مرجوعی کالا"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>مرجوعی</span>
                            </button>
                            <button
                              onClick={() => onRecordPaymentForSeller(c.sellerId)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-[#CEAE80]/15 hover:bg-[#CEAE80] text-amber-800 dark:text-[#CEAE80] hover:text-black border border-amber-500/30 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm"
                              title="ثبت دریافت وجه و تسویه"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>تسویه</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Handover Modal */}
      <NewHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        sellers={sellers}
        items={items}
        onSubmitHandover={onSubmitHandover}
        onQuickCreateSeller={onQuickCreateSeller}
        onQuickCreateItem={onQuickCreateItem}
      />

      {/* Return Modal */}
      <ReturnModal
        isOpen={Boolean(returnModalConsignment)}
        onClose={() => setReturnModalConsignment(null)}
        consignment={returnModalConsignment}
        onSubmitReturn={onSubmitReturn}
      />

      {/* Receipt Modal */}
      <ConsignmentReceipt
        isOpen={Boolean(receiptConsignment)}
        onClose={() => {
          setReceiptConsignment(null);
          if (onClearSelectedConsignment) onClearSelectedConsignment();
        }}
        consignment={receiptConsignment}
        seller={sellers.find((s) => s.id === receiptConsignment?.sellerId)}
        onOpenReturn={(c) => setReturnModalConsignment(c)}
        onRecordPayment={onRecordPaymentForSeller}
      />
    </div>
  );
};
