# Theme Settings & Avatar Concentric Fix — Design Spec

- Status: APPROVED design (in-chat review 2026-09-04) + self-review pass — pending user spec review
- Classification: architectural (design-token system migration + persistence + public API surface)
- Task ordering: Task A (this spec). Task B (workshop seed script) follows separately.

## Problem

1. **No theme customization.** The gold palette is hardcoded in two layers: semantic
   utilities (already var-driven via `@theme inline` — `--primary`, `--ring`, `--accent`)
   and ~70 files of arbitrary-value hex classes plus raw `rgba(206,174,128,…)` inside
   `index.css` glass utilities — invisible to any runtime CSS-var override. No admin UI
   exists to change palette, logo, brand name, or tagline; `PublicHeader`/`PublicFooter`
   hardcode `@/assets/logo.png` + «پولاریس استایل» + «فروشگاه پوشاک».
2. **Avatar non-concentric on mobile.** `UserAvatar` (`UserMenu.tsx:38-64`): the image
   variant has `border-2 border-[#F8F7F4] dark:border-[#16161a]` inside the 2.5px
   gradient ring; the initials variant has no border, so its disc is 4px larger and
   merges into the ring — reads off-center at the 32px header size with the name hidden
   below `sm`.

## Goals

- Admin picks one custom color → the whole site re-themes, in dark and light, including
  shadcn semantic utilities, glass utilities, scrollbar, selection, gradients, and the
  avatar ring — across public site, workshop, and control panel (shared components).
- Logo upload + brand name + tagline configurable; **public** surfaces bind fetched
  values with today's hardcoded values as fallbacks.
- Zero palette flash on first paint.
- Default palette visually identical to today — guaranteed structurally (see Strategy).
- Perfectly concentric avatar ring in both variants.
- All new frontend copy Persian (fa-IR, RTL).

## Non-Goals

- Presets — rejected in design review; custom color picker + reset only.
- Rebranding internal workshop **copy** (sidebar/login/receipt text) — brand name/tagline
  bind public surfaces only. (Palette color still applies workshop-wide; see Scope.)
- Fixing the workshop SettingsManager branding tab's session-only persistence
  (pre-existing bug, separate concern).
- Touching `index.html` SEO/OG/JSON-LD metas and `usePageMeta`'s static `SITE_NAME`.
- Adding a test runner (none exists in the repo — vitest for one pure function is
  scope creep; derivation verified by one-off script + browser).
- New tables/migrations. Task B (`seed-workshop.js`) is unaffected by this spec.

## Decision Record

| Decision | Choice | Rationale |
|---|---|---|
| Palette mechanism | Token migration | Runtime hex-override generation is fragile: escaped class names, opacity/`dark:`/`hover:` variants, and raw-rgba shadows each need bespoke rules and break silently on refactor. Migration is one mechanical rewrite with permanent payoff. |
| UI location | New `/controlpanel/theme` page | Matches `/api/company` admin-only auth chain; `WebsiteSettingsPage` is the pattern precedent. Workshop branding tab is session-only today — out of scope. |
| Brand-copy scope | Public surfaces only | Header, footer, home hero, document theming; internal copy stays static. |
| Palette-color scope | All surfaces | «whole website»: public + workshop + control panel share components (`UserAvatar`, `glass-*`); leaving workshop gold would half-break the feature. |
| Presets | None — custom only | User decision in design review. |
| Persistence | `company_settings.data.theme` (single-row JSON) | Existing merge-patch service; zero migration. |
| Palette storage | Store the choice, derive vars client-side | `theme.palette = {type:'custom', primary:'#RRGGBB'}` or `{type:'default'}`. |
| Default exactness | Literal Gold in `:root`/`.dark`; derivation runs ONLY for custom palettes | `#F4E8D4`/`#A67C38` are hand-tuned — no formula reproduces them; literals guarantee default is pixel-identical, and derivation quality only matters for custom picks. No pinning test needed. |
| Neutral surfaces | NOT migrated | `#F8F7F4`, `#16161a`, `#0A0A0A`, `#1E1E1E`, `#0D0D10`, stone classes are paper, not brand. |

## Token Design

### Roles

