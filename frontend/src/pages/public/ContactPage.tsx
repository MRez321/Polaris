import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Globe,
  Camera,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import type { PublicCompanyInfo } from '@/types';
import { publicApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/public/Reveal';
import { cn } from '@/lib/utils';

interface FormErrors {
  name?: string;
  phone?: string;
  message?: string;
}

/** Iranian mobile/landline check: 10–11 digits, optionally starting with 0. */
const isValidPhone = (value: string) => /^0?\d{10,11}$/.test(value.replace(/[\s-]/g, ''));

export const ContactPage: React.FC = () => {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .company()
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch(() => {
        /* Info cards fall back to defaults when the API is unreachable. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (name.trim().length < 2) next.name = 'لطفاً نام خود را وارد کنید.';
    if (!isValidPhone(phone)) next.phone = 'شماره تماس معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).';
    if (message.trim().length < 10) next.message = 'پیام باید حداقل ۱۰ حرف باشد.';
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Client-side only: no persistence endpoint exists yet, so we confirm
    // receipt honestly and point to direct contact channels.
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const phoneHref = (value: string) => `tel:${value.replace(/[^\d+]/g, '')}`;
  const instagramHref = (value: string) =>
    value.startsWith('http') ? value : `https://instagram.com/${value.replace(/^@/, '')}`;
  const telegramHref = (value: string) =>
    value.startsWith('http') ? value : `https://t.me/${value.replace(/^@/, '')}`;

  const companyPhone = company?.phone?.trim();
  const companySecondary = company?.secondaryPhone?.trim();
  const companyAddress = company?.address?.trim();
  const companyInstagram = company?.instagram?.trim();
  const companyTelegram = company?.telegram?.trim();
  const companyWebsite = company?.website?.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page header */}
      <Reveal className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#CEAE80]/40 bg-[#CEAE80]/10 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black tracking-wide">
          <Phone className="w-3.5 h-3.5" />
          تماس با پولاریس استایل
        </span>
        <h1 className="mt-5 text-2xl sm:text-4xl font-black text-stone-900 dark:text-white">
          صحبت با ما، <span className="text-[#A67C38] dark:text-[#CEAE80]">شروع هر سفارش</span>
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
          برای مشاوره دوخت، استعلام قیمت یا هر پرسش دیگری، فرم را پر کنید یا مستقیم تماس بگیرید.
        </p>
      </Reveal>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* ============================ FORM ============================ */}
        <Reveal className="lg:col-span-3" delay={0.05}>
          <div className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm">
            {submitted ? (
              <div className="py-10 text-center space-y-4">
                <span className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </span>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                  پیام شما آماده است، {name.trim()} عزیز
                </h2>
                <p className="text-xs sm:text-sm leading-7 text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                  از وقتی گذاشتید سپاس‌گزاریم. برای پیگیری سریع‌تر، مستقیم با شماره‌های زیر تماس بگیرید؛
                  همکاران ما شنبه تا پنجشنبه، ۹ صبح تا ۹ شب پاسخ‌گو هستند.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {companyPhone && (
                    <a
                      href={phoneHref(companyPhone)}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-md shadow-[#CEAE80]/25 transition-all active:scale-95"
                    >
                      <Phone className="w-4 h-4" />
                      تماس: {toPersianDigits(companyPhone)}
                    </a>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setPhone('');
                      setMessage('');
                      setErrors({});
                    }}
                    className="h-11 px-6 rounded-2xl text-sm font-black"
                  >
                    ارسال پیام جدید
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                  فرم تماس
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-black">نام و نام خانوادگی</Label>
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلاً: سارا محمدی"
                      className={cn('h-11 rounded-xl text-sm', errors.name && 'border-rose-500 focus-visible:ring-rose-500/30')}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="text-[11px] font-bold text-rose-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone" className="text-xs font-black">شماره تماس</Label>
                    <Input
                      id="contact-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                      inputMode="tel"
                      dir="ltr"
                      className={cn('h-11 rounded-xl text-sm text-left', errors.phone && 'border-rose-500 focus-visible:ring-rose-500/30')}
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && <p className="text-[11px] font-bold text-rose-500">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-xs font-black">پیام شما</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="مثلاً: برای دوخت یک کت و شلوار فاستونی مشکی، اواخر هفته وقت پرو می‌خواهم…"
                    rows={5}
                    className={cn('rounded-xl text-sm leading-7', errors.message && 'border-rose-500 focus-visible:ring-rose-500/30')}
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && <p className="text-[11px] font-bold text-rose-500">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-md shadow-[#CEAE80]/25"
                >
                  {!submitting && <Send className="w-4 h-4" />}
                  {submitting ? 'در حال ثبت…' : 'ثبت پیام'}
                </Button>
              </form>
            )}
          </div>
        </Reveal>

        {/* ========================= CONTACT INFO ========================= */}
        <div className="lg:col-span-2 space-y-4">
          <Reveal delay={0.1}>
            <div className="p-6 rounded-3xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-[#CEAE80]" />
                راه‌های ارتباطی
              </h2>

              <ul className="space-y-3.5">
                {companyPhone && (
                  <li>
                    <a href={phoneHref(companyPhone)} className="flex items-center gap-3 group">
                      <span className="w-10 h-10 rounded-xl bg-[#CEAE80]/12 border border-[#CEAE80]/25 flex items-center justify-center shrink-0">
                        <Phone className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[10px] font-bold text-stone-500 dark:text-stone-400">تلفن کارگاه</span>
                        <span dir="ltr" className="block text-sm font-black text-stone-800 dark:text-stone-100 group-hover:text-[#A67C38] dark:group-hover:text-[#CEAE80] transition-colors">
                          {toPersianDigits(companyPhone)}
                        </span>
                      </span>
                    </a>
                  </li>
                )}
                {companySecondary && (
                  <li>
                    <a href={phoneHref(companySecondary)} className="flex items-center gap-3 group">
                      <span className="w-10 h-10 rounded-xl bg-[#CEAE80]/12 border border-[#CEAE80]/25 flex items-center justify-center shrink-0">
                        <Phone className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[10px] font-bold text-stone-500 dark:text-stone-400">تلفن دوم</span>
                        <span dir="ltr" className="block text-sm font-black text-stone-800 dark:text-stone-100 group-hover:text-[#A67C38] dark:group-hover:text-[#CEAE80] transition-colors">
                          {toPersianDigits(companySecondary)}
                        </span>
                      </span>
                    </a>
                  </li>
                )}
                {companyAddress && (
                  <li className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#CEAE80]/12 border border-[#CEAE80]/25 flex items-center justify-center shrink-0">
                      <MapPin className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-1">آدرس کارگاه</span>
                      <span className="block text-xs font-bold leading-6 text-stone-800 dark:text-stone-100">{companyAddress}</span>
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#CEAE80]/12 border border-[#CEAE80]/25 flex items-center justify-center shrink-0">
                    <Clock className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-1">ساعات کاری</span>
                    <span className="block text-xs font-bold leading-6 text-stone-800 dark:text-stone-100">
                      شنبه تا پنجشنبه، ۹ صبح تا ۹ شب
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </Reveal>

          {/* Socials */}
          {(companyInstagram || companyTelegram || companyWebsite) && (
            <Reveal delay={0.15}>
              <div className="p-6 rounded-3xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm space-y-4">
                <h2 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#CEAE80]" />
                  ما را دنبال کنید
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {companyInstagram && (
                    <a
                      href={instagramHref(companyInstagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-stone-200 dark:border-white/10 text-xs font-black text-stone-700 dark:text-stone-200 hover:border-[#CEAE80]/60 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      اینستاگرام
                    </a>
                  )}
                  {companyTelegram && (
                    <a
                      href={telegramHref(companyTelegram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-stone-200 dark:border-white/10 text-xs font-black text-stone-700 dark:text-stone-200 hover:border-[#CEAE80]/60 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      تلگرام
                    </a>
                  )}
                  {companyWebsite && (
                    <a
                      href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-stone-200 dark:border-white/10 text-xs font-black text-stone-700 dark:text-stone-200 hover:border-[#CEAE80]/60 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-all active:scale-95"
                    >
                      <Globe className="w-4 h-4" />
                      وب‌سایت
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          )}

          {/* Map placeholder / address highlight */}
          <Reveal delay={0.2}>
            <div className="relative overflow-hidden p-6 rounded-3xl border border-[#CEAE80]/30 bg-gradient-to-bl from-[#CEAE80]/20 via-[#CEAE80]/8 to-transparent">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#CEAE80]/25 rounded-full blur-3xl" aria-hidden />
              <p className="relative text-xs font-black text-[#A67C38] dark:text-[#CEAE80] mb-2">مراجعه حضوری</p>
              <p className="relative text-sm font-black leading-7 text-stone-800 dark:text-stone-100">
                {companyAddress || 'برای دریافت آدرس کارگاه با ما تماس بگیرید.'}
              </p>
              <p className="relative mt-3 text-[11px] font-bold leading-6 text-stone-600 dark:text-stone-400">
                برای جلسه اندازه‌گیری و پرو، هماهنگی قبلی تلفنی کافی است.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
