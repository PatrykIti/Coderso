# Feature Grid Widget (v1)

## Purpose

Marketing grid for feature cards with optional highlighted-first emphasis,
media-first cards, CTA actions, and bounded layout/style controls.

## Widget ID

`feature-grid`

## Assistant Mapping

- `process`: supported via the Content pack `assistantPageSections` mapping for
  beginner site-builder process/workflow sections.

## Variants

- `cards-3`: three balanced cards with the default three-column desktop rhythm
- `cards-4`: four-card layout that now reaches the four-column desktop baseline
  at `lg`
- `highlight-first`: first card expands across two desktop columns while the
  remaining cards stay secondary

## Editor Modes

### Wizard

- setup-only variant action
- read-only cards count summary
- guidance that richer card/media/layout editing lives in `Visual`

### Visual

- variant preview cards
- truthful columns, gap, and cards count
- card management: drag handle, move button fallback, confirm-remove flow
- per-card title, description mode (`plain` / `rich`), and rich-text card copy
- icon input plus bounded emoji presets
- Media Library image picker, image alt text, and image-over-icon guidance
- explicit CTA enablement, published-page destination, and target selection
- card layout, text alignment, padding, media sizing, and horizontal layout
- surface/border colors
- section background, width, header size, card title size, and hover behavior
- color controls are swatch-only with separate theme-token, selected-swatch,
  saved-custom, and fallback-preview labels; authors are not asked to type CSS
  variables or token strings

### Advanced

- read-only layout summary
- read-only content/media/action health summary
- read-only presentation summary with human color/density labels
- authoring-boundary summary that points daily edits back to `Visual`

## Data Model

### Header

- `eyebrow`
- `title`
- `description`

### Items

- `id`
- `icon`
- `image`
- `imageAlt`
- `title`
- `description`
- `descriptionMode`: `plain` | `rich`
- `ctaEnabled`
- `ctaLabel`
- `ctaHref`
- `ctaTarget`: `same-tab` | `new-tab`

### Style

- `columns`: `2` | `3` | `4`
- `gap`: `none` | `sm` | `md` | `lg`
- `surfaceColor`
- `sectionBackground`
- `borderColor`
- `borderWidth`: `0` | `1` | `2` | `3`
- `radius`: `none` | `md` | `lg` | `xl`
- `textAlign`: `left` | `center` | `right`
- `cardPadding`: `compact` | `default` | `spacious`
- `mediaSize`: `sm` | `md` | `lg`
- `cardLayout`: `vertical` | `horizontal`
- `maxWidth`: `5xl` | `6xl` | `7xl` | `full`
- `headerSize`: `sm` | `md` | `lg`
- `cardTitleSize`: `sm` | `md` | `lg`
- `hoverEffect`: `none` | `lift` | `border`

## None And Clear Semantics

- `style.gap = "none"` removes card spacing
- `style.radius = "none"` removes forced card rounding
- `style.surfaceColor` is clearable
- `style.borderColor` is clearable
- `style.sectionBackground` is clearable

## Shared Safety Baseline

- card editor fields stack in one column inside each card so emoji preset
  buttons remain directly clickable and are not covered by neighboring media
  controls
- card-count or variant changes that would remove saved cards require
  destructive confirmation before truncating `items`
- public sections use `aria-labelledby` when a header title is present and
  `aria-label="Feature grid"` as the no-title fallback
- legacy invalid `items[].image` values stay visible in admin as read-only
  replace/clear state, but runtime output skips unsafe image URLs
- invalid `items[].ctaHref` values stay visible in admin with inline feedback,
  while runtime output rejects unsafe links
- existing custom/hash/external CTA links remain backward-compatible read-only
  replace/clear state in Visual and reuse shared safe-link attributes at runtime
- decorative emoji output is marked `aria-hidden="true"`
- rich descriptions are sanitized before runtime HTML output

## Current Deferred Or Shared-Follow-Up Scope

- `hero-card-above-grid` remains a deferred product variant; current Feature
  Grid stays within the three documented variants
- heading hierarchy policy (`A4` / `A5`) is not solved locally here and should
  route through a shared follow-up if product wants a cross-widget heading
  contract
- first-open editor mode policy (`UX-10`) is not a widget-local contract; this
  doc only reflects local Wizard guidance

## TASK-336-18 Editor Contract

- Exports `featureGridEditorContract` with `version: 2`.
- Contract target: Wizard exposes a setup-only layout action plus read-only
  cards-count guidance; Visual owns daily card content, CTA, media, layout, and
  styling; Advanced is read-only runtime diagnostics.

## TASK-336-19 Editor Drift Cleanup

- Advanced no longer renders a raw normalized payload snapshot or mutating
  normalization buttons.
- Advanced summaries use human labels instead of token/raw enum wording and
  expose no writable controls.
- Advanced color summaries reuse the shared color-control state labels:
  `Theme default`, `Transparent`, `Theme token`, selected picker color, or
  `Saved custom color`. CSS tokens such as `var(...)` and `color-mix(...)` are
  theme-token states, not saved custom colors.
- Visual color controls are swatch-only and carry explicit
  `data-widget-control-path` metadata for the persisted style fields.
- Wizard/Visual duplicate allowances now point at the active setup-only
  cleanup policy because Wizard is only visible on first setup or explicit
  `Run setup again`.
- Validation evidence:
  - `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-feature-grid-2026-05-26.*`
  - `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-feature-grid-focused-2026-05-26.*`
