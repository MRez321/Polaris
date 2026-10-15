import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';
import { customersApi, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  editCustomer: Customer | null;
  saving: boolean;
  onSavingChange: (v: boolean) => void;
}

/** Modal form for creating/editing customers in the workshop admin. */
export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editCustomer,
  saving,
  onSavingChange,
}) => {
  const [code, setCode] = useState(editCustomer?.code ?? '');
  const [name, setName] = useState(editCustomer?.name ?? '');
  const [phone, setPhone] = useState(editCustomer?.phone ?? '');
  const [email, setEmail] = useState(editCustomer?.email ?? '');
  const [province, setProvince] = useState(editCustomer?.province ?? '');
  const [city, setCity] = useState(editCustomer?.city ?? '');
  const [address, setAddress] = useState(editCustomer?.address ?? '');
  const [postalCode, setPostalCode] = useState(editCustomer?.postalCode ?? '');
  const [creditLimit, setCreditLimit] = useState(editCustomer?.creditLimit?.toString() ?? '0');
  const [isActive, setIsActive] = useState(editCustomer?.isActive ?? true);
  const [tags, setTags] = useState(editCustomer?.tags?.join(', ') ?? '');
  const [notes, setNotes] = useState(editCustomer?.notes ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('نام مشتری الزامی است');
      return;
    }
    onSavingChange(true);
    try {
      const payload: Partial<Customer> = {
        ...(code ? { code } : {}),
        name: name.trim(),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(province ? { province } : {}),
        ...(city ? { city } : {}),
        ...(address ? { address } : {}),
        ...(postalCode ? { postalCode } : {}),
        creditLimit: Number(creditLimit) || 0,
        isActive,
        ...(tags ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
        ...(notes ? { notes } : {}),
      };
      let saved: Customer;
      if (editCustomer) {
        saved = await customersApi.update(editCustomer.id, payload);
        toast.success(`مشتری ${saved.name} به‌روزرسانی شد`);
      } else {
        saved = await customersApi.create(payload);
        toast.success(`مشتری ${saved.name} ایجاد شد`);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      onSavingChange(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{editCustomer ? 'ویرایش مشتری' : 'مشتری جدید'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">کد</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="دستیاری (اختیاری)"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">نام *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام مشتری"
              required
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">تلفیحی</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">ایمیل</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">استان</label>
            <input
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">شهر</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">آدرس</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس کامل مشتری"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">کد پستی</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">اعتبار (تومان)</label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              min="0"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">برچسب‌ها</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="وکشی، VIP (با کاما جدا کنید)"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex items-center justify-between pt-6">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-stone-600 dark:text-stone-400">وضعیت فعال</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  isActive ? 'bg-brand' : 'bg-stone-300 dark:bg-stone-600',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                    isActive ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">یادداشت</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="یادداشت‌های داخلی"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg text-white dark:text-stone-900 transition-colors',
              'bg-brand hover:bg-brand-hover',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'در حال ذخیره...' : editCustomer ? 'به‌روزرسانی' : 'ایجاد'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerFormModal;