| Token | Role | Default light | Default dark |
|---|---|---|---|
| `--brand` | canonical tint — solid fills, borders, rings, glows, gradient bright end, standalone gold text | `#CEAE80` | `#CEAE80` |
| `--brand-ink` | readable accent text/icons on page background (replaces `text-[#A67C38] dark:text-[#CEAE80]` pairs) | `#A67C38` | `#CEAE80` |
| `--brand-hover` | hover fill on brand surfaces (unifies `#c2a06e`/`#B59363`/`#b59567` — near-identical shades) | `#B59363` | `#B59363` |
| `--brand-deep` | gradient deep end (avatar ring, mobile nav, decorative orbs) | `#A67C38` | `#A67C38` |
| `--brand-on` | ink ON brand fill — replaces `text-black`/`text-[#0A0A0A]` inside brand-button strings | `#000` | `#000` |
| `--brand-faint` | light tint text on dark/tinted surfaces (replaces `dark:text-[#F4E8D4]`) | `#F4E8D4` | `#F4E8D4` |
| `--shadow-brand-glow` | Modal glow (`rgba(206,174,128,0.6)`) | — | — |
| `--shadow-brand-glow-soft` | Badge gold glow (`rgba(206,174,128,0.1)`) | — | — |

`--brand-hover` light unification note: public buttons use `#c2a06e`, workshop `#B59363`,
ErrorBoundary `#b59567` — all within ~4% lightness of each other; one token, default
`#B59363` (dominant, 26 files). Imperceptible on hover states; documented accepted delta.

`SafeImage` light watermark `#5b4a2f` → `text-brand-deep` (slightly lighter brown;
accepted micro-delta on an initials-fallback watermark); dark `#F4E8D4` → `text-brand-faint`.

### Application strategy

**Default (no theme / `{type:'default'}`)**: zero runtime override. `:root`/`.dark`
carry literal Gold for every token above; existing `--primary`, `--ring` retargeted to
`var(--brand)` (same value), `--accent`/`--accent-foreground` keep their literal values
(`#F4E8D4`/`#1C1917` light, `#2A2620`/`#F4E8D4` dark). Legacy `--primary-gold`,
`--primary-gold-dark`, `--primary-gold-light` have **zero consumers** (grep-verified) —
deleted.

**Custom (`{type:'custom', primary:P}`)**: BrandContext (or pre-paint script) injects/
rewrites a single `<style id="brand-palette">` element:

```css
:root {
  --brand: P;
  --brand-ink: <P darkened to L≈48% if L>55%, else P>;
  --brand-hover: <P darkened ~7% L>;
  --brand-deep: <P darkened to L≈42%>;
  --brand-on: <relLum(P) < 0.35 ? #fff : #000>;
  --brand-faint: color-mix(in srgb, P 35%, white);
  --primary: P;
  --primary-foreground: <brand-on value>;
  --ring: P;
  --accent: color-mix(in srgb, P 18%, var(--background));
  --accent-foreground: var(--foreground);
}
.dark {
  --brand: P;
  --brand-ink: <P lightened to L≈70% if L<40%, else P>;
  --brand-hover: <P lightened ~7% L>;
  --brand-deep: <P darkened to L≈42%>;
  --brand-on: <same>;
  --brand-faint: color-mix(in srgb, P 35%, white);
  --primary: P;
  --ring: P;
  --accent: color-mix(in srgb, P 18%, var(--background));
  --accent-foreground: var(--brand-faint);
}
```

All shadcn semantic utilities (`bg-primary`, `text-primary-foreground`, `ring-ring`,
`hover:bg-accent`, switch/tabs/badge/button variants) follow automatically since
`@theme inline` maps them to these vars. Derivation lives in
`frontend/src/lib/theme/derivePalette.ts`; the pre-paint script in `index.html` carries
an inline copy (same formulas — sanity-checked once against the module via one-off
script, no runner added).

## Codemod Mapping (exhaustive from recon)

### Arbitrary hex → brand utility

