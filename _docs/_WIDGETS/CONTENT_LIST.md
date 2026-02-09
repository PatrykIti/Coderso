# Content List Widget (v1)

## Purpose

Dynamic listing widget that renders entries from a selected Content Type in runtime preview and public site output.

## Widget ID

`content-list`

## Variants (v1)

- `cards`: card grid with optional media and excerpt
- `list`: one-column stream
- `compact`: dense layout for sidebars/utility sections

## Editor Modes (current after TASK-050-14-01)

### Wizard (minimal onboarding)
- content type selection
- item limit
- variant selection

### Visual (primary editing mode)
Sections:
1. Variant and layout
2. Source and filters
3. Presentation fields
4. Empty state

Notes:
- Content List owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- query controls (limit, author, search, featured)
- styling tokens (background/border/text)
- runtime payload snapshot (read-only diagnostics)

## Runtime Behavior Notes

- Runtime data is resolved server-side before rendering:
  - public output: published entries only
  - preview output: respects `statusScope`
- Resolver supports:
  - status scope filtering
  - taxonomy/tag filtering
  - featured-only mode
  - author filter
  - search query match on title/slug/tags/excerpt
  - deterministic sorting
- Detail links are generated from `site.contentRoutes`; fallback pattern is `/{typeSlug}/:slug`.
- Widget exposes deterministic markers:
  - `data-content-list-variant`
  - `data-content-list-source`
  - `data-content-list-items`
  - `data-content-list-status-scope`
  - `data-content-list-state`

## Data Model (summary)

```json
{
  "source": {
    "contentTypeId": "",
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
    "resolvedAt": ""
  }
}
```
