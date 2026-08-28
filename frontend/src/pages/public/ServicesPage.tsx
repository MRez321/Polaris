import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  Gem,
  Hand,
  MessageCircle,
  Phone,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Reveal } from '@/components/public/Reveal';
import { SectionHeading } from '@/components/public/SectionHeading';
import tailoringPhoto from '@/assets/p3.png';
import repairPhoto from '@/assets/p4.png';

const SERVICES = [
  {
    icon: Ruler,
    title: 'دوخت شخصی کت و شلوار و پوشاک',
    photo: tailoringPhoto,
    photoAlt: 'دوخت شخصی در کارگاه پولاریس',
    description:
      'از صفر تا صد، برای تن شما: الگوی اختصاصی، پارچه انتخابی خودتان و حداقل یک جلسه پرو قبل از تحویل. کت و شلوار، کت تک، پیراهن، شلوار و مانتو با برش شخصی‌سازی‌شده.',
    bullets: [
      'اندازه‌گیری دقیق ۲۰ نقطه بدن و ثبت الگوی اختصاصی',
      'مشاوره انتخاب پارچه متناسب با فصل و کاربرد',
      'جلسه پرو میانی برای اصلاح برش و فیت',
      'تحویل با ضمانت اصلاح رایگان تا ۳۰ روز',
    ],
  },
  {
    icon: Scissors,
    title: 'تغییر سایز و پرو لباس',
    photo: null,
    photoAlt: '',
    description:
      'لباس آماده یا قدیمی که اندازه نیست را به تن شما برمی‌گردانیم: تنگ و گشاد کردن، کوتاه و بلند کردن، اصلاح سرشانه و کمر — بدون آسیب به فرم اصلی لباس.',
    bullets: [
      'تنگ و گشاد کردن کت، پیراهن، شلوار و دامن',
      'کوتاه کردن آستین و قد با حفظ دوخت اصلی',
      'اصلاح سرشانه و فیت کمر برای لباس‌های رسمی',
      'برآورد زمان و هزینه قبل از شروع کار',
    ],
  },
  {
    icon: Wrench,
    title: 'تعمیرات و رفو',
    photo: repairPhoto,
    photoAlt: 'تعمیرات و رفو لباس در پولاریس',
    description:
      'لباس‌های ارزشمند دور انداختنی نیستند: پارگی و سایش را رفو می‌کنیم، زیپ و آستر را تعویض می‌کنیم و جزئیات را زنده می‌کنیم تا سال‌های بیشتری بپوشید.',
    bullets: [
      'رفوی پارگی و سایش با نزدیک‌ترین بافت به پارچه',
      'تعویض زیپ، دکمه و آستر با متریال مرغوب',
      'ترمیم لبه‌ها و تقویت نقاط پرفشار',
      'مشاوره رایگان برای ارزیابی امکان تعمیر',
    ],
  },
];

const PROCESS_STEPS = [
  {
    icon: MessageCircle,
    step: '۱',
    title: 'مشاوره و اندازه‌گیری',
    description: 'نیاز، سلیقه و بودجه شما را می‌شنویم و اندازه‌های دقیق را ثبت می‌کنیم.',
  },
  {
    icon: Gem,
    step: '۲',
    title: 'انتخاب پارچه و برآورد',
    description: 'پارچه مناسب را انتخاب می‌کنید و برآورد شفاف هزینه و زمان می‌گیرید.',
  },
  {
    icon: Hand,
    step: '۳',
    title: 'دوخت و پرو',
    description: 'کار در کارگاه دوخته می‌شود و در جلسه پرو، فیت نهایی بررسی می‌شود.',
  },
  {
    icon: CalendarCheck,
    step: '۴',
    title: 'تحویل و ضمانت',
    description: 'لباس را تحویل می‌گیرید؛ تا ۳۰ روز هر اصلاحی لازم باشد رایگان است.',
  },
];

