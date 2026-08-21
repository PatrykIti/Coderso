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
- `fontSizeCustom` (TASK-532, present-only fluid size) is NOT token-backed: it
  emits a grammar-validated fluid length string (a bare number + allowlisted
  unit `rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`, or a single `clamp()`/`min()`/`max()`
  of such lengths — e.g. `clamp(2.6rem,5vw,4.4rem)`) INLINE on the text node and
  **wins over the `fontSize` token** at render (`toPageBlockTypographyStyle`);
  the discrete token stays the fallback/unset state. It is validated by
  `sanitizeAuthoringCssFontSize` (`pageAuthoringSanitizers.ts`) at the write
  boundary — never arbitrary CSS, 64-char cap, injection constructs fail-closed
  to omitted.
- `fontWeight: "normal" | "medium" | "semibold" | "bold" | "extrabold" |
  "black"` maps to 400/500/600/700/**800/900** (the last two added by TASK-532;
  no CSS variable — weights are not part of the v1 token groups and paint inline
  via `pageTypographyFontWeightCssValues`).
- `textTransform` (TASK-532, present-only enum `none`/`uppercase`/`lowercase`/
  `capitalize`) emits a fixed CSS keyword inline on the text node; `none`/unset
  ⇒ omitted (no token, no variable).
- The owner mapping lives in `core/services/pages/pageDocumentV2.ts`
  (`pageTypographyFontFamilyCssValues`, `pageTypographyFontSizeCssValues`,
  `pageTypographyFontWeightCssValues`, `pageTypographyTextTransforms`) and
  references `DesignTokens.typography` from `core/services/theme/tokenTypes.ts`.
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

### Page editor canvas: brand vs neutral token resolution (TASK-481)

- The page editor canvas is split into a CHROME layer (selection outline/ring,
  badges, ghost insert tiles) and a CONTENT scope (`data-page-editor-content`)
  holding the rendered page content + its brand-consuming inline style.
- NEUTRAL site vars (`--color-bg/-surface/-text`) are emitted on the canvas
  FRAME (`toPageCanvasColorCssVariableMap`, TASK-477-02) — chrome does not
  consume them.
- BRAND site vars (`--color-primary/-secondary/-accent/-border`) are emitted
  ONLY on the content scope (`toPageCanvasBrandColorCssVariableMap`,
  TASK-481-02), so block/inline brand colors render the SAME value as the front
  (WYSIWYG).
- Chrome RE-ASSERTS the admin brand (`adminBrandColorCssVariableMap`:
  `--color-primary: var(--primary)`, ...) on the section/block frame, so chrome —
  even nested inside an ancestor content scope — keeps the admin theme.
- Stored values are unchanged and still validated by the page-color sanitizer
  allowlist (`authoringColorTokenNames`); this is display-only token threading.
- Live repaint: on a settings write that changes `design.tokens`, the canvas
  revalidates the FULL settings payload (`getSettingsCached({ force: true })`
  on the `settingsRedacted` cache-bus event) so the content scope repaints to
  the new site accent instead of falling back to the redacted cache (which never
  carries `design.tokens`).

Cross-task boundary: TASK-481 did NOT edit `core/admin/styles/globals.css`
`@theme {`. The `@theme` brand `--color-*` mapping + dark layer remain owned by
TASK-479-05-L03; the `data-page-editor-canvas-frame` chrome restyle remains
owned by TASK-479-08-L02. TASK-481 only added the content-scope brand emission
+ admin re-assertion in `core/ui/theme/tokenCss.ts` and
`core/admin/ui/pages/**`.

## Canonical CSS color values (TASK-519, TASK-541)

`core/services/theme/cssColorContract.ts` is the one Bun-free semantic owner for
simple authored CSS colors. Admin adapters, Menu writes, Form theme values, and
the finite retained compatibility sinks delegate to this owner; they must not
copy its hex/RGB/HSL ranges or keyword grammar.

The parser receives the original `unknown` value before trimming or case
folding. It rejects non-strings, control/non-ASCII characters, and values longer
than `CSS_COLOR_VALUE_MAX_LENGTH` (128 JavaScript UTF-16 code units) **before**
removing surrounding ASCII U+0020 spaces. The accepted simple-color grammar is:

- hex `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`;
- comma-form `rgb()`/`rgba()` with three channels and an optional fourth alpha;
  either function alias may carry either valid arity. Channels are unsigned
  decimals in `0..255` or percentages in `0..100%`;
- comma-form `hsl()`/`hsla()` with unsigned hue `0..360` (optional `deg`),
  saturation/lightness `0..100%`, and optional alpha; either alias may carry
  either valid arity;
- alpha as an unsigned decimal in `0..1` (including a leading-dot spelling) or
  a percentage in `0..100%`;
- `var(--color-<lowercase-token>)` and `transparent`.

Signed numbers, exponent notation, modern space/slash function syntax, named
colors, arbitrary CSS functions/variables, URLs, declarations, and malformed or
out-of-range channels fail closed. The parser never clamps an invalid authored
value.

Two explicit profiles control keywords:

- `authoring` is the default write profile and accepts only the grammar above;
  it rejects `currentColor` and `inherit`.
- `inherited-render` is an intentional compatibility superset that additionally
  canonicalizes `currentColor` and accepts `inherit`. Only the Form TASK-516
  theme path and enumerated retained direct-color fields opt in. A nested color
  stop may narrow this profile with `allowInheritKeyword=false`, retaining
  `currentColor` while rejecting `inherit`.

Canonical output lowercases hex, removes only permitted surrounding/internal
formatting, emits comma-space function separators, removes `deg` from HSL hue,
normalizes aliases from arity (`rgb`/`hsl` without alpha, `rgba`/`hsla` with
alpha), and expands a leading-dot alpha (`.84` -> `0.84`). Numeric percentages
remain percentages; short and alpha hex widths remain their accepted widths.
Parsing canonical output is idempotent.

`CSS_COLOR_SCHEMA_PATTERNS[profile]` is only a JSON-Schema structural prefilter.
It carries the printable-ASCII and accepted-shape guard but does **not** encode a
length cap or numeric ranges. Schema consumers pair the imported pattern with a
separately imported `CSS_COLOR_VALUE_MAX_LENGTH` in `maxLength`; the semantic
parser independently enforces that same original-input cap before trimming.
Every consumer that has joined the canonical contract must still call
`parseCssColorValue`/`normalizeCssColorValue`; matching the pattern and cap alone
never authorizes persistence or rendering.

The shared admin controls use parser metadata for the base picker and alpha
slider, preserve tokens/keywords as explicit states, and commit only canonical
bytes. The landed Page admin control uses `authoring`, but the Page backend still
uses its independent legacy sanitizer: it enforces the exact site-token list
`primary`, `secondary`, `accent`, `bg`, `surface`, `text`, and `border` while
retaining its historical named-value behavior. TASK-539-02-L01 owns importing
the shared parser into that Page sanitizer without removing the seven-token
filter. Menu writes use `authoring`. Form theme
write/read/control/preview/public render uses `inherited-render` end to end as
the explicit TASK-516 exception.

Color strings remain existing JSON fields. TASK-541 introduces no schema key,
default emission, DDL, or migration. Existing sparse optional values remain
present-only and clear by omission; retained legacy fields that already use an
empty or explicit default sentinel keep those normalized bytes. In both cases an
unauthored document keeps its previous bytes and fallback behavior.

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
- `--spotlight-x` / `--spotlight-y` — cursor-follow spotlight position in **VIEWPORT
  coords** (raw `ev.clientX`/`ev.clientY`, rounded, updated on `pointermove` via rAF).
  These feed the `position:fixed inset:0` spotlight overlay's `radial-gradient`, so they
  MUST stay viewport-relative — NOT offset by the scrolled page root's rect (TASK-529:
  subtracting the negative root `getBoundingClientRect().top` added `scrollY` and pushed
  the glow below the fold past the first screenful).
- `--spotlight-color` — `readSafeColor` spotlight color (alpha-capable via TASK-519).
- `--spotlight-size` — spotlight radius (px).

**`prefers-reduced-motion` guarantee.** Every effect ships BOTH a CSS
`motion-safe:`/`motion-reduce:` guard AND a
`matchMedia('(prefers-reduced-motion: reduce)').matches` early-return in its runtime
IIFE, so a reduce user sees content fully at rest (no reveal/parallax translate, no
tilt, no spotlight; icon keyframes paused). Effects are **present-only** — no token,
no DDL, no migration; a no-effect page renders byte-identically to pre-521 output.

## Pages v2 composable hero toolkit tokens (TASK-522)

The composable hero toolkit (see `_docs/PAGE_MODEL.md` § Composable Hero Toolkit &
Premium Effects) exposes its per-instance config to CSS through validated custom
properties + fixed enums/clamps — never raw declarations. Values are normalized
(`readSafeColor` colors, `readNumber` clamps, `normalizeEnum` enums) before reaching
CSS. Enums/clamps are owned by `pageDocumentV2.ts`.

**Enums & clamps:**

| Effect | Enum / clamp | Values |
|--------|--------------|--------|
| Decoration motion | `pageBlockDecorationMotions` | `none`, `float`, `drift`, `pulse`, `orbit`, `radiate` |
| Decoration delay | `PAGE_DECORATION_DELAY_CLAMP` | `0`..`4000` ms |
| Decoration duration | `PAGE_DECORATION_DURATION_CLAMP` | `2000`..`16000` ms |
| Block tilt | `pageTiltStrengths` | `none`, `subtle`, `strong` |
| Surface preset | `pageSurfacePresets` | `none`, `glass`, `glass-grid`, `radial-glow`, `ambient-orbs` |
| Hover effect | `pageBlockHoverEffects` | `none`, `glow-reveal`, `lift`, `scale`, `lift-glow` |
| Composition | `pageCompositions` | `flow`, `layered` |
| Layer anchor | `pageLayerAnchors` | 9 grid positions (`top-left`..`bottom-right`) |
| Layer offset X/Y | `PAGE_LAYER_X_CLAMP`/`PAGE_LAYER_Y_CLAMP` | `-50`..`150` % |
| Layer Z | `PAGE_LAYER_Z_CLAMP` | `0`..`20` |
| Marquee direction | `pageMarqueeDirections` | `left`, `right` |
| Marquee speed | `PAGE_MARQUEE_SPEED_CLAMP` | `8`..`40` s |
| Custom-SVG draw speed | `PAGE_DRAW_SPEED_CLAMP` | `600`..`6000` ms |
| Custom-SVG byte cap | `PAGE_CUSTOM_SVG_MAX_BYTES` | `24576` (24 KiB) |

**CSS custom properties (set from normalized values only; consumed by
`PAGE_COMPOSITION_EFFECTS_CSS`):**

- `--deco-delay` / `--deco-duration` — decoration keyframe delay/duration (ms).
- `--deco-ring` / `--deco-ring-2` — radiate concentric-ring colors.
- `--layer-x` / `--layer-y` (%) / `--layer-z` — layered-canvas child placement
  (per-device varying token, emitted per breakpoint by `pageResponsiveCss.ts`).
- `--draw-speed` — custom-SVG stroke draw-in duration (ms).
- `--marquee-speed` — ticker scroll duration (s).
- `--surface-glow` — author retint, consumed by glass/radial-glow/hover glow
  (reference aqua/violet fallbacks). **Seed precedence (TASK-524-02):** block
  `style.surfaceTint` (independent, alpha-capable, sanitized) FIRST → plain block
  `style.background` FALLBACK → section `accent`; a gradient/url tint is left out
  (invalid in `radial-gradient()`) so CSS falls back to the literal. Per-device via
  `pageResponsiveCss.ts` (tablet/mobile `@media` retarget of this + `--deco-ring` +
  `--orb-color`, `!important`, gated on an active surface/effect).
- `--orb-color` / `--orb-color-2` — ambient-orb radial-gradient colors.
- `--glare-x` / `--glare-y` — tilt glare sheen position (updated on pointermove, rAF).

**`prefers-reduced-motion` guarantee.** Every keyframe binding sits inside a CSS
`@media (prefers-reduced-motion: no-preference)` gate, and the block-tilt runtime IIFE
early-returns on `matchMedia('(prefers-reduced-motion: reduce)').matches`, so a reduce
user keeps the STATIC layered/glass/surface styling but sees no animation, no tilt, no
hover transition. Effects are **present-only** — no token, no DDL, no migration; a
no-effect page renders byte-identically to post-521 output.

## Pages v2 page canvas background & spotlight layering (TASK-523)

- **Page canvas background** (`settings.background`) — a present-only per-page solid
  color OR CSS gradient emitted as inline `style.background` on the page `<Root>`,
  overriding the default `bg-white` utility. The Page settings panel authors solid colors only
  (shared color-only `ColorSwatchControl`, alpha-capable via TASK-519); gradients are
  model/import-only. The ONLY path a value reaches CSS is `sanitizeAuthoringCssBackground`
  (safe color/gradient, else the key is dropped), applied at write AND render.
- **Spotlight overlay layering z-index boundary** — the cursor-spotlight overlay paints at
  a FIXED `z-index:30` with `mix-blend-mode:screen` (occlusion-proof: above opaque section
  content, additive, `pointer-events:none`), STRICTLY BELOW the front sticky nav
  (`sticky z-40`) so screen-blend never tints the menu bar. The layered-canvas token
  `--layer-z` (`PAGE_LAYER_Z_CLAMP`) is bounded to a max of `20` — STRICTLY BELOW the
  overlay's `30` — so no authored layer can reach the spotlight and occlude the glow. The
  layering invariant is `PAGE_LAYER_Z_CLAMP.max (20) < overlay z-index (30) < nav z-index
  (40)`.

## Pages v2 per-block staggered reveal token (TASK-525)

TASK-525-02 adds a per-block scroll-reveal stagger so a revealing section's blocks
CASCADE (each fades on its own delay) instead of fading as one unit. It reuses the 521
reveal runtime/attributes (`data-reveal-armed`, `data-page-effect`, `data-revealed`) and
adds NO new runtime and NO new keyframe — only one bounded custom property fed into a
`transition-delay`.

**Enum & clamp:**

| Effect | Enum / clamp | Values |
|--------|--------------|--------|
| Block reveal delay | `PAGE_REVEAL_DELAY_CLAMP` | `0`..`4000` ms |

**CSS custom property (set from normalized values only; consumed by
`PAGE_REVEAL_MOTION_CSS`):**

- `--reveal-delay` — per-block scroll-reveal stagger (ms). Emitted on the `[data-block-id]`
  frame from `block.style.revealDelay` (normalized via `readNumber`, `Number.isFinite` +
  clamp), present-only (absent when unauthored → default `0ms`). Because it is a custom
  property it INHERITS down into a revealing section's children, and it is consumed as the
  `transition-delay` of the per-block reveal transition (`opacity .7s, transform .7s`) so
  each block staggers by its own delay. Only a bounded `${n}ms` literal reaches CSS — never
  a raw declaration/markup/URL.

**`prefers-reduced-motion` guarantee.** The `--reveal-delay` transition + `transition-delay`
live INSIDE the existing `@media (prefers-reduced-motion: no-preference)` + `[data-reveal-armed]`
gate, so under reduced-motion no transition runs and the delay is inert — motion-neutral,
identical to 521's reduced-motion behavior. Present-only — no DDL, no migration, no
schemaVersion bump; a no-`revealDelay` block renders byte-identically to post-522 output.

## Pages v2 premium backgrounds & colored glow (TASK-531)

TASK-531 adds two premium-fidelity surfaces to Page v2 blocks AND sections, both
present-only, jsonb-only (NO DDL, NO migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays
`2`], NO npm dependency): a **safe multi-layer background** (glow-over-gradient) and an
**arbitrary colored glow box-shadow**.

**Glow clamps (`PageGlow` — structured colored box-shadow):**

| Field | Clamp | Values |
|-------|-------|--------|
| Glow blur | `PAGE_GLOW_BLUR_CLAMP` | `0`..`120` px (default `24` at render) |
| Glow spread | `PAGE_GLOW_SPREAD_CLAMP` | `-40`..`80` px |
| Glow offset X/Y | `PAGE_GLOW_OFFSET_CLAMP` | `-80`..`80` px |

`glow.color` is REQUIRED and sanitized via `sanitizeAuthoringCssColor` at write (an
invalid/absent color OMITS the whole glow, present-only fail-soft). The spec composes at
render via the shared pure `composeGlowBoxShadow` (`pageGlow.ts`) into a FIXED `"<x>px <y>px
<blur>px <spread>px <color>"` box-shadow — never a raw author string, re-sanitized +
re-clamped at BOTH the SSR inline path (`pageRendererV2.tsx`) and the per-device RAW `<style>`
path (`pageResponsiveCss.ts`). When the enum `shadow` token is also set the glow is APPENDED
via `mergeShadows` (`"<enum-shadow>, <glow>"`) so both render. Authored via
`block.style.glow.*` / `section.style.glow.*` controls (color swatch + four numerics,
`responsive:true`).

**Multi-layer background caps (safe multi-layer `background` value):**

| Guard | Constant | Value |
|-------|----------|-------|
| Top-level layer cap | `PAGE_BG_MAX_LAYERS` | `6` |
| CSS value length cap | `PAGE_CSS_VALUE_MAX_LENGTH` | `512` |

`sanitizeAuthoringCssBackground` accepts a comma-separated list of safe gradient/color layers
(the reference `.cta-card`/`art-*` look) via an ALLOWLIST applied per top-level comma-split
layer (whole-value tripwire pre-pass → depth-0 comma split → each layer a safe color or safe
single gradient → `PAGE_BG_MAX_LAYERS` cap; length-capped at `PAGE_CSS_VALUE_MAX_LENGTH`;
fails CLOSED — see SECURITY_SPEC). The single-layer fast path is byte-identical. Both render
boundaries re-gate on `isSafeAuthoringCssGradient || isSafeAuthoringCssBackgroundLayers` so a
multi-layer value paints via `background-image`; the SECTION `backgroundType:"gradient"` branch
is NEW (block was already wired) and paints on the content box + the `100vw` bleed box for a
full-bleed section. No new `backgroundType` value — the gradient TYPE reuses the existing
`pageBackgroundTypes` enum. Present-only; a no-glow / single-layer / no-section-gradient
document renders byte-identically to post-530 output.

## Pages v2 typography fidelity (TASK-532)

Bundle B (Typography Fidelity) adds present-only, additive block-level fields on
top of the TASK-424 typography surface (all jsonb — NO DB migration, NO npm
dependency, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC).
Every field emits ZERO bytes when unauthored ⇒ post-530 / no-effect docs
normalize AND render byte-identical. Values reach CSS only as inline
custom-properties, fixed enum keywords, or grammar-validated length strings —
never raw declarations. Enums/clamps are owned by `pageDocumentV2.ts`; the fluid
length grammar is owned by `pageAuthoringSanitizers.ts`.

**Enums, clamps & grammar:**

| Field | Enum / clamp / grammar | Values |
|-------|------------------------|--------|
| `style.fontWeight` (extended) | `pageTypographyFontWeights` | +`extrabold` (800), +`black` (900) on top of `normal`/`medium`/`semibold`/`bold` |
| `style.textTransform` | `pageTypographyTextTransforms` | `none`/`uppercase`/`lowercase`/`capitalize` (`none` resets ⇒ omitted) |
| `style.fontSizeCustom` | `sanitizeAuthoringCssFontSize` grammar | bare number + unit (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`) OR single `clamp()`/`min()`/`max()` of such lengths; 64-char cap; wins over `fontSize` token |
| `divider.width` | `PAGE_DIVIDER_WIDTH_CLAMP` | `8`..`400` px (eyebrow short-rule length, default 34) |
| `divider.align` | `pageDividerAligns` | `left`/`center`/`right` |
| `divider.gradient` | boolean | `true` ⇒ slim `linear-gradient(90deg, <tone-color>, transparent)` `<span>` (tone from the `pageDividerToneBorderColor` whitelist); unset ⇒ legacy `<hr>` byte-identical |

**Security boundary.** `fontSizeCustom` is the only new free-text CSS surface and
is grammar-validated at the write boundary (rejects `url(`/`expression(`/`;`/`{`/
`}`/`<`/`\`/`:`/comment escapes fail-closed to omitted); `textColor` (rich path)
and the divider gradient tone color ride `sanitizeAuthoringCssColor`; the enums
fail closed (`PageDocumentError` on an unknown value in write mode). Each new key
joins the reject-unknown allowlist (`pageBlockStyleKeys` + `$defs/pageBlockStyle`
`additionalProperties:false`) with a round-trip test.

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
