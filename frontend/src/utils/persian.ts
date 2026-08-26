// Persian number and date helpers

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

// Convert Latin digits in a string/number to Persian digits (۰-۹)
export function toPersianDigits(num: number | string): string {
  if (num === undefined || num === null) return '';
  const str = String(num);
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

// Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits
function toAsciiDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

// Group a number in threes with ASCII ',' and render Persian digits.
// Accepts a number or a digit-string (any digit system, separators allowed).
// Returns '' for null/undefined/''/NaN/non-finite. Negatives get leading '-'.
export function formatGrouped(value: number | string): string {
  let raw: string;
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return '';
    // Spell out all digits: no exponent notation (1e21), no locale grouping
    raw = value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
  } else {
    raw = toAsciiDigits(String(value)).replace(/[،٬,\s]/g, '');
    if (raw.trim() === '') return '';
  }
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(raw.trim());
  if (!m || (m[2] === '' && !m[3])) return '';
  const sign = m[1] === '-' ? '-' : '';
  const intPart = m[2] === '' ? '0' : m[2];
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = m[3] ? `.${toPersianDigits(m[3])}` : '';
  return sign + toPersianDigits(grouped) + frac;
}

// Parse user-typed input (grouped, Persian or Arabic digits) to a number.
// Strips ',', '،' (U+060C), '٬' (U+066C) separators and spaces/tabs; converts
// Persian AND Arabic-Indic digits; treats '٫' (U+066B) as decimal point.
// Returns 0 for '', invalid or NaN. Preserves sign ('-۲,۰۰۰' → -2000);
// callers enforce bounds (e.g. stock >= 0) via min/max clamping.
export function parseGrouped(input: string): number {
  if (typeof input !== 'string') return 0;
  const cleaned = toAsciiDigits(input)
    .replace(/٫/g, '.')
    .replace(/[،٬,\s]/g, '');
  if (cleaned === '' || !/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(cleaned)) return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function formatToman(amount: number): string {
  const formatted = formatGrouped(Math.round(amount));
  return formatted === '' ? '۰ تومان' : `${formatted} تومان`;
}

export function formatNumber(num: number): string {
  const formatted = formatGrouped(num);
  return formatted === '' ? '۰' : formatted;
}

// Convert gregorian date to approximate Jalali representation
export function toJalaliDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    // Format using Intl DateTimeFormat for Persian calendar
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return String(dateInput);
  }
}

export function toJalaliDateTime(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return String(dateInput);
  }
}

export function getDaysDifference(targetDate: string | Date): number {
  const target = new Date(targetDate).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Convert number to Persian words (e.g. 15000000 -> پانزده میلیون)
export function numberToWordsPersian(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'صفر';
  if (num < 0) return `منفی ${numberToWordsPersian(Math.abs(num))}`;

  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) parts.push(hundreds[h]);

    if (remainder >= 10 && remainder <= 19) {
      parts.push(teens[remainder - 10]);
    } else {
      if (t > 0) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }

    return parts.join(' و ');
  }

  const groups: string[] = [];
  let temp = Math.floor(num);
  let scaleIndex = 0;

  while (temp > 0) {
    const groupVal = temp % 1000;
    if (groupVal > 0) {
      const groupWords = convertGroup(groupVal);
      const scaleWords = scales[scaleIndex] ? ` ${scales[scaleIndex]}` : '';
      groups.unshift(`${groupWords}${scaleWords}`);
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  return groups.join(' و ');
}

