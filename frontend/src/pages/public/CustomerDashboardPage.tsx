import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, LayoutDashboard, LogOut, Package, PenLine, RefreshCw, Settings2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus, PublicCatalogItem } from '@/types';
import { getApiErrorMessage, ordersApi, publicApi } from '@/lib/api';
import { authClient, mapAuthError } from '@/lib/auth';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatToman, toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ProductCard } from '@/components/public/ProductCard';
import { cn } from '@/lib/utils';

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  cancelled: { label: 'لغو شده', className: 'bg-red-500/12 text-red-600 dark:text-red-400 border-transparent' },
  confirmed: { label: 'تایید شده', className: 'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-transparent' },
  preparing: { label: 'در حال آماده‌سازی', className: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 border-transparent' },
  shipped: { label: 'ارسال شده', className: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 border-transparent' },
  delivered: { label: 'تحویل شده', className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-transparent' },
  pending: { label: 'در انتظار تایید', className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-transparent' },
};

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  cod: 'پرداخت در محل',
  card_transfer: 'کارت به کارت',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر',
  author: 'نویسنده',
  user: 'کاربر وب‌سایت',
  staff: 'کارمند',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'دسترسی کامل به مدیریت کارگاه (تولید، موجودی، مالی) و مدیریت وب‌سایت و وبلاگ.',
  author: 'دسترسی به نوشتن و مدیریت مطالب وبلاگ.',
  user: 'حساب کاربری وب‌سایت برای خرید، پیگیری سفارش‌ها و علاقه‌مندی‌ها.',
};

/**
 * Panel entry points per role — an explicit allowlist, so unknown or legacy
 * roles render no links. These buttons are navigation sugar only: /app and
 * /controlpanel re-check the role in their route guards, and every API
 * enforces it server-side (requireRole), so a hand-crafted URL or a tampered
 * DOM grants no access.
 */
const PANEL_LINKS: Record<
  string,
  { to: string; label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean }[]
> = {
  admin: [
    { to: '/workshop', label: 'پنل مدیریت کارگاه', icon: LayoutDashboard, primary: true },
    { to: '/controlpanel', label: 'مدیریت وب‌سایت و وبلاگ', icon: Settings2 },
  ],
  author: [{ to: '/controlpanel', label: 'پنل مدیریت وبلاگ', icon: PenLine, primary: true }],
};

/** First letter of up to two words, for the avatar fallback. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('‌');
}

/**
 * Customer account area for website users: order history, favorites and
 * profile. Lives inside the public layout — no workshop/admin data is ever
 * loaded here.
 */
export const CustomerDashboardPage: React.FC = () => {
  const { user, isLoading, signOut } = useAuth();

  usePageMeta(
    'حساب کاربری',
    'پیگیری سفارش‌ها و مدیریت حساب کاربری در فروشگاه پولاریس استایل.',
    '/dashboard'
  );

  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=/dashboard" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Profile header */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 flex items-center gap-4 mb-6">
        <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#CEAE80] text-black text-lg sm:text-xl font-black flex items-center justify-center shadow-lg shadow-[#CEAE80]/25">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-stone-900 dark:text-white truncate">
              {user.name}
            </h1>
            <Badge variant="outline" className="border-[#CEAE80]/40 text-[#A67C38] dark:text-[#CEAE80] text-[10px]">
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 truncate" dir="ltr">
            {user.email}
          </p>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="w-full sm:w-fit flex-wrap">
          <TabsTrigger value="orders">
            <Package className="w-4 h-4" />
            سفارش‌ها
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="w-4 h-4" />
            علاقه‌مندی‌ها
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserRound className="w-4 h-4" />
            پروفایل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <OrdersTab userId={user.id} />
        </TabsContent>
        <TabsContent value="favorites" className="mt-6">
          <FavoritesTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab onSignOut={signOut} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Orders ---------------------------------------------------------------

const OrdersTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setOrders(null);
    ordersApi
      .mine()
      .then(setOrders)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load, userId]);

  if (error) {
    return (
      <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
        <EmptyMedia variant="icon">
          <RefreshCw />
        </EmptyMedia>
        <EmptyTitle>خطا در بارگذاری سفارش‌ها</EmptyTitle>
        <EmptyDescription>{error}</EmptyDescription>
        <EmptyContent>
          <Button variant="outline" onClick={load}>تلاش دوباره</Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!orders) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
        <EmptyMedia variant="icon">
          <Package />
        </EmptyMedia>
        <EmptyTitle>هنوز سفارشی ثبت نکرده‌اید</EmptyTitle>
        <EmptyDescription>اولین خرید خود را از فروشگاه پولاریس انجام دهید.</EmptyDescription>
        <EmptyContent>
          <Button render={<Link to="/shop" />}>رفتن به فروشگاه</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const status = STATUS_META[order.status];
        return (
          <article
            key={order.id}
            className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5"
          >
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-stone-900 dark:text-white" dir="ltr">
                  {order.code}
                </span>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500">
                {toJalaliDateTime(order.createdAt)}
              </span>
            </header>

            <div className="mt-4 space-y-2.5">
              {order.items.map((line, i) => (
                <div key={`${line.itemId}-${i}`} className="flex items-center gap-3">
                  <span className="shrink-0 w-11 h-13 rounded-lg overflow-hidden bg-stone-100 dark:bg-white/5">
                    <SafeImage src={line.imageUrl} alt={line.name} className="w-full h-full object-cover" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${line.itemId}`}
                      className="text-xs font-bold text-stone-900 dark:text-white line-clamp-1 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
                    >
                      {line.name}
                    </Link>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      {toPersianDigits(line.quantity)} عدد
                      {[line.size && ` · سایز ${line.size}`, line.color && ` · رنگ ${line.color}`].join('')}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                    {formatToman(line.price * line.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <footer className="mt-4 pt-3 border-t border-dashed border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">
                {PAYMENT_LABELS[order.paymentMethod]} · تحویل: {order.city}
              </span>
              <span className="text-sm font-black text-[#A67C38] dark:text-[#CEAE80]">
                {formatToman(order.total)}
              </span>
            </footer>
          </article>
        );
      })}
    </div>
  );
};

// --- Favorites --------------------------------------------------------------

const FavoritesTab: React.FC = () => {
  const { favorites } = useFavorites();
  const [items, setItems] = useState<PublicCatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    publicApi
      .items()
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (favorites.length === 0) {
    return (
      <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
        <EmptyMedia variant="icon">
          <Heart />
        </EmptyMedia>
        <EmptyTitle>لیست علاقه‌مندی خالی است</EmptyTitle>
        <EmptyDescription>
          با لمس نشان قلب روی هر کالا، آن را اینجا ذخیره کنید.
        </EmptyDescription>
        <EmptyContent>
          <Button render={<Link to="/shop" />}>رفتن به فروشگاه</Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (error) {
    return (
      <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
        <EmptyMedia variant="icon">
          <RefreshCw />
        </EmptyMedia>
        <EmptyTitle>خطا در بارگذاری</EmptyTitle>
        <EmptyDescription>{error}</EmptyDescription>
        <EmptyContent>
          <Button variant="outline" onClick={load}>تلاش دوباره</Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!items) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="aspect-[3/5] rounded-2xl" />
        <Skeleton className="aspect-[3/5] rounded-2xl" />
        <Skeleton className="aspect-[3/5] rounded-2xl hidden lg:block" />
      </div>
    );
  }

  // Resolve ids against the live catalog; items removed from the shop drop silently.
  const favoriteItems = favorites
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is PublicCatalogItem => !!i);

  if (favoriteItems.length === 0) {
    return (
      <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
        <EmptyMedia variant="icon">
          <Heart />
        </EmptyMedia>
        <EmptyTitle>کالایی یافت نشد</EmptyTitle>
        <EmptyDescription>کالاهای ذخیره‌شده دیگر در فروشگاه موجود نیستند.</EmptyDescription>
        <EmptyContent>
          <Button render={<Link to="/shop" />}>رفتن به فروشگاه</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {favoriteItems.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  );
};

// --- Profile ----------------------------------------------------------------

const ProfileTab: React.FC<{ onSignOut: () => Promise<void> }> = ({ onSignOut }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setNameError('نام و نام خانوادگی را کامل وارد کنید');
      return;
    }
    setNameError(null);
    setSaving(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSaving(false);
    if (error) {
      toast.error(mapAuthError(error.message ?? 'خطا در به‌روزرسانی پروفایل'));
    } else {
      toast.success('پروفایل با موفقیت به‌روزرسانی شد');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await onSignOut();
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4 items-start">
      <form
        onSubmit={handleSave}
        className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-sm font-black text-stone-900 dark:text-white">ویرایش پروفایل</h2>

        <Field data-invalid={!!nameError || undefined}>
          <FieldLabel htmlFor="profile-name">نام و نام خانوادگی</FieldLabel>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!nameError || undefined}
          />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-email">ایمیل</FieldLabel>
          <Input id="profile-email" value={user?.email ?? ''} disabled dir="ltr" />
        </Field>

        <Button type="submit" loading={saving} className="bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black">
          ذخیره تغییرات
        </Button>
      </form>

      <div className="space-y-4">
        {/* Role & panel access */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-black text-stone-900 dark:text-white">نقش و دسترسی</h2>
          <div>
            <Badge variant="outline" className="border-[#CEAE80]/40 text-[#A67C38] dark:text-[#CEAE80] text-[10px]">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
            </Badge>
          </div>
          <p className="text-xs leading-6 text-stone-500 dark:text-stone-400">
            {ROLE_DESCRIPTIONS[user?.role ?? ''] ??
              'حساب کاربری وب‌سایت برای خرید و پیگیری سفارش‌ها.'}
          </p>
          {(PANEL_LINKS[user?.role ?? ''] ?? []).length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              {(PANEL_LINKS[user?.role ?? ''] ?? []).map((link) => (
                <Button
                  key={link.to}
                  render={<Link to={link.to} />}
                  variant={link.primary ? 'default' : 'outline'}
                  className={cn(
                    'w-full justify-start',
                    link.primary && 'bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black'
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Session */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-black text-stone-900 dark:text-white">نشست حساب</h2>
          <p className="text-xs leading-6 text-stone-500 dark:text-stone-400">
            از این حساب برای پیگیری سفارش‌ها و ثبت سفارش‌های جدید استفاده می‌شود. با خروج
            از حساب، سبد خرید شما روی همین دستگاه ذخیره می‌ماند.
          </p>
          <Button
            variant="destructive"
            loading={signingOut}
            onClick={handleSignOut}
            className={cn('w-full')}
          >
            <LogOut />
            خروج از حساب کاربری
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
