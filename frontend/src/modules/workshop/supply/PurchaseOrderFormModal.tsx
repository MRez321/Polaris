import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/common/FormField';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, Search, Package } from 'lucide-react';
import type { Supplier, PurchaseOrder, PurchaseOrderItem } from '@/types';
import type { PurchaseOrderPayload } from '@/lib/api';
import { toPersianDigits, formatToman } from '@/utils/persian';
import { useAuth } from '@/context/AuthContext';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PurchaseOrderPayload) => void;
  editOrder?: PurchaseOrder | null;
  suppliers: Supplier[];
  saving?: boolean;
  onRequestAddSupplier?: () => void;
}

interface LineForm {
  skuId: string;
  itemName: string;
  itemType: string;
  quantity: string;
  unit: string;
  unitCost: string;
}

/** Form for creating and editing purchase orders. Supports adding line items
 *  for each product the PO covers. In edit mode, existing items from the PO
 *  are pre-loaded into the line editor.
 */
export const PurchaseOrderFormModal: React.FC<PurchaseOrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editOrder,
  suppliers,
  saving,
  onRequestAddSupplier,
}
 ) => {
  const { hasPermission } = useAuth();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState<Date | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [transportationCost, setTransportationCost] = useState('');
  const [postTrackingCode, setPostTrackingCode] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineForm[]>([{ skuId: '', itemName: '', itemType: '', quantity: '', unit: '', unitCost: '' }]);
  const [supplierNameError, setSupplierNameError] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  const canManageSupplier = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');
  // Show all suppliers by default (no search), filtered when searching
  const filteredSupplierOptions = useMemo(() => {
    const query = supplierSearch.toLowerCase();
    if (!query) {
      // Show all active suppliers by default, limited for performance
      return suppliers
        .filter((s) => s.isActive !== false)
        .slice(0, 30);
    }
    return suppliers
      .filter((s) => s.isActive !== false)
      .filter((s) => {
        return (
          s.shopName?.toLowerCase().includes(query) ||
          s.code?.toLowerCase().includes(query)
        );
      })
      .slice(0, 20);
  }, [suppliers, supplierSearch]);

  useEffect(() => {
    if (editOrder) {
      setSupplierId(editOrder.supplierId ?? '');
      setExpectedDate(editOrder.expectedDate ? new Date(editOrder.expectedDate) : null);
      setPaymentTerms(editOrder.paymentTerms ?? '');
      setAdditionalCosts(editOrder.additionalCosts?.toString() ?? '');
      setPostTrackingCode(editOrder.trackingCode ?? '');
      setNote(editOrder.note ?? '');
      if (editOrder.items && editOrder.items.length > 0) {
        setLines(
          editOrder.items.map((item: PurchaseOrderItem) => ({
            skuId: item.skuId ?? '',
            itemName: item.name ?? '',
            itemType: item.type ?? '',
            quantity: item.quantity.toString(),
            unit: item.unit ?? '',
            unitCost: item.unitCost.toString(),
          }))
        );
      } else {
        setLines([{ skuId: '', itemName: '', itemType: '', quantity: '', unit: '', unitCost: '' }]);
      }
    } else {
      setSupplierId('');
      setExpectedDate(null);
      setPaymentTerms('');
      setAdditionalCosts('');
      setPostTrackingCode('');
      setNote('');
      setLines([{ skuId: '', itemName: '', itemType: '', quantity: '', unit: '', unitCost: '' }]);
    }
    setSupplierNameError(null);
  }, [editOrder, isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSupplierSearch('');
    }
  }, [isOpen]);

  // --- Line items ---
  const addLine = () => {
    setLines([...lines, { skuId: '', itemName: '', itemType: '', quantity: '', unit: '', unitCost: '' }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof LineForm, value: string) => {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  };

  const subtotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const cost = Number(line.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const transportation = Number(transportationCost) || 0;
  const additional = Number(additionalCosts) || 0;
  const totalCost = subtotal + transportation + additional;



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setSupplierNameError('انتخاب تأمین‌کننده الزامی است');
      return;
    }
    setSupplierNameError(null);
    const validLines = lines.filter((l) => l.skuId.trim() && Number(l.quantity) > 0);
    onSave({
      supplierId,
      expectedDate: expectedDate ? expectedDate.toISOString().split('T')[0] : undefined,
      paymentTerms: paymentTerms || undefined,
      additionalCosts: additional ? additional : undefined,
      transportationCost: transportation ? transportation : undefined,
      trackingCode: postTrackingCode || undefined,
      note: note || undefined,
      items: validLines.map((l) => ({
        skuId: l.skuId,
        quantity: Number(l.quantity),
        unit: l.unit || undefined,
        unitCost: Number(l.unitCost) || 0,
      })),
    });
  };

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editOrder ? `ویرایش سفارش ${editOrder.code}` : 'سفارش خرید جدید'}
      subtitle={editOrder ? 'به‌روزرسانی جزئیات سفارش' : 'ثبت سفارش خرید جدید از تأمین‌کننده'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Supplier Selection with Search & Quick Create */}
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <FormField
            id="po-supplier"
            label="تأمین‌کننده"
            required
            error={supplierNameError || undefined}
            hint="جستجو و انتخاب تأمین‌کننده، یا ساخت تأمین‌کننده جدید"
          >
            <div className="space-y-2">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="جستجوی تأمین‌کننده یا نمایش همه..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className={`w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-brand outline-none ${
                    supplierNameError ? 'border-rose-500 focus:ring-rose-500' : undefined
                  }`}
                />
              </div>

              {/* Active selection display */}
              {supplierId && selectedSupplier && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5">
                  <div>
                    <span className="text-sm font-black text-stone-900 dark:text-white">
                      {selectedSupplier.shopName}
                    </span>
                    <span className="mx-2 text-stone-300">|</span>
                    <span className="text-xs text-stone-400 font-mono">
                      {toPersianDigits(selectedSupplier.code)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupplierId('')}
                    className="text-xs text-stone-400 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Dropdown of matching suppliers or all suppliers */}
              {!supplierId && filteredSupplierOptions.length > 0 && (
                <div className="max-h-56 overflow-y-auto border border-stone-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#16161a]">
                  {filteredSupplierOptions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSupplierId(s.id);
                        setSupplierSearch('');
                        setSupplierNameError(null);
                      }}
                      className="w-full flex items-center justify-between p-3 text-right hover:bg-stone-100 dark:hover:bg-white/5 transition-colors first:rounded-t-xl last:rounded-b-xl border-b border-stone-100 dark:border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-stone-400 dark:text-gray-500">
                          {toPersianDigits(s.code)}
                        </span>
                        <span className="text-sm font-medium text-stone-900 dark:text-white">
                          {s.shopName}
                        </span>
                      </div>
                      <div className="text-left">
                        {s.city && (
                          <span className="text-[10px] text-stone-500 dark:text-gray-400">
                            {s.city}
                          </span>
                        )}
                        {s.phones && s.phones.length > 0 && (
                          <div className="text-[10px] text-stone-400 dark:text-gray-400 font-mono">
                            {s.phones[0]}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!supplierId && supplierSearch && filteredSupplierOptions.length === 0 && (
                <p className="p-2 text-xs text-stone-400 text-center">
                  تأمین‌کننده‌ای یافت نشد
                </p>
              )}

              {/* New supplier button — opens the full SupplierFormModal via parent */}
              {canManageSupplier && !supplierId && onRequestAddSupplier && (
                <button
                  type="button"
                  onClick={onRequestAddSupplier}
                  className="text-xs text-brand hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  ساخت تأمین‌کننده جدید
                </button>
              )}
            </div>
          </FormField>
        </div>

        {/* Dates & Tracking */}
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            id="po-expected-date"
            label="تاریخ تحویل مقرر"
            hint="تاریخ تحویل کالا به انبار"
            required
          >
            <DatePicker
              value={expectedDate}
              onValueChange={setExpectedDate}
              placeholder="انتخاب تاریخ..."
              className="w-full"
            />
          </FormField>

          <FormField
            id="po-tracking-code"
            label="کد پستی / رهگیر"
            hint="کد رهگیری ارسال یا شماره پست"
          >
            <Input
              id="po-tracking-code"
              value={postTrackingCode}
              onChange={(e) => setPostTrackingCode(e.target.value)}
              placeholder="مثلاً: 1234567890123"
            />
          </FormField>
        </div>

        {/* Terms & Costs */}
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            id="po-payment-terms"
            label="شرایط پرداخت"
            hint="مثلاً: ۳۰ روزه"
          >
            <Input
              id="po-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="شرایط پرداخت"
            />
          </FormField>

          <FormField
            id="po-transport-cost"
            label="هزینه حمل و نقل (تومان)"
            hint="اختیاری"
          >
            <Input
              id="po-transport-cost"
              type="number"
              min="0"
              value={transportationCost}
              onChange={(e) => setTransportationCost(e.target.value)}
              placeholder="۰"
            />
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            id="po-add-costs"
            label="هزینه‌های افزوده (تومان)"
            hint="صفر"
          >
            <Input
              id="po-add-costs"
              type="number"
              min="0"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
              placeholder="۰"
            />
          </FormField>

          <FormField
            id="po-note"
            label="یادداشت"
            hint="یادداشت‌های سفارش..."
          >
            <Textarea
              id="po-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="یادداشت‌های سفارش..."
              rows={3}
            />
          </FormField>
        </div>

        {/* Line items */}
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-brand" />
              کالاها
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
              افزودن خط
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_90px_90px_100px_auto] gap-2 items-end">
                <FormField
                  id={`line-name-${idx}`}
                  label="نام کالا / SKU *"
                  hint="مثلاً: پارچه پنیره‌ای A-001"
                >
                  <Input
                    id={`line-name-${idx}`}
                    value={line.itemName}
                    onChange={(e) => {
                      updateLine(idx, 'itemName', e.target.value);
                      // Also fill skuId from itemName if it looks like a SKU
                      if (!line.skuId) updateLine(idx, 'skuId', e.target.value);
                    }}
                    placeholder="نام کالا یا SKU"
                    aria-label={`نام کالا خط ${idx + 1}`}
                  />
                </FormField>

                <FormField
                  id={`line-sku-${idx}`}
                  label="SKU"
                  hint="SKU-001"
                >
                  <Input
                    id={`line-sku-${idx}`}
                    value={line.skuId}
                    onChange={(e) => updateLine(idx, 'skuId', e.target.value)}
                    placeholder="SKU-001"
                    aria-label={`SKU خط ${idx + 1}`}
                  />
                </FormField>

                <FormField
                  id={`line-qty-${idx}`}
                  label="تعداد"
                  hint="۰"
                >
                  <Input
                    id={`line-qty-${idx}`}
                    type="number"
                    min="0"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    placeholder="۰"
                    aria-label={`تعداد خط ${idx + 1}`}
                  />
                </FormField>

                <FormField
                  id={`line-unit-${idx}`}
                  label="واحد"
                  hint="مثلاً: بسته"
                >
                  <Input
                    id={`line-unit-${idx}`}
                    value={line.unit}
                    onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                    placeholder="بسته"
                    aria-label={`واحد خط ${idx + 1}`}
                  />
                </FormField>

                <FormField
                  id={`line-cost-${idx}`}
                  label="قیمت واحد (تومان)"
                  hint="۰"
                >
                  <Input
                    id={`line-cost-${idx}`}
                    type="number"
                    min="0"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
                    placeholder="۰"
                    aria-label={`قیمت واحد خط ${idx + 1}`}
                  />
                </FormField>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  aria-label={`حذف خط ${idx + 1}`}
                >
                  <Trash2 className="w-4 h-4 text-stone-500 hover:text-rose-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="p-4 rounded-2xl glass-card space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">جمع کل خطوط:</span>
            <span className="font-bold text-stone-900 dark:text-white font-mono" dir="ltr">
              {toPersianDigits(formatToman(subtotal))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">هزینه حمل:</span>
            <span className="font-bold text-stone-900 dark:text-white font-mono" dir="ltr">
              {toPersianDigits(formatToman(transportation))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">هزینه‌های افزوده:</span>
            <span className="font-bold text-stone-900 dark:text-white font-mono" dir="ltr">
              {toPersianDigits(formatToman(additional))}
            </span>
          </div>
          <div className="flex justify-between font-black pt-1 border-t border-stone-200 dark:border-white/10">
            <span className="text-stone-900 dark:text-white">کل سفارش:</span>
            <span className="text-brand-ink font-mono" dir="ltr">
              {toPersianDigits(formatToman(totalCost))}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            loading={saving}
            className="bg-brand hover:bg-brand-hover text-brand-on font-black"
          >
            {editOrder ? 'ذخیره سفارش' : 'ایجاد سفارش خرید'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
