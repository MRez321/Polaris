/**
 * Custom brand-palette derivation — the single source of truth for the
 * color math. Plain UMD-style JS so every consumer shares one implementation:
 *
 *   1. `src/lib/theme/derivePalette.ts`  (typed facade; app code imports that)
 *   2. `index.html` pre-paint script      (plain <script src> — same file)
 *   3. ThemeSettingsPage live preview     (through the typed facade)
 *
 * Must stay dependency-free, ES5-safe, and browser/global-safe.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolarisPalette = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HEX_RE = /^#([0-9a-f]{6})$/;

  function normalizePrimaryColor(value) {
    return String(value).trim().toLowerCase();
  }

  function isValidPrimaryColor(value) {
    return HEX_RE.test(normalizePrimaryColor(value));
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    function to(v) {
      v = Math.round(Math.max(0, Math.min(255, v)));
      var s = v.toString(16);
      return s.length < 2 ? '0' + s : s;
    }
    return '#' + to(r) + to(g) + to(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    var d = max - min;
    var s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    var h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /** WCAG relative luminance (sRGB, threshold 0.04045). */
  function relLum(r, g, b) {
    function f(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function toHsl(hex) {
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return { h: hsl[0], s: hsl[1], l: hsl[2] };
  }

  function fromHsl(hsl) {
    var rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }

  /** Clamp lightness into [min, max], preserving hue/saturation. */
  function withL(hsl, min, max) {
    var l = Math.min(max, Math.max(min, hsl.l));
    return fromHsl({ h: hsl.h, s: hsl.s, l: l });
  }

  /** Shift lightness by a relative delta (e.g. -0.07), clamped to [0, 1]. */
  function shiftL(hsl, delta) {
    return fromHsl({ h: hsl.h, s: hsl.s, l: Math.min(1, Math.max(0, hsl.l + delta)) });
  }

  /** `color-mix(in srgb, hex whitePct%, white)` as a concrete hex. */
  function mixWhite(hex, whitePct) {
    var rgb = hexToRgb(hex);
    return rgbToHex(
      rgb[0] + (255 - rgb[0]) * whitePct,
      rgb[1] + (255 - rgb[1]) * whitePct,
      rgb[2] + (255 - rgb[2]) * whitePct,
    );
  }

  function derivePalette(primary) {
    var p = normalizePrimaryColor(primary);
    if (!isValidPrimaryColor(p)) {
      return DEFAULT_DERIVED;
    }
    var hsl = toHsl(p);

    var lightInk = hsl.l > 0.55 ? withL(hsl, 0.3, 0.48) : p;
    var darkInk = hsl.l < 0.4 ? withL(hsl, 0.55, 0.7) : p;

    var rgb = hexToRgb(p);
    var on = relLum(rgb[0], rgb[1], rgb[2]) < 0.35 ? '#ffffff' : '#000000';

    var common = {
      brand: p,
      brandHover: shiftL(hsl, -0.07),
      brandDeep: withL(hsl, 0, 0.42),
      brandOn: on,
      brandFaint: mixWhite(p, 0.35),
    };

    return {
      light: merge(common, { brandInk: lightInk }),
      dark: merge(common, { brandInk: darkInk }),
    };
  }

  function merge(base, extra) {
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var k2 in extra) out[k2] = extra[k2];
    return out;
  }

  var DEFAULT_DERIVED = {
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

  function roleDeclarations(roles, accentForeground) {
    return [
      '--brand: ' + roles.brand + ';',
      '--brand-ink: ' + roles.brandInk + ';',
      '--brand-hover: ' + roles.brandHover + ';',
      '--brand-deep: ' + roles.brandDeep + ';',
      '--brand-on: ' + roles.brandOn + ';',
      '--brand-faint: ' + roles.brandFaint + ';',
      '--primary: ' + roles.brand + ';',
      '--primary-foreground: ' + roles.brandOn + ';',
      '--ring: ' + roles.brand + ';',
      '--accent: color-mix(in srgb, ' + roles.brand + ' 18%, var(--background));',
      '--accent-foreground: ' + accentForeground + ';',
    ].join(' ');
  }

  function derivePaletteCss(primary) {
    var d = derivePalette(primary);
    return [
      'html:root {',
      '    ' + roleDeclarations(d.light, 'var(--foreground)'),
      '}',
      'html.dark {',
      '    ' + roleDeclarations(d.dark, 'var(--brand-faint)'),
      '}',
    ].join('\n');
  }

  return {
    normalizePrimaryColor: normalizePrimaryColor,
    isValidPrimaryColor: isValidPrimaryColor,
    derivePalette: derivePalette,
    derivePaletteCss: derivePaletteCss,
    DEFAULT_DERIVED: DEFAULT_DERIVED,
  };
});
