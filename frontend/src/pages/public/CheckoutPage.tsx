import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Banknote, CheckCircle2, CreditCard, MapPin, PackageCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderPaymentMethod } from '@/types';
import { addressesApi, getApiErrorMessage, ordersApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { isValidIranPhone } from '@/lib/iranian-mobile';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { MobileNumberInput } from '@/components/ui/mobile-number-input';
import { CitySelector, type CitySelectorValue } from '@/components/ui/city-selector';
import { persianProvinces } from '@/lib/persian-provinces';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS: {
  value: OrderPaymentMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'cod',
    title: 'پرداخت در محل',
    description: 'مبلغ سفارش را هنگام تحویل کالا پرداخت کنید.',
    icon: <Banknote className="w-5 h-5" />,
  },
  {
    value: 'card_transfer',
    title: 'کارت به کارت',
    description: 'پس از ثبت سفارش، شماره کارت برای شما ارسال می‌شود.',
    icon: <CreditCard className="w-5 h-5" />,
  },
];

interface FormErrors {
  name?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  address?: string;
}

/**
 * Checkout: shipping details + payment method, then POST /api/orders.
 * Login-gated — anonymous shoppers are redirected to /login?next=/checkout.
 * Prices shown are the client-side estimate; the backend re-prices every
 * line from the items table and re-validates stock inside a transaction.
 */
