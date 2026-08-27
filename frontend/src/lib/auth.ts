import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';

// Same-origin client: the backend mounts better-auth at /api/auth and the
// Vite dev proxy forwards /api, so no baseURL override is needed.
//
// The server admin plugin (backend/src/config/auth.ts) works with the roles
// `admin` / `staff`. A standalone client would only infer the default
// `admin` | `user` roles, so the app's real roles are registered here to
// keep the admin endpoints (setRole, createUser, …) typed correctly.
export const authClient = createAuthClient({
  plugins: [
    adminClient({
      roles: {
        admin: adminAc,
        staff: userAc,
      },
    }),
  ],
});

// Map common better-auth (English) error messages to Persian copy.
// Already-Persian messages pass through untouched.
export function mapAuthError(message: string): string {
  if (/[\u0600-\u06FF]/.test(message)) return message;

  const m = message.toLowerCase();
  if (m.includes('already exists') || m.includes('taken')) {
    return 'این ایمیل قبلاً در سامانه ثبت شده است';
  }
  if (m.includes('invalid email') || m.includes('email is invalid')) {
    return 'ایمیل وارد شده معتبر نیست';
  }
  if (m.includes('password') && (m.includes('short') || m.includes('least') || m.includes('min'))) {
    return 'رمز عبور باید حداقل ۸ کاراکتر باشد';
  }
  if (m.includes('name') && (m.includes('required') || m.includes('short') || m.includes('least'))) {
    return 'نام و نام خانوادگی را به‌طور کامل وارد کنید';
  }
  if (m.includes('invalid email or password') || m.includes('invalid credentials')) {
    return 'ایمیل یا رمز عبور اشتباه است';
  }
  if (m.includes('email is not verified') || m.includes('not verified')) {
    return 'ایمیل شما هنوز تأیید نشده است';
  }
  if (m.includes('banned')) {
    return 'دسترسی شما توسط مدیر سیستم مسدود شده است';
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'تعداد تلاش‌ها بیش از حد است؛ چند لحظه صبر کنید';
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('connection')) {
    return 'خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید';
  }
  return 'خطا در انجام عملیات؛ لطفاً دوباره تلاش کنید';
}
