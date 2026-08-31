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
  Image as ImageIcon,
  Images,
  X,
  Hash,
  History as HistoryIcon,
  Users,
  Bell,
} from 'lucide-react';
import type { WorkshopInfo, GarmentItem, Seller, StaffMember, WorkshopExpense, Consignment } from '@/types';
import { toPersianDigits, formatToman, toJalaliDate } from '@/utils/persian';
import { Modal } from '@/components/common/Modal';
import type { NetworkStatus } from '@/hooks/useNetworkStatus';
import { AuditLogsManager } from '../audit/AuditLogsManager';
import { ImagePicker } from '@/components/common/ImagePicker';
import { GalleryManager } from './GalleryManager';
import { UsersManager } from './UsersManager';
import { NotificationsManager } from './NotificationsManager';
import { toast } from 'sonner';
import { normalizePhoneInput, isValidIranPhone, PHONE_ERROR } from '@/modules/workshop/utils/validation';

interface SettingsManagerProps {
  workshopInfo: WorkshopInfo;
  onSaveWorkshopInfo: (info: WorkshopInfo) => void;
  onRefreshData?: () => void;
  networkStatus?: NetworkStatus;
  onOpenPwaInstall?: () => void;
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
  onSaveWorkshopInfo,
  onRefreshData,
  networkStatus,
  onOpenPwaInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'gallery' | 'trash' | 'system' | 'audit' | 'users' | 'notifications'>('branding');
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Form State for Workshop Info
  const [name, setName] = useState(workshopInfo.name);
  const [slogan, setSlogan] = useState(workshopInfo.slogan);
  const [website, setWebsite] = useState(workshopInfo.website);
  const [instagram, setInstagram] = useState(workshopInfo.instagram);
  const [telegram, setTelegram] = useState(workshopInfo.telegram);
  const [address, setAddress] = useState(workshopInfo.address);
  const [postalCode, setPostalCode] = useState(workshopInfo.postalCode);
  const [phone, setPhone] = useState(workshopInfo.phone);
  const [emergencyPhone, setEmergencyPhone] = useState(workshopInfo.emergencyPhone);
  const [registrationNumber, setRegistrationNumber] = useState(workshopInfo.registrationNumber);
  const [logoUrl, setLogoUrl] = useState(workshopInfo.logoUrl || '');
  const [logoText, setLogoText] = useState(workshopInfo.logoText || '');
  const [isEditingBranding, setIsEditingBranding] = useState(false);

  // Trash & Recycle Bin State
  const [trashData, setTrashData] = useState<TrashData>({
    items: [],
    sellers: [],
    staff: [],
    expenses: [],
    consignments: [],
  });
  const [trashCategory, setTrashCategory] = useState<'all' | 'items' | 'sellers' | 'staff' | 'expenses' | 'consignments'>('all');
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  // Edit and Restore Modal
  const [editingItemForRestore, setEditingItemForRestore] = useState<{
    type: 'item' | 'seller' | 'staff' | 'expense' | 'consignment';
    data: any;
  } | null>(null);
  const [editRestoreName, setEditRestoreName] = useState('');
  const [editRestorePriceOrPhone, setEditRestorePriceOrPhone] = useState('');

