import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/common/FormField';
import { X } from 'lucide-react';
import type { Supplier } from '@/types';
import type { SupplierPayload } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { toast } from 'sonner';

interface ContactPersonInput {
  id: string;
  name: string;
  phone: string;
}

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupplierPayload) => void;
  editSupplier?: Supplier | null;
  saving?: boolean;
}

/** Form for creating and editing suppliers.
 *  - Auto-generated code (not shown/editable)
 *  - No email field
 *  - Shop name + contact persons + phone numbers + city + categories as main fields
 *  - Required fields: shop name, contact person name, city
 *  - New contact/phone entries appear below existing ones
 *  - Categories separated by comma (,) and Persian comma (،)
 */
export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editSupplier,
  saving,
}) => {
  const [shopName, setShopName] = useState('');
  const [contacts, setContacts] = useState<ContactPersonInput[]>([]);
  const [phones, setPhones] = useState<string[]>(['']);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [categories, setCategories] = useState('');
  const [cooperationTerms, setCooperationTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Errors
  const [shopNameError, setShopNameError] = useState('');
  const [cityError, setCityError] = useState('');

  useEffect(() => {
    if (editSupplier) {
      setShopName(editSupplier.shopName ?? '');
      setAddress(editSupplier.address ?? '');
      setCity(editSupplier.city ?? '');
      setCategories(editSupplier.categories?.join('، ') ?? '');
      setCooperationTerms(editSupplier.cooperationTerms ?? '');
      setPaymentTerms(editSupplier.paymentTerms ?? '');
      setPaymentDueDays(editSupplier.paymentDueDays?.toString() ?? '');
      setMinOrderAmount(editSupplier.minOrderAmount?.toString() ?? '');
      setNote(editSupplier.note ?? '');
      setIsActive(editSupplier.isActive !== false);

      const contactList: ContactPersonInput[] =
        editSupplier.contactPersons && editSupplier.contactPersons.length > 0
          ? editSupplier.contactPersons.map((c) => ({ id: c.id || `c_${Math.random().toString(36).slice(2, 9)}`, name: c.name ?? '', phone: c.phone ?? '' }))
          : [{ id: `c_${Math.random().toString(36).slice(2, 9)}`, name: '', phone: '' }];
      setContacts(contactList);

      const phoneList = editSupplier.phones && editSupplier.phones.length > 0 ? editSupplier.phones : [''];
      setPhones(phoneList);
    } else {
      setShopName('');
      setContacts([{ id: 'c_' + Math.random().toString(36).slice(2, 9), name: '', phone: '' }]);
      setPhones(['']);
      setCity('');
      setAddress('');
      setCategories('');
      setCooperationTerms('');
      setPaymentTerms('');
      setPaymentDueDays('');
      setMinOrderAmount('');
      setNote('');
      setIsActive(true);
    }
    setShopNameError('');
    setCityError('');
  }, [editSupplier, isOpen]);

  // --- Contact persons management ---
  const addContact = () => {
    // New entries appear below existing ones
    setContacts([...contacts, { id: 'c_' + Math.random().toString(36).slice(2, 9), name: '', phone: '' }]);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const updateContact = (id: string, field: 'name' | 'phone', value: string) => {
    setContacts(contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // --- Phone numbers management ---
  const addPhone = () => {
    // New entries appear below existing ones
    setPhones([...phones, '']);
  };

  const removePhone = (index: number) => {
    if (phones.length === 1) return;
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, value: string) => {
    const updated = [...phones];
    updated[index] = value;
    setPhones(updated);
  };

  // --- Validation ---
  const validate = (): boolean => {
    let valid = true;

    if (!shopName.trim()) {
      setShopNameError('نام فروشگاه الزامی است');
      valid = false;
    } else {
      setShopNameError('');
    }

    if (!city.trim()) {
      setCityError('شهر الزامی است');
      valid = false;
    } else {
      setCityError('');
    }

    // If any contact person has a phone but no name, flag as invalid
    const hasAnyContact = contacts.some((c) => c.name.trim());
    if (hasAnyContact) {
      const emptyNameContact = contacts.find((c) => c.name.trim() === '' && c.phone.trim());
      if (emptyNameContact) {
        valid = false;
      }
    }

    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('لطفاً فیلدهای الزامی را پر کنید');
      return;
    }

    // Filter out empty contacts
    const validContacts = contacts
      .filter((c) => c.name.trim() || c.phone.trim())
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        phone: c.phone.trim() || undefined,
      }));

    // Filter out empty phones
    const validPhones = phones.filter((p) => p.trim());

    // Parse categories - support both Persian and English commas
    const categoryList = categories
      .split(/[،,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    onSave({
      ...(editSupplier?.code && { code: editSupplier.code }),
      shopName: shopName.trim(),
      contactPersons: validContacts.length > 0 ? validContacts : undefined,
      phones: validPhones.length > 0 ? validPhones : undefined,
      city: city.trim(),
      address: address || undefined,
      categories: categoryList.length > 0 ? categoryList : undefined,
      isActive: isActive,
      cooperationTerms: cooperationTerms || undefined,
      paymentTerms: paymentTerms || undefined,
      paymentDueDays: paymentDueDays ? Number(paymentDueDays) : undefined,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      note: note || undefined,
    });
  };

  const handleClose = () => {
    setShopNameError('');
    setCityError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editSupplier ? 'ویرایش تأمین‌کننده' : 'تأمین‌کننده جدید'}
      subtitle={editSupplier ? `ویرایش ${editSupplier.code}` : 'ثبت تأمین‌کننده جدید'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Shop Name - Required */}
        <FormField
          id="supplier-shop-name"
          label="نام فروشگاه"
          required
          error={shopNameError}
          hint="مثلاً: پارچه‌فروشی اصفهان"
        >
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="نام فروشگاه تأمین‌کننده"
            aria-invalid={!!shopNameError}
            aria-describedby={shopNameError ? 'supplier-shop-name-error' : undefined}
          />
        </FormField>

        {/* City - Required */}
        <FormField
          id="supplier-city"
          label="شهر"
          required
          error={cityError}
          hint="مثلاً: اصفهان، تهران، مشهد"
        >
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="شهر فعالیت تأمین‌کننده"
            aria-invalid={!!cityError}
            aria-describedby={cityError ? 'supplier-city-error' : undefined}
          />
        </FormField>

        {/* Contact Person(s) — multiple, new ones appear below existing */}
        <div className="p-3.5 rounded-2xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              افراد تماس
            </label>
            <span className="text-[11px] text-stone-400">
              {toPersianDigits(contacts.length)} شخص
            </span>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="grid sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <FormField
                    id={`contact-name-${contact.id}`}
                    label="نام"
                    hint="مثلاً: علی احمدی"
                  >
                    <Input
                      id={`contact-name-${contact.id}`}
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                      placeholder="نام شخص تماس"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-1">
                  <FormField
                    id={`contact-phone-${contact.id}`}
                    label="شماره موبایل"
                    hint="مثلاً: 09121234567"
                  >
                    <Input
                      id={`contact-phone-${contact.id}`}
                      dir="ltr"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      placeholder="0912..."
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-1 flex items-end justify-end">
                  {index === contacts.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addContact}
                      className="text-xs font-bold"
                    >
                      + افزودن شخص
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeContact(contact.id)}
                      className="text-xs font-bold"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone Numbers — multiple, new ones appear below existing */}
        <div className="p-3.5 rounded-2xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              شماره‌های تماس
            </label>
            <span className="text-[11px] text-stone-400">
              {toPersianDigits(phones.filter((p) => p.trim()).length)} شماره
            </span>
          </div>

          <div className="space-y-2">
            {phones.map((phone, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <FormField
                    id={`phone-${index}`}
                    label={`شماره ${index + 1}`}
                    hint="مثلاً: 09121234567"
                  >
                    <Input
                      id={`phone-${index}`}
                      dir="ltr"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      placeholder="0912..."
                    />
                  </FormField>
                </div>
                <div className="flex items-end mb-1">
                  {index === phones.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhone}
                      className="text-xs font-bold"
                    >
                      + افزودن شماره
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removePhone(index)}
                      className="text-xs font-bold"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <FormField
          id="supplier-categories"
          label="دسته‌بندی‌ها"
          hint="با کاما یا ویرگول فارسی جدا کنید، مثلاً: پارچه، لباس مردانه، لباس زنانه"
        >
          <Input
            id="supplier-categories"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="پارچه، لباس مردانه، ..."
          />
        </FormField>

        {/* Address */}
        <FormField
          id="supplier-address"
          label="آدرس"
          hint="آدرس کامل تأمین‌کننده"
        >
          <Textarea
            id="supplier-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس کامل تأمین‌کننده..."
            rows={3}
          />
        </FormField>

        {/* Cooperation & Payment Terms */}
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            id="supplier-coop"
            label="شرایط همکاری"
            hint="مثلاً: پیش‌پرداخت ۵۰٪"
          >
            <Input
              id="supplier-coop"
              value={cooperationTerms}
              onChange={(e) => setCooperationTerms(e.target.value)}
              placeholder="شرایط همکاری"
            />
          </FormField>

          <FormField
            id="supplier-payment-terms"
            label="شرایط پرداخت"
            hint="مثلاً: نقدی یا اقساطی"
          >
            <Input
              id="supplier-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="شرایط پرداخت"
            />
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            id="supplier-due-days"
            label="مهلت پرداخت (روز)"
            hint="مثلاً: ۳۰"
          >
            <Input
              id="supplier-due-days"
              type="number"
              min="0"
              value={paymentDueDays}
              onChange={(e) => setPaymentDueDays(e.target.value)}
              placeholder="۳۰"
            />
          </FormField>

          <FormField
            id="supplier-min-order"
            label="حداقل سفارش (تومان)"
            hint="اختیاری"
          >
            <Input
              id="supplier-min-order"
              type="number"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="مثلاً: 5000000"
            />
          </FormField>
        </div>

        {/* Note */}
        <FormField
          id="supplier-note"
          label="یادداشت"
          hint="یادداشت‌های داخلی..."
        >
          <Textarea
            id="supplier-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت‌های داخلی..."
            rows={3}
          />
        </FormField>

        {/* Active Toggle & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-white/10">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={isActive}
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
              onClick={handleClose}
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