| Old | New |
|---|---|
| `text-[#A67C38] dark:text-[#CEAE80]` | `text-brand-ink` |
| `hover:text-[#A67C38] dark:hover:text-[#CEAE80]` | `hover:text-brand-ink` |
| standalone `text-[#CEAE80]` / `hover:text-[#CEAE80] dark:hover:text-[#CEAE80]` | `text-brand` / `hover:text-brand` |
| `bg-[#CEAE80]` | `bg-brand` |
| `hover:bg-[#CEAE80]` | `hover:bg-brand-hover` |
| `hover:bg-[#c2a06e]` / `hover:bg-[#B59363]` / `hover:bg-[#b59567]` | `hover:bg-brand-hover` |
| `bg-[#CEAE80]/<n>` (+ hover/dark-hover variants) | `bg-brand/<n>` (collapse duplicated light/dark pairs) |
| `ring-[#CEAE80]/<n>`, `hover:ring-[#CEAE80]/<n>` | `ring-brand/<n>`, `hover:ring-brand/<n>` |
| `border-[#CEAE80]/<n>`, `hover:border-[#CEAE80](/<n>)?` | `border-brand/<n>`, `hover:border-brand(/<n>)` |
| `shadow-[#CEAE80]/<n>` | `shadow-brand/<n>` |
| `from-[#A67C38] via-[#CEAE80] to-[#A67C38]` (avatar ring) | `from-brand-deep via-brand to-brand-deep` |
| `from-[#A67C38] to-[#CEAE80]` (mobile nav) | `from-brand-deep to-brand` |
| `from-[#CEAE80]/40 to-[#A67C38]/30` (SafeImage) | `from-brand/40 to-brand-deep/30` |
| decorative orbs `bg-[#A67C38]` | `bg-brand-deep` |
| `shadow-[0_0_8px_rgba(206,174,128,0.6)]` (Modal) | `shadow-brand-glow` |
| `shadow-[0_0_8px_rgba(206,174,128,0.1)]` (Badge gold) | `shadow-brand-glow-soft` |
| `dark:text-[#F4E8D4]` (SafeImage, select-menu) | `dark:text-brand-faint` |
| `text-black` / `text-[#0A0A0A]` / `hover:text-black` **inside class strings that also contain a brand fill** (`bg-[#CEAE80]`, `hover:bg-[#B59363]`, `hover:bg-[#CEAE80]`) | `text-brand-on` / `hover:text-brand-on` |

Neutral hexes (`#F8F7F4`, `#16161a`, `#0A0A0A`, `#1E1E1E`, `#0D0D10`, `#5b4a2f`→per
above, stone) are surfaces — not migrated (except the two documented micro-deltas).

### Amber classes — curated three-way split (grep-verified)

**Migrate to brand** (amber paired with gold hexes or gold-variant semantics):
- `Badge.tsx` `gold` variant (`bg-amber-500/15 text-amber-800 dark:text-[#CEAE80] border-amber-500/30` + soft glow) → `bg-brand/15 text-brand-ink dark:text-brand border-brand/30 shadow-brand-glow-soft`
- `HandoverManager` 85/89/189/225/254/257/272 (incl. `bg-amber-50 dark:bg-[#CEAE80]/15 hover:bg-[#CEAE80]` → `bg-brand/10 dark:bg-brand/15 hover:bg-brand`)
- `ConsignmentReceipt` 43/59/88/141/161/206; `NewHandoverModal` 774; `ReturnModal` 128/176/181
- `DashboardOverview` 172/235 («مشاهده همه» links); `SalesDebtChart` 101/133; `StatsCard` 50 (highlight value)
- `InventoryManager` 122/126/298/352; `Sidebar` 85/87; `MobileNav` 31 (active pill)
- `EntityProfilePage` 115/116 (consignment/item_line icon boxes); `OwnerCard` 98/163/164
- `SettingsManager` 982/1007; `TopSellersCard` 80; `FinancialReports` 317 (gold money-total, same convention as StatsCard)
- `AppLayout` 71 decorative orb `bg-amber-600` → `bg-brand-deep`

