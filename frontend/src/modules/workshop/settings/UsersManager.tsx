import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Users as UsersIcon, UserPlus, Loader2, Ban, CircleCheck, Trash2, Search } from 'lucide-react';
import { authClient } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { toJalaliDate, toPersianDigits } from '@/utils/persian';
import { Modal } from '@/components/common/Modal';
import { SelectMenu } from '@/components/ui/select-menu';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string | Date | number;
  banned: boolean;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مدیر' },
  { value: 'author', label: 'نویسنده وبلاگ' },
  { value: 'user', label: 'کاربر وب‌سایت' },
];

type AppRole = 'admin' | 'author' | 'user' | 'staff';

/** Narrow a SelectMenu string value to the app's role union. */
const toAppRole = (value: string): AppRole => {
  if (value === 'admin' || value === 'author' || value === 'user' || value === 'staff') return value;
  return 'user';
};

export const UsersManager: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Create-user modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');

  // List filters: search matches name/email; role narrows the list.
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
    if (error) {
      toast.error(error.message || 'خطا در دریافت لیست کاربران');
    } else {
      setUsers(
        (data?.users ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: Array.isArray(u.role) ? (u.role[0] ?? 'user') : (u.role ?? 'user'),
          createdAt: u.createdAt,
          banned: Boolean(u.banned),
        }))
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();

    if (!name) {
      toast.error('نام کاربر را وارد کنید');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('ایمیل وارد شده معتبر نیست');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setBusyKey('create');
    const { error } = await authClient.admin.createUser({
      name,
      email,
      password: newPassword,
      role: newRole,
    });
    setBusyKey(null);

    if (error) {
      toast.error(error.message || 'خطا در ایجاد کاربر جدید');
      return;
    }

    toast.success('کاربر جدید با موفقیت ایجاد شد');
    setIsCreateModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    fetchUsers();
  };

  const handleSetRole = async (userId: string, role: string) => {
    setBusyKey(`role:${userId}`);
    const { error } = await authClient.admin.setRole({ userId, role: toAppRole(role) });
    setBusyKey(null);

    if (error) {
      toast.error(error.message || 'خطا در تغییر نقش کاربر');
      return;
    }
    toast.success('نقش کاربر با موفقیت تغییر کرد');
    fetchUsers();
  };

  const handleToggleBan = async (user: ManagedUser) => {
    setBusyKey(`ban:${user.id}`);
    const { error } = user.banned
      ? await authClient.admin.unbanUser({ userId: user.id })
      : await authClient.admin.banUser({ userId: user.id, banReason: 'مسدود توسط مدیر' });
    setBusyKey(null);

    if (error) {
      toast.error(error.message || 'خطا در تغییر وضعیت مسدودی کاربر');
      return;
    }
    toast.success(user.banned ? 'دسترسی کاربر دوباره فعال شد' : 'کاربر مسدود شد');
    fetchUsers();
  };

  const handleRemoveUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `آیا از حذف کامل کاربر «${user.name}» مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`
    );
    if (!confirmed) return;

    setBusyKey(`remove:${user.id}`);
    const { error } = await authClient.admin.removeUser({ userId: user.id });
    setBusyKey(null);

    if (error) {
      toast.error(error.message || 'خطا در حذف کاربر');
      return;
    }
    toast.success('کاربر برای همیشه حذف شد');
    fetchUsers();
  };

  const getRoleLabel = (role: string) => {
    const option = ROLE_OPTIONS.find((o) => o.value === role);
    return option ? option.label : role;
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-stone-900 dark:text-white">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 flex items-center justify-center text-[#CEAE80]">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="text-[#CEAE80]">مدیریت کاربران و سطوح دسترسی</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
            ایجاد حساب کاربری برای پرسنل، تعیین نقش مدیر یا کاربر و کنترل دسترسی به سامانه
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left bg-stone-100 dark:bg-black/40 px-3.5 py-2 rounded-xl border border-black/5 dark:border-white/5">
            <span className="text-[10px] text-stone-400 block">تعداد کاربران:</span>
            <span className="text-sm font-black text-[#CEAE80] font-mono">
              {toPersianDigits(users.length)} کاربر
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="p-8 text-center glass-panel rounded-2xl text-xs text-stone-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#CEAE80]" />
          <span>در حال دریافت لیست کاربران...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filters: search bar + role SelectMenu */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا ایمیل کاربر…"
                className="w-full ps-9 pe-3 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none"
              />
            </div>
            <SelectMenu
              value={roleFilter}
              onChange={setRoleFilter}
              options={[{ value: 'all', label: 'همه نقش‌ها' }, ...ROLE_OPTIONS]}
              className="w-full sm:w-48"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl text-xs text-stone-400">
              کاربری با این مشخصات یافت نشد.
            </div>
          ) : (
            <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isSelf = currentUser?.id === user.id;
            return (
              <div
                key={user.id}
                className="p-4 rounded-xl glass-card hover:border-[#CEAE80]/40 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#CEAE80]/20 text-[#CEAE80] flex items-center justify-center shrink-0 font-black text-sm border border-[#CEAE80]/30">
                    {user.name.trim().charAt(0) || '؟'}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-stone-900 dark:text-white text-xs sm:text-sm">
                        {user.name}
                      </span>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-md bg-[#CEAE80]/15 text-[#CEAE80] text-[10px] font-bold">
                          شما
                        </span>
                      )}
                      <span
                        className={
                          user.role === 'admin'
                            ? 'px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[10px] font-bold'
                            : 'px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-300 text-[10px] font-bold'
                        }
                      >
                        {getRoleLabel(user.role)}
                      </span>
                      {user.banned && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          مسدود
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-stone-500 dark:text-stone-400">
                      <span dir="ltr" className="font-mono text-left">
                        {user.email}
                      </span>
                      {user.createdAt && (
                        <span>عضویت: {toJalaliDate(user.createdAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
                  <SelectMenu
                    value={user.role}
                    onChange={(role) => handleSetRole(user.id, role)}
                    options={ROLE_OPTIONS}
                    className="w-32"
                  />

                  <button
                    type="button"
                    onClick={() => handleToggleBan(user)}
                    disabled={isSelf || busyKey === `ban:${user.id}`}
                    title={user.banned ? 'فعال‌سازی مجدد دسترسی' : 'مسدود کردن کاربر'}
                    className={
                      user.banned
                        ? 'p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                        : 'p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                    }
                  >
                    {busyKey === `ban:${user.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : user.banned ? (
                      <CircleCheck className="w-4 h-4" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveUser(user)}
                    disabled={isSelf || busyKey === `remove:${user.id}`}
                    title="حذف کامل کاربر"
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busyKey === `remove:${user.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </div>
      )}


      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="افزودن کاربر جدید"
        subtitle="حساب کاربری برای ورود به سامانه کارگاه ایجاد کنید"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-stone-900 dark:text-white">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              نام و نام خانوادگی *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثلاً: رضا مرادی"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              ایمیل (نام کاربری برای ورود) *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              رمز عبور * (حداقل ۸ کاراکتر)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm focus:border-[#CEAE80] outline-none font-mono text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              نقش کاربر در سامانه
            </label>
            <SelectMenu value={newRole} onChange={(v) => setNewRole(toAppRole(v))} options={ROLE_OPTIONS} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={busyKey === 'create'}
              className="px-5 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait flex items-center gap-2"
            >
              {busyKey === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>ایجاد کاربر</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
