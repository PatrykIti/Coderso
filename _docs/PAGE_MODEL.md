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
`full-width`, `cards`, `grid`, `horizontal`, and `compact`. Variant editing is
base-only in Pages v2: tablet/mobile overrides cover section
`layout`/`style`/`spacing`/`visibility`, but not `variant`.

`pageSectionTemplates` owns the supported type/variant matrix consumed by the
renderer and editor controls:

| Section type | Supported variants | Fallback |
|---|---|---|
| `hero` | `default`, `split`, `centered`, `full-width` | `default` |
| `content` | `default`, `compact` | `default` |
| `feature-grid` | `default`, `cards`, `grid` | `default` |
| `media-split` | `split`, `horizontal`, `default` | `split` |
| `timeline` | `default`, `horizontal`, `compact` | `default` |
| `gallery` | `grid`, `cards`, `default` | `grid` |
| `comparison` | `default`, `grid`, `cards` | `default` |
| `faq` | `default`, `compact` | `default` |
| `testimonials` | `cards`, `grid`, `default` | `cards` |
| `cta` | `centered`, `full-width`, `default` | `centered` |
| `custom` | `default`, `compact`, `grid` | `default` |

Unsupported type/variant pairs render through the documented fallback variant
without mutating stored data. Stored valid non-insertable sections still keep
universal editor controls and render through generic fallback templates, while
command-palette insertion stays gated by `pageSectionCapabilities`.

## Blocks And Layout Slots

Most blocks are small content atoms. They are not the old specialized widget
surface and they do not own page-level layout. Pages v2 also has a small,
bounded set of layout blocks that own named `slots` for nested composition
inside a section. Sections remain top-level page bands; section-in-section
nesting is not part of the contract.

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
    "width": "auto",
    "align": "center",
    "textColor": "#111827",
    "background": null,
    "backgroundType": "none",
    "opacity": 1,
    "radius": 0,
    "shadow": "none",
    "borderColor": null,
    "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
    "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
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

Block style is bounded and optional. Supported style keys are:
- `align`: `left`, `center`, `right`;
- `width`: `auto`, `full`;
- `textColor`, `background`, `backgroundType`, `opacity`, `radius`, `shadow`,
  and `borderColor`;
- `padding` and `margin` using `{ top, right, bottom, left }` spacing objects.

The Pages owner clamps numeric style values and rejects unknown style keys on
fresh writes. Block responsive overrides are sparse deltas: `responsive.mobile`
or `responsive.tablet` may override only the changed `props`, `style`, or
`visibility` fields. The resolver applies section overrides first and then block
overrides through `resolvePageDocumentForBreakpoint`.

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
- `container`
- `columns`
- `group`

Layout block slot contract:
- `PAGE_BLOCK_MAX_TREE_DEPTH = 4`; a top-level block in `sections[].blocks[]`
  is depth 1.
- `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`.
- Slot keys are owned by `pageBlockCapabilities`, not by editor-local lists.
- `container`: props `{}` and `slots.children`.
- `columns`: props `{ count, gap, distribution }`, where `count` clamps to
  `1..4`, `gap` clamps to `0..120`, and `distribution` is `equal` or `auto`.
  It may own `slots.column:1` through `slots.column:4`.
- `group`: props `{ direction, wrap, gap }`, where `direction` is `row` or
  `column`, `wrap` is boolean, and `gap` clamps to `0..120`. It owns
  `slots.children`.

Layout blocks normalize and validate as Page data. Their capability transition
is intentionally staged during TASK-418-05:

- L01 keeps them hidden while the recursive data contract lands.
- L02 may expose them only in the admin editor through
  `pageBlockCapabilities[type].editorInsertable`, so editors can compose draft
  nested structures and edit slot children by path.
- During that L02 staging state, `container`, `columns`, and `group` still carry
  `insertable: false`, `assistantEmittable: false`,
  `runtimeRenderer: "placeholder"`, allowed `slots`, and a pending-nesting
  reason. Assistant emitters, solution kits, and public-ready catalogs must not
  consume `editorInsertable`.
- L03 owns recursive public/admin-preview rendering and responsive cascade. Only
  `container`, `columns`, and `group` are
  `editorInsertable: true`, `insertable: true`, `runtimeRenderer: "real"`,
  `assistantEmittable: false`, `publicDataBinding: "none"`, and no pending
  `reason`. Assistant emission stays false until TASK-418-06-L02 validates
  nested active-surface paths and blueprint alignment.
- L02 completes that assistant alignment: `container`, `columns`, and `group`
  now have `assistantEmittable: true`. Assistant `page.upsert` still gates
  block and section output through Page capabilities plus the explicit staged
  data-bound exceptions.

Runtime/admin-preview slot rendering is intentionally narrower than stored data
preservation:

