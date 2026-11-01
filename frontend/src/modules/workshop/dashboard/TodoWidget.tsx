/**
 * Dashboard todo widget: a colorful task list backed by /api/workshop/todos.
 *
 * Revamped task surface:
 *  - every task can carry a date AND time deadline (`dueDate` is a datetime),
 *  - free-form text with inline editing of both text and deadline,
 *  - per-task browser reminder (bell) that fires a Notification once the
 *    deadline passes while the dashboard is open; reminder keys are kept in
 *    localStorage so a fired reminder never repeats,
 *  - the list is ordered by urgency (open before done, earliest deadline
 *    first) and pages 6 rows at a time.
 *
 * Self-fetching (mount + refetch after every mutation) because the workshop
 * frontend has no socket.io client wired for the 'todo' channel yet.
 * Priority color language: low=sky, medium=amber, high=rose, urgent=red —
 * consistent with the project's overdue/critical = rose/red convention.
 */
import React from 'react';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { todoApi, getApiErrorMessage } from '@/lib/api';
import type { TodoPriority, WorkshopTodo } from '@/types';
import { toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { SelectMenu } from '@/components/ui/select-menu';
import { Pagination } from '@/components/common/Pagination';
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
  { label: string; badge: string; border: string }
> = {
  low: {
    label: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    border: 'border-s-2 border-sky-500',
  },
  medium: {
    label: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    border: 'border-s-2 border-amber-500',
  },
  high: {
    label: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    border: 'border-s-2 border-rose-500',
  },
  urgent: {
    label: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25',
    border: 'border-s-2 border-red-600',
  },
};

const PAGE_SIZE = 6;
const REMINDER_STORAGE_KEY = 'polaris.todo.reminders';

/** Stable reminder identity: one per task per deadline. */
const reminderKey = (t: WorkshopTodo): string => `${t.id}:${t.dueDate}`;

const readReminderKeys = (): string[] => {
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
};

/** `datetime-local` input value for an ISO timestamp. */
const toLocalInputValue = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

/** Deadline state used for badges: past, today, or plain. */
type DeadlineState = 'overdue' | 'today' | 'upcoming' | 'none';

const deadlineState = (t: WorkshopTodo): DeadlineState => {
  if (!t.dueDate) return 'none';
  const due = new Date(t.dueDate).getTime();
  if (Number.isNaN(due)) return 'none';
  const now = new Date();
  if (due < now.getTime()) return 'overdue';
  return due - now.getTime() <= 24 * 60 * 60 * 1000 ? 'today' : 'upcoming';
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
  const [page, setPage] = React.useState(1);
  const [reminders, setReminders] = React.useState<string[]>(readReminderKeys);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [editDue, setEditDue] = React.useState('');
  const [editPriority, setEditPriority] = React.useState<TodoPriority>('medium');

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

  const persistReminders = (next: string[]) => {
    setReminders(next);
    try {
      window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage disabled/full: reminders still work for this session.
    }
  };

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
      if (editingId === id) setEditingId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف کار ناموفق بود'));
    }
  };

  const startEdit = (t: WorkshopTodo) => {
    setEditingId(t.id);
    setEditText(t.text);
    setEditDue(t.dueDate ? toLocalInputValue(t.dueDate) : '');
    setEditPriority(t.priority);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      toast.error('متن کار را بنویسید');
      return;
    }
    try {
      const updated = await todoApi.update(editingId, {
        text: trimmed,
        priority: editPriority,
        dueDate: editDue ? new Date(editDue).toISOString() : '',
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ویرایش کار ناموفق بود'));
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

  const toggleReminder = async (t: WorkshopTodo) => {
    const key = reminderKey(t);
    if (reminders.includes(key)) {
      persistReminders(reminders.filter((entry) => entry !== key));
      return;
    }
    if (!t.dueDate) {
      toast.error('برای یادآور ابتدا سررسید تعیین کنید');
      return;
    }
    if (typeof Notification === 'undefined') {
      toast.error('مرورگر شما از یادآور پشتیبانی نمی‌کند');
      return;
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('اجازه نمایش اعلان داده نشد');
        return;
      }
    }
    persistReminders([...reminders, key]);
    toast.success('یادآور برای این سررسید فعال شد');
  };

  // Fires due reminders while the dashboard stays open. A fired reminder is
  // dropped from storage so it never repeats for the same deadline.
  React.useEffect(() => {
    if (reminders.length === 0 || todos.length === 0) return;
    const check = () => {
      const now = Date.now();
      const fired: string[] = [];
      for (const t of todos) {
        const key = reminderKey(t);
        if (!reminders.includes(key) || t.done || !t.dueDate) continue;
        if (new Date(t.dueDate).getTime() > now) continue;
        fired.push(key);
        try {
          new Notification('یادآور کار کارگاه', { body: t.text });
        } catch {
          // Notification constructor unavailable: keep the list intact.
        }
      }
      if (fired.length > 0) {
        persistReminders(reminders.filter((entry) => !fired.includes(entry)));
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [reminders, todos]);

  const sortedTodos = React.useMemo(() => {
    const dueTime = (t: WorkshopTodo): number =>
      t.dueDate ? new Date(t.dueDate).getTime() : Number.POSITIVE_INFINITY;
    return [...todos].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const delta = dueTime(a) - dueTime(b);
      if (delta !== 0) return delta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [todos]);

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const overdueOpen = todos.filter((t) => deadlineState(t) === 'overdue' && !t.done);

  const totalPages = Math.max(1, Math.ceil(sortedTodos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageTodos = sortedTodos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="glass-panel rounded-2xl border border-stone-200 dark:border-white/5 shadow-xl overflow-hidden">
      <Collapsible open={!collapsed} onOpenChange={onToggleCollapse}>
        <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
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
                {toPersianDigits(overdueOpen.length)} سررسید گذشته
              </span>
            )}
          </div>
          <CollapsibleTrigger className="p-1.5 rounded-lg text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors">
            <Chevron className="w-4 h-4 transition-transform" rotated={collapsed} />
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
            <div className="flex flex-wrap gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void add();
                }}
                placeholder="کار جدید... (Enter برای ثبت)"
                className="flex-1 min-w-[160px] text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
              <SelectMenu
                value={priority}
                onChange={(v: string) => setPriority(v as TodoPriority)}
                options={[...PRIORITY_OPTIONS]}
                className="w-24 shrink-0"
              />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                title="تاریخ و ساعت سررسید (اختیاری)"
                className="w-44 shrink-0 text-[11px] font-bold px-2 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
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
            ) : sortedTodos.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-4">
                هنوز کاری ثبت نشده است — اولین کار کارگاه را اضافه کنید
              </p>
            ) : (
              <div className="space-y-2">
                {pageTodos.map((t) => {
                  const style = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium;
                  const state = t.done ? 'none' : deadlineState(t);
                  const reminded = reminders.includes(reminderKey(t));

                  if (editingId === t.id) {
                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl glass-card space-y-2 ${style.border}`}
                      >
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <SelectMenu
                            value={editPriority}
                            onChange={(v: string) => setEditPriority(v as TodoPriority)}
                            options={[...PRIORITY_OPTIONS]}
                            className="w-24 shrink-0"
                          />
                          <input
                            type="datetime-local"
                            value={editDue}
                            onChange={(e) => setEditDue(e.target.value)}
                            title="تاریخ و ساعت سررسید"
                            className="w-44 shrink-0 text-[11px] font-bold px-2 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand/50"
                          />
                          <button
                            onClick={() => void saveEdit()}
                            className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            ذخیره
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            انصراف
                          </button>
                        </div>
                      </div>
                    );
                  }

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
                              {PRIORITY_OPTIONS.find((p) => p.value === t.priority)?.label ??
                                'متوسط'}
                            </span>
                            {t.dueDate && (
                              <span
                                className={`text-[9px] font-bold ${
                                  state === 'overdue'
                                    ? 'text-rose-600 dark:text-red-400'
                                    : state === 'today'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-stone-500 dark:text-gray-400'
                                }`}
                              >
                                {state === 'overdue'
                                  ? 'سررسید گذشته: '
                                  : state === 'today'
                                  ? 'امروز: '
                                  : 'سررسید: '}
                                {toJalaliDateTime(t.dueDate)}
                              </span>
                            )}
                            {reminded && !t.done && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-brand/10 text-brand border-brand/20">
                                یادآور فعال
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => void toggleReminder(t)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            reminded
                              ? 'text-brand hover:bg-brand/10'
                              : 'text-stone-400 hover:text-brand hover:bg-brand/10'
                          }`}
                          title={reminded ? 'حذف یادآور' : 'فعال‌کردن یادآور'}
                        >
                          {reminded ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <BellOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-brand hover:bg-brand/10 transition-colors"
                          title="ویرایش کار"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void remove(t.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-500/10 transition-colors"
                          title="حذف کار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sortedTodos.length > PAGE_SIZE && (
              <Pagination
                currentPage={safePage}
                totalItems={sortedTodos.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
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
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className ?? ''} ${rotated ? 'rotate-180' : ''}`}
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
