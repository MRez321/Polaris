import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import type { Owner, BankAccountInfo } from '@/types';
import {
  User,
  Phone,
  CreditCard,
  Plus,
  Trash2,
  Check,
  Mail,
} from 'lucide-react';
import { ImagePicker } from '@/components/common/ImagePicker';
import { BankCardInput, ShebaInput, detectBankByCard, detectBankBySheba } from '@/components/common/BankInput';
import { toPersianDigits } from '@/utils/persian';
import { toast } from 'sonner';
import {
  normalizePhoneInput,
  isValidIranPhone,
  normalizeDigitsInput,
  isValidNationalCode,
  PHONE_ERROR,
  NATIONAL_CODE_ERROR,
} from '@/modules/workshop/utils/validation';

interface OwnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ownerData: Partial<Owner>) => void;
  editOwner?: Owner | null;
  onDelete?: (id: string) => void;
}

export const OwnerFormModal: React.FC<OwnerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editOwner,
  onDelete,
}) => {
  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [sharePercentage, setSharePercentage] = useState<number | null>(null);
  const [nationalCode, setNationalCode] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');

  // Phones
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([
    { bankName: '', cardNumber: '', shebaNumber: '', accountHolder: '' },
  ]);
  // Form for adding a new bank account
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newShebaNumber, setNewShebaNumber] = useState('');

  useEffect(() => {
    if (editOwner) {
      setOwnerId(editOwner.id);
      setName(editOwner.name || '');
      setRole(editOwner.role || '');
      setSharePercentage(editOwner.sharePercentage ?? null);
      setNationalCode(editOwner.nationalCode || '');
      setEmail(editOwner.email || '');
      setAvatarUrl(editOwner.avatarUrl || '');
      setBio(editOwner.bio || '');
      setPhones(editOwner.phones ? [...editOwner.phones] : []);
      setBankAccounts(
        editOwner.bankAccounts?.length
          ? [...editOwner.bankAccounts]
          : [{ bankName: '', cardNumber: '', shebaNumber: '', accountHolder: '' }]
      );
      setShowAddBank(false);
    } else {
      setOwnerId(crypto.randomUUID());
      setName('');
      setRole('');
      setSharePercentage(null);
      setNationalCode('');
      setEmail('');
      setAvatarUrl('');
      setBio('');
      setPhones([]);
      setBankAccounts([{ bankName: '', cardNumber: '', shebaNumber: '', accountHolder: '' }]);
      setShowAddBank(false);
    }
  }, [editOwner, isOpen]);

  const handleAddPhone = () => {
    if (newPhone.trim()) {
      setPhones([...phones.filter(Boolean), newPhone.trim()]);
      setNewPhone('');
    } else {
      setPhones([...phones, '']);
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const next = [...phones];
    next[index] = value;
    setPhones(next);
  };

  const handleRemovePhone = (index: number) => {
    if (phones.length <= 1) {
      setPhones(['']);
      return;
    }
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleAccountChange = (index: number, field: keyof BankAccountInfo, value: string) => {
    const next = [...bankAccounts];
    next[index] = { ...next[index], [field]: value };
    if (field === 'cardNumber') {
      const detected = detectBankByCard(value);
      if (detected) {
        next[index].bankName = detected.name;
      }
    } else if (field === 'shebaNumber' && !next[index].bankName) {
      const detected = detectBankBySheba(value);
      if (detected) {
        next[index].bankName = detected.name;
      }
    }
    setBankAccounts(next);
  };

  const handleRemoveAccount = (index: number) => {
    if (bankAccounts.length <= 1) {
      setBankAccounts([{ bankName: '', cardNumber: '', shebaNumber: '', accountHolder: '' }]);
      return;
    }
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const handleAddNewAccount = () => {
    if (!newCardNumber.trim() && !newShebaNumber.trim()) return;
    const detected = detectBankByCard(newCardNumber) || detectBankBySheba(newShebaNumber);
    const bankName = newBankName.trim() || (detected ? detected.name : 'حساب بانکی');
    setBankAccounts([
      ...bankAccounts,
      {
        id: `acc-${Date.now()}`,
        bankName,
        accountHolder: newAccountHolder.trim() || name.trim(),
        cardNumber: newCardNumber.trim(),
        shebaNumber: newShebaNumber.trim(),
      },
    ]);
    setNewBankName('');
    setNewAccountHolder('');
    setNewCardNumber('');
    setNewShebaNumber('');
    setShowAddBank(false);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanedPhones = phones.map((p) => normalizePhoneInput(p)).filter(Boolean);
    if (!cleanedPhones.every((p) => isValidIranPhone(p))) {
      toast.error(PHONE_ERROR);
      return;
    }

    const normalizedNationalCode = normalizeDigitsInput(nationalCode);
    if (normalizedNationalCode && !isValidNationalCode(normalizedNationalCode)) {
      toast.error(NATIONAL_CODE_ERROR);
      return;
    }

    const cleanedAccounts = bankAccounts.filter(
      (a) => a.cardNumber?.trim() || a.shebaNumber?.trim()
    );

    const payload: Partial<Owner> = {
      id: ownerId,
      name: name.trim(),
      role: role.trim() || 'مالک و هم‌بنیان‌گذار',
      sharePercentage: sharePercentage || 50,
      nationalCode: normalizedNationalCode,
      email: email.trim(),
      avatarUrl: avatarUrl.trim(),
      bio: bio.trim(),
      phones: cleanedPhones,
      bankAccounts: cleanedAccounts,
    };

    onSave(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editOwner ? `ویرایش مشخصات ${editOwner.name}` : 'افزودن هم‌بنیان‌گذار / مالک کارگاه'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              نام و نام خانوادگی <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: محمد رضایی"
                className="w-full pl-3 pr-9 py-2.5 rounded-xl glass-input outline-none font-bold text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              سمت و حوزه مسئولیت در کارگاه
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="مثال: هم‌بنیان‌گذار و مدیر اجرایی و تولید"
              className="w-full px-3 py-2.5 rounded-xl glass-input outline-none text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              کد ملی
            </label>
            <input
              type="text"
              value={nationalCode}
              onChange={(e) => setNationalCode(e.target.value)}
              placeholder="۰۰۱۲۳۴۵۶۷۸"
              className="w-full px-3 py-2.5 rounded-xl glass-input outline-none font-mono text-left text-xs sm:text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              ایمیل سازمانی (اختیاری)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@polaris-style.ir"
                className="w-full pl-3 pr-9 py-2.5 rounded-xl glass-input outline-none font-mono text-left text-xs sm:text-sm"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              درصد سهام در کارگاه
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={sharePercentage ?? ''}
              onChange={(e) => setSharePercentage(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="مثلاً: ۵۰"
              className="w-full px-3 py-2.5 rounded-xl glass-input outline-none font-mono text-left text-xs sm:text-sm"
              dir="ltr"
            />
          </div>
        </div>

        {/* Unique Auto-generated ID */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            شناسه یکتا <span className="text-stone-400 font-normal">(خودکار — غیرقابل تغییر)</span>
          </label>
          <input
            type="text"
            dir="ltr"
            value={ownerId}
            readOnly
            disabled
            className="w-full px-3 py-2.5 rounded-xl glass-input outline-none font-mono text-left text-xs sm:text-sm opacity-70 cursor-not-allowed"
          />
        </div>

        {/* Avatar and Bio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              تصویر پروفایل / چهره
            </label>
            <ImagePicker
              values={avatarUrl ? [avatarUrl] : []}
              onChange={(urls) => setAvatarUrl(urls[0] ?? '')}
              category="avatar"
              tileClassName="w-14 h-14"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              بیوگرافی و یادداشت مدیریتی
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="توضیح کوتاه درباره تجارب، وظایف و سوابق در کارگاه..."
              className="w-full px-3 py-2 rounded-xl glass-input outline-none text-xs"
            />
          </div>
        </div>

        {/* Phone Numbers with ready-to-call direct support */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-brand" />
              <span>شماره‌های تماس و تلفن همراه</span>
            </h4>
            <button
              type="button"
              onClick={handleAddPhone}
              className="text-xs font-bold text-brand-ink dark:text-brand hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن شماره دیگر</span>
            </button>
          </div>

          <div className="space-y-2">
            {phones.map((ph, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400 w-16 shrink-0">
                  شماره {toPersianDigits(idx + 1)}:
                </span>
                <input
                  type="tel"
                  value={ph}
                  onChange={(e) => handlePhoneChange(idx, e.target.value)}
                  placeholder="09121234567"
                  className="flex-1 px-3 py-2 rounded-xl glass-input outline-none font-mono text-left text-xs sm:text-sm"
                  dir="ltr"
                />
                {ph && (
                  <a
                    href={`tel:${ph}`}
                    title="تست برقراری تماس"
                    className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhone(idx)}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="حذف شماره"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Accounts (Card & Sheba Numbers) */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand" />
              <span>حساب‌های بانکی، کارت و شبا (جهت واریز و تسویه)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddBank(!showAddBank)}
              className="text-xs font-bold text-brand-ink dark:text-brand hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن کارت و شبای جدید</span>
            </button>
          </div>

          {/* Existing Accounts List */}
          <div className="space-y-3">
            {bankAccounts.map((acc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/10 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-brand-ink dark:text-brand">
                    حساب {toPersianDigits(idx + 1)}: {acc.bankName || 'حساب بانکی'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAccount(idx)}
                    className="p-1 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="حذف این حساب"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">نام بانک</label>
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => handleAccountChange(idx, 'bankName', e.target.value)}
                      placeholder="مثال: بانک ملت"
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">به نام صاحب حساب</label>
                    <input
                      type="text"
                      value={acc.accountHolder || ''}
                      onChange={(e) => handleAccountChange(idx, 'accountHolder', e.target.value)}
                      placeholder="مثال: محمد رضایی"
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">شماره کارت (۱۶ رقمی)</label>
                    <BankCardInput
                      value={acc.cardNumber}
                      onChange={(val) => handleAccountChange(idx, 'cardNumber', val)}
                      placeholder="۶۱۰۴-۳۳۷۸-..."
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">شماره شبا (۲۴ رقمی)</label>
                    <ShebaInput
                      value={acc.shebaNumber}
                      onChange={(val) => handleAccountChange(idx, 'shebaNumber', val)}
                      placeholder="IR120120000..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form to add another bank account */}
          {showAddBank && (
            <div className="p-3.5 rounded-xl bg-brand/10 dark:bg-brand/15 border border-brand/30 dark:border-brand/30 space-y-3">
              <h5 className="font-bold text-xs text-stone-900 dark:text-white">
                مشخصات کارت و شبای جدید:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-600 dark:text-stone-300 mb-0.5">
                    نام بانک
                  </label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="مثال: بانک سامان"
                    className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-600 dark:text-stone-300 mb-0.5">
                    نام صاحب حساب
                  </label>
                  <input
                    type="text"
                    value={newAccountHolder}
                    onChange={(e) => setNewAccountHolder(e.target.value)}
                    placeholder="نام و نام خانوادگی..."
                    className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-600 dark:text-stone-300 mb-0.5">
                    شماره کارت
                  </label>
                  <BankCardInput
                    value={newCardNumber}
                    onChange={setNewCardNumber}
                    placeholder="۶۲۱۹-۸۶۱۰-..."
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-600 dark:text-stone-300 mb-0.5">
                    شماره شبا
                  </label>
                  <ShebaInput
                    value={newShebaNumber}
                    onChange={setNewShebaNumber}
                    placeholder="IR..."
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBank(false)}
                  className="px-3 py-1 rounded-lg text-xs text-stone-500 hover:bg-stone-200 dark:hover:bg-white/10"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleAddNewAccount}
                  className="px-3.5 py-1 rounded-lg bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover"
                >
                  افزودن این حساب
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-white/10">
          {editOwner && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`آیا از حذف اطلاعات ${editOwner.name} اطمینان دارید؟`)) {
                  onDelete(editOwner.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف هم‌بنیان‌گذار</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/10 text-xs sm:text-sm font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{editOwner ? 'ذخیره تغییرات' : 'ثبت هم‌بنیان‌گذار جدید'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
