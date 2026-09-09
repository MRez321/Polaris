import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertOctagon, AlarmClock, Info, Settings2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { notificationsApi } from '@/lib/api';
import { toPersianDigits, toJalaliDateTime } from '@/utils/persian';
import type { WorkshopNotification, WorkshopNotificationType } from '@/types';

/** Unified palette: critical=قرمز, need_action=نارنجی, notification=آبی, system=خنثی. */
const TYPE_META: Record<WorkshopNotificationType, {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  rowClass: string;
  dotClass: string;
}> = {
  critical: {
    label: 'بحرانی',
    icon: <AlertOctagon className="w-4 h-4" />,
    iconClass: 'text-rose-600 dark:text-rose-400',
    rowClass: 'border-rose-500/30 bg-rose-500/5',
    dotClass: 'bg-rose-500',
  },
  need_action: {
    label: 'نیاز به اقدام',
    icon: <AlarmClock className="w-4 h-4" />,
    iconClass: 'text-orange-600 dark:text-orange-400',
    rowClass: 'border-orange-500/30 bg-orange-500/5',
    dotClass: 'bg-orange-500',
  },
  notification: {
    label: 'اطلاعیه',
    icon: <Info className="w-4 h-4" />,
    iconClass: 'text-blue-600 dark:text-blue-400',
    rowClass: 'border-blue-500/30 bg-blue-500/5',
    dotClass: 'bg-blue-500',
  },
  system: {
    label: 'سیستمی',
    icon: <Settings2 className="w-4 h-4" />,
    iconClass: 'text-stone-600 dark:text-stone-400',
    rowClass: 'border-stone-400/40 bg-stone-500/5',
    dotClass: 'bg-stone-400',
  },
};

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<WorkshopNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const feed = await notificationsApi.listFeed();
      setItems(feed.notifications);
      setUnreadCount(feed.unreadCount);
    } catch {
      // Feed is non-critical; leave last state.
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every time the panel opens + keep in sync with data refreshes.
  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const markRead = async (n: WorkshopNotification) => {
    if (n.readAt || busy) return;
    setBusy(true);
    // Optimistic: grey the row immediately.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markFeedRead(n.id);
    } catch {
      void load(); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    const snapshot = items;
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllFeedRead();
    } catch {
      setItems(snapshot);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const openItem = (n: WorkshopNotification) => {
    void markRead(n);
    if (n.link) {
      onOpenChange(false);
      navigate(n.link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="start" className="w-[22rem] sm:w-[26rem] p-0 bg-white dark:bg-[#141416] border-e border-stone-200 dark:border-white/10">
        <SheetHeader className="p-4 pb-3 border-b border-stone-200 dark:border-white/5">
          <SheetTitle className="flex items-center justify-between text-base font-black text-stone-900 dark:text-white">
            <span className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand" />
              مرکز اعلان‌ها
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {toPersianDigits(unreadCount)} جدید
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllRead()}
                disabled={busy}
                className="flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-hover disabled:opacity-50"
                title="همه اعلان‌ها را خوانده‌شده علامت بزن"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                خواندن همه
              </button>
            )}
          </SheetTitle>
          <SheetDescription className="text-[11px] font-medium text-stone-600 dark:text-gray-400">
            رخدادها و وضعیت‌های نیازمند توجه کارگاه
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 max-h-[calc(100vh-7rem)]">
          {loading && items.length === 0 && (
            <div className="py-10 text-center text-xs text-stone-500">در حال بارگذاری…</div>
          )}
          {!loading && items.length === 0 && (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle className="text-sm font-black text-stone-800 dark:text-gray-200">اعلان جدیدی نیست</EmptyTitle>
                <EmptyDescription className="text-[11px] text-stone-500 dark:text-gray-400">
                  همه‌چیز مرتب است؛ اعلان‌های جدید اینجا نمایش داده می‌شوند.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {items.map((n) => {
            const meta = TYPE_META[n.type ?? 'system'];
            return (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-right rounded-xl border p-3 flex flex-col gap-1.5 transition-all ${meta.rowClass} ${
                  n.readAt ? 'opacity-55' : 'hover:border-brand/50 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`shrink-0 ${meta.iconClass}`}>{meta.icon}</span>
                  <span className="flex-1 min-w-0 truncate text-xs font-black text-stone-900 dark:text-white">
                    {n.title}
                  </span>
                  {!n.readAt && <span className={`shrink-0 w-2 h-2 rounded-full ${meta.dotClass}`} />}
                </span>
                {n.body && (
                  <span className="text-[11px] leading-5 text-stone-600 dark:text-gray-400 line-clamp-2">
                    {n.body}
                  </span>
                )}
                <span className="text-[10px] text-stone-400 dark:text-stone-500">
                  {toJalaliDateTime(n.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
