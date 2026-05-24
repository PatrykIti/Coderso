# Feature Grid Widget (v1)

## Purpose

Marketing grid for feature cards with optional highlighted-first emphasis,
media-first cards, CTA actions, and bounded layout/style controls.

## Widget ID

`feature-grid`

## Variants

- `cards-3`: three balanced cards with the default three-column desktop rhythm
- `cards-4`: four-card layout that now reaches the four-column desktop baseline
  at `lg`
- `highlight-first`: first card expands across two desktop columns while the
  remaining cards stay secondary

## Editor Modes

### Wizard

- variant
- section title and description
- cards count
- basic card labels
- guidance that richer card/media/layout editing lives in `Visual`

### Visual

- variant preview cards
- truthful columns, gap, and cards count
- card management: drag handle, move button fallback, confirm-remove flow
- per-card title, description mode (`plain` / `rich`), and rich-text card copy
- icon input plus bounded emoji presets
- media picker, image URL, image alt text, and image-over-icon guidance
- explicit CTA enablement, URL, and target selection
- card layout, text alignment, padding, media sizing, and horizontal layout
- surface/border colors
- section background, width, header size, card title size, and hover behavior

### Advanced

- read-only layout diagnostics
- normalization actions
- raw normalized payload snapshot

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

- invalid `items[].image` values stay visible in admin for correction, but
  runtime output skips unsafe image URLs
- invalid `items[].ctaHref` values stay visible in admin with inline feedback,
  while runtime output rejects unsafe links
- external CTA links reuse shared safe-link attributes
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
- Contract target: Wizard seeds starter layout/count/copy; Visual owns daily
  card content, CTA, media, layout, and styling; Advanced is read-only runtime
  diagnostics.
- Remaining raw URL and normalization-action UX drift is routed to
  `TASK-336-19`.
