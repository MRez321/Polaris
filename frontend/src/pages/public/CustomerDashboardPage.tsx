import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Pencil,
  PenLine,
  Plus,
  RefreshCw,
  Settings2,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus, PublicCatalogItem, UserAddress } from '@/types';
import { addressesApi, getApiErrorMessage, ordersApi, publicApi, type AddressPayload } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { MobileNumberInput } from '@/components/ui/mobile-number-input';
import { CitySelector, type CitySelectorValue } from '@/components/ui/city-selector';
import { persianProvinces } from '@/lib/persian-provinces';
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

/**
 * Forward-only tracking steps. `cancelled` is rendered separately as a red
 * terminal branch so a cancelled order never shows a fake "delivered" path.
 */
const TRACKING_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const TRACKING_META: Record<OrderStatus, { label: string; description: string }> = {
  pending: { label: 'ثبت سفارش', description: 'سفارش شما ثبت شد و در انتظار بررسی است.' },
  confirmed: { label: 'تایید سفارش', description: 'سفارش شما تایید و برای آماده‌سازی ارسال شد.' },
  preparing: { label: 'در حال آماده‌سازی', description: 'کالاهای سفارش شما در کارگاه آماده می‌شوند.' },
  shipped: { label: 'ارسال شده', description: 'بسته شما به شرکت پست تحویل داده شد.' },
  delivered: { label: 'تحویل شده', description: 'سفارش شما با موفقیت تحویل داده شد.' },
  cancelled: { label: 'لغو سفارش', description: 'این سفارش لغو شده است. در صورت پرداخت، مبلغ به شما بازگردانده می‌شود.' },
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
        <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand text-brand-on text-lg sm:text-xl font-black flex items-center justify-center shadow-lg shadow-brand/25">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-stone-900 dark:text-white truncate">
              {user.name}
            </h1>
            <Badge variant="outline" className="border-brand/40 text-brand-ink text-[10px]">
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
  const [openId, setOpenId] = useState<string | null>(null);

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
        const open = openId === order.id;
        const currentStep = order.status;
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
                      className="text-xs font-bold text-stone-900 dark:text-white line-clamp-1 hover:text-brand-ink transition-colors"
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

            <footer className="mt-4 pt-3 border-t border-dashed border-stone-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs flex-wrap">
              <span className="text-stone-500 dark:text-stone-400">
                {PAYMENT_LABELS[order.paymentMethod]} · تحویل: {order.province ? `${order.province}، ` : ''}{order.city}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-brand-ink">
                  {formatToman(order.total)}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : order.id)}
                  aria-expanded={open}
                  className="flex items-center gap-1 text-[11px] font-black text-brand-ink hover:text-brand-hover transition-colors"
                >
                  {open ? 'بستن پیگیری' : 'پیگیری سفارش'}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
                </button>
              </div>
            </footer>

            {open && (
              <div className="mt-4 pt-4 border-t border-dashed border-stone-200 dark:border-white/10 space-y-4">
                {/* Step timeline */}
                <ol className="relative space-y-0">
                  {(order.status === 'cancelled'
                    ? (['pending', 'cancelled'] as OrderStatus[])
                    : TRACKING_STEPS
                  ).map((step, i, arr) => {
                    const isPast = order.status !== 'cancelled' && TRACKING_STEPS.indexOf(step) <= TRACKING_STEPS.indexOf(currentStep);
                    const isCancelledStep = step === 'cancelled';
                    const isCurrent = order.status === step;
                    return (
                      <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
                        {i < arr.length - 1 && (
                          <span
                            className={cn(
                              'absolute top-7 start-[13px] w-0.5 h-[calc(100%-16px)] rounded-full',
                              isCancelledStep
                                ? 'bg-red-500/30'
                                : isPast
                                  ? 'bg-brand'
                                  : 'bg-stone-200 dark:bg-white/10'
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            'relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors',
                            isCancelledStep
                              ? 'border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-400'
                              : isPast
                                ? 'border-brand bg-brand text-brand-on'
                                : 'border-stone-200 dark:border-white/15 bg-white dark:bg-[#16161a] text-stone-300 dark:text-stone-600'
                          )}
                        >
                          {isPast && !isCancelledStep ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isCancelledStep ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                          )}
                        </span>
                        <div className="pt-0.5 min-w-0">
                          <p
                            className={cn(
                              'text-xs font-black',
                              isCancelledStep
                                ? 'text-red-600 dark:text-red-400'
                                : isPast
                                  ? 'text-stone-900 dark:text-white'
                                  : 'text-stone-400 dark:text-stone-500'
                            )}
                          >
                            {TRACKING_META[step].label}
                            {isCurrent && !isCancelledStep && (
                              <span className="ms-2 inline-flex items-center gap-1 text-[10px] font-black text-brand-ink">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                مرحله فعلی
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
                            {TRACKING_META[step].description}
                          </p>
                          {step === 'shipped' && order.trackingCode && (
                            <p className="mt-1.5 text-[11px] font-black text-stone-700 dark:text-stone-200" dir="ltr">
                              کد رهگیری پستی: {order.trackingCode}
                            </p>
                          )}
                          {step === 'delivered' && order.deliveredAt && (
                            <p className="mt-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
                              تحویل در {toJalaliDateTime(order.deliveredAt)}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Shipping snapshot */}
                <div className="rounded-2xl bg-stone-50 dark:bg-white/4 border border-stone-200/60 dark:border-white/8 p-4 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-white">
                    <MapPin className="w-3.5 h-3.5 text-brand-ink" />
                    مشخصات ارسال
                  </p>
                  <p className="text-[11px] leading-6 text-stone-500 dark:text-stone-400">
                    گیرنده: {order.customerName} · تماس: <span dir="ltr">{order.phone}</span>
                  </p>
                  <p className="text-[11px] leading-6 text-stone-500 dark:text-stone-400">
                    {order.province ? `${order.province}، ` : ''}{order.city}
                    {order.postalCode ? ' · کد پستی ' : ''}
                    {order.postalCode && <span dir="ltr">{order.postalCode}</span>}
                  </p>
                  <p className="text-[11px] leading-6 text-stone-500 dark:text-stone-400">
                    {order.address}
                  </p>
                </div>
              </div>
            )}
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

interface AddressFormState {
  label: string;
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  isDefault: boolean;
}

const EMPTY_ADDRESS: AddressFormState = {
  label: '',
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  postalCode: '',
  address: '',
  isDefault: false,
};

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
    <div className="space-y-4">
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

          <Button type="submit" loading={saving} className="bg-brand hover:bg-brand-hover text-brand-on font-black">
            ذخیره تغییرات
          </Button>
        </form>

        <div className="space-y-4">
          {/* Role & panel access */}
          <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-3">
            <h2 className="text-sm font-black text-stone-900 dark:text-white">نقش و دسترسی</h2>
            <div>
              <Badge variant="outline" className="border-brand/40 text-brand-ink text-[10px]">
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
                    link.primary && 'bg-brand hover:bg-brand-hover text-brand-on font-black'
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

      {/* Address book — full-width below the profile cards */}
      <AddressBookSection />
    </div>
  );
};

// --- Address book ------------------------------------------------------------

const AddressBookSection: React.FC = () => {
  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_ADDRESS);
  const [cityValue, setCityValue] = useState<CitySelectorValue>({ province: null, city: null });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressFormState, string>>>({});
  const [savingAddr, setSavingAddr] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    addressesApi
      .list()
      .then(setAddresses)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_ADDRESS);
    setCityValue({ province: null, city: null });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (addr: UserAddress) => {
    setEditing(addr);
    setForm({
      label: addr.label,
      receiverName: addr.receiverName,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      postalCode: addr.postalCode,
      address: addr.address,
      isDefault: addr.isDefault,
    });
    const prov = persianProvinces.find((pr) => pr.name === addr.province);
    setCityValue({ province: prov ?? null, city: prov?.cities.find((c) => c.name === addr.city) ?? null });
    setFormErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof AddressFormState, string>> = {};
    if (form.receiverName.trim().length < 3) next.receiverName = 'نام گیرنده را کامل وارد کنید';
    if (!/^0\d{10}$/.test(form.phone)) next.phone = 'شماره تماس باید ۱۱ رقم و با ۰ شروع شود';
    if (!cityValue.province) next.province = 'استان را انتخاب کنید';
    if (!cityValue.city) next.city = 'شهر را انتخاب کنید';
    if (form.postalCode.trim() && !/^\d{10}$/.test(form.postalCode.trim()))
      next.postalCode = 'کد پستی باید ۱۰ رقم باشد';
    if (form.address.trim().length < 5) next.address = 'نشانی کامل را وارد کنید';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || savingAddr) return;
    setSavingAddr(true);
    const payload: AddressPayload = {
      label: form.label.trim(),
      receiverName: form.receiverName.trim(),
      phone: form.phone,
      province: cityValue.province!.name,
      city: cityValue.city!.name,
      postalCode: form.postalCode.trim(),
      address: form.address.trim(),
      isDefault: form.isDefault,
    };
    try {
      if (editing) {
        await addressesApi.update(editing.id, payload);
        toast.success('نشانی به‌روزرسانی شد');
      } else {
        await addressesApi.create(payload);
        toast.success('نشانی جدید اضافه شد');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ذخیره نشانی ناموفق بود'));
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDelete = async (addr: UserAddress) => {
    if (!window.confirm(`نشانی «${addr.label || addr.city}» حذف شود؟`)) return;
    setDeletingId(addr.id);
    try {
      await addressesApi.remove(addr.id);
      toast.success('نشانی حذف شد');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف نشانی ناموفق بود'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-white">
            <MapPin className="w-4 h-4 text-brand-ink" />
            نشانی‌های ارسال
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
            نشانی‌های خود را ذخیره کنید تا هنگام ثبت سفارش، اطلاعات ارسال سریع‌تر تکمیل شود.
          </p>
        </div>
        {!formOpen && (
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-brand hover:bg-brand-hover text-brand-on font-black"
          >
            <Plus className="w-4 h-4" />
            افزودن نشانی
          </Button>
        )}
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/8 border border-red-500/20 px-4 py-3">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
          <Button size="sm" variant="outline" onClick={load}>تلاش دوباره</Button>
        </div>
      )}

      {!addresses && !error && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}

      {addresses && addresses.length === 0 && !formOpen && (
        <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-2xl py-8">
          <EmptyMedia variant="icon">
            <MapPin />
          </EmptyMedia>
          <EmptyTitle>هنوز نشانی‌ای ثبت نکرده‌اید</EmptyTitle>
          <EmptyDescription>نشانی خانه یا محل کار خود را اضافه کنید.</EmptyDescription>
        </Empty>
      )}

      {addresses && addresses.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {addresses.map((addr) => (
            <article
              key={addr.id}
              className={cn(
                'relative rounded-2xl border p-4 space-y-2 transition-all',
                addr.isDefault
                  ? 'border-brand/60 bg-brand/6'
                  : 'border-stone-200/80 dark:border-white/8'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-white">
                  {addr.isDefault && <Star className="w-3.5 h-3.5 fill-brand text-brand" />}
                  {addr.label || `${addr.province}، ${addr.city}`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="ویرایش نشانی"
                    onClick={() => openEdit(addr)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-brand-ink hover:bg-stone-100 dark:hover:bg-white/6 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف نشانی"
                    disabled={deletingId === addr.id}
                    onClick={() => handleDelete(addr)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === addr.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-bold text-stone-700 dark:text-stone-200">{addr.receiverName}</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400" dir="ltr">{addr.phone}</p>
              <p className="text-[11px] leading-5 text-stone-500 dark:text-stone-400">
                {addr.province}، {addr.city}
                {addr.postalCode && <span dir="ltr"> · {addr.postalCode}</span>}
              </p>
              <p className="text-[11px] leading-5 text-stone-500 dark:text-stone-400 line-clamp-2">{addr.address}</p>
              {addr.isDefault && (
                <span className="inline-block text-[10px] font-black text-brand-ink bg-brand/12 rounded-full px-2 py-0.5">
                  نشانی پیش‌فرض
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={handleSaveAddress}
          className="rounded-2xl border border-stone-200/80 dark:border-white/8 bg-stone-50/50 dark:bg-white/3 p-4 sm:p-5 space-y-4"
        >
          <h3 className="text-xs font-black text-stone-900 dark:text-white">
            {editing ? 'ویرایش نشانی' : 'نشانی جدید'}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="addr-label">عنوان نشانی (اختیاری)</FieldLabel>
              <Input
                id="addr-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="مثال: خانه"
              />
            </Field>

            <Field data-invalid={!!formErrors.receiverName || undefined}>
              <FieldLabel htmlFor="addr-receiver">نام گیرنده</FieldLabel>
              <Input
                id="addr-receiver"
                value={form.receiverName}
                onChange={(e) => setForm((f) => ({ ...f, receiverName: e.target.value }))}
                aria-invalid={!!formErrors.receiverName || undefined}
              />
              {formErrors.receiverName && <FieldError>{formErrors.receiverName}</FieldError>}
            </Field>

            <Field data-invalid={!!formErrors.phone || undefined}>
              <FieldLabel htmlFor="addr-phone">شماره تماس</FieldLabel>
              <MobileNumberInput
                id="addr-phone"
                value={form.phone}
                onValueChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                aria-invalid={!!formErrors.phone || undefined}
              />
              {formErrors.phone && <FieldError>{formErrors.phone}</FieldError>}
            </Field>

            <Field data-invalid={!!formErrors.province || !!formErrors.city || undefined}>
              <FieldLabel>استان و شهر</FieldLabel>
              <CitySelector value={cityValue} onValueChange={setCityValue} />
              {formErrors.province && <FieldError>{formErrors.province}</FieldError>}
              {formErrors.city && <FieldError>{formErrors.city}</FieldError>}
            </Field>

            <Field data-invalid={!!formErrors.postalCode || undefined}>
              <FieldLabel htmlFor="addr-postal">کد پستی</FieldLabel>
              <Input
                id="addr-postal"
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value.replace(/[^0-9۰-۹]/g, '') }))}
                placeholder="۱۰ رقم، مثال: ۱۲۳۴۵۶۷۸۹۰"
                inputMode="numeric"
                dir="ltr"
                className="text-left"
                aria-invalid={!!formErrors.postalCode || undefined}
              />
              {formErrors.postalCode && <FieldError>{formErrors.postalCode}</FieldError>}
            </Field>
          </div>

          <Field data-invalid={!!formErrors.address || undefined}>
            <FieldLabel htmlFor="addr-text">نشانی کامل</FieldLabel>
            <Textarea
              id="addr-text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={3}
              aria-invalid={!!formErrors.address || undefined}
            />
            {formErrors.address && <FieldError>{formErrors.address}</FieldError>}
          </Field>

          <label className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4 accent-[#b8860b] cursor-pointer"
            />
            این نشانی را به‌عنوان پیش‌فرض ثبت کنم
          </label>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" loading={savingAddr} className="bg-brand hover:bg-brand-hover text-brand-on font-black">
              {editing ? 'ذخیره تغییرات' : 'افزودن نشانی'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              انصراف
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};


export default CustomerDashboardPage;
