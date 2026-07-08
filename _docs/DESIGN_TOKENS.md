# Design Tokens (v1)

Cel: wspolny system wygladu dla core i pluginow, aby uniknac
niestandardowych klas Tailwind w runtime.

## Zasady

- Tokeny sa expose jako CSS variables w `:root`.
- Pluginy powinny uzywac tokenow zamiast hardcode kolorow.
- Wszelkie niestandardowe style pluginu musza byc w `dist/style.css`.
- Core dostarcza domyslne wartosci tokenow z aktywnego theme (np. `/themes/default`).
- Admin moze zmieniac wartosci **site tokens** na poziomie global settings.
- Override tokenow frontu jest przechowywany w `settings` pod kluczem `design.tokens`.
- Merge order (front): theme defaults -> global overrides (`design.tokens`) -> profile overrides.
- **Admin UI** ma osobny zestaw tokenow (patrz sekcja niżej) i nie używa `design.tokens`.

## Token groups (v1)

- colors: `--color-primary`, `--color-secondary`, `--color-accent`
- neutrals: `--color-bg`, `--color-surface`, `--color-text`
- spacing: `--space-xs` ... `--space-2xl`
- radius: `--radius-sm` ... `--radius-xl`
- typography: `--font-sans`, `--font-display`, `--text-2xs`, `--text-xs`,
  `--text-sm` ... `--text-5xl` (`2xs` = 0.625rem/10px, `xs` = 0.75rem/12px;
  `3xl`/`4xl`/`5xl` extend the heading scale: 1.875rem/2.25rem/3rem; `5xl`
  matches the baked h1 utility class so the largest explicit preset never
  shrinks a default h1). `xs` is the practical small-text floor for readable
  copy; `2xs` is opt-in for compact labels/badges and should keep a sane
  line-height.

## Pages v2 typography consumption (TASK-424)

Page block typography (`PageBlockStyleV2.fontFamily/fontSize`) is token-backed
and references the typography group above:

- `fontFamily: "sans" | "display"` renders as
  `var(--font-sans/--font-display, <DEFAULT_TOKENS stack>)`.
- `fontSize: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" |
  "4xl" | "5xl"` renders as `var(--text-*, <DEFAULT_TOKENS size>)`.
- `fontWeight: "normal" | "medium" | "semibold" | "bold"` maps to
  400/500/600/700 (no CSS variable; weights are not part of the v1 token
  groups).
- The owner mapping lives in `core/services/pages/pageDocumentV2.ts`
  (`pageTypographyFontFamilyCssValues`, `pageTypographyFontSizeCssValues`,
  `pageTypographyFontWeightCssValues`) and references
  `DesignTokens.typography` from `core/services/theme/tokenTypes.ts`.
