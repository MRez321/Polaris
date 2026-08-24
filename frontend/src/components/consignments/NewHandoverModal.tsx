import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { GarmentItem, Seller } from '../../types';
import { formatToman, toPersianDigits } from '../../utils/persian';
import {
  Plus,
  Trash2,
  User,
  Package,
  AlertCircle,
  Search,
  UserPlus,
  PackagePlus,
  MapPin,
} from 'lucide-react';
import { SellerFormModal } from '../sellers/SellerFormModal';
import { ItemFormModal } from '../inventory/ItemFormModal';
import { SelectMenu, SelectBadge, SelectOptionContent, persianColorToCss } from '../ui/select-menu';

interface NewHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: Seller[];
  items: GarmentItem[];
  preSelectedSeller?: Seller | null;
  onSubmitHandover: (data: {
    sellerId: string;
    dueDate: string;
    itemsList: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      selectedSize?: string;
      selectedColor?: string;
    }[];
    notes?: string;
  }) => void;
  onQuickCreateSeller?: (sellerData: Partial<Seller>) => void;
  onQuickCreateItem?: (itemData: Partial<GarmentItem>) => void;
}

export const NewHandoverModal: React.FC<NewHandoverModalProps> = ({
  isOpen,
  onClose,
  sellers = [],
  items = [],
  preSelectedSeller,
  onSubmitHandover,
  onQuickCreateSeller,
  onQuickCreateItem,
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState(
    preSelectedSeller?.id || (sellers.length > 0 ? sellers[0].id : '')
  );
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [dueDays, setDueDays] = useState('10');
  const [notes, setNotes] = useState('');

  // Modals for on-the-spot creation
  const [isQuickSellerModalOpen, setIsQuickSellerModalOpen] = useState(false);
  const [isQuickItemModalOpen, setIsQuickItemModalOpen] = useState(false);

  // Selected item lines for handover
  const [lines, setLines] = useState<
    {
      itemId: string;
      quantity: number;
      unitPrice: number;
      selectedSize: string;
      selectedColor: string;
    }[]
  >([]);

  // Current line item being selected
  const [currentSelectedItemId, setCurrentSelectedItemId] = useState(
    items.length > 0 ? items[0].id : ''
  );
  const [currentQty, setCurrentQty] = useState(5);
  const [currentSize, setCurrentSize] = useState('');
  const [currentColor, setCurrentColor] = useState('');

  // Filter sellers by search query
  const filteredSellers = (sellers || []).filter(
    (s) =>
      s.name.toLowerCase().includes(sellerSearchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(sellerSearchQuery.toLowerCase()) ||
      s.streetLocation.toLowerCase().includes(sellerSearchQuery.toLowerCase())
  );

  // Filter items by search query
  const filteredItems = (items || []).filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (i.fabric && i.fabric.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  );

  const selectedSeller = (sellers || []).find((s) => s.id === selectedSellerId);
  const currentInvItem = (items || []).find((i) => i.id === currentSelectedItemId);

  const handleAddLine = () => {
    if (!currentInvItem) return;
    if (currentQty <= 0) return;
    if (currentInvItem.stockQuantity < currentQty) {
      alert(`موجودی انبار کافی نیست (موجودی فعلی در انبار: ${currentInvItem.stockQuantity} عدد)`);
      return;
    }

    const sizeToAdd = currentSize || (currentInvItem.sizes && currentInvItem.sizes[0]) || 'L';
    const colorToAdd = currentColor || (currentInvItem.colors && currentInvItem.colors[0]) || 'مشکی';

    // Check if item already exists in lines
    const existingIndex = lines.findIndex(
      (l) =>
        l.itemId === currentInvItem.id &&
        l.selectedSize === sizeToAdd &&
        l.selectedColor === colorToAdd
    );

    if (existingIndex !== -1) {
      const updated = [...lines];
      updated[existingIndex].quantity += currentQty;
      setLines(updated);
    } else {
      setLines([
        ...lines,
        {
          itemId: currentInvItem.id,
          quantity: currentQty,
          unitPrice: currentInvItem.consignmentPrice,
          selectedSize: sizeToAdd,
          selectedColor: colorToAdd,
        },
      ]);
    }
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalHandoverValue = (lines || []).reduce(
    (sum, line) => sum + (line.quantity || 0) * (line.unitPrice || 0),
    0
  );
  const totalItemsCount = (lines || []).reduce((sum, line) => sum + (line.quantity || 0), 0);

  const remainingCredit = selectedSeller
    ? Math.max(0, (selectedSeller.creditLimit || 0) - (selectedSeller.currentDebt || 0))
    : 0;
  const isOverCreditLimit = selectedSeller && totalHandoverValue > remainingCredit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerId) {
      alert('لطفاً فروشنده را انتخاب فرمایید');
      return;
    }
    if (lines.length === 0) {
      alert('لطفاً حداقل یک قلم کالا به لیست واگذاری اضافه نمایید');
      return;
    }

    const calculatedDueDate = new Date(
      Date.now() + (Number(dueDays) || 10) * 24 * 60 * 60 * 1000
    ).toISOString();

    onSubmitHandover({
      sellerId: selectedSellerId,
      dueDate: calculatedDueDate,
      itemsList: lines,
      notes: notes.trim(),
    });

    onClose();
    setLines([]);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="صدور فاکتور واگذاری امانی (تحویل بار جدید)"
        subtitle="ثبت تحویل دسته جمعی پوشاک، کسر خودکار از انبار و محاسبه افزایش بدهی فروشنده"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
          {/* SECTION 1: SELLER SELECTION & QUICK ADD */}
          <div className="p-4 rounded-xl glass-card space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#CEAE80] flex items-center gap-1.5">
                <User className="w-4 h-4" />
                انتخاب فروشنده / دست‌فروش تحویل‌گیرنده *
              </label>

              {/* Quick Add Seller Button */}
              {onQuickCreateSeller && (
                <button
                  type="button"
                  onClick={() => setIsQuickSellerModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#CEAE80]/20 hover:bg-[#CEAE80] text-[#CEAE80] hover:text-black border border-[#CEAE80]/40 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 self-start sm:self-auto shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>ثبت فروشنده جدید در همین لحظه</span>
                </button>
              )}
            </div>

            {/* Seller Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجوی سریع فروشنده بر اساس نام، کد یا راسته بساط..."
                value={sellerSearchQuery}
                onChange={(e) => setSellerSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-9 rounded-xl glass-input text-xs outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>

            {/* Seller Dropdown / Selector */}
            <SelectMenu
              value={selectedSellerId}
              onChange={setSelectedSellerId}
              options={filteredSellers.map((s) => ({
                value: s.id,
                label: (
                  <SelectOptionContent
                    primary={s.name}
                    badges={
                      <>
                        <SelectBadge tone="gold">{s.code}</SelectBadge>
                        <SelectBadge tone="blue">
                          <MapPin className="w-2.5 h-2.5" />
                          {s.streetLocation}
                        </SelectBadge>
                        <SelectBadge tone={(s.currentDebt || 0) > 0 ? 'red' : 'green'}>
                          بدهی: {formatToman(s.currentDebt || 0)}
                        </SelectBadge>
                      </>
                    }
                  />
                ),
                triggerLabel: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold">{s.name}</span>
                    <SelectBadge tone="gold">{s.code}</SelectBadge>
                  </span>
                ),
              }))}
            />

            {/* Selected Seller Summary Card */}
            {selectedSeller && (
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/30 border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {selectedSeller.avatarUrl ? (
                    <img
                      src={selectedSeller.avatarUrl}
                      alt={selectedSeller.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-[#CEAE80]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#CEAE80]/20 text-[#CEAE80] flex items-center justify-center font-bold">
                      {selectedSeller.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                      <span>{selectedSeller.name}</span>
                      <span className="text-[11px] text-stone-400 font-mono">({selectedSeller.phone})</span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#CEAE80]" />
                      <span>{selectedSeller.streetLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">بدهی فعلی:</span>
                    <span className="font-bold text-rose-500 dark:text-rose-400 font-mono">
                      {formatToman(selectedSeller.currentDebt || 0)}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-stone-500 dark:text-gray-400 block">اعتبار امانت باقیمانده:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatToman(remainingCredit)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ADD ITEMS TO CONSIGNMENT */}
          <div className="p-4 rounded-xl glass-card space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#CEAE80] flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                انتخاب پوشاک از انبار دوزندگی *
              </label>

              {/* Quick Add Item Button */}
              {onQuickCreateItem && (
                <button
                  type="button"
                  onClick={() => setIsQuickItemModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#CEAE80]/20 hover:bg-[#CEAE80] text-[#CEAE80] hover:text-black border border-[#CEAE80]/40 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 self-start sm:self-auto shadow-sm"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>تعریف لباس جدید در همین لحظه</span>
                </button>
              )}
            </div>

            {/* Item Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجوی لباس بر اساس نام، جنس پارچه یا کد SKU..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-9 rounded-xl glass-input text-xs outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>

            {/* Line Selection Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
              <div className="sm:col-span-5">
                <label className="block text-[11px] text-stone-600 dark:text-stone-300 mb-1">
                  کالای مورد نظر
                </label>
                <SelectMenu
                  value={currentSelectedItemId}
                  onChange={(v) => {
                    setCurrentSelectedItemId(v);
                    const it = items.find((i) => i.id === v);
                    if (it) {
                      setCurrentSize(it.sizes?.[0] || 'L');
                      setCurrentColor(it.colors?.[0] || 'مشکی');
                    }
                  }}
                  options={filteredItems.map((item) => ({
                    value: item.id,
                    label: (
                      <SelectOptionContent
                        primary={item.name}
                        badges={
                          <>
                            <SelectBadge tone="gold">{item.code}</SelectBadge>
                            <SelectBadge tone="blue">
                              موجودی: {toPersianDigits(item.stockQuantity)} عدد
                            </SelectBadge>
                            <SelectBadge tone="green">{formatToman(item.consignmentPrice)}</SelectBadge>
                          </>
                        }
                      />
                    ),
                    triggerLabel: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-bold">{item.name}</span>
                        <SelectBadge tone="gold">{item.code}</SelectBadge>
                      </span>
                    ),
                  }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-stone-600 dark:text-stone-300 mb-1">
                  سایز
                </label>
                <SelectMenu
                  value={currentSize}
                  onChange={setCurrentSize}
                  options={(currentInvItem?.sizes || ['M', 'L', 'XL', '2XL']).map((sz) => ({
                    value: sz,
                    label: <span className="font-bold font-mono">{sz}</span>,
                  }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-stone-600 dark:text-stone-300 mb-1">
                  رنگ
                </label>
                <SelectMenu
                  value={currentColor}
                  onChange={setCurrentColor}
                  options={(currentInvItem?.colors || ['مشکی', 'سرمه‌ای', 'طوسی']).map((clr) => ({
                    value: clr,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/20 shrink-0" style={{ backgroundColor: persianColorToCss(clr) }} />
                        <span className="font-bold">{clr}</span>
                      </span>
                    ),
                  }))}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] text-stone-600 dark:text-stone-300 mb-1">
                  تعداد
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentInvItem ? currentInvItem.stockQuantity : 100}
                  value={currentQty}
                  onChange={(e) => setCurrentQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono text-center outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="w-full py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  افزودن به فاکتور
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADDED ITEMS TABLE */}
          <div className="p-4 rounded-xl glass-card space-y-3">
            <h5 className="font-bold text-xs text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span>اقلام موجود در این فاکتور واگذاری ({toPersianDigits(lines.length)} ردیف)</span>
              <span className="text-[#CEAE80] font-mono">
                مجموع: {toPersianDigits(totalItemsCount)} عدد لباس
              </span>
            </h5>

            {lines.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-xs border border-dashed border-stone-300 dark:border-white/10 rounded-xl">
                هنوز لباسی به این واگذاری اضافه نشده است. از بخش بالا کالا را انتخاب کرده و روی «افزودن به فاکتور» کلیک نمایید.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs table-stacked">
                  <thead className="text-stone-500 dark:text-gray-400 border-b border-black/5 dark:border-white/5 pb-2">
                    <tr>
                      <th className="py-2 px-2">نام کالا</th>
                      <th className="py-2 px-2">سایز / رنگ</th>
                      <th className="py-2 px-2 text-center">تعداد</th>
                      <th className="py-2 px-2 text-left">قیمت واحد امانی</th>
                      <th className="py-2 px-2 text-left">مبلغ کل ردیف</th>
                      <th className="py-2 px-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {lines.map((line, idx) => {
                      const item = items.find((i) => i.id === line.itemId);
                      return (
                        <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td data-label="نام کالا" className="py-2 px-2 font-bold text-stone-900 dark:text-white">
                            {item?.name || 'کالا'}
                            <span className="block text-[10px] text-stone-400 font-mono">{item?.code}</span>
                          </td>
                          <td data-label="سایز / رنگ" className="py-2 px-2 text-stone-600 dark:text-gray-300">
                            {line.selectedSize} / {line.selectedColor}
                          </td>
                          <td data-label="تعداد" className="py-2 px-2 text-center font-bold font-mono">
                            {toPersianDigits(line.quantity)}
                          </td>
                          <td data-label="قیمت واحد" className="py-2 px-2 text-left font-mono" dir="ltr">
                            {formatToman(line.unitPrice)}
                          </td>
                          <td data-label="مبلغ کل" className="py-2 px-2 text-left font-bold text-stone-900 dark:text-white font-mono" dir="ltr">
                            {formatToman(line.quantity * line.unitPrice)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 4: DUE DATE & FINANCIAL SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-card space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  مهلت تسویه حساب (روز)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['7', '10', '14', '20', '30'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDueDays(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        dueDays === d
                          ? 'bg-[#CEAE80] text-black shadow-sm'
                          : 'bg-stone-200 dark:bg-[#1E1E1E] text-stone-700 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-[#252525]'
                      }`}
                    >
                      {toPersianDigits(d)} روزه
                    </button>
                  ))}
                </div>

                {/* Custom Day Number Input */}
                <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400">یا تعداد روز دلخواه:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    placeholder="مثلاً: ۱۲"
                    className="w-24 px-3 py-1.5 rounded-xl glass-input text-xs font-mono text-center outline-none focus:border-[#CEAE80]"
                  />
                  <span className="text-xs text-stone-600 dark:text-stone-400">روز</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  توضیحات و شرایط خاص فاکتور
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثلاً: تحویل در راسته ولیعصر، تسویه پنج‌شنبه..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none"
                />
              </div>
            </div>

            {/* Financial Totals Card */}
            <div className="p-4 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/30 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-600 dark:text-stone-400">مجموع ارزش فاکتور امانی:</span>
                  <span className="font-black text-stone-900 dark:text-white text-base font-mono" dir="ltr">
                    {formatToman(totalHandoverValue)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-600 dark:text-stone-400">مانده بدهی قبلی فروشنده:</span>
                  <span className="font-bold text-stone-700 dark:text-stone-300 font-mono" dir="ltr">
                    {formatToman(selectedSeller?.currentDebt || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#CEAE80]/30">
                  <span className="font-bold text-stone-900 dark:text-white">کل بدهی جدید پس از تحویل:</span>
                  <span className="font-black text-rose-500 dark:text-rose-400 text-sm font-mono" dir="ltr">
                    {formatToman((selectedSeller?.currentDebt || 0) + totalHandoverValue)}
                  </span>
                </div>
              </div>

              {isOverCreditLimit && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>توجه: این واگذاری از سقف اعتبار امانت مجاز فروشنده تجاوز می‌کند!</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={lines.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0A0A] font-bold text-sm shadow-md transition-all active:scale-95"
            >
              ثبت نهایی و صدور فاکتور امانی
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Seller Creation Modal */}
      {isQuickSellerModalOpen && (
        <SellerFormModal
          isOpen={isQuickSellerModalOpen}
          onClose={() => setIsQuickSellerModalOpen(false)}
          onSave={(newSellerData) => {
            if (onQuickCreateSeller) {
              onQuickCreateSeller(newSellerData);
            }
            setIsQuickSellerModalOpen(false);
          }}
        />
      )}

      {/* Quick Item Creation Modal */}
      {isQuickItemModalOpen && (
        <ItemFormModal
          isOpen={isQuickItemModalOpen}
          onClose={() => setIsQuickItemModalOpen(false)}
          onSave={(newItemData) => {
            if (onQuickCreateItem) {
              onQuickCreateItem(newItemData);
            }
            setIsQuickItemModalOpen(false);
          }}
        />
      )}
    </>
  );
};
