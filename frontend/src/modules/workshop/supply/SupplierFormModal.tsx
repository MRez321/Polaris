import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier } from '@/types';
import type { SupplierPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupplierPayload) => void;
  editSupplier?: Supplier | null;
  saving?: boolean;
}

/** Form for creating and editing suppliers. Reuses the same shape for both
 *  modes — when `editSupplier` is provided the form pre-fills and PATCHes.
 */
export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editSupplier,
  saving,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [is_active, setIsActive] = useState(true);
  const [cooperationTerms, setCooperationTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [note, setNote] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (editSupplier) {
      setCode(editSupplier.code ?? '');
      setName(editSupplier.name ?? '');
      setContactPerson(editSupplier.contactPerson ?? '');
      setPhone(editSupplier.phone ?? '');
      setEmail(editSupplier.email ?? '');
      setAddress(editSupplier.address ?? '');
      setIsActive(editSupplier.is_active ?? true);
      setCooperationTerms(editSupplier.cooperationTerms ?? '');
      setPaymentTerms(editSupplier.paymentTerms ?? '');
      setPaymentDueDays(editSupplier.paymentDueDays?.toString() ?? '');
      setMinOrderAmount(editSupplier.minOrderAmount?.toString() ?? '');
      setNote(editSupplier.note ?? '');
    } else {
      setCode('');
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsActive(true);
      setCooperationTerms('');
      setPaymentTerms('');
      setPaymentDueDays('');
      setMinOrderAmount('');
      setNote('');
    }
    setNameError(null);
  }, [editSupplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('نام تأمین‌کننده الزامی است');
      return;
    }
    setNameError(null);
    onSave({
      ...(code && { code }),
      name: name.trim(),
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      is_active,
      cooperationTerms: cooperationTerms || undefined,
      paymentTerms: paymentTerms || undefined,
      paymentDueDays: paymentDueDays ? Number(paymentDueDays) : undefined,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      note: note || undefined,
    });
  };

  const reset = () => {
    setNameError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title={editSupplier ? 'ویرایش تأمین‌کننده' : 'تأمین‌کننده جدید'}
      subtitle={editSupplier ? `ویرایش ${editSupplier.code}` : 'ثبت تأمین‌کننده جدید'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field data-invalid={!!nameError || undefined}>
            <FieldLabel htmlFor="supplier-name">نام تأمین‌کننده *</FieldLabel>
            <Input
              id="supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!nameError || undefined}
              placeholder="مثلاً: پارچه‌فروشی اصفهان"
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="supplier-code">کد تأمین‌کننده</FieldLabel>
            <Input
              id="supplier-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="خودکار در صورت خالی گذاشتن"
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="supplier-contact">نام تماس</FieldLabel>
            <Input
              id="supplier-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="مثلاً: علی احمدی"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="supplier-phone">تلفیحی</FieldLabel>
            <Input
              id="supplier-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              placeholder="مثلاً: 09121234567"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="supplier-email">ایمیل</FieldLabel>
          <Input
            id="supplier-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            placeholder="example@supplier.com"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="supplier-address">آدرس</FieldLabel>
          <Textarea
            id="supplier-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس کامل تأمین‌کننده..."
            rows={3}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="supplier-coop">شرایط همکاری</FieldLabel>
            <Input
              id="supplier-coop"
              value={cooperationTerms}
              onChange={(e) => setCooperationTerms(e.target.value)}
              placeholder="مثلاً: پیش‌پرداخت ۵۰٪"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="supplier-payment-terms">شرایط پرداخت</FieldLabel>
            <Input
              id="supplier-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="مثلاً: نقدی یا اقساطی"
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="supplier-due-days">مهلت پرداخت (روز)</FieldLabel>
            <Input
              id="supplier-due-days"
              type="number"
              min="0"
              value={paymentDueDays}
              onChange={(e) => setPaymentDueDays(e.target.value)}
              placeholder="مثلاً: ۳۰"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="supplier-min-order">حداقل سفارش (تومان)</FieldLabel>
            <Input
              id="supplier-min-order"
              type="number"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="اختیاری"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="supplier-note">یادداشت</FieldLabel>
          <Textarea
            id="supplier-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت‌های داخلی..."
            rows={3}
          />
        </Field>

        <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-white/10">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={is_active}
              onCheckedChange={setIsActive}
            />
            <span className="text-xs font-bold text-stone-900 dark:text-white">
              فعال
            </span>
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="bg-brand hover:bg-brand-hover text-brand-on font-black"
            >
              {editSupplier ? 'ذخیره تغییرات' : 'ایجاد تأمین‌کننده'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
