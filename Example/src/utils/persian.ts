// Persian number and date helpers

export function toPersianDigits(num: number | string): string {
  if (num === undefined || num === null) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function formatToman(amount: number): string {
  if (isNaN(amount)) return '۰ تومان';
  const formatted = Math.round(amount).toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

export function formatNumber(num: number): string {
  if (isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR');
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

