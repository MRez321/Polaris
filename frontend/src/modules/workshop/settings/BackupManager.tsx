/**
 * Backup manager (Settings → پشتیبان‌گیری): local database/website/full
 * backups, cPanel host-side backups via UAPI token, auto-backup schedule +
 * retention, and the downloadable backups list. Mirrors the backend contract
 * in modules/backups: run(kind:'cpanel') returns {message} instead of a file.
 */
import React from 'react';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Database,
  Download,
  FolderArchive,
  Globe,
  HardDrive,
  Info,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { backupApi, getApiErrorMessage } from '@/lib/api';
import type { BackupFileMeta, BackupKind, BackupSettings } from '@/types';
import { toPersianDigits, toJalaliDateTime } from '@/utils/persian';
import { Badge } from '@/components/common/Badge';
import { Switch } from '@/components/ui/switch';
import { SelectMenu } from '@/components/ui/select-menu';
import { PasswordInput } from '@/components/ui/password-input';

const KIND_LABEL: Record<BackupKind | 'cpanel', string> = {
  database: 'دیتابیس',
  website: 'فایل‌های سایت',
  full: 'کامل (دیتابیس + فایل‌ها)',
  cpanel: 'هاست cPanel',
};

const KIND_BADGE: Record<BackupKind, 'blue' | 'orange' | 'success'> = {
  database: 'blue',
  website: 'orange',
  full: 'success',
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
}

