# Testimonials Widget (v2)

## Purpose

Customer proof section with quote cards, spotlight emphasis, or a static
horizontal slider strip. The widget now supports richer authoring for social
proof, safe avatar/background media selection, bounded section/card styling,
and optional CTA output. Local import/export parsing remains a domain helper
for support tooling, but the normal widget editor no longer asks users to paste
raw data.

## Widget ID

`testimonials`

## Variants

- `grid`: balanced multi-card proof grid.
- `spotlight`: highlights one selected testimonial while keeping supporting
  quotes visible.
- `slider-static`: SSR horizontal strip with optional dot navigation; this is
  not a client-side carousel runtime.

## Editor Modes

### Wizard

Wizard is now a read-only setup summary:

- current variant
- read-only testimonial count summary

Daily list size, section copy, quotes, authors, ratings, avatars, CTA, and
display settings belong to Visual.

### Visual

Visual owns the full product authoring surface:

- variant cards and count
- sectioned Visual IA:
  - `Variant and layout structure`
  - `Header copy`
  - `Testimonials content and ratings`
  - `Section surface and typography`
  - `Colors and emphasis`
  - `CTA and conversion follow-up`
  - `Pagination and load more`
- spotlight pinning for the `spotlight` variant
- per-testimonial rich quote formatting (`quoteHtml`) with plain-text fallback
- avatar Media Library selection with read-only legacy external URL state
- section background color, gradient preset, tone, and optional Media Library
  background image
- header alignment and title size
- card spacing, radius, border width, and bounded color tokens
- contrast advisories for text/card and accent/card combinations
- optional CTA label, published-page destination, target, and style
- load-more pagination mode, visible count, and button label
- slider dot navigation and zero-rating semantics

### Advanced

Advanced is read-only diagnostics. It must not duplicate Visual authoring or
ask nontechnical users for raw data.

- sectioned Advanced IA:
  - `Runtime summary`
  - `Display settings`
  - `Content health`
- runtime summary for variant, testimonial count, and spotlight item
- display summaries for spacing, rating-zero mode, slider navigation, and
  pagination
- content-health summaries for avatar/rating completeness and CTA state

## Runtime Behavior

- `layout.spotlightItemId` chooses the highlighted testimonial for the
  `spotlight` variant. Stale ids normalize to the first surviving testimonial.
- `behavior.sliderNavigation = "dots"` renders root-scoped SSR anchor dots for
  `slider-static` when more than one visible testimonial exists.
- `behavior.ratingDisplay` controls `rating = 0` output:
  - `hide-empty`: render no rating block.
  - `label-empty`: show `No rating` copy.
  - `stars`: render five empty stars.
- `pagination.mode = "load-more"` keeps the first `pageSize` testimonials
  visible and reveals the remainder through SSR `<details>` disclosure.
- Legacy avatar URLs and background image URLs fail closed at runtime when they
  are not safe relative or `http/https` values. Legacy custom/hash/external CTA
  `href` values stay read-only replace/clear state in Visual and continue to
  render only through the shared safe-link allowlist.
- Avatar images lazy-load and use contextual `Photo of ...` alt text derived
  from the author plus any available role/source metadata.
- `quoteHtml` is sanitized to bounded paragraph/line-break/emphasis/link markup
  before runtime output.

## None Token Support

- `style.spacing = "none"` renders zero gap between testimonial cards.
- `style.cardRadius = "none"` removes card rounding.
- `style.cardBorderWidth = "none"` removes visible card borders.

## Clear Controls

- `style.sectionBackground`, `style.cardSurface`, and `style.cardBorder` are
  clearable. Clear removes the stored field and the renderer omits the related
  inline style.
- `style.textColor` and `style.accentColor` use shared clear-to-default token
  behavior.
- `style.backgroundImage` is clearable and returns to no authored background
  media.

## Import / Export Policy

- The widget-local parser lives in
  `core/widgets/core/testimonialsImportExport.ts`.
- The parser is not exposed as a normal Widget editor control. Any future
  import/export workflow must be support-only or live in a dedicated bulk-data
  flow with confirmation, validation, and beginner-safe copy.
- Supported formats: local JSON array/object-with-`testimonials`, and CSV with
  the header row:
  `id,quote,quoteHtml,author,role,avatar,rating,sourceLabel`.
- Unknown fields are rejected per row.
- Import accepts `2`-`24` testimonials. Each row needs an `author` plus either
  a usable plain `quote` or usable sanitized `quoteHtml`, and the parser
  normalizes ids, ratings, and safe rich quote HTML before persistence.
- Export serializes the normalized testimonial rows only. CSV output is
  formula-safe and preserves the authored row count without fabricating
  fallback rows.

## Data Model (summary)

```json
{
  "header": {
    "eyebrow": "Customer stories",
    "title": "Trusted by teams that ship fast",
    "description": "Use real customer voices to build trust and reduce hesitation."
  },
  "testimonials": [
    {
      "id": "testimonial-1",
      "quote": "We launched our marketing site in two days.",
      "quoteHtml": "<p><strong>We launched</strong> our marketing site in two days.</p>",
      "author": "Anna Kowalska",
      "role": "Product Marketing Lead",
      "avatar": "https://cdn.example.com/avatar.jpg",
      "rating": 5,
      "sourceLabel": "Acme Studio"
    }
  ],
  "cta": {
    "enabled": true,
    "label": "Read more stories",
    "href": "/case-studies",
    "target": "same-tab",
    "style": "secondary"
  },
  "layout": {
    "spotlightItemId": "testimonial-1"
  },
  "behavior": {
    "sliderNavigation": "dots",
    "ratingDisplay": "hide-empty"
  },
  "pagination": {
    "mode": "none",
    "pageSize": 6,
    "loadMoreLabel": "Load more testimonials"
  },
  "style": {
    "sectionBackground": "#ffffff",
    "sectionGradient": "soft",
    "backgroundTone": "soft",
    "backgroundImage": "/media/testimonials-bg.jpg",
    "cardSurface": "#ffffff",
    "cardBorder": "#e2e8f0",
    "textColor": "#0f172a",
    "accentColor": "#1d4ed8",
    "spacing": "md",
    "headerAlign": "center",
    "titleSize": "md",
    "cardRadius": "lg",
    "cardBorderWidth": "sm"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `testimonialsEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only setup summary; Visual owns quotes,
  authors, avatars, ratings, CTA, pagination, and style; Advanced is read-only
  runtime diagnostics.
- `TASK-336-19` aligns the editor with that target: pagination is Visual-owned,
  Advanced has no writable inputs/selects/textareas/buttons/raw snapshots, color
  authoring is swatch-only, and temporary Wizard/Visual duplicate allowances are
  tied to the umbrella `TASK-336` one-time starter setup contract.
