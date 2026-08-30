import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  History as HistoryIcon,
  Search,
  User,
  Clock,
  Shield,
  FileText,
  Package,
  CreditCard,
  ChevronDown,
  Loader2,
  Globe,
} from 'lucide-react';
import type { AuditLog } from '@/types';
import { auditApi, getApiErrorMessage } from '@/lib/api';
import { toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { SelectMenu } from '@/components/ui/select-menu';

const PAGE_SIZE = 20;

export const AuditLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');

  const fetchLogs = useCallback(async (offset: number, append: boolean) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await auditApi.list(PAGE_SIZE, offset);
      setTotal(res.total);
      setLogs((prev) => (append ? [...prev, ...res.logs] : res.logs));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'خطا در دریافت لاگ‌های سیستم'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, false);
  }, [fetchLogs]);

  const filteredLogs = (logs || []).filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = selectedEntity === 'all' || log.entity === selectedEntity;
    return matchesSearch && matchesEntity;
  });

  const getEntityIcon = (entity: AuditLog['entity']) => {
    switch (entity) {
      case 'item':
        return <Package className="w-4 h-4 text-amber-500" />;
      case 'seller':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'consignment':
        return <FileText className="w-4 h-4 text-[#CEAE80]" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'staff':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'return':
        return <HistoryIcon className="w-4 h-4 text-rose-500" />;
      default:
        return <Clock className="w-4 h-4 text-stone-400" />;
    }
  };

  const getEntityLabel = (entity: AuditLog['entity']) => {
    switch (entity) {
      case 'item':
        return 'انبار و کالا';
      case 'seller':
        return 'فروشندگان';
      case 'consignment':
        return 'واگذاری امانی';
      case 'payment':
        return 'دریافت وجه و تسویه';
      case 'staff':
        return 'پرسنل و هم‌بنیان‌گذاران';
      case 'return':
        return 'مرجوعی کالا';
      case 'settings':
        return 'تنظیمات و برند';
      case 'auth':
        return 'ورود و امنیت';
      default:
        return 'عملیات';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'ایجاد';
      case 'update':
        return 'ویرایش';
      case 'delete':
        return 'حذف';
      default:
        return action;
    }
  };

  const getRoleLabel = (role: string | null | undefined) => {
    if (role === 'admin') return 'مدیر';
    if (role === 'staff') return 'کاربر';
    return role || '';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-stone-900 dark:text-white">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">ممیزی، لاگ‌های سیستمی و ردپای تغییرات (Audit Logs)</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            ثبت لحظه‌به‌لحظه تمامی ایجادها، ویرایش‌ها، حذف‌ها، واگذاری‌ها و تسویه‌ها توسط چه کسی و در چه زمانی
          </p>
        </div>

        <div className="text-left bg-stone-100 dark:bg-black/40 px-3.5 py-2 rounded-xl border border-black/5 dark:border-white/5">
          <span className="text-[10px] text-stone-400 block">کل رویدادهای مانیتور شده:</span>
          <span className="text-sm font-black text-[#CEAE80] font-mono">
            {toPersianDigits(total)} رویداد
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجو در نام کاربر، عملیات، فاکتور یا جزئیات تغییرات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 rounded-xl glass-input text-xs sm:text-sm outline-none"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
        </div>

        <SelectMenu
          value={selectedEntity}
          onChange={setSelectedEntity}
          className="w-full sm:w-auto"
          options={[
            { value: 'all', label: 'همه بخش‌ها و ماژول‌ها' },
            { value: 'consignment', label: 'واگذاری و تحویل بار' },
            { value: 'payment', label: 'دریافت وجه و تسویه' },
            { value: 'item', label: 'انبار و کالا' },
            { value: 'seller', label: 'پرونده فروشندگان' },
            { value: 'staff', label: 'پرسنل و کادر کارگاه' },
            { value: 'return', label: 'مرجوعی کالا' },
            { value: 'settings', label: 'تنظیمات و برندینگ' },
            { value: 'auth', label: 'ورود و امنیت' },
          ]}
        />
      </div>

      {/* Logs Timeline List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center glass-panel rounded-2xl text-xs text-stone-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#CEAE80]" />
            <span>در حال دریافت لاگ‌های سیستم...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-2xl text-xs text-stone-400">
            هیچ لاگ و رویدادی منطبق با جستجوی شما یافت نشد.
          </div>
        ) : (
          filteredLogs.map((log) => {
            return (
              <div
                key={log.id}
                className="p-4 rounded-xl glass-card hover:border-[#CEAE80]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#1E1E1E] flex items-center justify-center shrink-0 mt-0.5 border border-black/5 dark:border-white/5">
                    {getEntityIcon(log.entity)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-stone-900 dark:text-white text-xs sm:text-sm">
                        {log.userName}
                      </span>
                      {log.userRole && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[10px] font-bold">
                          {getRoleLabel(log.userRole)}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        {getActionLabel(log.action)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#CEAE80]/15 text-[#CEAE80] text-[10px] font-bold">
                        {getEntityLabel(log.entity)}
                      </span>
                    </div>

                    <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5 text-left text-[11px] font-mono text-stone-400 space-y-1">
                  <span className="text-[10px]" dir="ltr">{toJalaliDateTime(log.timestamp)}</span>
                  {log.ipAddress && (
                    <span className="text-[10px] inline-flex items-center gap-1 text-stone-500 dark:text-stone-400" dir="ltr">
                      <Globe className="w-3 h-3 shrink-0" />
                      {log.ipAddress}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Pagination */}
      {!isLoading && logs.length < total && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => fetchLogs(logs.length, true)}
            disabled={isLoadingMore}
            className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait"
          >
            {isLoadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>بارگذاری بیشتر</span>
          </button>
        </div>
      )}
    </div>
  );
};
