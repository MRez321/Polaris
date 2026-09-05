import React, { useState } from 'react';

interface SafeImageProps {
  src?: string;
  /** Name used for alt text AND initials fallback. */
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('');
}

/**
 * Image with graceful degradation: legacy rows may hold truncated base64 or
 * dead external URLs — those render as an initial-letter tile instead of a
 * broken-image glyph.
 */
export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className = '', fallbackClassName = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-brand/40 to-brand-deep/30 text-brand-deep dark:text-brand-faint font-black select-none ${className} ${fallbackClassName}`}
      >
        <span className="text-[0.6em] leading-none">{initialsOf(alt)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
