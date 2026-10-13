/**
 * FormField — Polaris management-form field primitive.
 *
 * A thin, accessible wrapper around a single form control: label (with
 * required marker), the control itself (slotted), and an optional hint/error
 * line. Wires up aria-describedby / aria-invalid so screen readers announce
 * errors and hints without the consumer having to repeat the plumbing.
 *
 * Conventions (from the Polaris UI checklist):
 *  - Persian labels; RTL layout; ASCII digits live in the slotted control.
 *  - Dark-mode aware via Tailwind `dark:` variants.
 *  - Error state uses the shared rose tone (red/rose = errors in Polaris).
 *
 * Usage:
 *   <FormField id="name" label="نام کالا" required error={errors.name} hint="حداکثر ۱۰۰ کاراکتر">
 *     <Input ... />
 *   </FormField>
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** Matches the slotted control's `id`. */
  id: string;
  label: string;
  /** Renders a red asterisk and marks the control required. */
  required?: boolean;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Persian error message; renders an error line and invalid state. */
  error?: string;
  /** The form control (Input, SelectMenu, textarea, etc.). */
  children: React.ReactElement;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className,
}) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  // Inject accessibility wiring into the slotted control. We only touch keys
  // the consumer is unlikely to override; explicit consumer values win.
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': !!error || undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-stone-800 dark:text-stone-200 select-none">
        {label}
        {required && (
          <span aria-hidden="true" className="text-rose-600 dark:text-rose-400">
            *
          </span>
        )}
      </label>

      {child}

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"
        >
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={hintId} className="text-xs text-stone-500 dark:text-gray-400">
          {hint}
        </span>
      )}
    </div>
  );
};