export const ServicesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page header */}
      <Reveal className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#CEAE80]/40 bg-[#CEAE80]/10 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black tracking-wide">
          <Scissors className="w-3.5 h-3.5 -rotate-45" />
          خدمات کارگاه پولاریس
        </span>
        <h1 className="mt-5 text-2xl sm:text-4xl font-black text-stone-900 dark:text-white">
          دوخت و خدماتی که <span className="text-[#A67C38] dark:text-[#CEAE80]">اندازه شماست</span>
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
          هر سفارش با مشاوره شروع می‌شود، با برآورد شفاف ادامه پیدا می‌کند و با ضمانت اصلاح تمام می‌شود.
          قیمت نهایی پس از بررسی کار اعلام می‌شود — بدون هزینه پنهان.
        </p>
      </Reveal>

      {/* Service blocks */}
      <div className="space-y-8 sm:space-y-10">
        {SERVICES.map((service, i) => {
          const Icon = service.icon;
          const reversed = i % 2 === 1;
          return (
            <Reveal key={service.title} delay={0.05}>
              <article className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm">
                {/* Visual / icon panel */}
                <div className={reversed ? 'lg:order-2' : ''}>
                  {service.photo ? (
                    <div className="rounded-3xl overflow-hidden border border-[#CEAE80]/25 shadow-lg">
                      <img
                        src={service.photo}
                        alt={service.photoAlt}
                        loading="lazy"
                        className="w-full h-56 sm:h-72 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative h-56 sm:h-72 rounded-3xl overflow-hidden border border-[#CEAE80]/25 bg-gradient-to-bl from-[#CEAE80]/25 via-[#CEAE80]/10 to-transparent flex items-center justify-center">
                      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#CEAE80]/25 rounded-full blur-3xl" aria-hidden />
                      <span className="relative w-24 h-24 rounded-[2rem] bg-[#CEAE80] flex items-center justify-center shadow-xl shadow-[#CEAE80]/30">
                        <Scissors className="w-12 h-12 text-black -rotate-45" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Copy */}
                <div className={reversed ? 'lg:order-1' : ''}>
                  <span className="w-12 h-12 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/25 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#A67C38] dark:text-[#CEAE80]" />
                  </span>
                  <h2 className="mt-4 text-lg sm:text-2xl font-black text-stone-900 dark:text-white leading-snug">
                    {service.title}
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm leading-7 text-stone-600 dark:text-stone-400">
                    {service.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#A67C38] dark:text-[#CEAE80]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/contact"
                    className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-xs sm:text-sm font-black shadow-md shadow-[#CEAE80]/25 transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    درخواست مشاوره برای این خدمت
                  </Link>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* Process */}
      <section className="mt-16 sm:mt-24">
        <SectionHeading
          eyebrow="روند کار"
          title="از مشاوره تا تحویل، در چهار قدم"
          subtitle="مسیر هر سفارش شفاف است؛ همیشه می‌دانید کار شما در کدام مرحله است."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.1}>
                <div className="relative h-full p-6 rounded-3xl bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm">
                  <span className="absolute top-5 left-5 text-3xl font-black text-[#CEAE80]/25 select-none" aria-hidden>
                    {step.step}
                  </span>
                  <span className="w-12 h-12 rounded-2xl bg-[#CEAE80]/15 border border-[#CEAE80]/25 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#A67C38] dark:text-[#CEAE80]" />
                  </span>
                  <h3 className="mt-4 text-sm sm:text-base font-black text-stone-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-[11px] sm:text-xs leading-6 text-stone-600 dark:text-stone-400">{step.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Guarantee band */}
      <Reveal className="mt-16 sm:mt-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#CEAE80]/35 bg-gradient-to-l from-[#CEAE80]/25 via-[#CEAE80]/12 to-transparent px-6 py-10 sm:px-12 sm:py-14 flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 bg-[#CEAE80]/25 rounded-full blur-3xl" aria-hidden />
          <span className="relative w-16 h-16 shrink-0 rounded-3xl bg-[#CEAE80] flex items-center justify-center shadow-lg shadow-[#CEAE80]/30">
            <ShieldCheck className="w-8 h-8 text-black" />
          </span>
          <div className="relative flex-1 text-center lg:text-right">
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white">ضمانت اصلاح رایگان تا ۳۰ روز</h2>
            <p className="mt-2 text-xs sm:text-sm leading-7 text-stone-600 dark:text-stone-400">
              اگر بعد از تحویل، فیت یا جزئیات لباس نیاز به اصلاح داشت، بدون هزینه اضافی انجام می‌دهیم.
              رضایت شما بخشی از کار است، نه خدمات پس از آن.
            </p>
          </div>
          <Link
            to="/contact"
            className="relative inline-flex items-center gap-2 h-12 px-7 rounded-2xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-lg shadow-[#CEAE80]/30 transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
          >
            شروع سفارش
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
};

export default ServicesPage;
