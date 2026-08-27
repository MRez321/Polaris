import { normalizePersianDigits } from '@/lib/normalize-persian-digits';

/**
 * Iranian contact-number rules: exactly 11 digits starting with 0.
 * Covers mobiles (09103205228) and landlines (02536606060).
 */
export const PHONE_ERROR = 'شماره تماس باید ۱۱ رقم و با صفر شروع شود (مانند ۰۹۱۰۳۲۰۵۲۲۸)';

/** National code (کد ملی) is exactly 10 digits. */
export const NATIONAL_CODE_ERROR = 'کد ملی باید دقیقاً ۱۰ رقم باشد';

/**
 * Normalize a phone input: trim, convert Persian/Arabic digits to Latin,
 * strip spaces, dashes and parentheses so typed variants all compare equal.
 */
export function normalizePhoneInput(value: string): string {
  return normalizePersianDigits(value).replace(/[\s\-()]/g, '').trim();
}

/** Valid Iranian phone: 11 digits, leading 0 (mobile or landline). */
export function isValidIranPhone(value: string): boolean {
  return /^0\d{10}$/.test(normalizePhoneInput(value));
}

/**
 * Normalize a pure-digit input (national codes): trim, convert
 * Persian/Arabic digits to Latin and strip spaces.
 */
export function normalizeDigitsInput(value: string): string {
  return normalizePersianDigits(value).replace(/\s/g, '').trim();
}

/** Valid national code: exactly 10 Latin digits after normalization. */
export function isValidNationalCode(value: string): boolean {
  return /^\d{10}$/.test(normalizeDigitsInput(value));
}
