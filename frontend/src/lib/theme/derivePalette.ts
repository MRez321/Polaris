/**
 * Custom brand-palette derivation — typed facade over the shared plain-JS
 * module `public/derive-palette.js`.
 *
 * The raw-JS module is the single source of truth for the color math. It is
 * loaded once in `index.html` via a plain `<script src="/derive-palette.js">`
 * (before first paint, ahead of the app bundle) and attaches
 * `window.PolarisPalette`. Consumers:
 *
 *   1. the index.html pre-paint script (custom palette → no FOUC)
 *   2. BrandContext (applies the live palette after fetch)
 *   3. ThemeSettingsPage live preview (via this facade)
 *
 * Any formula change belongs in `public/derive-palette.js`, never here.
 */

export interface PaletteChoice {
  type: 'default';
}

export interface PaletteCustom {
  type: 'custom';
  /** '#rrggbb', lowercase */
  primary: string;
}

export type Palette = PaletteChoice | PaletteCustom;

export interface BrandTheme {
  defaultMode: 'dark' | 'light';
  palette: Palette;
}

export const DEFAULT_BRAND_THEME: BrandTheme = {
  defaultMode: 'dark',
  palette: { type: 'default' },
};

/* ------------------------------------------------------------------ */
/* Shared-module bridge (window.PolarisPalette from /derive-palette.js) */
/* ------------------------------------------------------------------ */

interface SharedRoles {
  brand: string;
  brandInk: string;
  brandHover: string;
  brandDeep: string;
  brandOn: string;
  brandFaint: string;
}

interface SharedDerived {
  light: SharedRoles;
  dark: SharedRoles;
}

declare global {
  interface Window {
    PolarisPalette?: {
      normalizePrimaryColor(value: string): string;
      isValidPrimaryColor(value: string): boolean;
      derivePalette(primary: string): SharedDerived;
      derivePaletteCss(primary: string): string;
    };
  }
}

function shared(): NonNullable<Window['PolarisPalette']> {
  const mod = window.PolarisPalette;
  if (!mod) throw new Error('PolarisPalette module missing — /derive-palette.js failed to load');
  return mod;
}

export const isValidPrimaryColor = (value: string): boolean =>
  shared().isValidPrimaryColor(value);

export function normalizePrimaryColor(value: string): string {
  return shared().normalizePrimaryColor(value);
}

/* ------------------------------------------------------------------ */
/* Role derivation                                                     */
/* ------------------------------------------------------------------ */

/** One custom primary resolved into the concrete role colors for a mode. */
export interface BrandRoles {
  brand: string;
  brandInk: string;
  brandHover: string;
  brandDeep: string;
  brandOn: string;
  brandFaint: string;
}

export interface DerivedPalette {
  /** Light mode roles */
  light: BrandRoles;
  /** Dark mode roles */
  dark: BrandRoles;
}

/** Type guard over the untyped shared-module result. */
function asRoles(value: unknown): BrandRoles {
  const v = value as Record<string, string>;
  return {
    brand: v.brand,
    brandInk: v.brandInk,
    brandHover: v.brandHover,
    brandDeep: v.brandDeep,
    brandOn: v.brandOn,
    brandFaint: v.brandFaint,
  };
}

/**
 * Derive all brand roles from a custom primary.
 *
 * Light mode keeps the primary as-is for `--brand` and darkens it for readable
 * accent text (`--brand-ink`) when it is too light; dark mode symmetrically
 * lightens it when too dark. `--brand-on` picks black/white ink by WCAG
 * relative luminance of the fill. Invalid input falls back to the default
 * Gold palette roles.
 */
export function derivePalette(primary: string): DerivedPalette {
  const { light, dark } = shared().derivePalette(primary);
  return { light: asRoles(light), dark: asRoles(dark) };
}

/* ------------------------------------------------------------------ */
/* CSS serialization (shared by BrandContext and ThemeSettingsPage)     */
/* ------------------------------------------------------------------ */

/**
 * Build the full override stylesheet for a custom palette — the exact string
 * injected into `<style id="brand-palette">` (by BrandContext at runtime and
 * by the index.html pre-paint script before first paint).
 */
export function derivePaletteCss(primary: string): string {
  return shared().derivePaletteCss(primary);
}
