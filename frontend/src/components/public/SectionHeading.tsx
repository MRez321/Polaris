import React from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/public/Reveal';

interface SectionHeadingProps {
  /** Small gold eyebrow text above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  className?: string;
}

/** Consistent marketing section heading: gold eyebrow, bold title, muted subtitle. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}) => (
  <Reveal
    className={cn(
      'mb-10 sm:mb-14 max-w-2xl',
      align === 'center' ? 'mx-auto text-center' : 'text-right',
      className
    )}
  >
    {eyebrow && (
      <span className="inline-flex items-center gap-2 text-brand-ink text-xs sm:text-sm font-black tracking-widest mb-3">
        <span className="w-8 h-px bg-brand/60" />
        {eyebrow}
        {align === 'center' && <span className="w-8 h-px bg-brand/60" />}
      </span>
    )}
    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-white leading-snug">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-sm sm:text-base leading-7 text-stone-600 dark:text-stone-400">
        {subtitle}
      </p>
    )}
  </Reveal>
);
