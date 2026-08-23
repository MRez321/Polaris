import React, { useState } from 'react';
import {
  Users,
  CreditCard,
  Phone,
  Copy,
  Check,
  Plus,
  Edit,
  Trash2,
  History as HistoryIcon,
  Calendar,
  FileText,
  Search,
  Upload,
  Download,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import type { Owner, StaffMember, BankAccountInfo } from '../../types';
import { formatToman, toPersianDigits, toJalaliDate } from '../../utils/persian';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { BankCardInput, ShebaInput, detectBankByCard, detectBankBySheba } from '../common/BankInput';
import { OwnerCard } from '../settings/OwnerCard';
import { OwnerFormModal } from '../settings/OwnerFormModal';

interface StaffManagerProps {
  owners: Owner[];
  staff: StaffMember[];
  onUpdateOwners: (owners: Owner[]) => void;
  onAddStaff: (staffData: Partial<StaffMember>) => void;
  onUpdateStaff: (id: string, staffData: Partial<StaffMember>) => void;
  onDeleteStaff: (id: string) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  owners = [],
  staff = [],
  onUpdateOwners,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Owner Form Modal State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  const handleOpenAddOwner = () => {
    setEditingOwner(null);
    setIsOwnerModalOpen(true);
  };

  const handleOpenEditOwner = (owner: Owner) => {
    setEditingOwner(owner);
    setIsOwnerModalOpen(true);
  };

  const handleSaveOwner = (ownerData: Partial<Owner>) => {
    if (editingOwner) {
      const updated = owners.map((o) =>
        o.id === editingOwner.id ? { ...o, ...ownerData } : o
      );
      onUpdateOwners(updated);
    } else {
      const newOwner: Owner = {
        id: `own-${Date.now()}`,
        name: ownerData.name || '',
        role: ownerData.role || 'مالک و هم‌بنیان‌گذار',
        sharePercentage: ownerData.sharePercentage ?? 50,
        nationalCode: ownerData.nationalCode || '',
        email: ownerData.email || '',
        avatarUrl: ownerData.avatarUrl || '',
        bio: ownerData.bio || '',
        phones: ownerData.phones?.length ? ownerData.phones : ['09120000000'],
        bankAccounts: ownerData.bankAccounts || [],
      };
      onUpdateOwners([...owners, newOwner]);
    }
  };

  const handleDeleteOwner = (id: string) => {
    const updated = owners.filter((o) => o.id !== id);
    onUpdateOwners(updated);
  };

  // Form states for adding/editing staff
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('tailor');
  const [roleTitle, setRoleTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);  const [nationalCode, setNationalCode] = useState('');
  const [salaryType, setSalaryType] = useState<StaffMember['salaryType']>('monthly');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [status, setStatus] = useState<StaffMember['status']>('active');
  const [notes, setNotes] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newShebaNumber, setNewShebaNumber] = useState('');

  // Resume attachment state
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeAttachmentName, setResumeAttachmentName] = useState('');
  const [resumeAttachmentData, setResumeAttachmentData] = useState('');

  // 1-Click Copy Handler
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/\s|-/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setName('');
    setRole('tailor');
    setRoleTitle('دوزنده راسته کت و شلوار');
    setPhone('');
    setAdditionalPhones([]);
    setNationalCode('');
    setSalaryType('monthly');
    setSalaryAmount('18000000');
    setStatus('active');
    setNotes('');
    setBankAccounts([]);
    setNewCardNumber('');
    setNewShebaNumber('');
    setResumeUrl('');
    setResumeAttachmentName('');
    setResumeAttachmentData('');
    setIsStaffModalOpen(true);
  };

  const handleOpenEditModal = (stf: StaffMember) => {
    setEditingStaff(stf);
    setName(stf.name);
    setRole(stf.role);
    setRoleTitle(stf.roleTitle);
    setPhone(stf.phones?.[0] || '');
    setAdditionalPhones(stf.phones?.slice(1) || []);
    setNationalCode(stf.nationalCode || '');
    setSalaryType(stf.salaryType);
    setSalaryAmount(String(stf.salaryAmount || 0));
    setStatus(stf.status);
    setNotes(stf.notes || '');
    setBankAccounts(stf.bankAccounts || []);
    setNewCardNumber('');
    setNewShebaNumber('');
    setResumeUrl(stf.resumeUrl || '');
    setResumeAttachmentName(stf.resumeAttachmentName || '');
    setResumeAttachmentData(stf.resumeAttachmentData || '');
    setIsStaffModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setResumeAttachmentData(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const allPhones = [phone.trim(), ...additionalPhones].filter(Boolean);

    let finalBankAccounts = [...bankAccounts];
    if (newCardNumber.trim() || newShebaNumber.trim()) {
      const detected = detectBankByCard(newCardNumber) || detectBankBySheba(newShebaNumber);
      finalBankAccounts.push({
        id: `ba-${Date.now()}`,
        bankName: detected ? detected.name : 'حساب بانکی',
        cardNumber: newCardNumber.trim(),
        shebaNumber: newShebaNumber.trim(),
      });
    }

    const staffPayload: Partial<StaffMember> = {
      name: name.trim(),
      role,
      roleTitle: roleTitle.trim() || 'عضو تیم کارگاه',
      phones: allPhones,
      nationalCode: nationalCode.trim(),
      salaryType,
      salaryAmount: Number(salaryAmount) || 0,
      status,
      bankAccounts: finalBankAccounts,
      resumeUrl: resumeUrl.trim(),
      resumeAttachmentName: resumeAttachmentName.trim(),
      resumeAttachmentData,
      notes: notes.trim(),
    };

    if (editingStaff) {
      onUpdateStaff(editingStaff.id, staffPayload);
    } else {
      onAddStaff(staffPayload);
    }

    setIsStaffModalOpen(false);
  };

  const handleDeleteStaffPrompt = (stf: StaffMember) => {
    if (
      confirm(
        `آیا از انتقال پرونده "${stf.name}" به سطل بازیافت اطمینان دارید؟ در بخش تنظیمات و سطل بازیافت قابل بازگردانی خواهد بود.`
      )
    ) {
      onDeleteStaff(stf.id);
    }
  };

  const filteredStaff = (staff || []).filter((stf) => {
    const matchesSearch =
      stf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stf.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stf.phones && stf.phones.some((p) => p.includes(searchQuery)));
    const matchesRole = selectedRoleFilter === 'all' || stf.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-stone-900 dark:text-white">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">مدیریت پرسنل، کادر دوزندگی و حساب‌های صاحبان کارگاه</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            مشخصات کامل هم‌بنیان‌گذاران، دوزندگان، حسابداری، رزومه‌ها، شماره کارت‌های تسویه و تاریخچه اقدامات
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>افزودن عضو جدید به پرسنل</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: OWNERS OF THE WORKSHOP */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#CEAE80] ring-4 ring-[#CEAE80]/20" />
            <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <span>صاحبان و هم‌بنیان‌گذاران کارگاه پولاریس استایل</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#CEAE80]/20 text-[#CEAE80] font-bold">
                {toPersianDigits(owners.length)} نفر
              </span>
            </h4>
          </div>

          <button
            type="button"
            onClick={handleOpenAddOwner}
            className="px-3.5 py-1.5 rounded-xl bg-[#CEAE80]/20 hover:bg-[#CEAE80] text-[#CEAE80] hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن هم‌بنیان‌گذار جدید</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {owners.map((owner) => (
            <OwnerCard
              key={owner.id}
              owner={owner}
              onEdit={handleOpenEditOwner}
              showEditButton={true}
            />
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: WORKSHOP STAFF (TAILORS, CUTTERS, BUYERS) */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-4 border-t border-black/10 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
            <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
              کادر اجرایی، دوزندگان، برش‌کاران و پرسنل کارگاه
            </h4>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
              {toPersianDigits(staff.length)} نفر
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="جستجوی پرسنل یا تخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 pl-8 rounded-xl glass-input text-xs outline-none"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl glass-input text-xs outline-none"
            >
              <option value="all" className="bg-stone-900 text-white">همه نقش‌ها</option>
              <option value="tailor" className="bg-stone-900 text-white">دوزنده / خیاط</option>
              <option value="cutter" className="bg-stone-900 text-white">برش‌کار</option>
              <option value="buyer" className="bg-stone-900 text-white">مسئول خرید</option>
              <option value="accountant" className="bg-stone-900 text-white">حسابداری</option>
            </select>
          </div>
        </div>

        {/* Staff Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((stf) => {
            return (
              <div
                key={stf.id}
                className="glass-card p-4 rounded-2xl hover:border-[#CEAE80]/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {stf.avatarUrl ? (
                        <img
                          src={stf.avatarUrl}
                          alt={stf.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-[#CEAE80]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#CEAE80]/15 text-[#CEAE80] flex items-center justify-center font-bold text-lg">
                          {stf.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span>{stf.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono">({stf.code})</span>
                        </h5>
                        <p className="text-[11px] text-[#CEAE80] font-bold mt-0.5">{stf.roleTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(stf)}
                        className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="ویرایش پرونده"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaffPrompt(stf)}
                        className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        title="حذف و انتقال به سطل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Phone & Banking Quick Summary */}
                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-2 text-xs">
                    {/* Phones list with tel: links */}
                    <div>
                      <span className="text-[10px] text-stone-500 dark:text-gray-400 font-bold block mb-1">
                        شماره‌های تماس:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(stf.phones || []).map((ph, pIdx) => {
                          const copyKey = `stf-phone-${stf.id}-${pIdx}`;
                          return (
                            <div
                              key={pIdx}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 dark:bg-black/40 border border-black/5 dark:border-white/5 text-[11px] font-mono group"
                            >
                              <a
                                href={`tel:${ph}`}
                                className="text-[#CEAE80] hover:underline flex items-center gap-1"
                                dir="ltr"
                                title="برقراری تماس مستقیم"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{ph}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopy(ph, copyKey)}
                                className="p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-white"
                                title="کپی شماره"
                              >
                                {copiedId === copyKey ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500 dark:text-gray-400">نوع حقوق / دستمزد:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300 font-mono" dir="ltr">
                        {formatToman(stf.salaryAmount)}
                      </span>
                    </div>

                    {/* Resume File Snippet if available */}
                    {(stf.resumeAttachmentName || stf.resumeUrl) && (
                      <div className="p-2 rounded-lg bg-[#CEAE80]/10 border border-[#CEAE80]/30 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#CEAE80] truncate max-w-[170px]">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-[10px]">{stf.resumeAttachmentName || 'فایل رزومه'}</span>
                        </div>
                        {stf.resumeAttachmentData ? (
                          <a
                            href={stf.resumeAttachmentData}
                            download={stf.resumeAttachmentName || 'resume.pdf'}
                            className="px-2 py-0.5 rounded bg-[#CEAE80] text-black text-[10px] font-bold flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>دانلود</span>
                          </a>
                        ) : stf.resumeUrl ? (
                          <a
                            href={stf.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#CEAE80] hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>لینک</span>
                          </a>
                        ) : null}
                      </div>
                    )}

                    {/* Staff Bank Accounts (Full Clickable Container) */}
                    {stf.bankAccounts && stf.bankAccounts.length > 0 && (
                      <div className="space-y-1.5">
                        {stf.bankAccounts.slice(0, 2).map((acc, aIdx) => {
                          const copyKey = `stf-bank-${stf.id}-${aIdx}`;
                          const isCopied = copiedId === copyKey;
                          const targetNum = acc.cardNumber || acc.shebaNumber || '';

                          return (
                            <div
                              key={aIdx}
                              onClick={() => handleCopy(targetNum, copyKey)}
                              className="p-2 rounded-xl bg-stone-100 dark:bg-black/40 hover:bg-[#CEAE80]/10 dark:hover:bg-[#CEAE80]/10 border border-black/5 dark:border-white/5 cursor-pointer transition-all flex items-center justify-between text-[11px] group"
                              title="کلیک برای کپی شماره کارت/شبا"
                            >
                              <div className="flex items-center gap-1.5 font-mono text-stone-800 dark:text-stone-200" dir="ltr">
                                <CreditCard className="w-3.5 h-3.5 text-[#CEAE80]" />
                                <span className="font-bold">{acc.cardNumber || acc.shebaNumber}</span>
                              </div>
                              <span className="text-[10px] text-[#CEAE80] font-bold flex items-center gap-1">
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                    <span>کپی</span>
                                  </>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* History & Timeline Trigger */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">
                    {toPersianDigits(stf.activityHistory?.length || 0)} فعالیت ثبت شده
                  </span>

                  <button
                    onClick={() => {
                      setSelectedStaff(stf);
                      setIsHistoryModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#CEAE80]/15 hover:bg-[#CEAE80] text-[#CEAE80] hover:text-black text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <HistoryIcon className="w-3 h-3" />
                    <span>مشاهده سوابق</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Adding / Editing Staff Member */}
      {isStaffModalOpen && (
        <Modal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          title={editingStaff ? 'ویرایش پرونده پرسنل کارگاه' : 'افزودن عضو جدید به کادر دوزندگی و پرسنل'}
          subtitle="ثبت مشخصات شغلی، پیوست رزومه، شماره کارت/شبا و شرایط قرارداد"
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveStaffSubmit} className="space-y-4 text-stone-900 dark:text-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  نام و نام خانوادگی *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: استاد رحیم کاظمی"
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  سمت و عنوان شغلی *
                </label>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="مثلاً: دوزنده ارشد پالتو و کاپشن"
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  دسته‌بندی نقش
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
                >
                  <option value="tailor" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">دوزنده / خیاط کارگاه</option>
                  <option value="cutter" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">برش‌کار صنعتی</option>
                  <option value="buyer" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">مسئول خرید و تامین پارچه</option>
                  <option value="accountant" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">حسابدار و مدیریت مالی</option>
                  <option value="quality_control" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">کنترل کیفیت (QC)</option>
                  <option value="workshop_manager" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">سرپرست سالن دوخت</option>
                  <option value="driver" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">راننده و تحویل‌دار بار</option>
                </select>
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
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  کد ملی
                </label>
                <input
                  type="text"
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value)}
                  placeholder="۰۰۵۴۳۲۱۹۸۷"
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  نوع محاسبه حقوق و دستمزد
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value as any)}
                    className="px-2 py-2 rounded-xl glass-input text-xs outline-none"
                  >
                    <option value="monthly" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">ماهانه ثابت</option>
                    <option value="piecework" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">کنترات / تکه‌ای</option>
                    <option value="hourly" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">ساعتی</option>
                  </select>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder="مبلغ (تومان)"
                    className="px-2 py-2 rounded-xl glass-input text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Resume Upload and Attachment Section */}
            <div className="p-3.5 rounded-xl glass-card space-y-2.5">
              <label className="text-xs font-bold text-[#CEAE80] flex items-center gap-1.5">
                <Paperclip className="w-4 h-4" />
                <span>پیوست فایل رزومه و سوابق کاری پرسنل</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                    آپلود فایل رزومه (PDF یا تصویر)
                  </label>
                  <label className="w-full p-2.5 rounded-xl border border-dashed border-[#CEAE80]/50 hover:border-[#CEAE80] flex items-center justify-center gap-2 cursor-pointer transition-colors bg-black/10">
                    <Upload className="w-4 h-4 text-[#CEAE80]" />
                    <span className="text-xs text-stone-700 dark:text-stone-300 truncate max-w-[200px]">
                      {resumeAttachmentName || 'انتخاب فایل رزومه...'}
                    </span>
                    <input type="file" accept=".pdf,image/*,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                    یا لینک اینترنتی رزومه / نمونه‌کارها
                  </label>
                  <input
                    type="url"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Bank Card / Sheba with Mandatory BankInput Component */}
            <div className="p-3.5 rounded-xl glass-card space-y-3">
              <label className="text-xs font-bold text-[#CEAE80] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>اطلاعات کارت و شبای بانکی جهت واریز حقوق (تشخیص خودکار بانک)</span>
              </label>

              <div className="space-y-3">
                <BankCardInput
                  value={newCardNumber}
                  onChange={(val) => setNewCardNumber(val)}
                  placeholder="---- ---- ---- ----"
                  label="شماره کارت ۱۶ رقمی"
                />

                <ShebaInput
                  value={newShebaNumber}
                  onChange={(val) => setNewShebaNumber(val)}
                  placeholder="IR -- ---- ---- ---- ---- ---- --"
                  label="شماره شبا (۲۴ رقمی)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                توضیحات، وظایف و سوابق کاری
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تخصص‌های دوخت، سابقه قبلی در بازار..."
                className="w-full px-3 py-2 rounded-xl glass-input text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-bold text-sm shadow-md transition-all active:scale-95"
              >
                {editingStaff ? 'ذخیره تغییرات' : 'ثبت پرسنل'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* History & Timeline Modal */}
      {isHistoryModalOpen && selectedStaff && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title={`سوابق و تاریخچه فعالیت‌های: ${selectedStaff.name}`}
          subtitle={`سمت: ${selectedStaff.roleTitle} | شناسه: ${selectedStaff.code}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-stone-900 dark:text-white">
            <div className="p-3 rounded-xl glass-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#CEAE80]" />
                <span>تاریخ استخدام: {selectedStaff.hireDate}</span>
              </div>
              <Badge variant={selectedStaff.status === 'active' ? 'success' : 'warning'}>
                {selectedStaff.status === 'active' ? 'مشغول به کار' : 'مرخصی / غیرفعال'}
              </Badge>
            </div>

            {/* Timeline */}
            <div className="space-y-3 relative before:absolute before:inset-y-0 before:right-3.5 before:w-0.5 before:bg-[#CEAE80]/30 pr-8">
              {(selectedStaff.activityHistory || []).length === 0 ? (
                <p className="text-xs text-stone-400 p-4">سابقه‌ای ثبت نشده است.</p>
              ) : (
                selectedStaff.activityHistory?.map((act, idx) => (
                  <div key={act.id || idx} className="relative space-y-1">
                    <div className="absolute -right-8 top-1 w-3 h-3 rounded-full bg-[#CEAE80] ring-4 ring-[#CEAE80]/20" />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-stone-900 dark:text-white">{act.title}</span>
                      <span className="text-stone-400 font-mono">{toJalaliDate(act.date)}</span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-gray-300 p-2.5 rounded-xl bg-stone-100 dark:bg-black/30 border border-black/5 dark:border-white/5">
                      {act.description}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-black/10 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-[#252525] text-stone-800 dark:text-white font-bold text-xs"
              >
                بستن
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Owner Form Modal */}
      {isOwnerModalOpen && (
        <OwnerFormModal
          isOpen={isOwnerModalOpen}
          onClose={() => setIsOwnerModalOpen(false)}
          editOwner={editingOwner}
          onSave={handleSaveOwner}
          onDelete={handleDeleteOwner}
        />
      )}
    </div>
  );
};
