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
- variant selection

### Visual

Primary editing mode:
1. Variant and layout
2. Source and filters
3. Section context
4. Pagination and actions
5. Presentation fields
6. Empty state

Notes:
- `visualOwnsVariantSelection = true`
- `Columns` is only effective for `cards`; `list` / `compact` show an explanatory note instead of a misleading selector.
- Visual shows the current source mode and source-specific controls, but the source-mode switch itself stays in Wizard / Advanced.
- The builder canvas shows saved `resolved` data; save or open Preview to refresh live resolved content.

### Advanced

Technical-only surface:
- source mode
- item limit
- listing query/template selection when mode = `listing`
- author picker, search query, and featured toggle when mode = `legacy`
- styling tokens with shared clear/picker support
- runtime payload snapshot

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
- Advanced supports author selection, search query, and featured-only filtering.
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
- View-all links use the configured safe href or the resolved list path when available.
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
- Background, border, and text color controls currently expose the intended
  clear/picker UX; the later helper-level convergence onto the shared
  implementation itself remains tracked in `TASK-310-02`.
- Tag badges and section context are Content List-local, not shared Posts Feed behavior.