- `container` and `group` render the `children` slot.
- `columns` renders only active slots derived from normalized `props.count`, in
  ascending order `column:1` through `column:N`.
- Dormant `columns` slots beyond `props.count` remain preserved in data but are
  not rendered while inactive.
- Each active slot renders a stable slot wrapper even when empty, and children
  inside the slot render in stored order.

Each block type has a strict allowlist of props. Unknown props are rejected on
fresh writes by both the imperative normalizer and `pageDocumentV2JsonSchema`.
Examples:
- `button`: `label`, `href`, `target`, `variant`, `size`
- `image`: `assetId`, `src`, `alt`, `caption`, `fit`
- `collection`: `contentTypeId`, `queryId`, `limit`, `templateId`
- `form`: `formId`, `title`
- `list`: `items`, `ordered`
- `columns`: `count`, `gap`, `distribution`
- `group`: `direction`, `wrap`, `gap`

`list.items[]` may be plain strings or simple `{ "label": "...", "href": "..." }`
objects for navigation/footer links.

Fresh writes reject:
- unknown slot keys,
- `slots` on non-layout blocks,
- children deeper than `PAGE_BLOCK_MAX_TREE_DEPTH`,
- more than `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT` children in one slot,
- duplicate block ids anywhere in the Page document,
- cyclic object references from programmatic callers.

Stored reads remain non-destructive for legacy/corrupt rows: malformed slot
containers, slots on atom blocks, unknown slot keys, over-depth descendants, and
cyclic branches are dropped; oversized slot arrays are clipped to
`PAGE_BLOCK_MAX_CHILDREN_PER_SLOT`; duplicate block ids after the first
occurrence are renamed deterministically.

`pageDocumentV2` owns `pageBlockCapabilities`, which is the source metadata for
whether a block type is admin-editor insertable, runtime-ready insertable,
assistant-emittable, runtime-renderable, slot-capable, or data-bound.
Non-insertable block types also carry an explicit `reason`. Downstream
editor/runtime/assistant code must consume that owner metadata instead of
maintaining parallel block capability lists.

Runtime-renderable and insertable are related but not identical states:

- `gallery` has a real static public renderer for normalized `items[]` and
  `layout`, so solution-kit output no longer falls back to a generic placeholder.
  It remains absent from editor and assistant insertion with
  `reason: "gallery-editor-controls-pending"` until gallery controls and
  authoring tests ship in the same increment.
- `collection`, `form`, and `embed` have real scoped public runtime renderers
  with `publicDataBinding: "scoped-read-only"` and still remain not
  editor-insertable or assistant-emittable. The public runtime resolves only
  visible/authorized sections, maps collection props through the content-list
  resolver with `statusScope: "published"`, reuses the forms runtime projection
  without adding a write route, and renders embeds only as hardened provider
  iframes or sanitized inline markup. Missing or invalid resources fail closed
  without leaking internal ids or raw errors.
- `icon` remains gated with `reason: "icon-runtime-renderer-pending"` until a
  real renderer, controls, and tests ship together.

The insertable catalog is test-frozen: guard tests in
`tests/vitest/pages/page-editor-control-registry.test.ts` and
`tests/vitest/ui/page-editor-v2-flow.test.tsx` assert the exact 11 insertable
sections, 14 insertable blocks, the capability reasons for all 6 gated sections
and 5 gated blocks, and that the gated entries stay absent from the command
palette by entry title (`icon` additionally stays the only
`runtimeRenderer: "placeholder"` type). Promoting or demoting any catalog entry
is an intentional contract change that must update those tests and this
document together.

`pageBlockPaths` owns section-scoped editor block paths for nested authoring.
Paths are arrays of `{ index, slotKey? }` segments rooted in one section:
`[{ index: 1 }, { slotKey: "column:2", index: 0 }]` identifies a child block in
the second column of the second top-level block. Editor mutations must use these
helpers for nested get/update/insert/move/duplicate/delete behavior, stable DOM
serialization, depth and slot-size checks, self-descendant move rejection, and
deterministic delete-selection fallback. Assistant active surfaces expose a
bounded server-revalidated string path such as
`sections.0.blocks.1.slots.column:2.0`; planning hydration derives or confirms
that path from the normalized current Page document and clears stale
section/block/path selections.

The shared renderer carries the same section-scoped path model through recursive
admin-preview frame callbacks. Frame metadata includes the rendered block path,
depth, slot key for nested children, and parent block where applicable. Page
editor chrome must consume this renderer metadata for nested canvas selection
instead of reconstructing paths from the top-level `section.blocks[]` list.

