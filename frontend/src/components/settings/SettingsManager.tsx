import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Globe,
  Camera,
  Send,
  MapPin,
  Phone,
  Check,
  Shield,
  Save,
  Users,
  ExternalLink,
  Sparkles,
  Trash2,
  RefreshCw,
  Edit,
  Edit2,
  Database,
  Activity,
  RotateCcw,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  Upload,
  X,
  Hash,
  History as HistoryIcon,
} from 'lucide-react';
import type { WorkshopInfo, Owner, GarmentItem, Seller, StaffMember, WorkshopExpense, Consignment, AuditLog } from '../../types';
import { toPersianDigits, formatToman } from '../../utils/persian';
import { Modal } from '../common/Modal';
import type { NetworkStatus } from '../../hooks/useNetworkStatus';
import { OwnerCard } from './OwnerCard';
import { OwnerFormModal } from './OwnerFormModal';
import { AuditLogsManager } from '../audit/AuditLogsManager';

interface SettingsManagerProps {
  workshopInfo: WorkshopInfo;
  owners: Owner[];
  onSaveWorkshopInfo: (info: WorkshopInfo) => void;
  onSaveOwners: (owners: Owner[]) => void;
  onRefreshData?: () => void;
  networkStatus?: NetworkStatus;
  onOpenPwaInstall?: () => void;
  auditLogs?: AuditLog[];
}

interface TrashData {
  items: GarmentItem[];
  sellers: Seller[];
  staff: StaffMember[];
  expenses: WorkshopExpense[];
  consignments: Consignment[];
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  workshopInfo,
  owners = [],
  onSaveWorkshopInfo,
  onSaveOwners,
  onRefreshData,
  networkStatus,
  onOpenPwaInstall,
  auditLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'owners' | 'trash' | 'system' | 'audit'>('branding');
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Form State for Workshop Info
  const [name, setName] = useState(workshopInfo.name || 'کارگاه دوزندگی و تولیدی پولاریس استایل');
  const [slogan, setSlogan] = useState(workshopInfo.slogan || 'تولیدکننده تخصصی پوشاک زمستانه، پالتو و کاپشن‌های راسته بازار');
  const [website, setWebsite] = useState(workshopInfo.website || 'https://polaris-style.ir');
  const [instagram, setInstagram] = useState(workshopInfo.instagram || '@polaris_style_clothing');
  const [telegram, setTelegram] = useState(workshopInfo.telegram || 't.me/polaris_style');
  const [address, setAddress] = useState(workshopInfo.address || 'تهران، بازار بزرگ، خیابان خیام، گذر لوطی صالح، کوچه کارگاه، پلاک ۱۸');
  const [postalCode, setPostalCode] = useState(workshopInfo.postalCode || '۱۱۹۳۶۴۸۲۹۱');
  const [phone, setPhone] = useState(workshopInfo.phone || '021-55667788');
  const [emergencyPhone, setEmergencyPhone] = useState(workshopInfo.emergencyPhone || '09121112233');
  const [registrationNumber, setRegistrationNumber] = useState(workshopInfo.registrationNumber || '۵۸۹۴۲۱');
  const [logoUrl, setLogoUrl] = useState(workshopInfo.logoUrl || '');
  const [logoText, setLogoText] = useState(workshopInfo.logoText || 'POLARIS');
  const [isEditingBranding, setIsEditingBranding] = useState(false);

  // Owner Form Modal State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  // Trash & Recycle Bin State
  const [trashData, setTrashData] = useState<TrashData>({
    items: [],
    sellers: [],
    staff: [],
    expenses: [],
    consignments: [],
  });
  const [trashCategory, setTrashCategory] = useState<'items' | 'sellers' | 'staff' | 'expenses' | 'consignments'>('items');
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  // Edit and Restore Modal
  const [editingItemForRestore, setEditingItemForRestore] = useState<{
    type: 'item' | 'seller' | 'staff' | 'expense' | 'consignment';
    data: any;
  } | null>(null);
  const [editRestoreName, setEditRestoreName] = useState('');
  const [editRestorePriceOrPhone, setEditRestorePriceOrPhone] = useState('');

