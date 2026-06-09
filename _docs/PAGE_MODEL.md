# Page Builder Data Model (v2)

Specyfikacja JSON dla `pages.current_data` i `pages.published_data`.
TASK-417 robi czysty break: Pages nie sa juz dokumentem widgetowym. Strony
uzywaja `schemaVersion: 2`, sekcji i atomowych blokow.

## Root document

```json
{
  "schemaVersion": 2,
  "breakpoints": ["desktop", "tablet", "mobile"],
  "seo": {
    "title": "Home",
    "description": "Short public description",
    "image": null
  },
  "settings": {
    "template": "page-v2",
    "showInNav": true,
    "revisionRetention": 10,
    "collectionLink": null
  },
  "sections": []
}
```

Required root fields for writes:
- `schemaVersion: 2`
- `sections[]`

Fresh Page writes reject unknown root fields and reject legacy/versionless
`blocks[]` payloads. Stored legacy Page rows are non-destructively reset to an
empty v2 document on read/render/preview/revision paths; old rows are not
rendered through the widget runtime.

## Sections

Sections are the layout owner. They group atomic blocks and own responsive
layout, spacing, style, and visibility.

```json
{
  "id": "sec_hero",
  "type": "hero",
  "name": "Hero",
  "variant": "centered",
  "layout": {
    "columns": 1,
    "align": "stretch",
    "justify": "start",
    "maxWidth": 1080
  },
  "style": {
    "background": "#ffffff",
    "backgroundType": "color",
    "backgroundImage": null,
    "accent": "#0d9488",
    "radius": 0,
    "shadow": "none"
  },
  "spacing": {
    "paddingTop": 64,
    "paddingBottom": 64,
    "paddingLeft": 40,
    "paddingRight": 40,
    "gap": 24
  },
  "visibility": {
    "visible": true,
    "authOnly": false,
    "anchor": null,
    "startsAt": null,
    "endsAt": null
  },
  "responsive": {
    "mobile": {
      "layout": { "columns": 1 }
    }
  },
  "blocks": []
}
```

Core section types:
- `template`
- `navigation`
- `hero`
- `content`
- `feature-grid`
- `media-split`
- `timeline`
- `gallery`
- `collection`
- `comparison`
- `filters`
- `lead-form`
- `faq`
- `testimonials`
- `cta`
- `embed`
- `custom`

Section variants are intentionally small: `default`, `split`, `centered`,
`full-width`, `cards`, `grid`, `horizontal`, and `compact`.

## Atomic Blocks

Blocks are small content atoms. They are not the old specialized widget surface
and they do not own page-level layout.

```json
{
  "id": "blk_heading",
  "type": "heading",
  "props": {
    "text": "Build faster",
    "level": "h1",
    "align": "center"
  },
  "style": {
    "width": "auto"
  },
  "visibility": {
    "visible": true
  },
  "responsive": {
    "mobile": {
      "props": { "align": "left" }
    }
  }
}
```

Core block types:
- `heading`
- `text`
- `button`
- `image`
- `video`
- `gallery`
- `form`
- `list`
- `card`
- `collection`
- `embed`
- `divider`
- `spacer`
- `statistic`
- `icon`
- `quote`

Each block type has a strict allowlist of props. Unknown props are rejected on
fresh writes. Examples:
- `button`: `label`, `href`, `target`, `variant`, `size`
- `image`: `assetId`, `src`, `alt`, `caption`, `fit`
- `collection`: `contentTypeId`, `queryId`, `limit`, `templateId`
- `form`: `formId`, `title`
- `list`: `items`, `ordered`

`list.items[]` may be plain strings or simple `{ "label": "...", "href": "..." }`
objects for navigation/footer links.

## Responsive Cascade

The owner normalizer keeps `desktop`, `tablet`, and `mobile` breakpoints stable.
Responsive overrides are partial and are resolved at render time by applying:

1. base section/block values,
2. tablet override when previewing/rendering tablet,
3. mobile override when previewing/rendering mobile.

Desktop never needs an override to express the base state.

## Settings

`settings.template` resolves the Page v2 shell. Unknown/empty values normalize
to `page-v2`.

`settings.showInNav` controls whether published pages are eligible for runtime
navigation lists. Missing values normalize to `true`.

`settings.revisionRetention` controls publish revision retention:
- default: 10
- min: 1
- max: 100

`settings.collectionLink` is optional owner metadata used by assistant/catalog
flows to avoid duplicate canonical/supporting pages:

```json
{
  "contentTypeId": "content-type-id",
  "pageRole": "canonical-list-page",
  "compositionKey": null,
  "listingQueryId": "query-id",
  "listingTemplateId": "template-id"
}
```

## Public Runtime

Pages v2 render through `core/site/pageRuntimeV2.tsx`, not through
`WidgetRenderer`. Public and preview Pages use `renderPublicPageV2RuntimeHtml`.

Non-Page surfaces keep their widget contracts:
- widget templates,
- custom screens,
- detail pages,
- post/content block runtimes.

## Revisions And Autosave

`page_revisions` stores:
- `publish` snapshots, governed by `settings.revisionRetention`;
- one latest `autosave` snapshot for Page Settings/draft recovery.

Snapshots store normalized v2 Page documents:

```json
{
  "title": "Home draft",
  "slug": "/home-draft",
  "data": {
    "schemaVersion": 2,
    "sections": [],
    "settings": {
      "template": "page-v2",
      "showInNav": false
    }
  }
}
```

Restore applies `title`, `slug`, and normalized `current_data`. Autosave
revisions may be discarded; publish revisions may be restored but not discarded
through the autosave delete route.

## Assistant Contract

Assistant Page actions emit or update `sections[]`. `page.widget.patch` is
retired for Pages and is rejected by the strict action plan schema. Reusable
widget-template edits still use widget-template actions, and custom-screen
widget edits still use custom-screen actions.
