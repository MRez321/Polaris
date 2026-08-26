import React, { createContext, useContext, useState } from 'react';

interface ThemeContextValue {
  isDarkMode: boolean;
  /** Viewport coords of the activating click; drives the circular reveal origin. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
}
type VTDocument = Document & { startViewTransition?: (update: () => void) => ViewTransitionLike };

/** Number of in-flight theme flips; `theme-switching` stays until all settle. */
let activeSwitches = 0;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('polaris_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const toggleTheme = (origin?: { x: number; y: number }) => {
    const next = !isDarkMode;
    const root = document.documentElement;
    // Freeze every per-element transition for the duration of the swap so
    // buttons/cards/borders snap to the new palette instead of tweening.
    root.classList.add('theme-switching');
    activeSwitches += 1;

    // Mutate the DOM synchronously — inside a ViewTransition callback React
    // state updates commit too late for the old/new snapshots.
    const apply = () => {
      root.classList.toggle('dark', next);
      root.classList.toggle('light', !next);
      try {
        localStorage.setItem('polaris_theme', next ? 'dark' : 'light');
      } catch {
        /* storage unavailable (private mode) — theme still applies for the session */
      }
      setIsDarkMode(next);
    };

    const finish = () => {
      activeSwitches -= 1;
      if (activeSwitches === 0) root.classList.remove('theme-switching');
    };

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = (document as VTDocument).startViewTransition;

    if (reducedMotion || typeof startViewTransition !== 'function') {
      // Hard cut: two frames is enough for the style recalc to flush.
      apply();
      requestAnimationFrame(() => requestAnimationFrame(finish));
      return;
    }

    // Circular reveal expanding from the toggle button.
    const vw = root.clientWidth;
    const vh = root.clientHeight;
    const x = origin?.x ?? vw / 2;
    const y = origin?.y ?? vh / 2;
    const radius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));

    const vt = startViewTransition.call(document, apply);

    vt.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 400,
            easing: 'cubic-bezier(0.33, 0, 0.15, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => {
        /* transition skipped (rapid re-toggle) — nothing to animate */
      });

    vt.finished.then(finish, finish);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
