/**
 * ActivityTimeline — a compact "latest activity" timeline built on the EXISTING
 * Audit API (auditApi.list). Newest-first (the backend returns newest first).
 *
 * Reuses the shared audit display helpers (auditUtils) so entity icons/labels
 * never drift from AuditLogsManager. Severity states (success/warning/danger/
 * info/neutral) are derived from action + entity via getSeverity.
 *
 * Content-only: when placed on the dashboard it renders inside a WidgetShell
 * (which supplies the panel title / collapse chrome); it can also be embedded
 * anywhere else a compact activity feed is needed.
 */
import React from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { auditApi, getApiErrorMessage } from '@/lib/api';
import type { AuditLog } from '@/types';
import { toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getActionLabel,
  getEntityIcon,
  getEntityLabel,
  getRoleLabel,
  getSeverity,
  SEVERITY_DOT,
  type AuditSeverity,
} from './auditUtils';

const DEFAULT_LIMIT = 15;

const SEVERITY_BADGE: Record<
  AuditSeverity,
  'default' | 'gold' | 'success' | 'warning' | 'danger' | 'outline' | 'neutral' | 'orange' | 'blue'
> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'blue',
  neutral: 'neutral',
};

interface ActivityTimelineProps {
  /** How many of the latest events to fetch. Defaults to 15. */
  limit?: number;
  /** When true, hides the "view all" footer link (e.g. embedded in the audit page). */
  hideFooter?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  limit = DEFAULT_LIMIT,
  hideFooter = false,
}) => {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const PAGE_SIZE = 6;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  React.useEffect(() => {
    let active = true;
    setError(null);
    setLoading(true);
    auditApi
      .list(limit, 0)
      .then((res) => {
        if (!active) return;
        setLogs(res.logs);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err, 'خطا در دریافت جریان فعالیت‌ها'));
        toast.error('خطا در دریافت لاگ‌های فعالیت');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return (
    <div className="space-y-4">
      {loading ? (
        Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))
      ) : error ? (
        <div className="p-6 text-center text-sm text-rose-600 dark:text-rose-400 glass-panel rounded-2xl">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-xs text-stone-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-brand mx-auto mb-2" />
          هیچ فعالیتی ثبت نشده است.
        </div>
      ) : (
        <>
        <div className="space-y-3.5">
          {logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((log) => {
            const sev = getSeverity(log);
            return (
              <div key={log.id} className="flex items-start gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#141416] shrink-0 mt-1 ${SEVERITY_DOT[sev]}`}
                  aria-hidden="true"
                />
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-[#1E1E1E] flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                  {getEntityIcon(log.entity)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={SEVERITY_BADGE[sev]} size="sm">
                      {getActionLabel(log.action)}
                    </Badge>
                    <span className="text-stone-400 dark:text-stone-500">•</span>
                    <span className="font-medium text-brand text-xs">
                      {getEntityLabel(log.entity)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {log.details}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-stone-500 dark:text-gray-400">
                    <span className="font-medium">{log.userName || '—'}</span>
                    {log.userRole && getRoleLabel(log.userRole) ? (
                      <span className="text-stone-400 dark:text-gray-500">
                        ({getRoleLabel(log.userRole)})
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 shrink-0 whitespace-nowrap">
                  {toJalaliDateTime(log.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
        {logs.length > PAGE_SIZE && (
          <Pagination
            currentPage={safePage}
            totalItems={logs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
        </>
      )}

      {!hideFooter && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-stone-400 dark:text-gray-500 font-mono">
            {toPersianDigits(total)} رویداد مانیتور شده
          </span>
          <a
            href="/console/settings"
            className="text-[10px] font-bold text-brand hover:text-brand-hover transition-colors"
          >
            مشاهده همه لاگ‌ها
          </a>
        </div>
      )}
    </div>
  );
};
