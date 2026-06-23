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
- Admin UI mapuje tokeny na zmienne shadcn (`--background`, `--foreground`, itp.) przez `--admin-*`.
- Tailwind v4 uzywa `@theme` w CSS do generowania klas `bg-background`, `text-foreground`, itd.
- Mapowanie jest w `core/admin/styles/globals.css`.

### Admin UI Theme Tokens (granular)

Minimalny zestaw grup:

```ts
base: { bg, surface, text, border }
buttons: {
  primary: { bg, text, hoverBg, hoverText },
  secondary: { bg, text, hoverBg, hoverText },
  outline: { border, text, hoverBg, hoverText },
  ghost: { hoverBg, hoverText }
}
inputs: { bg, border, text, placeholder, focusRing }
sidebar: { bg, text, activeBg, activeText, hoverBg }
topbar: { bg, text, border }
card: { bg, border }
state: { success, warning, danger }
```

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
