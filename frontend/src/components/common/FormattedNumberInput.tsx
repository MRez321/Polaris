import type * as React from "react";
import { PriceInput } from "../ui/price-input";
import { cn } from "@/lib/utils";

interface FormattedNumberInputProps {
  /** Current numeric value; null = empty field */
  value: number | null;
  /** Called with the raw number on every keystroke; null when emptied */
  onChange: (v: number | null) => void;
  placeholder?: string;
  /** Inline unit label rendered at inline-end inside the field (e.g. «تومان») */
  suffix?: string;
  className?: string;
  /** Clamped on blur by PriceInput */
  min?: number;
  max?: number;
  disabled?: boolean;
  /**
   * Accepted for call-site compatibility; intentionally a no-op.
   * PriceInput (persian-labs) is integer-only — quantities and Toman
   * amounts in Polaris are whole numbers, decimals are not parseable.
   */
  decimal?: boolean;
  id?: string;
}

// Glass look shared with the rest of the app; merged last onto the
// vendored Input primitive so these win over its shadcn defaults
// (rounded-lg/h-8/text-base → rounded-xl/auto/sm).
const FIELD_CLASSES =
  "h-auto w-full rounded-xl glass-input px-3 py-2 text-sm text-left font-mono outline-none focus:border-brand transition-colors";

/**
 * Thin wrapper over the vendored persian-labs PriceInput with the app-wide
 * locked prop shape. All parsing, live grouping («۲,۰۰۰,۰۰۰»), fa/ar digit
 * acceptance, caret management and min/max blur clamping live in PriceInput.
 * LTR wrapper so the suffix's inline-end lands after the number («۱۲۳ تومان»).
 */
export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  placeholder,
  suffix,
  className,
  min,
  max,
  disabled,
  id,
}) => {
  const field = (
    <PriceInput
      value={value}
      onValueChange={onChange}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      className={cn(FIELD_CLASSES, suffix && "pr-8", className)}
    />
  );

  if (!suffix) return field;

  return (
    <div dir="ltr" className="relative">
      {field}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-3 flex select-none items-center whitespace-nowrap text-xs text-stone-500 dark:text-stone-400"
      >
        {suffix}
      </span>
    </div>
  );
};
