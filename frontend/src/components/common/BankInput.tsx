import React from 'react';
import { CreditCard, Check, Building2 } from 'lucide-react';
export interface BankInfo {
  name: string;
  code: string;
  bin: string[];
  shebaCode: string;
  color: string;
  bgGradient: string;
  logoBg: string;
}

export const IRANIAN_BANKS: BankInfo[] = [
  {
    name: 'بانک ملت',
    code: 'mellat',
    bin: ['610433', '991975'],
    shebaCode: '012',
    color: '#E61C24',
    bgGradient: 'from-rose-950/40 to-stone-900',
    logoBg: 'bg-rose-600',
  },
  {
    name: 'بانک ملی ایران',
    code: 'melli',
    bin: ['603799', '170019'],
    shebaCode: '017',
    color: '#0083CA',
    bgGradient: 'from-sky-950/40 to-stone-900',
    logoBg: 'bg-sky-600',
  },
  {
    name: 'بانک صادرات ایران',
    code: 'saderat',
    bin: ['603769', '903769'],
    shebaCode: '019',
    color: '#1D3B8B',
    bgGradient: 'from-blue-950/40 to-stone-900',
    logoBg: 'bg-blue-700',
  },
  {
    name: 'بانک تجارت',
    code: 'tejarat',
    bin: ['585983', '627353'],
    shebaCode: '018',
    color: '#005BAA',
    bgGradient: 'from-blue-950/40 to-stone-900',
    logoBg: 'bg-blue-600',
  },
  {
    name: 'بانک سپه',
    code: 'sepah',
    bin: ['589210', '627381', '639599', '505801', '639370'],
    shebaCode: '015',
    color: '#E4A025',
    bgGradient: 'from-amber-950/40 to-stone-900',
    logoBg: 'bg-amber-600',
  },
  {
    name: 'بانک پاسارگاد',
    code: 'pasargad',
    bin: ['502229', '639347'],
    shebaCode: '057',
    color: '#F4B000',
    bgGradient: 'from-yellow-950/40 to-stone-900',
    logoBg: 'bg-amber-500',
  },
  {
    name: 'بانک سامان',
    code: 'saman',
    bin: ['621986'],
    shebaCode: '056',
    color: '#0097DA',
    bgGradient: 'from-cyan-950/40 to-stone-900',
    logoBg: 'bg-cyan-600',
  },
  {
    name: 'بانک پارسیان',
    code: 'parsian',
    bin: ['622106', '639194', '627884'],
    shebaCode: '054',
    color: '#701518',
    bgGradient: 'from-red-950/40 to-stone-900',
    logoBg: 'bg-red-800',
  },
  {
    name: 'بانک اقتصاد نوین',
    code: 'en',
    bin: ['627412'],
    shebaCode: '055',
    color: '#5C2D91',
    bgGradient: 'from-purple-950/40 to-stone-900',
    logoBg: 'bg-purple-700',
  },
  {
    name: 'بانک آینده',
    code: 'ayandeh',
    bin: ['636214'],
    shebaCode: '062',
    color: '#8A5832',
    bgGradient: 'from-amber-950/40 to-stone-900',
    logoBg: 'bg-amber-700',
  },
  {
    name: 'بانک قرض‌الحسنه رسالت',
    code: 'resalat',
    bin: ['504172'],
    shebaCode: '070',
    color: '#007A3E',
    bgGradient: 'from-emerald-950/40 to-stone-900',
    logoBg: 'bg-emerald-700',
  },
  {
    name: 'بانک قرض‌الحسنه مهر ایران',
    code: 'mehr',
    bin: ['606373'],
    shebaCode: '060',
    color: '#008752',
    bgGradient: 'from-emerald-950/40 to-stone-900',
    logoBg: 'bg-emerald-600',
  },
  {
    name: 'بانک رفاه کارگران',
    code: 'refah',
    bin: ['589463'],
    shebaCode: '013',
    color: '#0054A6',
    bgGradient: 'from-blue-950/40 to-stone-900',
    logoBg: 'bg-blue-600',
  },
  {
    name: 'بانک مسکن',
    code: 'maskan',
    bin: ['628023'],
    shebaCode: '014',
    color: '#F37023',
    bgGradient: 'from-orange-950/40 to-stone-900',
    logoBg: 'bg-orange-600',
  },
  {
    name: 'بانک کشاورزی',
    code: 'keshavarzi',
    bin: ['603770', '639217'],
    shebaCode: '016',
    color: '#9C7A14',
    bgGradient: 'from-yellow-950/40 to-stone-900',
    logoBg: 'bg-yellow-700',
  },
  {
    name: 'بانک شهر',
    code: 'shahr',
    bin: ['502806', '504706'],
    shebaCode: '061',
    color: '#D41426',
    bgGradient: 'from-rose-950/40 to-stone-900',
    logoBg: 'bg-rose-700',
  },
  {
    name: 'بانک سینا',
    code: 'sina',
    bin: ['639346'],
    shebaCode: '058',
    color: '#0D7E40',
    bgGradient: 'from-emerald-950/40 to-stone-900',
    logoBg: 'bg-emerald-700',
  },
  {
    name: 'بانک گردشگری',
    code: 'gardeshgari',
    bin: ['505416'],
    shebaCode: '064',
    color: '#282828',
    bgGradient: 'from-stone-900 to-stone-950',
    logoBg: 'bg-stone-800',
  },
  {
    name: 'بانک دی',
    code: 'day',
    bin: ['502938'],
    shebaCode: '066',
    color: '#00838F',
    bgGradient: 'from-teal-950/40 to-stone-900',
    logoBg: 'bg-teal-700',
  },
  {
    name: 'بانک ایران زمین',
    code: 'iz',
    bin: ['505785'],
    shebaCode: '069',
    color: '#5C2D91',
    bgGradient: 'from-purple-950/40 to-stone-900',
    logoBg: 'bg-purple-800',
  },
  {
    name: 'پست بانک ایران',
    code: 'post',
    bin: ['627760'],
    shebaCode: '021',
    color: '#008938',
    bgGradient: 'from-green-950/40 to-stone-900',
    logoBg: 'bg-green-700',
  },
];

