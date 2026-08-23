import React, { useState } from 'react';
import {
  History as HistoryIcon,
  Search,
  Filter,
  User,
  Clock,
  Shield,
  FileText,
  Calendar,
  CheckCircle,
  Package,
  CreditCard,
  Trash2,
  Edit,
  PlusCircle,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { toJalaliDate, toPersianDigits } from '../../utils/persian';
import { Badge } from '../common/Badge';

interface AuditLogsManagerProps {
  logs: AuditLog[];
}

export const AuditLogsManager: React.FC<AuditLogsManagerProps> = ({ logs = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');

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
            {toPersianDigits(logs.length)} رویداد
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

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-medium outline-none"
        >
          <option value="all" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">همه بخش‌ها و ماژول‌ها</option>
          <option value="consignment" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">واگذاری و تحویل بار</option>
          <option value="payment" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">دریافت وجه و تسویه</option>
          <option value="item" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">انبار و کالا</option>
          <option value="seller" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">پرونده فروشندگان</option>
          <option value="staff" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">پرسنل و کادر کارگاه</option>
          <option value="return" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">مرجوعی کالا</option>
          <option value="settings" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">تنظیمات و برندینگ</option>
          <option value="auth" className="bg-white dark:bg-[#1A1A1E] text-stone-900 dark:text-white">ورود و امنیت</option>
        </select>
      </div>

      {/* Logs Timeline List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
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
                        {log.action}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#CEAE80]/15 text-[#CEAE80] text-[10px] font-bold">
                        {getEntityLabel(log.entity)}
                      </span>
                      {log.userRole && (
                        <span className="text-[10px] text-stone-400">
                          ({log.userRole})
                        </span>
                      )}
                    </div>

                    <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5 text-left text-[11px] font-mono text-stone-400">
                  <span className="font-bold text-stone-700 dark:text-stone-300 font-sans">{log.userName}</span>
                  <span className="text-[10px]" dir="ltr">{toJalaliDate(log.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
