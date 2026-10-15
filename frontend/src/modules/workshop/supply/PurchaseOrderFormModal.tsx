import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { SelectMenu } from '@/components/ui/select-menu';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier, PurchaseOrder, PurchaseOrderItem } from '@/types';
import type { PurchaseOrderPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PurchaseOrderPayload) => void;
  editOrder?: PurchaseOrder | null;
  suppliers: Supplier[];
  saving?: boolean;
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
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineForm[]>([{ skuId: '', quantity: '', unit: '', unitCost: '' }]);
  const [supplierNameError, setSupplierNameError] = useState<string | null>(null);

  useEffect(() => {
    if (editOrder) {
      setSupplierId(editOrder.supplierId ?? '');
      setExpectedDate(editOrder.expectedDate?.split('T')[0] ?? '');
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
      setExpectedDate('');
      setPaymentTerms('');
      setAdditionalCosts('');
      setNote('');
      setLines([{ skuId: '', quantity: '', unit: '', unitCost: '' }]);
    }
    setSupplierNameError(null);
  }, [editOrder, isOpen]);

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
      expectedDate: expectedDate || undefined,
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

  const supplierOptions = suppliers
    .filter((s) => s.is_active !== false)
    .map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editOrder ? `ویرایش سفارش ${editOrder.code}` : 'سفارش خرید جدید'}
      subtitle={editOrder ? 'به‌روزرسانی جزئیات سفارش' : 'ثبت سفارش خرید جدید از تأمین‌کننده'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier + dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field data-invalid={!!supplierNameError || undefined}>
            <FieldLabel htmlFor="po-supplier">تأمین‌کننده *</FieldLabel>
            <SelectMenu
              value={supplierId}
              onChange={setSupplierId}
              placeholder="انتخاب تأمین‌کننده..."
              options={supplierOptions}
              className={supplierNameError ? 'border-rose-500' : undefined}
            />
            {supplierNameError && <FieldError>{supplierNameError}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="po-expected-date">تاریخ تحویل مقرر</FieldLabel>
            <Input
              id="po-expected-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="po-payment-terms">شرایط پرداخت</FieldLabel>
            <Input
              id="po-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="مثلاً: ۳۰ روزه"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="po-add-costs">هزینه‌های افزوده (تومان)</FieldLabel>
            <Input
              id="po-add-costs"
              type="number"
              min="0"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
              placeholder="صفر"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="po-note">یادداشت</FieldLabel>
          <Textarea
            id="po-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت‌های سفارش..."
            rows={3}
          />
        </Field>

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
                <Field>
                  <FieldLabel>کد کالا (SKU) *</FieldLabel>
                  <Input
                    value={line.skuId}
                    onChange={(e) => updateLine(idx, 'skuId', e.target.value)}
                    placeholder="SKU-001"
                    aria-label={`SKU خط ${idx + 1}`}
                  />
                </Field>
                <Field>
                  <FieldLabel>تعداد</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    placeholder="۰"
                    aria-label={`تعداد خط ${idx + 1}`}
                  />
                </Field>
                <Field>
                  <FieldLabel>واحد</FieldLabel>
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                    placeholder="مثلاً: بسته"
                    aria-label={`واحد خط ${idx + 1}`}
                  />
                </Field>
                <Field>
                  <FieldLabel>قیمت واحد (تومان)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
                    placeholder="۰"
                    aria-label={`قیمت واحد خط ${idx + 1}`}
                  />
                </Field>
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
