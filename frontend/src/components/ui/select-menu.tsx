import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * SelectMenu — a form-select replacement built entirely on the persian-labs
 * DropdownMenu component (https://ui.persian-labs.ir/docs/components/dropdown-menu).
 *
 * Unlike a native <select>, each option can render rich, color-coded content
 * (badges, amounts, codes) via the `label` ReactNode, so mixed info like
 * money, codes and locations stays visually distinct instead of one long text.
 */

export interface SelectMenuOption {
  value: string;
  /** Rich content shown inside the menu item. */
  label: React.ReactNode;
  /** Compact content shown on the closed trigger (falls back to `label`). */
  triggerLabel?: React.ReactNode;
  disabled?: boolean;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  /** Width/layout classes for the trigger wrapper (default: w-full). */
  className?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید…',
  className,
  contentClassName,
  align = 'start',
}) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [minWidth, setMinWidth] = React.useState<number>(0);
  const selected = options.find((o) => o.value === value);

  return (
    <div ref={wrapperRef} className={cn('w-full', className)}>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open && wrapperRef.current) {
            setMinWidth(wrapperRef.current.offsetWidth);
          }
        }}
      >
        <DropdownMenuTrigger
          className="group flex w-full items-center justify-between gap-2 rounded-xl glass-input px-3 py-2 text-xs sm:text-sm outline-none cursor-pointer text-right"
        >
          <span className="min-w-0 flex-1 truncate">
            {selected ? (
              selected.triggerLabel ?? selected.label
            ) : (
              <span className="text-stone-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-stone-400 transition-transform duration-200 group-data-[popup-open]:rotate-180 group-data-[popup-open]:text-[#CEAE80]" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          sideOffset={6}
          className={cn('max-h-72 overflow-y-auto p-1.5', contentClassName)}
          style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <DropdownMenuItem
                key={opt.value}
                disabled={opt.disabled}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'justify-between gap-2 rounded-lg px-2.5 py-2 text-xs sm:text-sm',
                  isSelected &&
                    'bg-[#CEAE80]/15 text-stone-900 dark:bg-[#CEAE80]/20 dark:text-[#F4E8D4]'
                )}
              >
                <span className="min-w-0 flex-1">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0 text-[#A67C38] dark:text-[#CEAE80]" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * Visual vocabulary for rich option content
 * ------------------------------------------------------------------------- */

export type SelectBadgeTone =
  | 'gold'
  | 'green'
  | 'red'
  | 'blue'
  | 'violet'
  | 'amber'
  | 'neutral';

const badgeTones: Record<SelectBadgeTone, string> = {
  gold: 'bg-[#CEAE80]/15 text-[#A67C38] dark:text-[#CEAE80] border-[#CEAE80]/40',
  green:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  red: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  violet:
    'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
  amber:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  neutral:
    'bg-stone-500/10 text-stone-600 dark:text-stone-300 border-stone-500/25',
};

/** Small color-coded pill used to tag one piece of info (money, code, …). */
export const SelectBadge: React.FC<{
  tone?: SelectBadgeTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap leading-none',
      badgeTones[tone],
      className
    )}
  >
    {children}
  </span>
);

/**
 * Standard rich-option layout: bold primary text + row of color-coded badges
 * + optional muted subtitle. Keeps each piece of info visually distinct.
 */
export const SelectOptionContent: React.FC<{
  primary: React.ReactNode;
  badges?: React.ReactNode;
  subtitle?: React.ReactNode;
}> = ({ primary, badges, subtitle }) => (
  <span className="flex flex-col gap-1 py-0.5">
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-bold">{primary}</span>
      {badges}
    </span>
    {subtitle && (
      <span className="text-[10px] text-stone-500 dark:text-stone-400">
        {subtitle}
      </span>
    )}
  </span>
);

/* ---------------------------------------------------------------------------
 * Persian color names → CSS colors (for swatch previews)
 * ------------------------------------------------------------------------- */

const persianColorMap: Record<string, string> = {
  'مشکی': '#1C1917',
  'سیاه': '#1C1917',
  'سفید': '#FFFFFF',
  'سرمه‌ای': '#1E3A5F',
  'طوسی': '#9CA3AF',
  'خاکستری': '#9CA3AF',
  'قرمز': '#DC2626',
  'آبی': '#2563EB',
  'سبز': '#16A34A',
  'زرد': '#EAB308',
  'قهوه‌ای': '#78350F',
  'کرم': '#F5F0DC',
  'بژ': '#E8DCC0',
  'عسلی': '#D4A24E',
  'نارنجی': '#EA580C',
  'بنفش': '#7C3AED',
  'صورتی': '#EC4899',
  'شرابی': '#7F1D1D',
  'یشمی': '#0F766E',
  'خاکی': '#8B7355',
};

/** Resolve a Persian color name to a CSS color for swatch rendering. */
export function persianColorToCss(name: string): string {
  return persianColorMap[name] ?? '#A8A29E';
}
