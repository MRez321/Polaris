import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Seller, BankAccountInfo } from '../../types';
import { Plus, Trash2, Camera, CreditCard, Shield, Phone, MapPin, User, Check, Copy } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { BankCardInput, ShebaInput, detectBankByCard, detectBankBySheba } from '../common/BankInput';
import { SelectMenu } from '../ui/select-menu';
import { FormattedNumberInput } from '../common/FormattedNumberInput';

interface SellerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sellerData: Partial<Seller>) => void;
  editSeller?: Seller | null;
}

export const SellerFormModal: React.FC<SellerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editSeller,
}) => {
  const [sellerId, setSellerId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [newExtraPhone, setNewExtraPhone] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [streetLocation, setStreetLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Toggle for Guarantee & Credit settings - DEFAULT UNCHECKED per requirements
  const [hasGuarantee, setHasGuarantee] = useState(false);
  const [guaranteeType, setGuaranteeType] = useState<Seller['guaranteeType']>('promissory_note');
  const [guaranteeAmount, setGuaranteeAmount] = useState<number | null>(null);
  const [guaranteeDetails, setGuaranteeDetails] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | null>(null);

  // Bank Accounts / Card & Sheba
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newDetectedBank, setNewDetectedBank] = useState('');
  const [newShebaNumber, setNewShebaNumber] = useState('');
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (editSeller) {
      setSellerId(editSeller.id);
      setName(editSeller.name || '');
      setPhone(editSeller.phone || '');
      setAdditionalPhones(editSeller.additionalPhones || []);
      setNationalCode(editSeller.nationalCode || '');
      setStreetLocation(editSeller.streetLocation || '');
      setAvatarUrl(editSeller.avatarUrl || '');
      setNotes(editSeller.notes || '');
      setHasGuarantee(Boolean(editSeller.hasGuarantee));
      setGuaranteeType(editSeller.guaranteeType || 'promissory_note');
      setGuaranteeAmount(editSeller.guaranteeAmount ?? null);
      setGuaranteeDetails(editSeller.guaranteeDetails || '');
      setCreditLimit(editSeller.creditLimit ?? null);
      setBankAccounts(editSeller.bankAccounts || []);
      setShowAddBankForm(false);
    } else {
      setSellerId(crypto.randomUUID());
      setName('');
      setPhone('');
      setAdditionalPhones([]);
      setNationalCode('');
      setStreetLocation('');
      setAvatarUrl('');
      setNotes('');
      setHasGuarantee(false); // Default unchecked
      setGuaranteeType('promissory_note');
      setGuaranteeAmount(null);
      setGuaranteeDetails('');
      setCreditLimit(null);
      setBankAccounts([]);
      setNewCardNumber('');
      setNewDetectedBank('');
      setNewShebaNumber('');
      setShowAddBankForm(true);
    }
  }, [editSeller, isOpen]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/\s|-/g, ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddExtraPhone = () => {
    if (!newExtraPhone.trim()) return;
    setAdditionalPhones([...additionalPhones, newExtraPhone.trim()]);
    setNewExtraPhone('');
  };

  const handleRemoveExtraPhone = (index: number) => {
    setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
  };

  const handleAddBankAccount = () => {
    if (!newCardNumber.trim() && !newShebaNumber.trim()) return;
    const detected = detectBankByCard(newCardNumber) || detectBankBySheba(newShebaNumber);
    const bankTitle = detected ? detected.name : 'حساب بانکی';

    setBankAccounts([
      ...bankAccounts,
      {
        id: `ba-${Date.now()}`,
        bankName: bankTitle,
        cardNumber: newCardNumber.trim(),
        shebaNumber: newShebaNumber.trim(),
      },
    ]);
    setNewCardNumber('');
    setNewDetectedBank('');
    setNewShebaNumber('');
    setShowAddBankForm(false);
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setAvatarUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (hasGuarantee && creditLimit === null) return;

    let finalBankAccounts = [...bankAccounts];
    // If user filled in the bank inputs but didn't click "Add", include it automatically
    if (newCardNumber.trim() || newShebaNumber.trim()) {
      const detected = detectBankByCard(newCardNumber) || detectBankBySheba(newShebaNumber);
      finalBankAccounts.push({
        id: `ba-${Date.now()}`,
        bankName: detected ? detected.name : 'حساب بانکی',
        cardNumber: newCardNumber.trim(),
        shebaNumber: newShebaNumber.trim(),
      });
    }

    onSave({
      id: sellerId,
      name: name.trim(),
      phone: phone.trim(),
      additionalPhones,
      nationalCode: nationalCode.trim(),
      streetLocation: streetLocation.trim() || 'نامشخص',
      avatarUrl,
      hasGuarantee,
      guaranteeType,
      guaranteeAmount: hasGuarantee ? guaranteeAmount || 0 : 0,
      guaranteeDetails: hasGuarantee ? guaranteeDetails.trim() : '',
      creditLimit: hasGuarantee ? creditLimit || 0 : 0,
      bankAccounts: finalBankAccounts,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editSeller ? 'ویرایش مشخصات فروشنده و دست‌فروش' : 'ثبت فروشنده و دست‌فروش جدید'}
      subtitle="ثبت هویت، راسته بساط، اطلاعات کارت/شبا، تنظیمات ضمانت و سقف امانت"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-stone-900 dark:text-white">
        {/* Profile Avatar & Primary Identity */}
        <div className="p-4 rounded-2xl glass-card flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || 'فروشنده'}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#CEAE80] shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#CEAE80]/20 border-2 border-[#CEAE80] flex items-center justify-center text-[#CEAE80] text-xl font-bold">
                {name ? name.charAt(0) : <User className="w-8 h-8" />}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-[#CEAE80] hover:bg-[#B59363] text-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                نام و نام خانوادگی / شهرت بساط‌دار *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: حسین احمدی (عمو حسین)"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                شماره همراه اصلی *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Unique auto-generated ID */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            شناسه یکتا <span className="text-stone-400 font-normal">(خودکار — غیرقابل تغییر)</span>
          </label>
          <input
            type="text"
            dir="ltr"
            value={sellerId}
            readOnly
            disabled
            className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none font-mono text-left opacity-70 cursor-not-allowed"
          />
        </div>

        {/* Location & National Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              محل استقرار بساط / راسته خیابانی *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={streetLocation}
                onChange={(e) => setStreetLocation(e.target.value)}
                placeholder="مثلاً: میدان ولیعصر - روبروی سینما قدس"
                className="w-full px-3 py-2.5 pl-9 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none"
              />
              <MapPin className="w-4 h-4 text-[#CEAE80] absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              کد ملی (اختیاری)
            </label>
            <input
              type="text"
              value={nationalCode}
              onChange={(e) => setNationalCode(e.target.value)}
              placeholder="۰۰۱۲۳۴۵۶۷۸"
              className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
              dir="ltr"
            />
          </div>
        </div>

        {/* Additional Phone Numbers */}
        <div className="p-3.5 rounded-2xl glass-card space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
              شماره‌های تماس تکمیلی / معرف / منزل
            </label>
            <span className="text-[11px] text-stone-400">
              {toPersianDigits(additionalPhones.length)} شماره فرعی
            </span>
          </div>

          {additionalPhones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {additionalPhones.map((ph, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs font-mono"
                >
                  <a href={`tel:${ph}`} className="text-[#CEAE80] hover:underline" dir="ltr">
                    {ph}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraPhone(idx)}
                    className="text-rose-500 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="شماره تماس دوم یا ثابت (مثلاً: ۰۲۱۶۶۴۴۲۲۱۱)..."
              value={newExtraPhone}
              onChange={(e) => setNewExtraPhone(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl glass-input text-xs font-mono outline-none text-left"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleAddExtraPhone}
              className="px-3.5 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-[#CEAE80] hover:text-black text-xs font-bold transition-colors"
            >
              افزودن
            </button>
          </div>
        </div>

        {/* Bank Accounts / Card & Sheba Section with BankInput Component */}
        <div className="p-4 rounded-2xl glass-card space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#CEAE80]" />
              <span>اطلاعات کارت و شبای بانکی (تشخیص خودکار بانک از پیش‌شماره)</span>
            </label>

            {!showAddBankForm && (
              <button
                type="button"
                onClick={() => setShowAddBankForm(true)}
                className="text-xs text-[#CEAE80] hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن حساب جدید</span>
              </button>
            )}
          </div>

          {/* Existing Bank Accounts List */}
          {bankAccounts.length > 0 && (
            <div className="space-y-2.5">
              {bankAccounts.map((acc, idx) => {
                const cKey = `card-${idx}`;
                const sKey = `sheba-${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-black/40 border border-stone-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all hover:border-[#CEAE80]/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#CEAE80]/15 text-[#CEAE80] text-xs font-bold border border-[#CEAE80]/30 shrink-0">
                        {acc.bankName || 'بانک'}
                      </span>

                      <div className="space-y-1">
                        {acc.cardNumber && (
                          <div
                            onClick={() => handleCopy(acc.cardNumber, cKey)}
                            className="flex items-center gap-2 text-xs font-mono text-stone-800 dark:text-stone-200 cursor-pointer group"
                            title="کلیک برای کپی شماره کارت"
                          >
                            <span className="text-stone-400 group-hover:text-[#CEAE80]">کارت:</span>
                            <span className="font-bold tracking-wider group-hover:text-[#CEAE80]" dir="ltr">
                              {acc.cardNumber}
                            </span>
                            {copiedKey === cKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        )}

                        {acc.shebaNumber && (
                          <div
                            onClick={() => handleCopy(acc.shebaNumber, sKey)}
                            className="flex items-center gap-2 text-[11px] font-mono text-stone-500 dark:text-gray-400 cursor-pointer group"
                            title="کلیک برای کپی شماره شبا"
                          >
                            <span className="text-stone-400 group-hover:text-[#CEAE80]">شبا:</span>
                            <span className="group-hover:text-[#CEAE80]" dir="ltr">
                              {acc.shebaNumber}
                            </span>
                            {copiedKey === sKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg self-end sm:self-center transition-colors"
                      title="حذف این حساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Bank Form - SEPARATE ROWS FOR CARD, SHEBA AND SUBMIT */}
          {(showAddBankForm || bankAccounts.length === 0) && (
            <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                مشخصات حساب جدید فروشنده:
              </div>

              {/* Row 1: 16-digit Card Input */}
              <div>
                <BankCardInput
                  value={newCardNumber}
                  onChange={(val, bankName) => {
                    setNewCardNumber(val);
                    setNewDetectedBank(bankName);
                  }}
                  placeholder="---- ---- ---- ----"
                  label="شماره کارت ۱۶ رقمی (بانک خودکار شناسایی می‌شود)"
                />
              </div>

              {/* Row 2: 24-digit Sheba Input */}
              <div>
                <ShebaInput
                  value={newShebaNumber}
                  onChange={(val, bankName) => {
                    setNewShebaNumber(val);
                    if (!newDetectedBank && bankName) {
                      setNewDetectedBank(bankName);
                    }
                  }}
                  placeholder="IR -- ---- ---- ---- ---- ---- --"
                  label="شماره شبا (IBAN بیست و چهار رقمی)"
                />
              </div>

              {/* Row 3: Submit Button in its own separate row */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  disabled={!newCardNumber.trim() && !newShebaNumber.trim()}
                  className="px-4 py-2 rounded-xl bg-stone-800 dark:bg-stone-700 hover:bg-[#CEAE80] hover:text-black text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت و ذخیره کارت در لیست</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Guarantee & Credit Limit Option (TOGGLE CHECKBOX - UNCHECKED BY DEFAULT) */}
        <div className="p-4 rounded-2xl bg-[#CEAE80]/10 border border-[#CEAE80]/30 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasGuarantee}
                onChange={(e) => setHasGuarantee(e.target.checked)}
                className="w-4 h-4 accent-[#CEAE80] rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-stone-900 dark:text-[#CEAE80] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#CEAE80]" />
                تنظیمات ضمانت و سقف امانت مالی (اختیاری)
              </span>
            </label>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {hasGuarantee ? 'فعال (تضمین دارد)' : 'غیرفعال (امانت بدون وثیقه)'}
            </span>
          </div>

          {hasGuarantee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#CEAE80]/20">
              <div>
                <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-bold mb-1">
                  نوع مدرک ضمانتی
                </label>
              <SelectMenu
                value={guaranteeType}
                onChange={(v) => setGuaranteeType(v as Seller['guaranteeType'])}
                options={[
                  { value: 'promissory_note', label: 'سفته معتبر بانکی' },
                  { value: 'cheque', label: 'چک صیادی بنفش' },
                  { value: 'trusted_guarantor', label: 'ضمانت حضوری کاسب معتمد بازار' },
                  { value: 'national_card', label: 'کارت ملی هوشمند / اصل شناسنامه' },
                ]}
              />
              </div>

              <div>
                <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-bold mb-1">
                  مبلغ ضمانت تودیع شده (تومان)
                </label>
                <FormattedNumberInput
                  value={guaranteeAmount}
                  onChange={setGuaranteeAmount}
                  suffix="تومان"
                  placeholder="مثلاً: ۵۰,۰۰۰,۰۰۰"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-bold mb-1">
                  مشخصات سند ضمانت (شماره سفته/شناسه چک)
                </label>
                <input
                  type="text"
                  value={guaranteeDetails}
                  onChange={(e) => setGuaranteeDetails(e.target.value)}
                  placeholder="مثلاً: سفته شماره ۹۸۴۵۱ به امضای ضامن"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none focus:border-[#CEAE80]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#CEAE80] font-bold mb-1">
                  سقف اعتبار امانت مجاز (تومان) *
                </label>
                <FormattedNumberInput
                  value={creditLimit}
                  onChange={setCreditLimit}
                  suffix="تومان"
                  placeholder="مثلاً: ۳۰,۰۰۰,۰۰۰"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141414] border border-[#CEAE80] text-[#CEAE80] text-xs sm:text-sm font-bold font-mono outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            یادداشت‌ها و سابقه کاری
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="روزهای حضور، شرایط خاص و توضیحات بساط..."
            className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white text-xs sm:text-sm font-medium"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            {editSeller ? 'ذخیره تغییرات فروشنده' : 'ثبت نهایی فروشنده'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

