# Content List Widget (v1)

## Purpose

Dynamic listing widget that renders entries from either:
- a selected Content Type, or
- a selected Listings query/template pair.

It is used in runtime preview and public site output for editorial collections,
content teasers, and bounded list navigation.

## Widget ID

`content-list`

## Variants

- `cards`: card grid with optional media, tags, excerpt, CTA, and multi-column layout.
- `list`: single-column article stream.
- `compact`: denser stack for sidebars or short utility collections.

## Editor Modes

### Wizard

Minimal onboarding:
- source mode (`By content type` / `By listing query`)
- content type search/select or listing query/template select
- item limit
- status/sort setup for legacy content-type sources

Wizard is a one-time setup surface. It does not own presentation, card style,
pagination labels, colors, empty-state copy, or daily filters.

### Visual

Primary editing mode:
1. Variant and layout
2. Daily filters with read-only Wizard source summary
3. Section context
4. Pagination and actions
5. Presentation fields
6. Surface color swatches
7. Empty state

Notes:
- `visualOwnsVariantSelection = true`
- `Columns` is only effective for `cards`; `list` / `compact` show an explanatory note instead of a misleading selector.
- Visual shows the current source mode and source-specific daily filters, but source binding and source-mode switching stay in Wizard.
- Surface colors use swatches and clear controls in Visual; nontechnical users are not asked to type CSS variables or design-token strings.
- View-all navigation uses the shared page-first destination picker. Editors
  choose a published page or leave the field empty to use the resolved list
  page when available; Visual does not ask users to type raw URL/path strings.
- Search fields used to filter content types or authors are preview/helper
  controls only and do not claim persisted widget paths.
- The builder canvas shows saved `resolved` data; save or open Preview to refresh live resolved content.

### Advanced

Read-only diagnostics surface:
- source summary
- style summary
- sanitized runtime summary with item counts, pagination state, runtime health,
  and support-owner guidance only

Advanced does not mutate source, style, filters, or resolved runtime payloads.
It renders human summaries instead of raw JSON snapshots, internal IDs, raw CSS
tokens, or editable support fields.

## Data Model (summary)

```json
{
  "title": "",
  "description": "",
  "source": {
    "mode": "legacy",
    "contentTypeId": "",
    "listingQueryId": "",
    "listingTemplateId": "",
    "statusScope": "published",
    "limit": 6,
    "sort": "published-desc"
  },
  "filters": {
    "taxonomy": "",
    "featuredOnly": false,
    "searchQuery": "",
    "authorId": ""
  },
  "pagination": {
    "mode": "none",
    "pageSize": 6,
    "viewAllHref": "",
    "viewAllLabel": "View all",
    "loadMoreLabel": "Load more"
  },
  "fields": {
    "showImage": true,
    "showExcerpt": true,
    "showMeta": true,
    "showCta": true
  },
  "emptyState": {
    "title": "No items found",
    "description": "Adjust filters or publish entries for this content type."
  },
  "style": {
    "columns": "3",
    "gap": "md",
    "cardStyle": "outlined",
    "imageAspect": "standard",
    "tagMode": "meta-line",
    "tagLimit": 2,
    "ctaLabel": "Read more",
    "backgroundColor": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "textColor": "var(--color-text)"
  },
  "resolved": {
    "items": [],
    "total": 0,
    "sourceTypeId": "",
    "sourceTypeSlug": "",
    "listPath": "",
    "listingQueryId": "",
    "listingTemplateId": "",
    "resolvedAt": "",
    "runtime": {
      "rejectedTokens": [],
      "searchQuery": "",
      "page": 1,
      "pageSize": 6,
      "totalPages": 1,
      "previousPageHref": "",
      "nextPageHref": ""
    }
  }
}
```

## Source Behavior

### Legacy content type mode

- Uses the selected `contentTypeId` plus widget-owned filters.
- Visual supports taxonomy suggestions from the taxonomy overview seam.
- Visual supports author selection, search query, and featured-only filtering.
- Runtime pagination uses a widget-scoped query key derived from `blockId`:
  `cl.<blockId>.page`.

### Listing query mode

- Uses the selected `listingQueryId` and optional `listingTemplateId`.
- Widget-owned legacy filters are cleared/hidden when switching into listing mode.
- Runtime page navigation reuses the shared listing runtime token contract:
  `lq.<listingQueryId>.__page`.
- Sort/filter behavior is owned by the selected Listings query.

## Runtime Behavior

- Runtime data is resolved server-side before render.
- Public output (`preview=false`) stays read-only and published-only.
- Preview output (`preview=true`) can respect broader status scope for legacy content.
- Detail links use `site.contentRoutes` with safe fallback patterns.
- View-all links use the configured page-picker href or the resolved list path when available.
- Legacy `load-more` grows cumulatively from the first slice through the
  requested page instead of replacing the list with page-local results.
- Legacy `view-all` ignores stale `cl.<blockId>.page` params and always starts
  from the first bounded slice.
- CTA output is truthful: if `showCta=true` and an item has no href, a disabled label is rendered instead of silently disappearing.
- Tags can render in the meta line, as bounded badges, or stay hidden.
- Empty-state copy is source-aware:
  - legacy mode defaults to `content type` copy
  - listing mode defaults to listing-query copy

## Deterministic Markers

The widget renders stable DOM markers for QA/runtime assertions:
- `data-content-list-variant`
- `data-content-list-source-mode`
- `data-content-list-source`
- `data-content-list-items`
- `data-content-list-status-scope`
- `data-content-list-state`
- `data-listing-widget="content-list"`
- `data-listing-block-id`
- `data-listing-query-id`

## Shared Contract Notes

- `ContentListBlock` is also used by `posts-feed`, so shared renderer truthfulness lives alongside the widget-owned Content List surface.
- Shared date metadata now renders semantic `<time dateTime="...">` output with
  readable UTC-stable labels when runtime dates are valid.
- Shared CTA output now adds contextual accessible naming from the visible CTA
  label plus the item title without changing visible copy.
- Background, border, and text color controls now use the landed shared
  clear/picker implementation.
- Tag badges and section context are Content List-local, not shared Posts Feed behavior.
