import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/common/FormField';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, Search } from 'lucide-react';
import type { Supplier, PurchaseOrder, PurchaseOrderItem } from '@/types';
import type { PurchaseOrderPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { supplyApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PurchaseOrderPayload) => void;
  editOrder?: PurchaseOrder | null;
  suppliers: Supplier[];
  saving?: boolean;
  onAddSupplier?: (supplier: Supplier) => void;
}

interface LineForm {
  skuId: string;
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
  onAddSupplier,
}) => {
  const { hasPermission } = useAuth();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState<Date | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineForm[]>([{ skuId: '', quantity: '', unit: '', unitCost: '' }]);
  const [supplierNameError, setSupplierNameError] = useState<string | null>(null);

  // Supplier quick-create
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierCity, setQuickSupplierCity] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const canManageSupplier = hasPermission('suppliers.manage') || hasPermission('purchasing.manage');

  // Filter active suppliers by search
  const filteredSupplierOptions = useMemo(() => {
    const query = supplierSearch.toLowerCase();
    return suppliers
      .filter((s) => s.isActive !== false)
      .filter((s) => {
        if (!query) return true;
        return (
          s.shopName?.toLowerCase().includes(query) ||
          s.code?.toLowerCase().includes(query)
        );
      })
      .slice(0, 20); // Limit to 20 options for performance
  }, [suppliers, supplierSearch]);

  useEffect(() => {
    if (editOrder) {
      setSupplierId(editOrder.supplierId ?? '');
      setExpectedDate(editOrder.expectedDate ? new Date(editOrder.expectedDate) : null);
      setPaymentTerms(editOrder.paymentTerms ?? '');
      setAdditionalCosts(editOrder.additionalCosts?.toString() ?? '');
      setNote(editOrder.note ?? '');
      if (editOrder.items && editOrder.items.length > 0) {
        setLines(
          editOrder.items.map((item: PurchaseOrderItem) => ({
            skuId: item.skuId ?? '',
            quantity: item.quantity.toString(),
            unit: item.unit ?? '',
            unitCost: item.unitCost.toString(),
          }))
        );
      } else {
        setLines([{ skuId: '', quantity: '', unit: '', unitCost: '' }]);
      }
    } else {
      setSupplierId('');
      setExpectedDate(null);
      setPaymentTerms('');
      setAdditionalCosts('');
      setNote('');
      setLines([{ skuId: '', quantity: '', unit: '', unitCost: '' }]);
    }
    setSupplierNameError(null);
  }, [editOrder, isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSupplierSearch('');
      setShowQuickCreate(false);
      setQuickSupplierName('');
      setQuickSupplierCity('');
      setCreatingSupplier(false);
    }
  }, [isOpen]);

  const addLine = () => {
    setLines([...lines, { skuId: '', quantity: '', unit: '', unitCost: '' }]);
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

  const totalCost = subtotal + (Number(additionalCosts) || 0);

  // --- Quick supplier creation ---
  const handleQuickCreateSupplier = async () => {
    if (!quickSupplierName.trim()) {
      toast.error('نام فروشگاه الزامی است');
      return;
    }
    if (!quickSupplierCity.trim()) {
      toast.error('شهر الزامی است');
      return;
    }
    setCreatingSupplier(true);
    try {
      const created = await supplyApi.createSupplier({
        shopName: quickSupplierName.trim(),
        city: quickSupplierCity.trim(),
      });
      setShowQuickCreate(false);
      setQuickSupplierName('');
      setQuickSupplierCity('');
      setSupplierId(created.id);
      setSupplierNameError(null);
      if (onAddSupplier) {
        onAddSupplier(created);
      }
      toast.success(`تأمین‌کننده ${created.code} - ${created.shopName} اضافه و انتخاب شد`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setCreatingSupplier(false);
    }
  };

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
      additionalCosts: additionalCosts ? Number(additionalCosts) : undefined,
      note: note || undefined,
      items: validLines.map((l) => ({
        skuId: l.skuId,
        quantity: Number(l.quantity),
        unit: l.unit || undefined,
        unitCost: Number(l.unitCost) || 0,
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editOrder ? `ویرایش سفارش ${editOrder.code}` : 'سفارش خرید جدید'}
      subtitle={editOrder ? 'به‌روزرسانی جزئیات سفارش' : 'ثبت سفارش خرید جدید از تأمین‌کننده'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier Selection with Search & Quick Create */}
        <div className="space-y-2">
          <FormField
            id="po-supplier"
            label="تأمین‌کننده"
            required
            error={supplierNameError || undefined}
          >
            <div className="space-y-2">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="جستجوی تأمین‌کننده..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className={supplierNameError ? 'border-rose-500 focus:ring-rose-500' : undefined}
                />
              </div>

              {/* Active selection display */}
              {supplierId && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                  <span className="text-sm font-medium text-stone-900 dark:text-white">
                    {suppliers.find((s) => s.id === supplierId)?.shopName ||
                      suppliers.find((s) => s.id === supplierId)?.code ||
                      'انتخاب شده'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSupplierId('')}
                    className="text-xs text-stone-400 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Dropdown of matching suppliers */}
              {supplierSearch && !supplierId && (
                <div className="max-h-48 overflow-y-auto border border-stone-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#16161a]">
                  {filteredSupplierOptions.length > 0 ? (
                    filteredSupplierOptions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSupplierId(s.id);
                          setSupplierSearch('');
                          setSupplierNameError(null);
                        }}
                        className="w-full flex items-center justify-between p-2 text-right hover:bg-stone-100 dark:hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-400 dark:text-gray-500">
                            {toPersianDigits(s.code)}
                          </span>
                          <span className="text-sm font-medium text-stone-900 dark:text-white">
                            {s.shopName}
                          </span>
                        </div>
                        {s.city && (
                          <span className="text-[10px] text-stone-500 dark:text-gray-400">
                            {s.city}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="p-2 text-xs text-stone-400 text-center">
                      تأمین‌کننده‌ای یافت نشد
                    </p>
                  )}
                </div>
              )}

              {/* Quick create inline */}
              {canManageSupplier && showQuickCreate && !supplierId && (
                <div className="p-3 rounded-lg bg-brand/5 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 space-y-2">
                  <p className="text-xs font-bold text-stone-700 dark:text-gray-300">
                    ساخت تأمین‌کننده جدید
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="نام فروشگاه"
                      value={quickSupplierName}
                      onChange={(e) => setQuickSupplierName(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Input
                      placeholder="شهر"
                      value={quickSupplierCity}
                      onChange={(e) => setQuickSupplierCity(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleQuickCreateSupplier}
                      loading={creatingSupplier}
                      className="text-xs font-black bg-brand hover:bg-brand-hover text-brand-on"
                    >
                      ساخت و انتخاب
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQuickCreate(false)}
                      className="text-xs"
                    >
                      لغو
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick create toggle */}
              {canManageSupplier && !showQuickCreate && !supplierId && (
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="text-xs text-brand hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  ساخت تأمین‌کننده جدید
                </button>
              )}
            </div>
          </FormField>

          {/* Expected Date - Persian Calendar */}
          <div className="pt-2">
            <FormField
              id="po-expected-date"
              label="تاریخ تحویل مقرر"
              hint="تاریخ تحویل کالا به انبار"
            >
              <DatePicker
                value={expectedDate}
                onValueChange={setExpectedDate}
                placeholder="انتخاب تاریخ..."
                className="w-full"
              />
            </FormField>
          </div>
        </div>

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
        </div>

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

        {/* Line items */}
        <div className="pt-3 border-t border-stone-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-stone-900 dark:text-white">کالاها</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3 h-3" />
              افزودن خط
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_80px_100px_auto] gap-2 items-end">
                <FormField id={`line-sku-${idx}`} label="کد کالا (SKU) *" hint="SKU-001">
                  <Input
                    id={`line-sku-${idx}`}
                    value={line.skuId}
                    onChange={(e) => updateLine(idx, 'skuId', e.target.value)}
                    placeholder="SKU-001"
                    aria-label={`SKU خط ${idx + 1}`}
                  />
                </FormField>
                <FormField id={`line-qty-${idx}`} label="تعداد" hint="۰">
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
                <FormField id={`line-unit-${idx}`} label="واحد" hint="مثلاً: بسته">
                  <Input
                    id={`line-unit-${idx}`}
                    value={line.unit}
                    onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                    placeholder="بسته"
                    aria-label={`واحد خط ${idx + 1}`}
                  />
                </FormField>
                <FormField id={`line-cost-${idx}`} label="قیمت واحد (تومان)" hint="۰">
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
        <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">جمع کل خطوط:</span>
            <span className="font-bold text-stone-900 dark:text-white">
              {toPersianDigits(subtotal.toLocaleString('fa-IR'))} تومان
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">هزینه‌های افزوده:</span>
            <span className="font-bold text-stone-900 dark:text-white">
              {toPersianDigits((Number(additionalCosts) || 0).toLocaleString('fa-IR'))} تومان
            </span>
          </div>
          <div className="flex justify-between font-black pt-1 border-t border-stone-200 dark:border-white/10">
            <span className="text-stone-900 dark:text-white">کل سفارش:</span>
            <span className="text-brand-ink">
              {toPersianDigits(totalCost.toLocaleString('fa-IR'))} تومان
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