export const BackupManager: React.FC = () => {
  const [settings, setSettings] = React.useState<BackupSettings | null>(null);
  const [files, setFiles] = React.useState<BackupFileMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [runningKind, setRunningKind] = React.useState<BackupKind | 'cpanel' | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    Promise.all([backupApi.getSettings(), backupApi.list()])
      .then(([s, f]) => {
        setSettings(s);
        setFiles(f);
      })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, 'دریافت اطلاعات پشتیبان‌گیری ناموفق بود'))
      )
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const patch = (p: Partial<BackupSettings>) => {
    if (!settings) return;
    // lastBackupAt is server-managed; never send it back.
    const { lastBackupAt: _keep, ...rest } = settings;
    setSettings({ ...settings, ...p });
    setSaving(true);
    backupApi
      .updateSettings({ ...rest, ...p })
      .then((saved) => setSettings(saved))
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'ذخیره تنظیمات پشتیبان‌گیری ناموفق بود'));
        reload();
      })
      .finally(() => setSaving(false));
  };

  const run = async (kind: BackupKind | 'cpanel') => {
    setRunningKind(kind);
    try {
      const result = await backupApi.runNow(kind);
      if ('filename' in result) {
        toast.success(`پشتیبان «${KIND_LABEL[kind]}» ساخته شد: ${result.filename}`);
      } else {
        toast.info(result.message);
      }
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ساخت پشتیبان ناموفق بود'));
    } finally {
      setRunningKind(null);
    }
  };

  const remove = async (f: BackupFileMeta) => {
    setDeletingId(f.id);
    try {
      await backupApi.remove(f.id);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
      toast.success('فایل پشتیبان حذف شد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف فایل پشتیبان ناموفق بود'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl text-center">
        <RefreshCw className="w-5 h-5 text-brand mx-auto animate-spin" />
        <p className="text-xs font-bold text-stone-500 dark:text-gray-400 mt-2">
          در حال دریافت اطلاعات پشتیبان‌گیری...
        </p>
      </div>
    );
  }

  const autoKindOptions = (['database', 'website', 'full'] as BackupKind[]).map((k) => ({
    value: k,
    label: KIND_LABEL[k],
  }));

  return (
    <div className="space-y-6">
      {/* Run-now actions */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
          <Archive className="w-5 h-5 text-brand" />
          <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base">
            ساخت پشتیبان فوری
          </h3>
          {saving && (
            <span className="text-[10px] font-bold text-brand animate-pulse">در حال ذخیره تنظیمات...</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => void run('database')}
            disabled={runningKind !== null}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {runningKind === 'database' ? (
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-xs font-black text-stone-800 dark:text-gray-200">
              پشتیبان دیتابیس
            </span>
            <span className="text-[10px] text-stone-500 dark:text-gray-400">
              خروجی MySQL فشرده
            </span>
          </button>

          <button
            onClick={() => void run('website')}
            disabled={runningKind !== null}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {runningKind === 'website' ? (
              <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin" />
            ) : (
              <FolderArchive className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            )}
            <span className="text-xs font-black text-stone-800 dark:text-gray-200">
              پشتیبان فایل‌های سایت
            </span>
            <span className="text-[10px] text-stone-500 dark:text-gray-400">
              سورس و ماژول‌ها (بدون node_modules)
            </span>
          </button>

          <button
            onClick={() => void run('full')}
            disabled={runningKind !== null}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {runningKind === 'full' ? (
              <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-green-400 animate-spin" />
            ) : (
              <HardDrive className="w-6 h-6 text-emerald-600 dark:text-green-400" />
            )}
            <span className="text-xs font-black text-stone-800 dark:text-gray-200">
              پشتیبان کامل
            </span>
            <span className="text-[10px] text-stone-500 dark:text-gray-400">
              دیتابیس + فایل‌های سایت
            </span>
          </button>

          <button
            onClick={() => void run('cpanel')}
            disabled={runningKind !== null}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-brand/25 bg-brand/5 hover:bg-brand/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {runningKind === 'cpanel' ? (
              <RefreshCw className="w-6 h-6 text-brand animate-spin" />
            ) : (
              <Globe className="w-6 h-6 text-brand" />
            )}
            <span className="text-xs font-black text-stone-800 dark:text-gray-200">
              پشتیبان روی هاست cPanel
            </span>
            <span className="text-[10px] text-stone-500 dark:text-gray-400">
              از طریق UAPI هاست (تنظیمات زیر)
            </span>
          </button>
        </div>

        {settings.lastBackupAt && (
          <p className="text-[11px] font-bold text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            آخرین پشتیبان موفق: {toJalaliDateTime(settings.lastBackupAt)}
          </p>
        )}
      </div>

      {/* Schedule + cPanel settings */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
          <Save className="w-5 h-5 text-brand" />
          <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base">
            تنظیمات پشتیبان‌گیری خودکار
          </h3>
        </div>

        {/* Auto switch */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-stone-800 dark:text-gray-200">
              پشتیبان‌گیری خودکار
            </p>
            <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
              در بازه‌های زمانی مشخص، بدون دخالت شما (بررسی هر ۱۵ دقیقه)
            </p>
          </div>
          <Switch
            checked={settings.autoEnabled}
            onCheckedChange={(checked: boolean) => patch({ autoEnabled: checked })}
          />
        </div>

        {settings.autoEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                فاصله زمانی (ساعت)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={settings.scheduleHours}
                onChange={(e) =>
                  patch({ scheduleHours: Math.min(720, Math.max(1, Number(e.target.value) || 1)) })
                }
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                نگهداری حداکثر (تعداد فایل)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={settings.retention}
                onChange={(e) =>
                  patch({ retention: Math.min(200, Math.max(0, Number(e.target.value) || 0)) })
                }
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
              <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-1">
                صفر = بدون حذف خودکار
              </p>
            </div>
            <div>
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                نوع پشتیبان خودکار
              </label>
              <SelectMenu
                value={settings.autoKind}
                onChange={(v: string) => patch({ autoKind: v as BackupKind })}
                options={autoKindOptions}
              />
            </div>
          </div>
        )}

        {/* Telegram notify */}
        <div className="flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/5 pt-4">
          <div>
            <p className="text-xs font-black text-stone-800 dark:text-gray-200">
              اطلاع‌رسانی تلگرام
            </p>
            <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
              بعد از هر پشتیبان موفق پیام تلگرام ارسال شود (نیازمند تنظیمات اطلاع‌رسانی)
            </p>
          </div>
          <Switch
            checked={settings.notifyTelegram}
            onCheckedChange={(checked: boolean) => patch({ notifyTelegram: checked })}
          />
        </div>

        {/* cPanel credentials */}
        <div className="border-t border-black/5 dark:border-white/5 pt-4 space-y-3">
          <p className="text-xs font-black text-stone-800 dark:text-gray-200 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-brand" />
            اتصال به هاست cPanel (برای پشتیبان روی هاست)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                آدرس هاست (بدون https)
              </label>
              <input
                value={settings.cpanelHost}
                onChange={(e) => patch({ cpanelHost: e.target.value })}
                placeholder="server1.example.com"
                dir="ltr"
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                نام کاربری cPanel
              </label>
              <input
                value={settings.cpanelUser}
                onChange={(e) => patch({ cpanelUser: e.target.value })}
                placeholder="polaris"
                dir="ltr"
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-black text-stone-600 dark:text-gray-300 block mb-1.5">
                توکن API هاست (UAPI Token)
              </label>
              <PasswordInput
                value={settings.cpanelToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ cpanelToken: e.target.value })}
                placeholder="cpanel token از بخش Manage API Tokens هاست"
              />
            </div>
          </div>
          <p className="text-[10px] text-stone-500 dark:text-gray-400 flex items-start gap-1.5 bg-stone-100/60 dark:bg-white/5 rounded-xl p-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            پشتیبان‌های cPanel داخل حساب هاست شما ساخته می‌شوند و از طریق فایل‌منیجر cPanel قابل
            دریافت‌اند — این صفحه فقط درخواست ساخت را ثبت می‌کند.
          </p>
        </div>
      </div>

      {/* Backups list */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <ArchiveRestore className="w-5 h-5 text-brand" />
            <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base">
              فایل‌های پشتیبان ({toPersianDigits(files.length)})
            </h3>
          </div>
          <button
            onClick={reload}
            className="p-2 rounded-lg text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
            title="به‌روزرسانی فهرست"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {files.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-6">
            هنوز فایل پشتیبانی وجود ندارد — از بخش «ساخت پشتیبان فوری» شروع کنید
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl glass-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={KIND_BADGE[f.kind]} size="sm">
                      {KIND_LABEL[f.kind]}
                    </Badge>
                    {f.automatic && (
                      <Badge variant="neutral" size="sm">خودکار</Badge>
                    )}
                    <span className="text-[10px] text-stone-400 font-mono truncate" dir="ltr">
                      {f.filename}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-1">
                    {toJalaliDateTime(f.createdAt)} • {formatSize(f.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={backupApi.download(f.id)}
                    download
                    className="p-2 rounded-lg border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:text-brand hover:border-brand/40 transition-colors"
                    title="دانلود"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => void remove(f)}
                    disabled={deletingId === f.id}
                    className="p-2 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                    title="حذف فایل"
                  >
                    {deletingId === f.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-stone-500 dark:text-gray-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          بازیابی دستی این فایل‌ها روی مسئولیت شماست: فایل دیتابیس را با MySQL و فایل سایت را با
          میزبانی خود جایگزین کنید. پشتیبان‌های ساخته‌شده روی هاست فقط از داخل cPanel قابل بازیابی‌اند.
        </p>
      </div>
    </div>
  );
};

export default BackupManager;