**Keep literal amber** (semantic warning/urgency — NOT brand):
- `OverdueAlertBanner` (all), `NewHandoverModal` 836 (credit-limit warning), `InventoryManager` 161/232/319 (low-stock), `DashboardOverview` 212 (overdue status), `FinancialReports` 489–505/578 (7–14 day receivables tier, ratio bands), `TopSellersCard` 121 (debt mid-tier), `EntityProfilePage` 460 (low stock), `select-menu` 129 (amber variant), `ImagePickerModal` 326 (camera error), `Badge` `warning` variant, `AuditLogsManager` 71 (item icon)

**Never touch** (bank brand identity colors): `BankInput` all ambers/yellows + hex logo colors.

### `index.css` changes

- `:root`: add `--brand`,`--brand-ink`,`--brand-hover`,`--brand-deep`,`--brand-on`,`--brand-faint` (Gold literals); retarget `--primary: var(--brand)`, `--ring: var(--brand)`; delete `--primary-gold*`; `--accent`/`--accent-foreground` keep literals.
- `.dark`: add brand overrides (`--brand-ink: #CEAE80`, `--brand-hover: #B59363`); `--primary`/`--ring` retargeted; `--accent`/`--accent-foreground` keep literals.
- `@theme inline`: add `--color-brand/-ink/-hover/-deep/-on/-faint` + `--shadow-brand-glow(-soft)` mappings.
- Scrollbar/selection (21–45) + glass utilities (302–493): every `rgba(206,174,128,X)` → `color-mix(in srgb, var(--brand) X%, transparent)`; bare `#CEAE80` → `var(--brand)`; `#B58E58` (glass-input focus) → `var(--brand-hover)`.

## Theme Settings UI — `/controlpanel/theme` (تنظیمات ظاهری سایت)

New route + page, admin-only (same guard pattern as `WebsiteSettingsPage`), all Persian:

1. **پالت رنگی** — custom color picker (`<input type="color">` + synced hex text field),
   live derived-role swatches (`--brand/ink/hover/deep/on/faint`), and a **live preview
   strip**: mini nav-pill, primary button, glass card, input replica — re-render
   instantly on any change; the live site is untouched until save.
2. **حالت پیش‌فرض نمایش** — تاریک (default) / روشن radio.
3. **هویت بصری** — logo upload via existing `ImagePicker` (category `logo` →
   `galleryApi.upload`), brand name, tagline; live replica of the public header.
4. **بازنشانی پالت** — reset button restoring Gold + dark defaults in the form.
5. Save → `PUT /api/company` with `{ theme, logoUrl, brandName, tagline }`;
   loading/saving states + toasts per `WebsiteSettingsPage` pattern.

`ControlPanelLayout` nav gains «تنظیمات ظاهری» (Palette icon), admin-only, beside
«تنظیمات سایت».

## Persistence & Data Flow

### Backend

- `companyController.ts` zod schema: add `theme: { defaultMode: 'dark'|'light',
  palette: {type:'default'} | {type:'custom', primary: string} }`; normalize `primary`
  to lowercase `#rrggbb`; reject other formats.
- `settingsService.ts`: theme rides the existing merge-patch into `company_settings.data`.
- Workshop `publicController.ts` `getPublicCompany` (49–64): project `logoUrl`,
  `brandName`, `tagline`, `theme` (public read — no secrets in these fields).

### Frontend

- `types/index.ts`: `CompanyTheme` type; `PublicCompanyInfo` gains `logoUrl?`,
  `brandName?`, `tagline?`, `theme?`.
- `lib/api.ts`: `companyApi.get()/update()` → GET/PUT `/api/company` (admin).
- `context/BrandContext.tsx` (new, mounted inside ThemeProvider scope in `App.tsx`):
  on mount apply cached palette from `localStorage.polaris_palette` (rewrite the
  `<style id="brand-palette">` or remove it for default); fetch
  `/api/public/company` once; apply server theme + brand values; update cache and
  `<meta name="theme-color">`; expose `{ company, palette }` to header/footer.
- `index.html` pre-paint: the existing dark-class script also reads
  `polaris_palette`; when custom, inline-derive the roles (same formulas) and inject the
  `<style id="brand-palette">` before first paint. `theme-color`/
  `msapplication-TileColor` stay Gold statically; BrandContext updates `theme-color`
  at runtime.
