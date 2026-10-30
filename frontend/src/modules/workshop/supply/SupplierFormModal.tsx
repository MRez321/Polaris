import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import type { Supplier } from '@/types';
import type { SupplierPayload } from '@/lib/api';
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
 *  - Shop name + contact persons (with phones inline) + city + categories
 *  - Required fields: shop name, contact person name, city
 *  - New contact person entries appear below existing ones
 *  - Categories separated by comma (,) and Persian comma (،)
 *  - Placeholders replace under-input label text
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
    } else {
      setShopName('');
      setContacts([{ id: 'c_' + Math.random().toString(36).slice(2, 9), name: '', phone: '' }]);
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
    if (contacts.length === 1) return;
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const updateContact = (id: string, field: 'name' | 'phone', value: string) => {
    setContacts(contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
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

    // Filter out empty contacts and collect phones from contacts
    const validContacts = contacts
      .filter((c) => c.name.trim() || c.phone.trim())
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        phone: c.phone.trim() || undefined,
      }));

    // Collect all non-empty phones from contacts for the phones array
    const allPhones = contacts
      .filter((c) => c.name.trim() || c.phone.trim())
      .map((c) => c.phone.trim())
      .filter((p) => p.length > 0);

    // Parse categories - support both Persian and English commas
    const categoryList = categories
      .split(/[،,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    onSave({
      ...(editSupplier?.code && { code: editSupplier.code }),
      shopName: shopName.trim(),
      contactPersons: validContacts.length > 0 ? validContacts : undefined,
      phones: allPhones.length > 0 ? allPhones : undefined,
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
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
            نام فروشگاه <span className="text-rose-600">*</span>
          </label>
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="مثلاً: پارچه‌فروشی اصفهان"
            aria-invalid={!!shopNameError}
            aria-describedby={shopNameError ? 'supplier-shop-name-error' : undefined}
            className={shopNameError ? 'border-rose-500' : ''}
          />
          {shopNameError && (
            <span id="supplier-shop-name-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">
              {shopNameError}
            </span>
          )}
        </div>

        {/* City - Required */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
            شهر <span className="text-rose-600">*</span>
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="مثلاً: اصفهان، تهران، مشهد"
            aria-invalid={!!cityError}
            aria-describedby={cityError ? 'supplier-city-error' : undefined}
            className={cityError ? 'border-rose-500' : ''}
          />
          {cityError && (
            <span id="supplier-city-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">
              {cityError}
            </span>
          )}
        </div>

        {/* Contact Person(s) — multiple, new ones appear below existing */}
        <div className="p-4 rounded-2xl glass-card space-y-4 border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              افراد تماس
            </label>
            <span className="text-[11px] text-stone-400">
              {contacts.length} شخص
            </span>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="grid sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    نام
                  </label>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                    placeholder="مثلاً: علی احمدی"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    موبایل
                  </label>
                  <Input
                    dir="ltr"
                    value={contact.phone}
                    onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                    placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                  />
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

        {/* Categories */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            دسته‌بندی‌ها
          </label>
          <Input
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="با کاما جدا کنید، مثلاً: پارچه، لباس مردانه، لباس زنانه"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            آدرس
          </label>
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس کامل تأمین‌کننده..."
            rows={3}
          />
        </div>

        {/* Cooperation & Payment Terms */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              شرایط همکاری
            </label>
            <Input
              value={cooperationTerms}
              onChange={(e) => setCooperationTerms(e.target.value)}
              placeholder="مثلاً: پیش‌پرداخت ۵۰٪"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              شرایط پرداخت
            </label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="مثلاً: نقدی یا اقساطی"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              مهلت پرداخت (روز)
            </label>
            <Input
              type="number"
              min="0"
              value={paymentDueDays}
              onChange={(e) => setPaymentDueDays(e.target.value)}
              placeholder="۳۰"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              حداقل سفارش (تومان)
            </label>
            <Input
              type="number"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="مثلاً: 5000000"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            یادداشت
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت‌های داخلی..."
            rows={3}
          />
        </div>

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
