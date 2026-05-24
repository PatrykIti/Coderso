# Testimonials Widget (v2)

## Purpose

Customer proof section with quote cards, spotlight emphasis, or a static
horizontal slider strip. The widget now supports richer authoring for social
proof, safe avatar/background media selection, bounded section/card styling,
optional CTA output, and local JSON/CSV import-export for larger testimonial
sets.

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

Wizard covers the beginner-facing first-pass content flow:

- variant
- testimonial count
- section `eyebrow`, `title`, and `description`
- per-testimonial `quote`, `author`, `role`, `sourceLabel`, `rating`
- avatar URL entry plus Media Library image picking

### Visual

Visual owns the full product authoring surface:

- variant cards and count
- spotlight pinning for the `spotlight` variant
- per-testimonial rich quote formatting (`quoteHtml`) with plain-text fallback
- avatar URL validation plus Media Library selection
- section background color, gradient preset, tone, and optional background image
- header alignment and title size
- card spacing, radius, border width, and bounded color tokens
- contrast advisories for text/card and accent/card combinations
- optional CTA label, href, target, and style
- slider dot navigation and zero-rating semantics

### Advanced

Advanced keeps display diagnostics and large-set tooling without duplicating the
Visual-owned spacing and display controls.

- display diagnostics for variant, spacing token, rating-zero mode, and slider
  navigation state
- pagination `mode`, `pageSize`, `loadMoreLabel`
- normalization/reset helpers
- local JSON/CSV import preview + apply
- normalized JSON/CSV export generation
- raw payload snapshot

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
- Avatar URLs, CTA hrefs, and background image URLs fail closed at runtime when
  they are not safe relative or `http/https` values.
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
    "sectionBackground": "var(--color-surface)",
    "sectionGradient": "soft",
    "backgroundTone": "soft",
    "backgroundImage": "/media/testimonials-bg.jpg",
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "textColor": "var(--color-text)",
    "accentColor": "var(--color-primary)",
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
- Contract target: Wizard seeds starter social-proof copy/count; Visual owns
  quotes, authors, avatars, ratings, CTA, pagination, and style; Advanced is
  read-only runtime diagnostics.
- JSON/CSV import, pagination placement, and replayable duplicate ownership are
  routed to `TASK-336-19` / `TASK-336-16`.