// Helper to normalize digits
export const cleanDigits = (val: string): string => {
  if (!val) return '';
  return val
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^0-9]/g, '');
};

// Auto detect bank by 16-digit card BIN
export const detectBankByCard = (cardNumber: string): BankInfo | null => {
  const digits = cleanDigits(cardNumber);
  if (digits.length < 6) return null;
  const prefix = digits.substring(0, 6);
  return IRANIAN_BANKS.find((b) => b.bin.includes(prefix)) || null;
};

// Auto detect bank by Sheba (IBAN)
export const detectBankBySheba = (shebaNumber: string): BankInfo | null => {
  let clean = shebaNumber.toUpperCase().replace(/\s|-/g, '');
  if (clean.startsWith('IR')) {
    clean = clean.substring(2);
  }
  const digits = cleanDigits(clean);
  if (digits.length < 5) return null;
  const bankCode = digits.substring(2, 5);
  return IRANIAN_BANKS.find((b) => b.shebaCode === bankCode) || null;
};

// Format Card Number as XXXX - XXXX - XXXX - XXXX
export const formatCardNumber = (val: string): string => {
  const digits = cleanDigits(val).slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' - ');
};

// Format Sheba as IRXX - XXXX - XXXX - XXXX - XXXX - XXXX - XX
export const formatShebaNumber = (val: string): string => {
  let clean = val.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.startsWith('IR')) {
    clean = clean.substring(2);
  }
  clean = cleanDigits(clean).slice(0, 24);
  
  if (!clean) return '';
  
  const parts: string[] = [];
  parts.push(clean.slice(0, 2)); // Check digits
  for (let i = 2; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return `IR ${parts.join(' - ')}`;
};

interface BankCardInputProps {
  value: string;
  onChange: (formattedValue: string, detectedBankName: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const BankCardInput: React.FC<BankCardInputProps> = ({
  value,
  onChange,
  placeholder = '---- ---- ---- ----',
  label = 'شماره کارت بانکی (۱۶ رقمی)',
  disabled = false,
  required = false,
  className = '',
}) => {
  const detectedBank = detectBankByCard(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCardNumber(raw);
    const bank = detectBankByCard(formatted);
    onChange(formatted, bank ? bank.name : '');
  };

  const digits = cleanDigits(value);
  const isValidLength = digits.length === 16;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-[#CEAE80]" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {detectedBank ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#CEAE80]/15 text-[#CEAE80] border border-[#CEAE80]/30 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detectedBank.color }} />
            <span>{detectedBank.name}</span>
          </span>
        ) : digits.length >= 6 ? (
          <span className="text-[10px] text-amber-500 font-medium">بانک نامشخص</span>
        ) : null}
      </div>

      <div className="relative">
        <input
          type="text"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono tracking-wider text-center outline-none transition-all ${
            isValidLength
              ? 'border-emerald-500/50 focus:border-emerald-500'
              : 'focus:border-[#CEAE80]'
          }`}
          maxLength={25}
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {isValidLength && (
            <span className="text-emerald-500 text-xs font-bold">
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ShebaInputProps {
  value: string;
  onChange: (formattedValue: string, detectedBankName: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const ShebaInput: React.FC<ShebaInputProps> = ({
  value,
  onChange,
  placeholder = 'IR -- ---- ---- ---- ---- ---- --',
  label = 'شماره شبا (IBAN بیست و چهار رقمی)',
  disabled = false,
  required = false,
  className = '',
}) => {
  const detectedBank = detectBankBySheba(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatShebaNumber(raw);
    const bank = detectBankBySheba(formatted);
    onChange(formatted, bank ? bank.name : '');
  };

  const digits = cleanDigits(value.replace(/IR/i, ''));
  const isValidLength = digits.length === 24;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#CEAE80]" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {detectedBank ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#CEAE80]/15 text-[#CEAE80] border border-[#CEAE80]/30 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detectedBank.color }} />
            <span>{detectedBank.name}</span>
          </span>
        ) : digits.length >= 5 ? (
          <span className="text-[10px] text-amber-500 font-medium">بانک نامشخص</span>
        ) : null}
      </div>

      <div className="relative">
        <input
          type="text"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono tracking-wide text-center outline-none transition-all ${
            isValidLength
              ? 'border-emerald-500/50 focus:border-emerald-500'
              : 'focus:border-[#CEAE80]'
          }`}
          maxLength={35}
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {isValidLength && (
            <span className="text-emerald-500 text-xs font-bold">
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
