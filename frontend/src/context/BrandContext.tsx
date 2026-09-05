import React, { createContext, useContext, useEffect, useState } from 'react';

import { publicApi } from '@/lib/api';
import {
  DEFAULT_BRAND_THEME,
  derivePaletteCss,
  isValidPrimaryColor,
  normalizePrimaryColor,
  type BrandTheme,
} from '@/lib/theme/derivePalette';
import type { CompanyTheme, PublicCompanyInfo } from '@/types';

/** localStorage cache of the last seen server theme, written for the pre-paint script. */
const PALETTE_CACHE_KEY = 'polaris_palette';

const STYLE_ID = 'brand-palette';
const META_SELECTOR = 'meta[name="theme-color"]';

interface BrandContextValue {
  /** Public company branding (logo/name/tagline/contact) once fetched; null until then. */
  company: PublicCompanyInfo | null;
  /** Server theme normalized; falls back to defaults until the fetch resolves. */
  theme: BrandTheme;
  /** True once the server response (or its cached copy) has been applied. */
  isBrandReady: boolean;
}

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

function toBrandTheme(server?: CompanyTheme): BrandTheme {
  if (!server) return DEFAULT_BRAND_THEME;
  const defaultMode = server.defaultMode === 'light' ? 'light' : 'dark';
  if (server.palette?.type === 'custom') {
    const primary = normalizePrimaryColor(server.palette.primary);
    if (isValidPrimaryColor(primary)) {
      return { defaultMode, palette: { type: 'custom', primary } };
    }
  }
  return { defaultMode, palette: { type: 'default' } };
}

function readCache(): CompanyTheme | undefined {
  try {
    const raw = localStorage.getItem(PALETTE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CompanyTheme) : undefined;
  } catch {
    return undefined;
  }
}

/** Inject or remove the `<style id="brand-palette">` override stylesheet. */
function applyPalette(theme: BrandTheme): void {
  const existing = document.getElementById(STYLE_ID);
  if (theme.palette.type !== 'custom') {
    existing?.remove();
    return;
  }
  const css = derivePaletteCss(theme.palette.primary);
  if (existing) {
    existing.textContent = css;
  } else {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/** Keep the PWA status-bar tint in sync with the active brand fill. */
function applyMetaColor(theme: BrandTheme): void {
  const meta = document.querySelector<HTMLMetaElement>(META_SELECTOR);
  if (!meta) return;
  // Default palette: the static Gold value already in index.html is correct.
  meta.content = theme.palette.type === 'custom' ? theme.palette.primary : '#CEAE80';
}

/**
 * Apply the admin's default mode when the visitor has no explicit choice.
 * First-visit correction: the pre-paint script has no server data yet, so it
 * paints dark; once the fetch resolves, a choice-less visitor is flipped to
 * the admin's mode. Visitors who toggled (polaris_theme) are never touched.
 */
function applyDefaultMode(theme: BrandTheme): void {
  let hasChoice = false;
  try {
    const stored = localStorage.getItem('polaris_theme');
    hasChoice = stored === 'dark' || stored === 'light';
  } catch {
    /* storage unavailable — treat as no choice */
  }
  if (hasChoice) return;
  const isLight = theme.defaultMode === 'light';
  const root = document.documentElement;
  root.classList.toggle('dark', !isLight);
  root.classList.toggle('light', isLight);
}

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);
  const [theme, setTheme] = useState<BrandTheme>(() => toBrandTheme(readCache()));
  const [isBrandReady, setIsBrandReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = toBrandTheme(readCache());

    publicApi
      .company()
      .then((companyData) => {
        if (cancelled) return;
        const next = toBrandTheme(companyData.theme);
        setCompany(companyData);
        setTheme(next);
        setIsBrandReady(true);
        try {
          localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable — pre-paint just falls back to defaults */
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Offline/API down: the cached copy (already in state) stays applied.
        setTheme(cached);
        setIsBrandReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyPalette(theme);
    applyMetaColor(theme);
    if (isBrandReady) applyDefaultMode(theme);
  }, [theme, isBrandReady]);

  return (
    <BrandContext.Provider value={{ company, theme, isBrandReady }}>
      {children}
    </BrandContext.Provider>
  );
};

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
