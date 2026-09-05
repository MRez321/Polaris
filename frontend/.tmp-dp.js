"use strict";
/**
 * Custom palette derivation.
 *
 * Default (Gold) lives as literals in index.css :root/.dark and never passes
 * through these formulas — the default look is exact by construction. This
 * module only runs for `{ type: 'custom', primary }` palettes: it derives the
 * brand role tokens from one admin-chosen color, in both light and dark mode.
 *
 * The same formulas are inlined (hand-copied) in frontend/index.html's
 * pre-paint script — keep them in sync. derivePaletteCss() is the shared
 * serializer both BrandContext and the ThemeSettingsPage preview use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPrimaryColor = exports.DEFAULT_BRAND_THEME = void 0;
exports.normalizePrimaryColor = normalizePrimaryColor;
exports.derivePalette = derivePalette;
exports.derivePaletteCss = derivePaletteCss;
exports.DEFAULT_BRAND_THEME = {
    defaultMode: 'dark',
    palette: { type: 'default' },
};
const HEX_RE = /^#([0-9a-f]{6})$/;
const isValidPrimaryColor = (value) => HEX_RE.test(value.trim().toLowerCase());
exports.isValidPrimaryColor = isValidPrimaryColor;
function normalizePrimaryColor(value) {
    return value.trim().toLowerCase();
}
/* ------------------------------------------------------------------ */
/* Color math (HSL-based; no dependencies)                             */
/* ------------------------------------------------------------------ */
function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
    const to = (v) => Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min)
        return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r)
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g)
        h = ((b - r) / d + 2) / 6;
    else
        h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
}
function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)
        [r, g, b] = [c, x, 0];
    else if (h < 120)
        [r, g, b] = [x, c, 0];
    else if (h < 180)
        [r, g, b] = [0, c, x];
    else if (h < 240)
        [r, g, b] = [0, x, c];
    else if (h < 300)
        [r, g, b] = [x, 0, c];
    else
        [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
/** WCAG relative luminance */
function relLum(r, g, b) {
    const f = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function toHsl(hex) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { h, s, l };
}
function fromHsl({ h, s, l }) {
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
}
/** Clamp lightness into [min, max], preserving hue/saturation. */
function withL(hsl, min, max) {
    const l = Math.min(max, Math.max(min, hsl.l));
    return fromHsl({ ...hsl, l });
}
/** Shift lightness by a relative delta (e.g. -0.07), clamped to [0, 1]. */
function shiftL(hsl, delta) {
    return fromHsl({ ...hsl, l: Math.min(1, Math.max(0, hsl.l + delta)) });
}
/** `color-mix(in srgb, hex whitePct%, white)` as a concrete hex (pre-paint needs real values). */
function mixWhite(hex, whitePct) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * whitePct, g + (255 - g) * whitePct, b + (255 - b) * whitePct);
}
/**
 * Derive all brand roles from a custom primary.
 *
 * Light mode keeps the primary as-is for `--brand` and darkens it for readable
 * accent text (`--brand-ink`) when it is too light; dark mode symmetrically
 * lightens it when too dark. `--brand-on` picks black/white ink by WCAG
 * relative luminance of the fill.
 */
function derivePalette(primary) {
    const p = normalizePrimaryColor(primary);
    if (!(0, exports.isValidPrimaryColor)(p))
        return DEFAULT_DERIVED;
    const hsl = toHsl(p);
    // Light mode: ink must be readable on the light page background.
    const lightInk = hsl.l > 0.55 ? withL(hsl, 0.3, 0.48) : p;
    // Dark mode: ink must be readable on the dark page background.
    const darkInk = hsl.l < 0.4 ? withL(hsl, 0.55, 0.7) : p;
    const [r, g, b] = hexToRgb(p);
    const on = relLum(r, g, b) < 0.35 ? '#ffffff' : '#000000';
    const common = {
        brand: p,
        brandHover: shiftL(hsl, -0.07),
        brandDeep: withL(hsl, 0, 0.42),
        brandOn: on,
        brandFaint: mixWhite(p, 0.35),
    };
    return {
        light: { ...common, brandInk: lightInk },
        dark: { ...common, brandInk: darkInk },
    };
}
const DEFAULT_DERIVED = {
    light: {
        brand: '#ceae80',
        brandInk: '#a67c38',
        brandHover: '#b59363',
        brandDeep: '#a67c38',
        brandOn: '#000000',
        brandFaint: '#f4e8d4',
    },
    dark: {
        brand: '#ceae80',
        brandInk: '#ceae80',
        brandHover: '#b59363',
        brandDeep: '#a67c38',
        brandOn: '#000000',
        brandFaint: '#f4e8d4',
    },
};
/* ------------------------------------------------------------------ */
/* CSS serialization (shared by BrandContext and ThemeSettingsPage)     */
/* ------------------------------------------------------------------ */
function roleDeclarations(roles, accentForeground) {
    return [
        `--brand: ${roles.brand};`,
        `--brand-ink: ${roles.brandInk};`,
        `--brand-hover: ${roles.brandHover};`,
        `--brand-deep: ${roles.brandDeep};`,
        `--brand-on: ${roles.brandOn};`,
        `--brand-faint: ${roles.brandFaint};`,
        `--primary: ${roles.brand};`,
        `--primary-foreground: ${roles.brandOn};`,
        `--ring: ${roles.brand};`,
        `--accent: color-mix(in srgb, ${roles.brand} 18%, var(--background));`,
        `--accent-foreground: ${accentForeground};`,
    ].join('\n    ');
}
/**
 * Build the full override stylesheet for a custom palette — the exact string
 * injected into `<style id="brand-palette">` (by BrandContext at runtime and
 * by the index.html pre-paint script before first paint).
 */
function derivePaletteCss(primary) {
    const { light, dark } = derivePalette(primary);
    return [
        `:root {`,
        `    ${roleDeclarations(light, 'var(--foreground)')}`,
        `}`,
        `.dark {`,
        `    ${roleDeclarations(dark, 'var(--brand-faint)')}`,
        `}`,
    ].join('\n');
}