export const CheckoutPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { lines, total, clear } = useCart();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [cityValue, setCityValue] = useState<CitySelectorValue>({ province: null, city: null });
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<OrderPaymentMethod>('cod');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  usePageMeta(
    'تکمیل سفارش',
    'ثبت نهایی سفارش از فروشگاه پولاریس استایل؛ پرداخت در محل یا کارت به کارت.',
    '/checkout'
  );

  // Prefill the receiver name once the session resolves (state initializes
  // while the user may still be loading).
  useEffect(() => {
    if (user) setName((n) => n.trim() || user.name);
  }, [user]);

  // Prefill the form with the saved default address (user can override).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    addressesApi
      .list()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        const def = list.find((a) => a.isDefault) ?? list[0];
        setName((n) => n.trim() || def.receiverName);
        setPhone((ph) => ph || def.phone);
        setPostalCode((pc) => pc || def.postalCode);
        setAddress((a) => a || def.address);
        // Resolve the saved province/city names into the CitySelector value
        setCityValue((cv) => {
          if (cv.province || cv.city) return cv;
          const prov = persianProvinces.find((pr) => pr.name === def.province);
          const city = prov?.cities.find((c) => c.name === def.city) ?? null;
          return prov ? { province: prov, city } : cv;
        });
      })
      .catch(() => {
        /* Address book is optional — checkout stays fully manual. */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=/checkout" replace />;

  // Success screen after a submitted order.
  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="rounded-3xl border border-brand/30 bg-white dark:bg-[#16161a] p-8 sm:p-12 text-center space-y-5 shadow-xl shadow-brand/10">
          <span className="mx-auto w-16 h-16 rounded-full bg-brand/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-brand-ink" />
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            سفارش شما با موفقیت ثبت شد
          </h1>
          <p className="text-sm leading-7 text-stone-600 dark:text-stone-300">
            کد پیگیری سفارش شما{' '}
            <span className="font-black text-brand-ink" dir="ltr">
              {placedOrder.code}
            </span>{' '}
            است. وضعیت سفارش را می‌توانید از حساب کاربری خود پیگیری کنید.
          </p>
          {placedOrder.paymentMethod === 'card_transfer' && (
            <p className="text-xs leading-6 text-stone-500 dark:text-stone-400 rounded-2xl bg-stone-50 dark:bg-white/4 border border-stone-200/60 dark:border-white/8 p-4">
              شماره کارت برای پرداخت به‌صورت پیامکی برای شما ارسال می‌شود؛ لطفاً تا
              تایید سفارش منتظر بمانید.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            <Button size="lg" className="bg-brand hover:bg-brand-hover text-brand-on font-black" render={<Link to="/dashboard" />}>
              پیگیری سفارش‌ها
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/shop" />}>
              ادامه خرید
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
          <EmptyMedia variant="icon">
            <PackageCheck />
          </EmptyMedia>
          <EmptyTitle>سبد خرید خالی است</EmptyTitle>
          <EmptyDescription>برای ثبت سفارش ابتدا کالاهایی را به سبد اضافه کنید.</EmptyDescription>
          <EmptyContent>
            <Button render={<Link to="/shop" />}>رفتن به فروشگاه</Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (name.trim().length < 3) next.name = 'نام و نام خانوادگی را کامل وارد کنید';
    if (!isValidIranPhone(phone)) next.phone = 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)';
    if (!cityValue.city) next.city = 'استان و شهر را انتخاب کنید';
    if (postalCode.trim() && !/^\d{10}$/.test(postalCode.trim()))
      next.postalCode = 'کد پستی باید ۱۰ رقم باشد';
    if (address.trim().length < 10) next.address = 'نشانی کامل پستی را وارد کنید';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        customerName: name.trim(),
        phone: phone,
        city: cityValue.city!.name,
        province: cityValue.province!.name,
        postalCode: postalCode.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        paymentMethod: payment,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          size: l.size,
          color: l.color,
        })),
      });
      clear();
      setPlacedOrder(order);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ثبت سفارش ناموفق بود؛ دوباره تلاش کنید'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mb-6 sm:mb-8">
        تکمیل سفارش
      </h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_24rem] gap-6 lg:gap-8 items-start">
        {/* Shipping + payment */}
        <div className="space-y-5">
          <section className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-white">
              <UserRound className="w-4 h-4 text-brand-ink" />
              اطلاعات گیرنده
            </h2>

            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="checkout-name">نام و نام خانوادگی</FieldLabel>
              <Input
                id="checkout-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سارا محمدی"
                aria-invalid={!!errors.name || undefined}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.phone || undefined}>
              <FieldLabel htmlFor="checkout-phone">شماره موبایل</FieldLabel>
              <MobileNumberInput
                id="checkout-phone"
                value={phone}
                onValueChange={setPhone}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                aria-invalid={!!errors.phone || undefined}
              />
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.city || undefined}>
              <FieldLabel>استان و شهر</FieldLabel>
              <CitySelector value={cityValue} onValueChange={setCityValue} />
              {errors.city && <FieldError>{errors.city}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.postalCode || undefined}>
              <FieldLabel htmlFor="checkout-postal">کد پستی</FieldLabel>
              <Input
                id="checkout-postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9۰-۹]/g, ''))}
                placeholder="۱۰ رقم، مثال: ۱۲۳۴۵۶۷۸۹۰"
                inputMode="numeric"
                dir="ltr"
                className="text-left"
                aria-invalid={!!errors.postalCode || undefined}
              />
              {errors.postalCode && <FieldError>{errors.postalCode}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.address || undefined}>
              <FieldLabel htmlFor="checkout-address">نشانی کامل</FieldLabel>
              <Textarea
                id="checkout-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="خیابان، کوچه، پلاک، واحد و کد پستی"
                rows={3}
                aria-invalid={!!errors.address || undefined}
              />
              {errors.address && <FieldError>{errors.address}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="checkout-note">یادداشت (اختیاری)</FieldLabel>
              <Input
                id="checkout-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="توضیحی برای کارگاه دارید؟"
              />
            </Field>
          </section>

          <section className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-white">
              <CreditCard className="w-4 h-4 text-brand-ink" />
              روش پرداخت
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPayment(method.value)}
                  className={cn(
                    'text-right rounded-2xl border p-4 transition-all active:scale-[0.98]',
                    payment === method.value
                      ? 'border-brand bg-brand/10 shadow-md shadow-brand/15'
                      : 'border-stone-200 dark:border-white/10 hover:border-brand/50'
                  )}
                  aria-pressed={payment === method.value}
                >
                  <span
                    className={cn(
                      'flex items-center gap-2 text-sm font-black',
                      payment === method.value
                        ? 'text-brand-ink'
                        : 'text-stone-900 dark:text-white'
                    )}
                  >
                    {method.icon}
                    {method.title}
                  </span>
                  <span className="block mt-1.5 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
                    {method.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Order summary */}
        <aside className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-sm font-black text-stone-900 dark:text-white mb-4">خلاصه سفارش</h2>

          <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
            {lines.map((line) => (
              <div key={`${line.itemId}|${line.size ?? ''}|${line.color ?? ''}`} className="flex gap-3">
                <span className="shrink-0 w-14 h-16 rounded-lg overflow-hidden bg-stone-100 dark:bg-white/5">
                  <SafeImage src={line.imageUrl} alt={line.name} className="w-full h-full object-cover" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 dark:text-white line-clamp-1">{line.name}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {[line.size && `سایز ${line.size}`, line.color && `رنگ ${line.color}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mt-1">
                    {toPersianDigits(line.quantity)} × {formatToman(line.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
              <span>تعداد کالاها</span>
              <span className="font-bold">{toPersianDigits(lines.reduce((s, l) => s + l.quantity, 0))}</span>
            </div>
            <div className="flex items-center justify-between text-stone-900 dark:text-white">
              <span className="font-black">مبلغ قابل پرداخت</span>
              <span className="text-lg font-black text-brand-ink">
                {formatToman(total)}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            className="w-full mt-5 h-12 bg-brand hover:bg-brand-hover text-brand-on font-black shadow-lg shadow-brand/25"
          >
            ثبت نهایی سفارش
          </Button>

          <p className="flex items-start gap-1.5 mt-3 text-[11px] leading-5 text-stone-400 dark:text-stone-500">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ارسال از کارگاه پولاریس؛ زمان تحویل بسته به شهر مقصد پس از تایید سفارش اعلام می‌شود.
          </p>
        </aside>
      </form>
    </div>
  );
};

export default CheckoutPage;