  // Online System & Diagnostics
  const [pingLatency, setPingLatency] = useState<number>(24);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('fa-IR'));

  const fetchTrash = async () => {
    try {
      setIsLoadingTrash(true);
      const res = await fetch('/api/trash');
      if (res.ok) {
        const data = await res.json();
        setTrashData(data);
      }
    } catch (err) {
      console.error('Failed to load trash', err);
    } finally {
      setIsLoadingTrash(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trash') {
      fetchTrash();
    }
  }, [activeTab]);
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanyData = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWorkshopInfo({
      ...workshopInfo,
      name,
      slogan,
      website,
      instagram,
      telegram,
      address,
      postalCode,
      phone,
      emergencyPhone,
      registrationNumber,
      logoUrl,
      logoText,
    });
    setIsEditingBranding(false);
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
  };

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
      onSaveOwners(updated);
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
      onSaveOwners([...owners, newOwner]);
    }
  };

  const handleDeleteOwner = (id: string) => {
    const updated = owners.filter((o) => o.id !== id);
    onSaveOwners(updated);
  };

  // Restore Action
  const handleRestore = async (type: 'item' | 'seller' | 'staff' | 'expense' | 'consignment', id: string) => {
    try {
      const res = await fetch(`/api/trash/restore/${type}/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchTrash();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to restore item', err);
    }
  };

  // Permanent Delete Action
  const handlePermanentDelete = async (type: 'item' | 'seller' | 'staff' | 'expense', id: string, label: string) => {
    if (
      confirm(
        `هشدار: آیا از حذف دائمی و غیرقابل بازگشت "${label}" از پایگاه داده اطمینان دارید؟ این عملیات قابل بازگردانی نیست.`
      )
    ) {
      try {
        const res = await fetch(`/api/trash/permanent/${type}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTrash();
        }
      } catch (err) {
        console.error('Failed to permanently delete item', err);
      }
    }
  };

  // Open Edit and Restore
  const handleOpenEditRestore = (type: 'item' | 'seller' | 'staff', data: any) => {
    setEditingItemForRestore({ type, data });
    setEditRestoreName(data.name || '');
    setEditRestorePriceOrPhone(type === 'item' ? String(data.consignmentPrice || '') : data.phone || '');
  };

  const handleSaveEditAndRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemForRestore) return;

    const { type, data } = editingItemForRestore;
    let payload: any = { ...data, name: editRestoreName };
    if (type === 'item') {
      payload.consignmentPrice = Number(editRestorePriceOrPhone) || data.consignmentPrice;
    } else if (type === 'seller') {
      payload.phone = editRestorePriceOrPhone;
    }

    try {
      const res = await fetch(`/api/trash/edit-and-restore/${type}/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingItemForRestore(null);
        fetchTrash();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to edit and restore', err);
    }
  };

  // Manual Ping Test — hits /api/health, which verifies the database link
  const handlePingTest = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
      setIsServerOnline(res.ok);
      setLastSyncTime(new Date().toLocaleTimeString('fa-IR'));
    } catch {
      setIsServerOnline(false);
    }
  };

  const totalTrashCount =
    trashData.items.length +
    trashData.sellers.length +
    trashData.staff.length +
    trashData.expenses.length +
    trashData.consignments.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-stone-900 dark:text-white">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">تنظیمات برندینگ، سطل بازیافت و سامانه برخط پولاریس</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            مشخصات کارگاه، اطلاعات مالی هم‌بنیان‌گذاران، بازیابی اطلاعات حذف‌شده و وضعیت پایگاه داده
          </p>
        </div>

        {isSavedAlert && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4" />
            <span>تنظیمات با موفقیت ذخیره گردید</span>
          </div>
        )}
      </div>

      {/* Main Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'branding'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          مشخصات برند
        </button>

        <button
          onClick={() => setActiveTab('owners')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'owners'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          حساب‌های مالی صاحبان کارگاه
        </button>

        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'trash'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>سطل زباله</span>
          {totalTrashCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
              {toPersianDigits(totalTrashCount)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'system'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>وضعیت سرور</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'audit'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>لاگ‌های سیستم</span>
          {auditLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-[#CEAE80] text-[10px] font-bold">
              {toPersianDigits(auditLogs.length)}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WORKSHOP BRANDING (VIEW & EDIT) */}
      {/* ======================================================== */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {isEditingBranding ? (
            /* --- Edit Mode Form --- */
            <form onSubmit={handleSaveCompanyData} className="glass-panel p-6 rounded-2xl space-y-5 shadow-xl border border-[#CEAE80]/30">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#CEAE80]" />
                  <span>ویرایش مشخصات سازمانی و رسانه‌های رسمی کارگاه</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingBranding(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 text-xs flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>انصراف</span>
                </button>
              </div>

              {/* Logo and Logo Text Section */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-3">
                <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#CEAE80]" />
                  <span>لوگو، نشان تجاری و متن لوگوی کارگاه</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Logo Preview */}
                  <div className="flex items-center gap-3 sm:col-span-1">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="لوگوی کارگاه"
                        className="w-16 h-16 rounded-2xl object-contain bg-white dark:bg-black p-1 border-2 border-[#CEAE80] shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-[#1E1E22] border-2 border-dashed border-[#CEAE80] flex flex-col items-center justify-center text-[#CEAE80] shrink-0">
                        <span className="font-black text-sm tracking-wider">{logoText || 'POLARIS'}</span>
                        <span className="text-[9px] text-stone-400">لوگو</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-xs font-bold text-stone-800 dark:text-stone-200 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>آپلود تصویر لوگو</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="block text-[11px] text-rose-500 hover:underline"
                        >
                          حذف تصویر لوگو
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo URL Input */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      آدرس اینترنتی فایل لوگو (اختیاری)
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono text-left outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Logo Text / Monogram */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      متن یا نماد اختصاصی لوگو (Logo Text)
                    </label>
                    <input
                      type="text"
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value)}
                      placeholder="مثال: POLARIS STYLE یا پولاریس"
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    نام رسمی کارگاه / برند تولیدی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    شعار و حوزه فعالیت تخصصی
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:border-[#CEAE80] outline-none"
                  />
                </div>

                {/* شماره ثبت - Input as requested */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>شماره ثبت کارگاه / شناسه صنفی</span>
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="مثال: ۵۸۹۴۲۱ یا ۹۸۴۳۲۱/ت"
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#CEAE80]" />
                    وب‌سایت رسمی
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#CEAE80]" />
                    صفحه اینستاگرام کالکشن
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#CEAE80]" />
                    کانال تلگرام نمونه‌کارها
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
                    تلفن ثابت دفتر کارگاه
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
                    تلفن همراه اضطراری / مدیریت
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    کد پستی ۱۰ رقمی
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-left outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#CEAE80]" />
                    نشانی دقیق سالن دوخت و انبار مرکزی کارگاه
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs sm:text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingBranding(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/10 text-xs sm:text-sm font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره مشخصات کارگاه</span>
                </button>
              </div>
            </form>
          ) : (
            /* --- Non-Editable View Mode by Default with Edit Button Below --- */
            <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-xl border border-stone-200 dark:border-white/10">
              {/* Header Showcase */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-white dark:bg-black p-1.5 border-2 border-[#CEAE80] shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 dark:bg-[#1E1E22] border-2 border-[#CEAE80] flex flex-col items-center justify-center text-amber-900 dark:text-[#CEAE80] shadow-md shrink-0">
                      <span className="font-black text-sm sm:text-base tracking-wider">{logoText || 'POLARIS'}</span>
                      <span className="text-[10px] text-stone-500 dark:text-gray-400">استایل</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base sm:text-xl text-stone-900 dark:text-white">
                        {name}
                      </h3>
                      {logoText && (
                        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#CEAE80]/20 text-amber-900 dark:text-[#CEAE80] font-black border border-[#CEAE80]/30 tracking-wider">
                          {logoText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium mt-1">
                      {slogan}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/10 text-xs font-mono shrink-0">
                  <span className="text-stone-500 dark:text-gray-400 text-[11px] block font-sans font-medium">شماره ثبت رسمی:</span>
                  <span className="font-black text-sm text-amber-800 dark:text-[#CEAE80]">{registrationNumber}</span>
                </div>
              </div>

              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Fixed Phone */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>تلفن ثابت دفتر کارگاه</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <a
                      href={`tel:${phone}`}
                      title="تماس مستقیم با دفتر"
                      className="font-black font-mono text-sm text-stone-900 dark:text-white hover:text-amber-800 dark:hover:text-[#CEAE80] hover:underline"
                      dir="ltr"
                    >
                      {phone}
                    </a>
                    <a
                      href={`tel:${phone}`}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="برقراری تماس"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Emergency Phone */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>تلفن اضطراری / مدیریت</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <a
                      href={`tel:${emergencyPhone}`}
                      title="تماس مستقیم با مدیریت"
                      className="font-black font-mono text-sm text-stone-900 dark:text-white hover:text-amber-800 dark:hover:text-[#CEAE80] hover:underline"
                      dir="ltr"
                    >
                      {emergencyPhone}
                    </a>
                    <a
                      href={`tel:${emergencyPhone}`}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="برقراری تماس"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Postal Code */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>کد پستی انبار مرکزی</span>
                  </span>
                  <div className="font-black font-mono text-sm text-stone-900 dark:text-white" dir="ltr">
                    {postalCode}
                  </div>
                </div>

                {/* Website */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>وب‌سایت رسمی</span>
                  </span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-amber-800 dark:text-[#CEAE80] hover:underline flex items-center justify-between"
                    dir="ltr"
                  >
                    <span className="truncate">{website}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>

                {/* Instagram */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>اینستاگرام کالکشن</span>
                  </span>
                  <a
                    href={`https://instagram.com/${instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-amber-800 dark:text-[#CEAE80] hover:underline flex items-center justify-between"
                    dir="ltr"
                  >
                    <span>{instagram}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>

                {/* Telegram */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>کانال تلگرام نمونه‌کارها</span>
                  </span>
                  <a
                    href={`https://${telegram.replace('@', 't.me/')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-amber-800 dark:text-[#CEAE80] hover:underline flex items-center justify-between"
                    dir="ltr"
                  >
                    <span>{telegram}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>

                {/* Address */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#CEAE80]" />
                    <span>نشانی دقیق سالن دوخت و انبار مرکزی</span>
                  </span>
                  <p className="text-stone-900 dark:text-white font-medium text-xs sm:text-sm leading-relaxed">
                    {address}
                  </p>
                </div>
              </div>

              {/* Edit Button Below as requested */}
              <div className="flex justify-end pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingBranding(true)}
                  className="px-6 py-3 rounded-2xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ویرایش مشخصات کارگاه</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: OWNERS ACCOUNTS */}
      {/* ======================================================== */}
      {activeTab === 'owners' && (
        <div className="space-y-5">
          {/* Header & Add Button */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border border-stone-200 dark:border-white/10">
            <div>
              <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#CEAE80]" />
                <span>صاحبان و هم‌بنیان‌گذاران کارگاه پولاریس استایل</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#CEAE80]/20 text-[#CEAE80] font-bold">
                  {toPersianDigits(owners.length)} نفر
                </span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                اطلاعات تماس مستقیم و حساب‌های بانکی شرکا جهت تسویه حساب و واریزی‌ها (با کلیک روی هر شماره کپی می‌شود)
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddOwner}
              className="px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن هم‌بنیان‌گذار جدید</span>
            </button>
          </div>

          {/* Owners Cards Grid */}
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

          {/* Owner Form Modal */}
          {isOwnerModalOpen && (
            <OwnerFormModal
              isOpen={isOwnerModalOpen}
              onClose={() => setIsOwnerModalOpen(false)}
              onSave={handleSaveOwner}
              editOwner={editingOwner}
              onDelete={handleDeleteOwner}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TRASH & RECYCLE BIN (SOFT DELETE RESTORE) */}
      {/* ======================================================== */}
      {activeTab === 'trash' && (
        <div className="glass-panel p-6 rounded-2xl space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
            <div>
              <h4 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#CEAE80]" />
                <span>سطل زباله و اقلام موقتاً حذف‌شده (Soft Delete)</span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                کلیه آیتم‌ها با امکان بازیابی مستقیم یا ویرایش قبل از بازگردانی
              </p>
            </div>

            <button
              onClick={fetchTrash}
              disabled={isLoadingTrash}
              className="px-3.5 py-1.5 rounded-xl glass-card hover:border-[#CEAE80] text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTrash ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی سطل</span>
            </button>
          </div>

          {/* Sub Categories for Trash */}
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2 text-xs">
            <button
              onClick={() => setTrashCategory('items')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                trashCategory === 'items'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              کالاها و پوشاک ({toPersianDigits(trashData.items.length)})
            </button>

            <button
              onClick={() => setTrashCategory('sellers')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                trashCategory === 'sellers'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              فروشندگان ({toPersianDigits(trashData.sellers.length)})
            </button>

            <button
              onClick={() => setTrashCategory('staff')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                trashCategory === 'staff'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              پرسنل و کادر دوزندگی ({toPersianDigits(trashData.staff.length)})
            </button>

            <button
              onClick={() => setTrashCategory('expenses')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                trashCategory === 'expenses'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              هزینه‌های کارگاه ({toPersianDigits(trashData.expenses.length)})
            </button>
          </div>

          {/* Content by category */}
          {trashCategory === 'items' && (
            <div className="space-y-3">
              {trashData.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ پوشاک یا کالایی در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-white">{item.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-black font-mono">
                          {item.code}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-1 flex gap-3">
                        <span>قیمت امانی: {formatToman(item.consignmentPrice)}</span>
                        <span>موجودی: {toPersianDigits(item.stockQuantity)} عدد</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRestore('item', item)}
                        className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-[#CEAE80] hover:text-black text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>ویرایش و بازگردانی</span>
                      </button>

                      <button
                        onClick={() => handleRestore('item', item.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>بازیابی ۱-کلیک</span>
                      </button>

                      <button
                        onClick={() => handlePermanentDelete('item', item.id, item.name)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        title="حذف دائمی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {trashCategory === 'sellers' && (
            <div className="space-y-3">
              {trashData.sellers.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ فروشنده‌ای در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.sellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-white">{seller.name}</span>
                        <span className="text-[11px] text-[#CEAE80] font-mono">{seller.phone}</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{seller.streetLocation}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRestore('seller', seller)}
                        className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-[#CEAE80] hover:text-black text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>ویرایش و بازگردانی</span>
                      </button>

                      <button
                        onClick={() => handleRestore('seller', seller.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>بازیابی ۱-کلیک</span>
                      </button>

                      <button
                        onClick={() => handlePermanentDelete('seller', seller.id, seller.name)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        title="حذف دائمی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {trashCategory === 'staff' && (
            <div className="space-y-3">
              {trashData.staff.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ عضوی از پرسنل در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.staff.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-white">{st.name}</span>
                        <span className="text-xs text-[#CEAE80]">{st.roleTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore('staff', st.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>بازیابی پرسنل</span>
                      </button>

                      <button
                        onClick={() => handlePermanentDelete('staff', st.id, st.name)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        title="حذف دائمی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {trashCategory === 'expenses' && (
            <div className="space-y-3">
              {trashData.expenses.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ فاکتور هزینه‌ای در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-sm text-stone-900 dark:text-white">{exp.title}</span>
                      <div className="text-xs text-rose-400 mt-1 font-mono">{formatToman(exp.amount)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore('expense', exp.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>بازیابی هزینه</span>
                      </button>

                      <button
                        onClick={() => handlePermanentDelete('expense', exp.id, exp.title)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        title="حذف دائمی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: ONLINE STATUS & DATABASE HEALTH & PWA */}
      {/* ======================================================== */}
      {activeTab === 'system' && (
        <div className="space-y-5">
          {/* PWA & Mobile App Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl border border-[#CEAE80]/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e1e1e] to-black border border-[#CEAE80]/50 p-1.5 flex items-center justify-center shrink-0">
                  <img src="/icons/icon.svg" alt="PWA" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
                    <span>وب‌اپلیکیشن پیش‌رونده (PWA) و نصب روی دستگاه</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      فعال و آماده
                    </span>
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                    امکان اجرای مستقیم و تمام‌صفحه از منوی گوشی و دسکتاپ بدون نیاز به آدرس‌بار مرورگر
                  </p>
                </div>
              </div>

              {onOpenPwaInstall && (
                <button
                  type="button"
                  onClick={onOpenPwaInstall}
                  className="px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>راهنما و نصب اپلیکیشن (PWA)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1">
                <span className="text-stone-500 dark:text-gray-400 font-bold block">سرویس‌ورکر (Service Worker):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ثبت شده و فعال
                </span>
                <span className="text-[10px] text-stone-400 block">کش هوشمند پوسته کارگاه</span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1">
                <span className="text-stone-500 dark:text-gray-400 font-bold block">پایش برخط بودن (Online Guardian):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  محافظت هوشمند فعال
                </span>
                <span className="text-[10px] text-stone-400 block">جلوگیری از مغایرت مالی در حالت آفلاین</span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-1">
                <span className="text-stone-500 dark:text-gray-400 font-bold block">حالت اجرا (Display Mode):</span>
                <span className="text-amber-700 dark:text-[#CEAE80] font-bold">
                  {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
                    ? 'نصب شده (Standalone PWA)'
                    : 'درون مرورگر (Browser Mode)'}
                </span>
                <span className="text-[10px] text-stone-400 block">پشتیبانی کامل از اندروید، ویندوز و iOS</span>
              </div>
            </div>
          </div>

          {/* Database & Server Health */}
          <div className="glass-panel p-6 rounded-2xl space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <h4 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span>سامانه برخط، وضعیت دیتابیس و تست پایش سرور</span>
              </h4>

              <button
                onClick={handlePingTest}
                className="px-3.5 py-1.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تست پینگ و برقراری ارتباط</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">وضعیت سرور کارگاه:</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isServerOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  <span className="font-bold text-sm text-stone-900 dark:text-white">
                    {isServerOnline ? 'برخط و فعال (Online)' : 'قطع ارتباط'}
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 block">پاسخ‌دهی آنی بدون قطعی</span>
              </div>

              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">زمان تاخیر سرور (Latency):</span>
                <div className="font-mono text-base font-black text-[#CEAE80]">
                  {toPersianDigits(networkStatus?.latency ?? pingLatency)} ms
                </div>
                <span className="text-[11px] text-emerald-500 font-bold">بسیار عالی و پرسرعت</span>
              </div>

              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">آخرین زمان همگام‌سازی:</span>
                <div className="font-mono text-sm font-bold text-stone-900 dark:text-white">
                  {lastSyncTime}
                </div>
                <span className="text-[11px] text-stone-400">ذخیره‌سازی پایدار در حافظه سرور</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2 text-xs text-stone-400">
              <div className="font-bold text-stone-300">ویژگی‌های امنیتی و پایایی داده‌ها:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>پشتیبانی کامل از حذف نرم (Soft Delete) جهت جلوگیری از خطای سهوی در کارگاه</li>
                <li>پایشگر خودکار عدم ثبت تراکنش‌ها در حالت آفلاین به منظور تضمین تطابق حسابداری</li>
                <li>ثبت لاگ کلیه تراکنش‌ها و واگذاری‌ها با شناسه کاربری و برچسب زمانی دقیق</li>
                <li>سیستم تسویه زنجیره‌ای خودکار بدهی‌ها بر پایه اولویت تاریخی فاکتورها</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: AUDIT LOGS (ممیزی و لاگ‌های سیستم) */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AuditLogsManager logs={auditLogs} />
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT AND RESTORE FROM TRASH */}
      {/* ======================================================== */}
      {editingItemForRestore && (
        <Modal
          isOpen={Boolean(editingItemForRestore)}
          onClose={() => setEditingItemForRestore(null)}
          title="ویرایش مشخصات و بازیابی از سطل"
          subtitle="اصلاح اطلاعات قبل از بازگرداندن به لیست فعال"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditAndRestore} className="space-y-4 text-stone-900 dark:text-white">
            <div>
              <label className="block text-xs font-bold mb-1">نام / عنوان *</label>
              <input
                type="text"
                required
                value={editRestoreName}
                onChange={(e) => setEditRestoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none"
              />
            </div>

            {editingItemForRestore.type === 'item' && (
              <div>
                <label className="block text-xs font-bold mb-1">قیمت امانی (تومان)</label>
                <input
                  type="number"
                  value={editRestorePriceOrPhone}
                  onChange={(e) => setEditRestorePriceOrPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none"
                />
              </div>
            )}

            {editingItemForRestore.type === 'seller' && (
              <div>
                <label className="block text-xs font-bold mb-1">شماره تماس فروشنده</label>
                <input
                  type="tel"
                  value={editRestorePriceOrPhone}
                  onChange={(e) => setEditRestorePriceOrPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setEditingItemForRestore(null)}
                className="px-4 py-2 rounded-xl text-stone-500 text-xs font-medium"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md"
              >
                ذخیره و بازیابی به سیستم
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