- `ThemeContext`: unchanged visitor toggle; server `defaultMode` applies only when the
  visitor has no stored choice (`polaris_theme` wins over `defaultMode`).
- `PublicHeader`: binds BrandContext values: `logoUrl ?? static import`,
  `brandName ?? «پولاریس استایل»`, `tagline ?? «فروشگاه پوشاک»`.
- `PublicFooter`: replaces its own `publicApi.company()` fetch with the shared
  BrandContext value; same fallbacks.

## Avatar Fix

`UserMenu.tsx:58` — initials span gains the identical border the img variant has:

```diff
- <span className="w-full h-full rounded-full bg-[#CEAE80] text-black text-xs font-black flex items-center justify-center">
+ <span className="w-full h-full rounded-full bg-brand text-brand-on text-xs font-black flex items-center justify-center border-2 border-[#F8F7F4] dark:border-[#16161a]">
```

Both variants then render: 2.5px gradient ring → 2px page-colored border → content —
identical geometry, concentric in both modes, at every size.

## Implementation Order

1. `index.css` token layer (literals, retargets, `@theme inline`, glass var-ification,
   shadow tokens) + `lib/theme/derivePalette.ts`.
2. Codemod: hex/amber classes → brand utilities per the tables above (~70 files;
   ast_edit for mechanical patterns, manual pass for gradients, glow shadows,
   amber-curation cases, `text-black`-in-brand-string cases).
3. `UserMenu.tsx` avatar border fix.
4. Backend: zod `theme` + public projection.
5. Frontend clients: `companyApi`, `BrandContext`, `index.html` pre-paint,
   `ThemeContext` default-mode integration.
6. `PublicHeader`/`PublicFooter` brand binding; footer fetch consolidation.
7. Controlpanel: nav item + `/controlpanel/theme` page.
8. Verification (below).

## Verification (acceptance)

1. **Default unchanged**: with no theme / `{type:'default'}`, site is pixel-equivalent
   to today in both modes (structural guarantee — literals; spot-check visually).
2. **Palette site-wide**: pick `#7C3AED` → save → public site, workshop, and control
   panel all show violet in: nav CTA, buttons (incl. shadcn `bg-primary` variants),
   glass cards, input focus, scrollbar, selection, gradients, avatar ring, tabs/switch;
   no `#CEAE80`/`#A67C38`/migrated amber visible anywhere. Warning ambers (overdue
   banner, low-stock) stay amber.
3. **Brand-on contrast**: pick a dark color (e.g. `#1E3A8A`) → brand-fill buttons show
   white text; pick light → black text.
4. **Persistence + no flash**: set palette + logo + brand name + tagline → hard reload
   (`/`, `/shop`, `/workshop`) → all survive; no gold flash before custom palette
   (pre-paint).
5. **Avatar**: 375px viewport, logged-in with initials only → ring concentric; image
   variant and 1200px with name visible → same.
6. **Default-mode**: set default-mode light with no visitor choice → first paint is
   light; visitor toggle still wins once they choose.
7. **Reset**: reset → Gold + dark restored in form and after save; cache cleared.
8. **Auth**: non-admin on `/controlpanel/theme` → redirected; PUT `/api/company` as
   non-admin → 403.
9. **Regression**: `tsc -b` clean, `eslint .` clean, grep proves zero migrated hexes
   remain (outside neutral/bank/warning whitelists and fallback literals).
10. All visual checks browser-driven on the real running site, both modes.

## Risks

- **70-file codemod**: mitigated by the exhaustive tables above (recon-verified),
  `lsp diagnostics` clean over `src/`, full diff review, and the browser visual pass.
- **Inline pre-paint derivation duplicates formulas**: sanity-checked once against the
  module via one-off script (no runner added — repo has none).
- **`color-mix` support**: evergreen-only site (View Transitions, `@theme inline`
  already assumed) — acceptable.
- **Accepted micro-deltas**: unified hover shade (`#B59363` for all), SafeImage light
  watermark (`--brand-deep`), derived tints for custom palettes — all documented above.
- **Amber curation judgment calls** (e.g. `FinancialReports` 317 money-total):
  enumerated in the table; reviewer may reclassify any row during spec review.
