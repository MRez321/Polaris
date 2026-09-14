import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Lock, ShieldCheck, ShieldOff, Copy, Download, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authClient, mapAuthError } from '@/lib/auth';
import { InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS } from '@/components/ui/input-otp';
import { toPersianDigits } from '@/lib/persian-date';

/**
 * P0-A-06 — self-service TOTP two-factor panel (workshop settings → security).
 *
 * Flow (better-auth twoFactor plugin, verified against 1.7.1 source):
 *  1. enable:  POST /two-factor/enable { password, method: 'totp' }
 *              → { totpURI, backupCodes } (2FA NOT yet active; twoFactor row
 *                stored unverified; twoFactorEnabled stays false)
 *  2. verify:  POST /two-factor/verify-totp { code } (session-scoped) — after
 *              one live code matches: twoFactor.verified=true and
 *              user.twoFactorEnabled=true. Until then login does NOT challenge.
 *  3. disable: POST /two-factor/disable { password } → flags cleared.
 *  4. new codes: POST /two-factor/generate-backup-codes { password } — the ONLY
 *              time codes are readable; stored encrypted server-side.
 *
 * QR is rendered client-side from the totpURI (qrcode.react) — the secret
 * never leaves the browser, no third-party image service.
 */
export const TwoFactorSettings: React.FC = () => {
  const { data: session } = authClient.useSession();
  const enabled = session?.user.twoFactorEnabled ?? false;

  type Step = 'idle' | 'password' | 'scan' | 'codes';
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Extracts the base32 secret from an otpauth:// URI for manual entry. */
  const secretFromUri = (uri: string): string => {
    try {
      const secret = new URL(uri).searchParams.get('secret');
      return secret ?? '';
    } catch {
      return '';
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error('کپی نشد؛ به‌صورت دستی انتخاب و کپی کنید');
    }
  };

  const downloadCodes = () => {
    const lines = backupCodes.join('\n');
    const blob = new Blob(
      [`Polaris backup codes\n${session?.user.email ?? ''}\n\n${lines}\n`],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polaris-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Step 1 → 2: password → server returns totpURI + backupCodes (unverified).
  const handleEnable = async () => {
    if (busy) return;
    if (!password) {
      setError('رمز عبور خود را وارد کنید');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await authClient.twoFactor.enable({
        password,
        method: 'totp',
        issuer: 'Polaris',
      });
      if (error || !data) {
        setError(mapAuthError(error?.message ?? ''));
        setBusy(false);
        return;
      }
      // Response shape: { method, totpURI, backupCodes }
      const resp = data as { totpURI?: string; backupCodes?: string[] };
      setTotpURI(resp.totpURI ?? '');
      setBackupCodes(Array.isArray(resp.backupCodes) ? resp.backupCodes : []);
      setPassword(''); // never keep the password around
      setStep('scan');
    } catch {
      setError('خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید');
    }
    setBusy(false);
  };

  // Step 2 → 3: live TOTP code confirms setup (flips twoFactorEnabled=true).
  const handleVerify = async () => {
    if (busy) return;
    if (verifyCode.length !== 6) {
      setError('کد ۶ رقمی برنامه احراز هویت را وارد کنید');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: verifyCode });
      if (error) {
        setError(mapAuthError(error.message ?? ''));
        setVerifyCode('');
        setBusy(false);
        return;
      }
      // Verified — session atom refreshes via the cookie set by the response;
      // the panel flips to the codes step, backup codes are shown ONCE here.
      setStep('codes');
    } catch {
      setError('خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید');
    }
    setBusy(false);
  };

  const handleDisable = async () => {
    if (busy) return;
    if (!password) {
      setError('برای غیرفعال‌سازی، رمز عبور خود را وارد کنید');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        setError(mapAuthError(error.message ?? ''));
        setBusy(false);
        return;
      }
      toast.success('ورود دومرحله‌ای غیرفعال شد');
      setPassword('');
      setStep('idle');
    } catch {
      setError('خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید');
    }
    setBusy(false);
  };

  const handleRegenerateCodes = async () => {
    if (busy) return;
    if (!password) {
      setError('برای تولید کدهای جدید، رمز عبور خود را وارد کنید');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error || !data) {
        setError(mapAuthError(error?.message ?? ''));
        setBusy(false);
        return;
      }
      const codes = (data as { backupCodes?: string[] }).backupCodes ?? [];
      setBackupCodes(Array.isArray(codes) ? codes : []);
      setPassword('');
      setStep('codes');
    } catch {
      setError('خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید');
    }
    setBusy(false);
  };

  const resetAll = () => {
    setStep('idle');
    setPassword('');
    setTotpURI('');
    setBackupCodes([]);
    setVerifyCode('');
    setError(null);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl border border-brand/30 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              enabled
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-stone-100 dark:bg-white/5 text-stone-500 border border-stone-200 dark:border-white/10'
            }`}
          >
            {enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
              ورود دومرحله‌ای (TWO-FACTOR)
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  enabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-500 border-stone-200 dark:border-white/10'
                }`}
              >
                {enabled ? 'فعال' : 'غیرفعال'}
              </span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              لایه محافظتی دوم با کد یک‌بارمصرف از برنامه احراز هویت (Google Authenticator و مشابه آن)
            </p>
          </div>
        </div>
      </div>

      {/* 2FA active — disable / regenerate */}
      {enabled && step !== 'codes' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-relaxed">
            ورود دومرحله‌ای برای حساب شما فعال است. هنگام ورود، پس از رمز عبور، کد تأیید از برنامه احراز هویت پرسیده می‌شود.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-2">
              <span className="text-xs font-black text-stone-700 dark:text-gray-300">تولید کدهای بازیابی جدید</span>
              <p className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
                کدهای قبلی باطل می‌شوند. رمز عبور لازم است.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                  dir="ltr"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg glass-input text-xs font-mono text-left outline-none focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={handleRegenerateCodes}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg bg-stone-800 dark:bg-white dark:text-black text-white text-xs font-black flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>تولید کدهای جدید</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">غیرفعال‌سازی ورود دومرحله‌ای</span>
              <p className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
                حساب شما تنها با رمز عبور محافظت می‌شود. توصیه می‌شود فعال نگه دارید.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                  dir="ltr"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg glass-input text-xs font-mono text-left outline-none focus:border-rose-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                  <span>غیرفعال‌سازی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA inactive — enable flow */}
      {!enabled && (step === 'idle' || step === 'password') && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
            ورود دومرحله‌ای فعال نیست. برای حساب‌های مدیریتی توصیه اکید می‌شود.
          </div>
          {step === 'idle' && (
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setError(null);
                setStep('password');
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>فعال‌سازی ورود دومرحله‌ای</span>
            </button>
          )}
          {step === 'password' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="mfa-password" className="block text-xs font-black text-stone-700 dark:text-gray-300">
                  تأیید با رمز عبور فعلی
                </label>
                <input
                  id="mfa-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-left outline-none focus:border-brand transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-on font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>ادامه</span>
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold text-sm transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: scan QR + verify live code */}
      {step === 'scan' && (
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#161618] border border-stone-200 dark:border-white/5 space-y-4">
            <p className="text-xs font-bold text-stone-700 dark:text-gray-300 leading-relaxed">
              ۱. برنامه احراز هویت را روی گوشی خود نصب کنید (Google Authenticator، Authy و مشابه آن)
              <br />
              ۲. کد QR زیر را اسکن کنید یا کلید را دستی وارد کنید
              <br />
              ۳. کد ۶ رقمی نمایش‌داده‌شده در برنامه را در پایین وارد کنید
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm shrink-0" dir="ltr">
                {totpURI ? (
                  <QRCodeSVG value={totpURI} size={168} level="M" />
                ) : (
                  <div className="w-[168px] h-[168px] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400 block">
                  ورود دستی کلید (در صورت عدم امکان اسکن):
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 text-xs font-mono text-left break-all" dir="ltr">
                    {secretFromUri(totpURI)}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(secretFromUri(totpURI), 'کلید کپی شد')}
                    className="p-2 rounded-lg bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-xs font-black text-stone-700 dark:text-gray-300">
              کد ۶ رقمی برنامه را وارد کنید تا فعال‌سازی نهایی شود:
            </span>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={verifyCode}
                onChange={setVerifyCode}
                disabled={busy}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={busy || verifyCode.length !== 6}
                className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-on font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>تأیید و فعال‌سازی</span>
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold text-sm transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: backup codes — shown exactly once */}
      {step === 'codes' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <p className="text-xs font-black text-amber-700 dark:text-amber-300">
              این کدها فقط یک‌بار نمایش داده می‌شوند — در جای امنی ذخیره کنید
            </p>
            <p className="text-[11px] text-stone-500 dark:text-gray-400 leading-relaxed">
              هر کد یک‌بار مصرف است و هنگام از دست دادن گوشی، جایگزین کد تأیید می‌شود.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" dir="ltr">
            {backupCodes.map((code) => (
              <code
                key={code}
                className="px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 text-xs font-mono text-center select-all"
              >
                {code}
              </code>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(backupCodes.join('\n'), 'کدهای بازیابی کپی شد')}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
              <span>کپی همه کدها</span>
            </button>
            <button
              type="button"
              onClick={downloadCodes}
              className="px-4 py-2.5 rounded-xl bg-stone-800 dark:bg-white dark:text-black text-white font-black text-sm flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل متنی</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetAll();
                toast.success('ورود دومرحله‌ای با موفقیت فعال شد');
              }}
              className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold text-sm transition-colors"
            >
              تمام شد
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Password-field note: shown while regenerating or disabling */}
      {enabled && step !== 'codes' && (
        <p className="text-[11px] text-stone-400 dark:text-gray-500 text-center">
          کدهای بازیابی: {toPersianDigits(String(backupCodes.length > 0 ? backupCodes.length : 10))} کد یک‌بارمصرف
        </p>
      )}
    </div>
  );
};
