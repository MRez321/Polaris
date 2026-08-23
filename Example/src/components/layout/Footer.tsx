import React, { useState } from 'react';
import {
  ShieldCheck,
  Heart,
  Code2,
  FileText,
  Lock,
  Scissors,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { Modal } from '../common/Modal';

export const Footer: React.FC = () => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full mt-auto border-t border-black/5 dark:border-white/5 bg-stone-100/80 dark:bg-[#0E0E0E]/90 backdrop-blur-md transition-colors text-stone-700 dark:text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-black/5 dark:border-white/5 text-xs sm:text-sm">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#CEAE80] text-black flex items-center justify-center font-black shadow-md">
                <Scissors className="w-4 h-4 -rotate-45" />
              </div>
              <span className="font-black text-stone-900 dark:text-white text-base tracking-tight">
                سیستم مدیریت پولاریس
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#CEAE80]/20 text-[#CEAE80] font-bold border border-[#CEAE80]/30">
                نسخه ۲.۴.۰
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
              سامانه تخصصی مدیریت امانت کالا، انبارداری پوشاک، زنجیره تسویه فاکتورها، حسابداری راسته بازار و ارزیابی عملکرد فروشندگان خیابانی کارگاه دوزندگی پولاریس استایل.
            </p>
          </div>

          {/* Quick Legal Links */}
          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 dark:text-white text-xs uppercase tracking-wider">
              قوانین و امنیت داده‌ها
            </h5>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => setIsPrivacyOpen(true)}
                  className="hover:text-[#CEAE80] transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#CEAE80]" />
                  <span>حریم خصوصی و محرمانگی مالی</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-[#CEAE80] transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#CEAE80]" />
                  <span>شرایط و مقررات واگذاری امانی</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Developer & Copyright Info */}
          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 dark:text-white text-xs uppercase tracking-wider">
              طراحی و توسعه
            </h5>
            <div className="p-2.5 rounded-xl bg-stone-200/60 dark:bg-[#161616] border border-black/5 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-white">
                <Code2 className="w-4 h-4 text-[#CEAE80]" />
                <span>Developed by MRez</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                طراحی اختصاصی با فریم‌ورک React، Tailwind CSS و رابط مدرن شیشه‌ای (Glassmorphism)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <span>© {toPersianDigits(1405)} کلیه حقوق مادی و معنوی برای کارگاه دوزندگی پولاریس استایل محفوظ است.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[11px]">
              ساخته شده با <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> برای بازار پوشاک ایران
            </span>
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-[#CEAE80] hover:text-black transition-colors"
              title="بازگشت به بالای صفحه"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {isPrivacyOpen && (
        <Modal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
          title="سیاست حریم خصوصی و محرمانگی مالی کارگاه"
          subtitle="حفاظت از اطلاعات فروشندگان، اسناد ضمانت و تراکنش‌های مالی"
          maxWidth="lg"
        >
          <div className="space-y-3.5 text-xs text-stone-700 dark:text-stone-300 leading-relaxed text-right">
            <p>
              کلیه اطلاعات ثبت شده در سیستم مدیریت پولاریس شامل اطلاعات شناسنامه‌ای، شماره تماس‌ها، شماره حساب‌ها و اسناد ضمانت (سفته و چک‌های صیادی) فروشندگان امانی صرفاً جهت حسابداری داخلی کارگاه نگهداری شده و در هیچ سرور یا سرویس ثالثی به اشتراک گذاشته نمی‌شود.
            </p>
            <p>
              ثبت و ویرایش اطلاعات تحت لاگ‌های ممیزی دقیق ذخیره می‌گردد تا تاریخچه تمامی تغییرات قیمت، تحویل بار و دریافتی‌ها شفاف و قابل پیگیری باشد.
            </p>
            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setIsPrivacyOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#CEAE80] text-black font-bold text-xs"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Terms of Service Modal */}
      {isTermsOpen && (
        <Modal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          title="شرایط و مقررات واگذاری امانت پوشاک"
          subtitle="ضوابط تحویل بار، سقف اعتباری و تسویه حساب‌های راسته بازار"
          maxWidth="lg"
        >
          <div className="space-y-3.5 text-xs text-stone-700 dark:text-stone-300 leading-relaxed text-right">
            <p className="font-bold text-stone-900 dark:text-white">
              ۱. قاعده تخصیص تقدم تاریخی فاکتورها:
            </p>
            <p>
              هرگونه وجه واریزی یا نقدی از طرف فروشندگان مستقیماً و خودکار برای تسویه قدیمی‌ترین فاکتورهای دارای مانده بدهی تخصیص می‌یابد تا حساب‌های مالی شفاف و بدون ابهام بمانند.
            </p>
            <p className="font-bold text-stone-900 dark:text-white">
              ۲. مرجوعی کالا:
            </p>
            <p>
              مرجوعی پوشاک سالم ظرف مهلت مقرر مورد قبول بوده و مستقیماً از مانده فاکتور مربوطه کسر و به موجودی انبار بازگردانده می‌شود.
            </p>
            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setIsTermsOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#CEAE80] text-black font-bold text-xs"
              >
                تایید ضوابط
              </button>
            </div>
          </div>
        </Modal>
      )}
    </footer>
  );
};