  const fetchTrash = async () => {
    try {
      setIsLoadingTrash(true);
      const res = await fetch('/api/workshop/trash');
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

  const handleSaveCompanyData = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = normalizePhoneInput(phone);
    if (normalizedPhone && !isValidIranPhone(normalizedPhone)) {
      toast.error(PHONE_ERROR);
      return;
    }
    const normalizedEmergencyPhone = normalizePhoneInput(emergencyPhone);
    if (normalizedEmergencyPhone && !isValidIranPhone(normalizedEmergencyPhone)) {
      toast.error(PHONE_ERROR);
      return;
    }

    onSaveWorkshopInfo({
      ...workshopInfo,
      name: name.trim(),
      slogan: slogan.trim(),
      website: website.trim(),
      instagram: instagram.trim(),
      telegram: telegram.trim(),
      address: address.trim(),
      postalCode: postalCode.trim(),
      phone: normalizedPhone,
      emergencyPhone: normalizedEmergencyPhone,
      registrationNumber: registrationNumber.trim(),
      logoUrl,
      logoText,
    });
    setIsEditingBranding(false);
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
  };

  // Restore Action
  const handleRestore = async (type: 'item' | 'seller' | 'staff' | 'expense' | 'consignment', id: string) => {
    try {
      const res = await fetch(`/api/workshop/trash/restore/${type}/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchTrash();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to restore item', err);
    }
  };

  // Permanent Delete Action
  const handlePermanentDelete = async (type: 'item' | 'seller' | 'staff' | 'expense' | 'consignment', id: string, label: string) => {
    if (
      confirm(
        `هشدار: آیا از حذف دائمی و غیرقابل بازگشت "${label}" از پایگاه داده اطمینان دارید؟ این عملیات قابل بازگردانی نیست.`
      )
    ) {
      try {
        const res = await fetch(`/api/workshop/trash/permanent/${type}/${id}`, { method: 'DELETE' });
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
      const normalizedPhone = normalizePhoneInput(editRestorePriceOrPhone);
      if (normalizedPhone && !isValidIranPhone(normalizedPhone)) {
        toast.error(PHONE_ERROR);
        return;
      }
      payload.phone = normalizedPhone;
    }

    try {
      const res = await fetch(`/api/workshop/trash/edit-and-restore/${type}/${data.id}`, {
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

  const totalTrashCount =
    trashData.items.length +
    trashData.sellers.length +
    trashData.staff.length +
    trashData.expenses.length +
    trashData.consignments.length;

  // Row renderers shared by the per-category trash tabs and the unified «همه» view.
  const renderItemTrashRow = (item: GarmentItem, withTypeBadge: boolean) => (
    <div
      key={`item-${item.id}`}
      className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          {withTypeBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">کالا</span>
          )}
          <span className="font-bold text-sm text-stone-900 dark:text-white">{item.name}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-black font-mono">{item.code}</span>
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
  );

  const renderSellerTrashRow = (seller: Seller, withTypeBadge: boolean) => (
    <div
      key={`seller-${seller.id}`}
      className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          {withTypeBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#CEAE80]/15 text-[#CEAE80] font-bold">فروشنده</span>
          )}
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
  );

  const renderStaffTrashRow = (st: StaffMember, withTypeBadge: boolean) => (
    <div
      key={`staff-${st.id}`}
      className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          {withTypeBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold">پرسنل</span>
          )}
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
  );

  const renderExpenseTrashRow = (exp: WorkshopExpense, withTypeBadge: boolean) => (
    <div
      key={`expense-${exp.id}`}
      className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          {withTypeBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">هزینه</span>
          )}
          <span className="font-bold text-sm text-stone-900 dark:text-white">{exp.title}</span>
        </div>
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
  );

  const renderConsignmentTrashRow = (c: Consignment, withTypeBadge: boolean) => (
    <div
      key={`consignment-${c.id}`}
      className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          {withTypeBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold">واگذاری</span>
          )}
          <span className="font-bold text-sm text-stone-900 dark:text-white">{c.sellerName}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-black font-mono">{c.code}</span>
        </div>
        <div className="text-xs text-stone-400 mt-1 flex gap-3">
          <span>مبلغ کل: {formatToman(c.totalAmount)}</span>
          <span>تاریخ واگذاری: {toJalaliDate(c.date)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleRestore('consignment', c.id)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>بازیابی واگذاری</span>
        </button>

        <button
          onClick={() => handlePermanentDelete('consignment', c.id, `${c.code} - ${c.sellerName}`)}
          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
          title="حذف دائمی"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Live server health derived from useNetworkStatus (auto-polls /api/health every 10s)
  const isCheckingNow = networkStatus?.isChecking ?? false;
  const isServerConnectedLive = networkStatus?.isServerConnected ?? true;
  const lastSyncLabel = networkStatus?.lastSuccessfulConnection
    ? networkStatus.lastSuccessfulConnection.toLocaleTimeString('fa-IR')
    : '—';

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
            مشخصات کارگاه، بازیابی اطلاعات حذف‌شده و وضعیت پایگاه داده
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
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'gallery'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Images className="w-3.5 h-3.5" />
          <span>گالری تصاویر</span>
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
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'users'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>مدیریت کاربران</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-[#CEAE80] text-black shadow-md font-black'
              : 'text-stone-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>اطلاع‌رسانی</span>
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
                        <span className="font-black text-sm tracking-wider">{logoText}</span>
                        <span className="text-[9px] text-stone-400">لوگو</span>
                      </div>
                    )}
                    <ImagePicker
                      values={logoUrl ? [logoUrl] : []}
                      onChange={(urls) => setLogoUrl(urls[0] ?? '')}
                      category="logo"
                      tileClassName="w-16 h-16"
                      addLabel="تغییر لوگو"
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
                    placeholder="نام رسمی کارگاه خود را وارد کنید"
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
                    placeholder="شعار یا حوزه فعالیت تخصصی کارگاه"
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
                    placeholder="https://example.ir"
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
                    placeholder="@username"
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
                    placeholder="t.me/username"
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
                    placeholder="021XXXXXXXX"
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
                    placeholder="0912XXX XXXX"
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
                    placeholder="کد پستی ۱۰ رقمی محل کارگاه"
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
                    placeholder="نشانی کامل سالن دوخت و انبار مرکزی"
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
      {/* TAB: IMAGE GALLERY */}
      {activeTab === 'gallery' && (
        <div className="animate-in fade-in duration-200">
          <GalleryManager />
        </div>
      )}

      {/* ======================================================== */}

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
              onClick={() => setTrashCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                trashCategory === 'all'
                  ? 'bg-[#CEAE80] text-black shadow-sm'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              همه ({toPersianDigits(totalTrashCount)})
            </button>

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
          {trashCategory === 'all' && (
            <div className="space-y-3">
              {totalTrashCount === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  سطل بازیافت خالی است؛ هیچ مورد حذف‌شده‌ای وجود ندارد.
                </div>
              ) : (
                <>
                  {trashData.items.map((item) => renderItemTrashRow(item, true))}
                  {trashData.sellers.map((seller) => renderSellerTrashRow(seller, true))}
                  {trashData.staff.map((st) => renderStaffTrashRow(st, true))}
                  {trashData.expenses.map((exp) => renderExpenseTrashRow(exp, true))}
                  {trashData.consignments.map((c) => renderConsignmentTrashRow(c, true))}
                </>
              )}
            </div>
          )}

          {trashCategory === 'items' && (
            <div className="space-y-3">
              {trashData.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ پوشاک یا کالایی در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.items.map((item) => renderItemTrashRow(item, false))
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
                trashData.sellers.map((seller) => renderSellerTrashRow(seller, false))
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
                trashData.staff.map((st) => renderStaffTrashRow(st, false))
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
                trashData.expenses.map((exp) => renderExpenseTrashRow(exp, false))
              )}
            </div>
          )}

          {trashCategory === 'consignments' && (
            <div className="space-y-3">
              {trashData.consignments.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  هیچ فاکتور واگذاری در سطل بازیافت وجود ندارد.
                </div>
              ) : (
                trashData.consignments.map((c) => renderConsignmentTrashRow(c, false))
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
                type="button"
                onClick={() => { void networkStatus?.checkConnection(); }}
                disabled={isCheckingNow}
                className="px-3.5 py-1.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNow ? 'animate-spin' : ''}`} />
                <span>{isCheckingNow ? 'در حال بررسی…' : 'تست پینگ و برقراری ارتباط'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">وضعیت سرور کارگاه:</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isServerConnectedLive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  <span className="font-bold text-sm text-stone-900 dark:text-white">
                    {isCheckingNow ? 'در حال بررسی اتصال…' : isServerConnectedLive ? 'برخط و فعال (Online)' : 'قطع ارتباط'}
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 block">پاسخ‌دهی آنی بدون قطعی</span>
              </div>

              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">زمان تاخیر سرور (Latency):</span>
                <div className="font-mono text-base font-black text-[#CEAE80]">
                  {networkStatus?.latency != null ? `${toPersianDigits(networkStatus.latency)} ms` : '—'}
                </div>
                <span className="text-[11px] text-emerald-500 font-bold">بسیار عالی و پرسرعت</span>
              </div>

              <div className="p-4 rounded-xl glass-card space-y-1">
                <span className="text-xs text-stone-500 dark:text-gray-400 block">آخرین زمان همگام‌سازی:</span>
                <div className="font-mono text-sm font-bold text-stone-900 dark:text-white">
                  {lastSyncLabel}
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
          <AuditLogsManager />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: NOTIFICATIONS (اطلاع‌رسانی تلگرام و پیامک) */}
      {/* ======================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <NotificationsManager />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: USERS MANAGEMENT (مدیریت کاربران و سطوح دسترسی) */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <UsersManager />
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
