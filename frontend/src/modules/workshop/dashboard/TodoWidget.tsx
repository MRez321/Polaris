/**
 * Dashboard todo widget: a colorful task list backed by /api/workshop/todos.
 * Self-fetching (mount + refetch after every mutation) because the workshop
 * frontend has no socket.io client wired for the 'todo' channel yet.
 * Priority color language: low=sky, medium=amber, high=rose, urgent=red —
 * consistent with the project's overdue/critical = rose/red convention.
 */
import React from 'react';
import { toast } from 'sonner';
import {
  Check,
  ClipboardList,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { todoApi, getApiErrorMessage } from '@/lib/api';
import type { TodoPriority, WorkshopTodo } from '@/types';
import { toJalaliDate, toPersianDigits } from '@/utils/persian';
import { SelectMenu } from '@/components/ui/select-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'کم' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high', label: 'زیاد' },
  { value: 'urgent', label: 'فوری' },
] as const;

/** Priority → tailwind classes for the row accent + select tint. */
const PRIORITY_STYLE: Record<
  TodoPriority,
  { dot: string; label: string; badge: string; border: string }
> = {
  low: {
    dot: 'bg-sky-500',
    label: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    border: 'border-s-2 border-sky-500',
  },
  medium: {
    dot: 'bg-amber-500',
    label: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    border: 'border-s-2 border-amber-500',
  },
  high: {
    dot: 'bg-rose-500',
    label: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    border: 'border-s-2 border-rose-500',
  },
  urgent: {
    dot: 'bg-red-600',
    label: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25',
    border: 'border-s-2 border-red-600',
  },
};

interface TodoWidgetProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TodoWidget: React.FC<TodoWidgetProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const [todos, setTodos] = React.useState<WorkshopTodo[]>([]);
  const [text, setText] = React.useState('');
  const [priority, setPriority] = React.useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refetch = React.useCallback(() => {
    todoApi
      .list()
      .then(setTodos)
      .catch(() => toast.error('دریافت فهرست کارها ناموفق بود'))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const add = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('متن کار را بنویسید');
      return;
    }
    setBusy(true);
    try {
      await todoApi.create({
        text: trimmed,
        priority,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      });
      setText('');
      setDueDate('');
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ثبت کار جدید ناموفق بود'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string) => {
    try {
      const updated = await todoApi.toggle(id);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تغییر وضعیت کار ناموفق بود'));
    }
  };

  const remove = async (id: string) => {
    try {
      await todoApi.remove(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف کار ناموفق بود'));
    }
  };

  const clearDone = async () => {
    try {
      const { cleared } = await todoApi.clearDone();
      if (cleared > 0) {
        toast.success(`${toPersianDigits(cleared)} کار انجام‌شده پاک شد`);
        refetch();
      } else {
        toast.info('کاری برای پاک‌سازی نیست');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'پاک‌سازی کارهای انجام‌شده ناموفق بود'));
    }
  };

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const overdueOpen = todos.filter(
    (t) => !t.done && t.dueDate && new Date(t.dueDate).getTime() < Date.now(),
  );

  return (
    <div className="glass-panel rounded-2xl border border-stone-200 dark:border-white/5 shadow-xl overflow-hidden">
      <Collapsible open={!collapsed} onOpenChange={onToggleCollapse}>
        <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-brand" />
            <h4 className="font-black text-stone-900 dark:text-white text-sm">
              فهرست کارهای کارگاه
            </h4>
            {totalCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300 font-mono">
                {toPersianDigits(doneCount)}/{toPersianDigits(totalCount)}
              </span>
            )}
            {overdueOpen.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                {toPersianDigits(overdueOpen.length)} سرسید گذشته
              </span>
            )}
          </div>
          <CollapsibleTrigger className="p-1.5 rounded-lg text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors">
            <Chevron
              className="w-4 h-4 transition-transform"
              rotated={collapsed}
            />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-3">
            {/* Progress bar */}
            {totalCount > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="text-stone-500 dark:text-gray-400">پیشرفت کارها</span>
                  <span className="text-emerald-600 dark:text-green-400 font-mono">
                    {toPersianDigits(progressPct)}٪
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-200/60 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Add form */}
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void add();
                }}
                placeholder="کار جدید... (Enter برای ثبت)"
                className="flex-1 min-w-0 text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
              <SelectMenu
                value={priority}
                onChange={(v: string) => setPriority(v as TodoPriority)}
                options={[...PRIORITY_OPTIONS]}
                className="w-24 shrink-0"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                title="سررسید (اختیاری)"
                className="w-32 shrink-0 text-[11px] font-bold px-2 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
              <button
                onClick={() => void add()}
                disabled={busy}
                className="shrink-0 w-9 h-9 rounded-xl bg-brand hover:bg-brand-hover text-brand-on flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
                title="افزودن کار"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            {loading ? (
              <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-4">
                در حال دریافت کارها...
              </p>
            ) : todos.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-4">
                هنوز کاری ثبت نشده است — اولین کار کارگاه را اضافه کنید
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto ps-1">
                {todos.map((t) => {
                  const style = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium;
                  const isOverdue =
                    !t.done && t.dueDate && new Date(t.dueDate).getTime() < Date.now();
                  return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-xl glass-card flex items-start justify-between gap-2 ${style.border}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => void toggle(t.id)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                            t.done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-stone-300 dark:border-white/20 hover:border-brand'
                          }`}
                          title={t.done ? 'برگرداندن به انجام‌نشده' : 'انجام شد'}
                        >
                          {t.done && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold break-words ${
                              t.done
                                ? 'text-stone-400 dark:text-gray-500 line-through'
                                : 'text-stone-900 dark:text-white'
                            }`}
                          >
                            {t.text}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${style.badge}`}
                            >
                              {PRIORITY_OPTIONS.find((p) => p.value === t.priority)?.label ?? 'متوسط'}
                            </span>
                            {t.dueDate && (
                              <span
                                className={`text-[9px] font-bold ${
                                  isOverdue
                                    ? 'text-rose-600 dark:text-red-400'
                                    : 'text-stone-500 dark:text-gray-400'
                                }`}
                              >
                                {isOverdue ? 'سررسید گذشته: ' : 'سررسید: '}
                                {toJalaliDate(t.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => void remove(t.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="حذف کار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer actions */}
            {doneCount > 0 && (
              <button
                onClick={() => void clearDone()}
                className="w-full text-[11px] font-bold py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
              >
                پاک‌سازی {toPersianDigits(doneCount)} کار انجام‌شده
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/** Chevron that rotates with the collapsed state (kept tiny by necessity). */
const Chevron: React.FC<{ className?: string; rotated?: boolean }> = ({ className, rotated }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className ?? ''} ${rotated ? '-rotate-90' : ''}`}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Grip icon reserved for future drag-reorder of individual todos.
void GripVertical;
