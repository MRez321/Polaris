import React from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Entrance animation wrapper: children fade in and slide up the first time
 * they scroll into view. `once: true` keeps the page calm after the reveal.
 */

const variants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] },
  }),
};

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  className?: string;
  /** Render as a different element (default: div). */
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className, as = 'div' }) => {
  const Component = motion[as];
  return (
    <Component
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      custom={delay}
    >
      {children}
    </Component>
  );
};