- The published front resolves the variables from the `:root` token stylesheet
  (`toCssVariables` in `core/ui/theme/tokenCss.ts`). The admin shell defines
  its OWN admin-theme `--text-*`/`--font-*` variables on `:root`, so the page
  editor canvas frame re-paints the SITE typography variables inline
  (`toPageTypographyCssVariableMap` over the resolved `design.tokens`
  settings value, `DEFAULT_TOKENS` when none are cached) — otherwise the
  admin typography scale would leak into the canvas and drift from the front
  (phase2 smoke anomaly #2).
- Free-form font strings are not accepted: the Pages schema rejects unknown
  typography tokens on fresh writes.

## Pages v2 color-token authoring

Page Editor v2 color controls may store either a sanitized raw color or one of
the allowlisted site color token references:

- `var(--color-primary)`
- `var(--color-secondary)`
- `var(--color-accent)`
- `var(--color-bg)`
- `var(--color-surface)`
- `var(--color-text)`
- `var(--color-border)`

The token swatches commit the `var(--color-*)` value while previewing the
resolved site token in the admin canvas. Arbitrary `var()` expressions are not
accepted by the Page authoring color sanitizer; only the names above are valid
for Page block/section colors and inline text marks.

## Admin color-value authoring (alpha-capable) (TASK-519)

Every admin color control authors AND round-trips **alpha-capable** values, not
just opaque hex. The two shared controls —
`core/admin/ui/pages/editorControls/ColorSwatchControl.tsx` (menu/page) and
`core/admin/ui/widgets/editors/SharedColorControl.tsx` +
`core/admin/ui/widgets/editors/ClearableFields.tsx` (widget editors) — expose:

- a native **base-color picker** (`<input type="color">`, `#rrggbb`),
- an **opacity/alpha slider** (`0`–`1`),
- a **free-text field** that accepts the full alpha-capable set, and
- the existing **transparent**, **palette-swatch**, and **`var(--color-*)`
  token** UX unchanged.

**Accepted value set** (8-digit hex `#rrggbbaa` e.g. `#0812209e`, `rgb()/rgba()`
incl. leading-dot alpha `.84`, `hsl()/hsla()`, `#rgb/#rgba/#rrggbb`,
`var(--color-*)`, `transparent`) is the **authoritative whitelist** enforced at
the server-write boundary `normalizeMenuColorValue`
(`core/services/menus/normalizeMenuAppearance.ts`) and the render boundary
`resolveClearableCssColorValue` (`core/widgets/core/clearableStyle.ts`). Those
boundaries are unchanged and remain the security surface (they reject
`url()`/`expression()`/`javascript:`/`data:`/`;{}<>`).

**Shared admin helper — `core/admin/ui/shared/colorValue.ts` (TASK-519-01).**
A pure, framework-free parse/compose helper that is a **read-only subset** of the
authoritative whitelist (its accepted-set patterns MIRROR the boundaries; a
parity test asserts every value it emits via `normalizeAdminColorValue` is
accepted by `resolveClearableCssColorValue`). It never constructs an unsafe
token. Both controls route their committed value through it.

**Canonicalization note (the ONLY normalization).** The render boundary's
`rgb()/hsl()` alpha group REQUIRES a leading `0` (`0.84`) and REJECTS a bare
leading-dot (`.84`), whereas the menu write boundary also accepts `.84`. To keep
BOTH boundaries happy, `normalizeAdminColorValue` accepts a leading-dot alpha as
INPUT but canonicalizes it on emit (`rgba(8,17,31,.84)` → `rgba(8,17,31,0.84)`).
Hex round-trips **byte-identically**; alpha is clamped to `[0,1]` (NaN/out-of-range
falls back to fully opaque). This is why the owner's legacy token
`rgba(8,17,31,.84)` survives to front render as `rgba(8,17,31,0.84)`.

**Storage:** color strings are existing `string` fields on the menu document
(`jsonb`) and per-widget props (`jsonb` page regions). This upgrade is
**present-only** — NO schema key, NO DDL, NO migration; legacy opaque values
normalize byte-identically.

## Pages v2 motion & interaction effect tokens (TASK-521)

The Pages v2 motion/interaction effects (see `_docs/PAGE_MODEL.md` § Motion And
Interaction Effects) expose their per-instance config to CSS through validated
custom properties + fixed enums/clamps — never as raw declarations. All values are
already normalized (`readSafeColor` colors, `readNumber` clamps,
`normalizeEnum`/`resolveHeroTilt` enums) before reaching CSS.

**Enums & clamps (owned by `pageDocumentV2.ts`, hero `tilt` by `hero.tsx`):**

| Effect | Enum / clamp | Values |
|--------|--------------|--------|
| Section scroll | `pageSectionScrollEffects` | `none`, `reveal-fade`, `reveal-up`, `parallax` |
| Section parallax | `PAGE_PARALLAX_INTENSITY_CLAMP` | `0`..`40` px |
| Animated icon | `animatedIconAnimations` | `none`, `spin`, `pulse`, `bounce`, `draw` |
| Animated icon | `animatedIconNames` (allowlist) | `sparkles`, `star`, `heart`, `zap`, `check`, `shield`, `arrow-right`, `bell`, `rocket`, `loader` |
| Animated icon size | `ANIMATED_ICON_SIZE_CLAMP` | `16`..`160` px |
| Animated icon speed | `ANIMATED_ICON_SPEED_CLAMP` | `400`..`4000` ms |
| Hero tilt | `heroTilts` | `none`, `subtle`, `strong` |
| Page spotlight size | `PAGE_SPOTLIGHT_SIZE_CLAMP` | `120`..`900` px |

**CSS custom properties (set from normalized values only):**

- `--anim-speed` — animated-icon keyframe duration (ms).
- `--spotlight-x` / `--spotlight-y` — cursor-follow spotlight position (updated on
  `mousemove`, rAF).
- `--spotlight-color` — `readSafeColor` spotlight color (alpha-capable via TASK-519).
- `--spotlight-size` — spotlight radius (px).

**`prefers-reduced-motion` guarantee.** Every effect ships BOTH a CSS
`motion-safe:`/`motion-reduce:` guard AND a
`matchMedia('(prefers-reduced-motion: reduce)').matches` early-return in its runtime
IIFE, so a reduce user sees content fully at rest (no reveal/parallax translate, no
tilt, no spotlight; icon keyframes paused). Effects are **present-only** — no token,
no DDL, no migration; a no-effect page renders byte-identically to pre-521 output.

## Tailwind integration

- Core build mapuje tokeny na utility classes.
- Pluginy nie polegaja na `bg-[#123456]` bezposrednio.
- Dla dynamicznych klas plugin uzywa safelist w swoim buildzie.

Przyklad mapowania w tailwind.config:

```js
theme: {
  colors: {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",
    accent: "var(--color-accent)"
  }
}
```

## Admin UI (shadcn + Tailwind v4)

Admin UI korzysta z osobnych **Admin UI Theme Tokens** przechowywanych w DB.

- Tokeny admina sa przechowywane w `admin_theme_templates` i aktywowane przez `admin_theme_profiles`.
- UI edycji to **Visual → Admin UI Theme** (tylko pickery, JSON tylko export/import).
- Admin UI mapuje tokeny na zmienne shadcn (`--background`, `--foreground`,
  `--color-primary-soft`, `--color-info`/`--color-info-soft`,
  `--color-success-soft`/`--color-warning-soft`, `--color-sidebar-accent`,
  `--shadow-soft`/`--shadow-card`/`--shadow-pop`, itp.) przez `--admin-*`.
- Tailwind v4 uzywa `@theme` w CSS do generowania klas `bg-background`, `text-foreground`, itd.
- Mapowanie jest w `core/admin/styles/globals.css`.

### Admin UI Theme Tokens (granular) — Soft & Friendly (violet)

The full group shape (TASK-479-05; `NEW` keys carried by `AdminThemeTokens` in
`core/services/adminThemes/tokenTypes.ts`):

```ts
base: { bg, surface, text, border }
buttons: {
  primary: { bg, text, hoverBg, hoverText },
  secondary: { bg, text, hoverBg, hoverText },
  outline: { border, text, hoverBg, hoverText },
  ghost: { hoverBg, hoverText }
}
primarySoft: { bg, text }                 // NEW (TASK-479-05): violet wash
inputs: { bg, border, text, placeholder, focusRing }
sidebar: {
  bg, text, activeBg, activeText, hoverBg,
  muted, accent, accentForeground, border  // + NEW
}
topbar: { bg, text, border }
card: { bg, border }
typography: { sans, display, sm, md, lg, xl, "2xl", mutedText }  // Inter / Inter Tight
state: {
  success, warning, danger,
  info, infoForeground,                              // + NEW
  successForeground, warningForeground, dangerForeground,  // + NEW (L01 §B)
  successSoft, warningSoft, infoSoft                 // + NEW
}
effects: { shadowSoft, shadowCard, shadowPop }       // NEW (soft elevation)
```

**CSS-var owners:** every field is emitted as a `--admin-*` variable by
`toAdminThemeCssVariables` / `toAdminThemeCssVariableMap`
(`core/ui/theme/tokenCss.ts`); `core/admin/styles/globals.css` then derives the
shadcn `--color-*`/`--*` vars FROM `--admin-*`. The admin chrome primitives
(`button`/`input`/`textarea`/`alert`/`SidebarNav`/`TopBar`) read `--admin-*`
**directly**, so re-coloring a `--admin-*` recolors the whole shell.

Frozen prototype → admin mapping (TASK-479-05-L01; `NEW` = added by this
subtask, otherwise re-colored):

| Prototype var | Light | Dark | `AdminThemeTokens` path | `--admin-*` owner | shadcn var | Status |
|---|---|---|---|---|---|---|
| `--background` | `#f6f5f2` | `#18171a` | `base.bg` | `--admin-base-bg` | `--background` | re-color |
| `--foreground` | `#1c1a17` | `#ededec` | `base.text` | `--admin-base-text` | `--foreground` | re-color |
| (surface) | `#f3f1ed` | `#232128` | `base.surface` | `--admin-base-surface` | `--muted` | re-color |
| `--popover` | `#ffffff` | `#232127` | `card.bg` | `--admin-card-bg` | `--popover` | re-map |
| `--border` | `#eae7e0` | `#2d2b32` | `base.border` | `--admin-base-border` | `--border` | re-color |
| `--card` | `#ffffff` | `#211f24` | `card.bg` | `--admin-card-bg` | `--card` | re-color |
| `--input` | `#e5e1d9` | `#36333c` | `inputs.border` | `--admin-input-border` | `--input` | re-color |
| `--ring` | `#a78bfa` | `#8b5cf6` | `inputs.focusRing` | `--admin-input-ring` | `--ring` | re-color |
| `--primary` | `#7c3aed` | `#8b5cf6` | `buttons.primary.bg` | `--admin-button-primary-bg` | `--primary` | re-color |
| `--primary-foreground` | `#ffffff` | `#ffffff` | `buttons.primary.text` | `--admin-button-primary-text` | `--primary-foreground` | re-color |
| `--primary-soft` | `#f1ecfe` | `#2a2440` | `primarySoft.bg` | `--admin-primary-soft` | `--primary-soft` | **NEW** |
| `--primary-soft-foreground` | `#6d28d9` | `#c4b5fd` | `primarySoft.text` | `--admin-primary-soft-text` | `--primary-soft-foreground` | **NEW** |
| `--secondary` | `#f1efeb` | `#29272e` | `buttons.secondary.bg` | `--admin-button-secondary-bg` | `--secondary` | re-color |
| `--destructive` | `#e11d48` | `#fb7185` | `state.danger` | `--admin-state-danger` | `--destructive` | re-color |
| `--destructive-foreground` | `#ffffff` | `#1c1a17` | `state.dangerForeground` | `--admin-state-danger-foreground` | `--destructive-foreground` | **NEW** |
| `--success` | `#16a34a` | `#34d399` | `state.success` | `--admin-state-success` | `--success` | **NEW** |
| `--success-foreground` | `#ffffff` | `#06281c` | `state.successForeground` | `--admin-state-success-foreground` | `--success-foreground` | **NEW** |
| `--success-soft` | `#e7f6ec` | `#18342a` | `state.successSoft` | `--admin-state-success-soft` | `--success-soft` | **NEW** |
| `--warning` | `#d97706` | `#fbbf24` | `state.warning` | `--admin-state-warning` | `--warning` | **NEW** |
| `--warning-foreground` | `#ffffff` | `#2a1c05` | `state.warningForeground` | `--admin-state-warning-foreground` | `--warning-foreground` | **NEW** |
| `--warning-soft` | `#fdf0db` | `#36290f` | `state.warningSoft` | `--admin-state-warning-soft` | `--warning-soft` | **NEW** |
| `--info` | `#2563eb` | `#60a5fa` | `state.info` | `--admin-state-info` | `--info` | **NEW** |
| `--info-foreground` | `#ffffff` | `#07203f` | `state.infoForeground` | `--admin-state-info-foreground` | `--info-foreground` | **NEW** |
| `--info-soft` | `#e7eefe` | `#16263f` | `state.infoSoft` | `--admin-state-info-soft` | `--info-soft` | **NEW** |
| `--sidebar` | `#f1efea` | `#1c1b1f` | `sidebar.bg` | `--admin-sidebar-bg` | `--sidebar` | re-color |
| `--sidebar-foreground` | `#57534e` | `#a8a29a` | `sidebar.text` | `--admin-sidebar-text` | `--sidebar-foreground` | re-color |
| `--sidebar-muted` | `#a8a29a` | `#756f68` | `sidebar.muted` | `--admin-sidebar-muted` | `--sidebar-muted` | **NEW** |
| `--sidebar-accent` | `#ece6fb` | `#2c2542` | `sidebar.accent` | `--admin-sidebar-accent` | `--sidebar-accent` | **NEW** |
| `--sidebar-accent-foreground` | `#6d28d9` | `#c4b5fd` | `sidebar.accentForeground` | `--admin-sidebar-accent-foreground` | `--sidebar-accent-foreground` | **NEW** |
| `--sidebar-border` | `#e7e3db` | `#2a282f` | `sidebar.border` | `--admin-sidebar-border` | `--sidebar-border` | **NEW** |
| (topbar bg/text/border) | warm | dark | `topbar.*` | `--admin-topbar-*` | — (chrome reads `--admin-*`) | re-color |
| `--shadow-soft` | `0 1px 2px …` | (same) | `effects.shadowSoft` | `--admin-shadow-soft` | `--shadow-soft` | **NEW** |
| `--shadow-card` | `0 1px 3px …` | (same) | `effects.shadowCard` | `--admin-shadow-card` | `--shadow-card` | **NEW** |
| `--shadow-pop` | `0 10px 34px …` | (same) | `effects.shadowPop` | `--admin-shadow-pop` | `--shadow-pop` | **NEW** |
| `--font-sans` (Inter) | Inter stack | (same) | `typography.sans` | `--font-sans` | `--font-sans` | re-value |
| `--font-display` (Inter Tight) | Inter Tight | (same) | `typography.display` | `--font-display` | `--font-display` | re-value |

Backward compatibility: `admin_theme_templates.tokens` is `jsonb`, so the NEW
groups need **no DB migration**; `mergeAdminThemeTokens` /
`normalizeAdminThemeTokens` back-fill them from the defaults so pre-TASK-479-05
templates keep loading. `assertAdminThemeTokens` still rejects unknown keys and
non-string leaves.

### Admin UI dark mode (TASK-479-05)

- **Light** = the canonical `AdminThemeTokens` DB set (the contract stays
  single-mode; the per-template tokens are the LIGHT palette).
- **Dark** = a `:root.dark{--admin-*}` block emitted FROM the injected
  `<style id="coderso-theme-tokens">` (`AdminApp`), alongside the light
  `:root{--admin-*}` block; the values come from the shared default constant
  `DEFAULT_ADMIN_THEME_TOKENS_DARK` (`tokenTypes.ts`). The chrome reads
  `--admin-*` directly, so flipping these recolors the WHOLE shell
  (button/sidebar/topbar/input/alert); the derived shadcn vars in
  `globals.css :root` follow automatically. It is **NOT** a static
  `globals.css .dark{--admin-*}` block — that cannot win source order against
  the later injected style and would never reach the chrome (the static
  `:root.dark` in `globals.css` exists only as a pre-paint anti-flash fallback
  that mirrors the same constant).
- **Toggle:** the TopBar `AdminColorModeToggle` flips `<html class="dark">`,
  persisted to `localStorage["coderso-admin-color-mode"]` and applied pre-paint
  by an inline script in `core/admin/index.html` (no SSR flash). This is a
  DISTINCT axis from the theme-PROFILE switcher and from the admin-theme TOKENS
  cache key `localStorage["coderso.adminThemeTokens"]`.
- **Rationale:** zero migration for existing templates — their dark comes from
  the shared default palette emitted by the injected style. A per-template dark
  (`dark?: Partial<AdminThemeTokens>`) is a deferred, purely-additive follow-up
  (the injected style already owns the dark block), NOT part of this subtask.

### Admin Popup State Surfaces

- Shared admin popups should use `Dialog`, `Sheet`, `Alert`, `Button`, and
  toast primitives instead of fixed Tailwind color families.
- `Alert` exposes a token-backed `warning` variant mapped to
  `--admin-state-warning`.
- Destructive dialog and callout states use shared destructive button/alert
  variants backed by Admin UI state tokens.
- Resource screens may own confirmation copy and action state, but popup
  backgrounds, foreground text, borders, overlays, focus, validation copy,
  warning state, and destructive state should remain token-driven.

### Admin Floating Toasts

- The shared Admin UI toaster is mounted once from `AdminApp` and stays
  top-right, closeable, duration-bound, and labelled as `Admin notifications`.
- The toaster keeps Sonner `richColors` enabled so success, error, warning, and
  info states use Sonner's typed state selectors, but the visible state colors
  are owned by `core/admin/components/ui/sonner.tsx` and
  `core/admin/styles/globals.css`.
- Normal, success, error, warning, and neutral info toast variables resolve to
  Admin UI Theme variables:
  - normal/info surfaces use the popover and border token set,
  - success borders use `--admin-state-success`,
  - warning borders use `--admin-state-warning`,
  - error borders use `--admin-state-danger`.
- The toast shell, title, description text, border, close button,
  action/cancel controls, loading indicator, shadow, hover state, and focus
  ring must inherit from active Admin UI Theme variables or shared
  `--admin-toast-*` variables. Resource screens must not style floating toasts
  with Sonner's bundled black/green/red/yellow/blue palettes or local Tailwind
  color families.
- Custom Admin UI Theme templates/profiles update toast visuals dynamically
  through CSS variables; resource-specific list code should only emit shared
  toast messages, not visual overrides.

## Example usage

```css
.plugin-card {
  background: var(--color-surface);
  color: var(--color-text);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
}
```

## Token compliance (store)

- Store moze flagowac hardcode kolorow w CSS pluginu.
- Preferowane jest uzywanie tokenow dla spojnosc i kompatybilnosci.
