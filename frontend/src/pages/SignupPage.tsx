import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Scissors, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { mapAuthError } from '@/lib/auth';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already authenticated → straight to the app.
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('نام و نام خانوادگی را وارد کنید');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('ایمیل معتبر وارد کنید');
      return;
    }
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }
    if (password !== confirm) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const err = await signUp(trimmedName, trimmedEmail, password);
      if (err) {
        const msg = mapAuthError(err);
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }
      toast.success('حساب کاربری شما ساخته شد؛ خوش آمدید');
      navigate('/', { replace: true });
    } catch {
      const msg = 'خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center font-sans px-4 transition-colors duration-200 overflow-hidden"
      dir="rtl"
    >
      {/* Subtle Ambient Glow Light Orbs for Glassmorphism depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#CEAE80] rounded-full blur-[140px] opacity-[0.14] dark:opacity-[0.12] transition-opacity" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-amber-600 rounded-full blur-[130px] opacity-[0.10] dark:opacity-[0.09] transition-opacity" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#A67C38] rounded-full blur-[150px] opacity-[0.10] dark:opacity-[0.08] transition-opacity" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-3xl border border-stone-200 dark:border-white/10 shadow-2xl p-8 space-y-6">
          {/* Brand */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#CEAE80] text-black flex items-center justify-center shadow-lg font-black ring-2 ring-[#CEAE80]/30">
              <Scissors className="w-7 h-7 -rotate-45 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-stone-900 dark:text-white">
                ایجاد حساب کاربری جدید
              </h1>
              <p className="text-xs text-stone-600 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
                ثبت‌نام در سامانه مدیریت کارگاه، امانات و حسابداری تولیدی پوشاک
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-name"
                className="block text-xs font-black text-stone-700 dark:text-gray-300"
              >
                نام و نام خانوادگی
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: رضا مرادی"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm outline-none focus:border-[#CEAE80] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-email"
                className="block text-xs font-black text-stone-700 dark:text-gray-300"
              >
                ایمیل
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-left outline-none focus:border-[#CEAE80] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-password"
                className="block text-xs font-black text-stone-700 dark:text-gray-300"
              >
                رمز عبور <span className="font-medium text-stone-400">(حداقل ۸ کاراکتر)</span>
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-left outline-none focus:border-[#CEAE80] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-confirm"
                className="block text-xs font-black text-stone-700 dark:text-gray-300"
              >
                تکرار رمز عبور
              </label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-left outline-none focus:border-[#CEAE80] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black text-sm shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{loading ? 'در حال ایجاد حساب...' : 'ثبت‌نام و ورود'}</span>
            </button>
          </form>

          <p className="text-[11px] text-stone-500 dark:text-gray-500 text-center font-medium leading-relaxed">
            حساب‌های جدید با نقش «کاربر» ایجاد می‌شوند؛ ارتقا به «مدیر» فقط توسط مدیر سیستم انجام می‌شود.
          </p>

          <p className="text-xs text-center text-stone-600 dark:text-gray-400 font-medium">
            قبلاً حساب کاربری دارید؟{' '}
            <Link
              to="/login"
              className="text-[#A67C38] dark:text-[#CEAE80] font-black hover:underline"
            >
              وارد شوید
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