`pageDocumentV2` also owns Page editor option and section capability metadata:
`pageSectionCapabilities` records whether each section type is insertable or why
it is intentionally hidden, while exported option arrays such as
`pageHeadingLevels`, `pageButtonTargets`, `pageButtonVariants`,
`pageButtonSizes`, `pageTextAlignments`, `pageTextFormats`,
`pageSectionVariants`, `pageSectionAlignments`, `pageSectionJustify`,
`pageShadowTokens`, `pageBackgroundTypes`, `pageBlockWidths`, `pageImageFits`,
`pageGalleryLayouts`, `pageDividerTones`, `pageColumnDistributions`,
`pageGroupDirections`, and `pageBlockSlotKeys` are the only source for editor
select/segmented controls and slot affordances. Enum-like block props are
normalized and represented in `pageDocumentV2JsonSchema` by the same owner
arrays.

`pageEditorControlRegistry` defines universal section/block controls plus
per-type atomic controls for insertable blocks with schema-owned array paths,
matching responsive override paths, bounded inputs, and capability-gated target
lookup. Registry consumers must patch only fields accepted by `pageDocumentV2`;
dot-string paths and UI-local enum copies are not part of the contract. The admin
Page editor consumes this registry for selected block controls and derives admin
block inserter choices from `pageBlockCapabilities.editorInsertable`. Runtime
and assistant surfaces must continue to use the stricter `insertable` and
`assistantEmittable` flags. On tablet/mobile, registry consumers must expose
whether each field is inherited or overridden and reset only the selected field
path without clearing unrelated sparse overrides.

## Responsive Cascade

The owner normalizer keeps `desktop`, `tablet`, and `mobile` breakpoints stable.
Responsive overrides are partial and are resolved at render time by applying:

1. base section/block values,
2. tablet override when previewing/rendering tablet,
3. mobile override when previewing/rendering mobile.

Desktop never needs an override to express the base state.

Nested blocks store the same sparse `responsive.tablet` and `responsive.mobile`
override records as top-level blocks. `resolvePageDocumentForBreakpoint`
resolves those overrides recursively through every rendered slot child before
public runtime or admin preview output is produced.

## Settings

`settings.template` resolves the Page v2 shell. Unknown/empty values normalize
to `page-v2`.

Page template inputs use the Page v2 section/block contract. The owner helper
`core/services/pages/pageTemplateBoundary.ts` resolves runtime Page template
input as:

- `kind: "page-v2"`;
- `documentContract: "page-v2-section-block-contract"`;
- a normalized `PageDocumentV2` with `sections[]`.

Fresh Page-template inputs must not carry a legacy root `blocks[]` payload.
Stored legacy Page rows keep the existing read/render compatibility behavior:
they are non-destructively reset to an empty v2 document rather than hydrating
old widget-template blocks into Page runtime.

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

Pages v2 section/block rendering is owned by
`core/services/pages/pageRendererV2.tsx`, not by `WidgetRenderer`. The public
runtime adapter in `core/site/pageRuntimeV2.tsx` delegates to that shared
renderer, and public/preview Pages use `renderPublicPageV2RuntimeHtml`.

The shared renderer resolves section templates through `pageSectionTemplates`.
It emits both `data-page-section` and the resolved `data-page-variant`, plus
`data-page-section-template`, so public runtime and admin canvas consume the
same type/variant layout output before editor chrome is added.

The shared renderer owns block frame render props for `PageBlockStyleV2`:
width/alignment classes, text/background variables, opacity, radius, border,
shadow, padding, and margin are applied before public runtime or admin preview
chrome wraps the block. Hidden block frames are omitted from public/shared
runtime output by default. Admin preview may opt into hidden blocks through the
renderer extension point and must render them as selectable ghost chrome instead
of public content.

Non-Page surfaces keep their widget contracts:
- widget templates,
- custom screens,
- detail pages,
- post/content block runtimes.

Those surfaces remain on `documentContract: "legacy-widget-block-contract"` and
own `WidgetBlock[]` data until a dedicated migration changes them. TASK-420
tracks the deferred product decision to introduce a separate Page Templates
surface or migrate Advanced Widgets templates without mixing Page v2 documents
into legacy widget-template rows.

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

`page.upsert.sections[]` normalizes through `pageDocumentV2` before action plan
acceptance, then the assistant schema rejects Page section/block types outside
the assistant output vocabulary. Runtime-real `heading`, `text`, `button`,
`image`, `video`, `list`, `card`, `divider`, `spacer`, `statistic`, `quote`,
`container`, `columns`, and `group` blocks are assistant-emittable. Existing
static `gallery` output remains accepted but not broadly advertised until its
authoring controls ship. `collection`, `form`, and `embed` are runtime-real
scoped public data-bound blocks, but they are not advertised as
assistant-emittable until focused Page controls and assistant policies ship.
