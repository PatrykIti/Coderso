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
    "maxWidth": 1080,
    "stackVertical": false
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

`layout.stackVertical` (TASK-425) is the vertical-stacking switch: when the
EFFECTIVE resolved value at a breakpoint is `true`, the section content grid is
forced to a single column, beating the template-floored column count. It is
optional on input and defaults to `false` through full normalization, so
documents saved before the field render exactly as before. Like every other
layout key it is per-breakpoint override-able through
`responsive[bp].layout.stackVertical`; the typical authoring shape keeps the
base `false` and sets `responsive.mobile.layout.stackVertical = true` from the
editor's Responsive panel.

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

Phase 3B section template semantics are part of the public runtime contract:

- `content.compact`, `faq.compact`, and `timeline.compact` reduce published
  spacing/gap rather than emitting marker-only classes.
- `media-split.split` and `media-split.horizontal` keep the two-column template
  floor and group existing child blocks into media and content zones. `split`
  renders media first; `horizontal` renders content first.
- `timeline.horizontal` floors the grid to at least three columns and wraps
  each child block in a timeline item with a marker. Other timeline variants
  keep the item/marker structure with their resolved grid/spacing.
- `gallery` remains a section template over existing child blocks. `cards`
  wraps child blocks in card surfaces while `grid` keeps the flat section grid;
  this does not ungate or redefine the standalone `gallery` block.
- `testimonials.cards` wraps child blocks in card surfaces while
  `testimonials.grid` keeps flat grid rendering.
- `cta.default`, `cta.centered`, and `cta.full-width` have distinct published
  alignment/min-height classes. `full-width` still pins `max-width: none`.
- `feature-grid`, `comparison`, and `custom` keep their existing truthful
  grid/card geometry guards while using the shared dedicated control surface.

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
    "backgroundImage": null,
    "opacity": 1,
    "radius": 0,
    "shadow": "none",
    "borderColor": null,
    "borderWidth": 0,
    "borderStyle": "none",
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
- `textColor`, `background`, `backgroundType`, `backgroundImage`, `opacity`,
  `radius`, `shadow`, `borderColor`, `borderWidth`, and `borderStyle`;
- `padding` and `margin` using `{ top, right, bottom, left }` spacing objects;
- token-backed typography (TASK-424), nullable with unset/`null` meaning
  "keep the baked classes" so pre-existing documents render identically:
  - `fontFamily`: `sans` | `display` (theme token refs emitted as
    `var(--font-sans/--font-display, <default stack>)`),
  - `fontSize`: `2xs` | `xs` | `sm` | `md` | `lg` | `xl` | `2xl` | `3xl` |
    `4xl` | `5xl` (theme scale refs emitted as `var(--text-*, <default size>)`),
  - `fontWeight`: `normal` | `medium` | `semibold` | `bold` (400/500/600/700),
  - `lineHeight`: unitless number clamped to 1–2.5,
  - `letterSpacing`: px number clamped to -2–8.

Typography fields persist on any block but paint only on typography-capable
block types (`heading`, `text`, `button`, `list`, `card`, `statistic`,
`quote` — `pageTypographyCapableBlockTypes` in `pageDocumentV2.ts`). The
renderer paints them inline on the exact text node(s) a block renders (the
`h1`–`h6`, `p`, `blockquote`, `ul`/`ol`, statistic value/label/caption, card
title/body), marked with `data-page-block-text="true"`; the button paints them
on its anchor element together with the rest of its visual surface. Painting
on the text node is mandatory: typography on the block frame would lose to the
baked utility classes (`text-5xl`, `font-semibold`) on the text node itself.
Unknown typography tokens reject on fresh writes and normalize to `null` on
stored reads.

`style.align` is block-box self-alignment for every block type. `center` and
`right` resolve the frame to fit-content width (`w-fit`) and use grid
`justify-self` plus auto horizontal margins, so `width: "full"` does not force a
centered/right-aligned block to stretch. Content/text alignment remains owned by
the block's text props where they exist (`heading.props.align`, `text.props.align`)
or by the relocated typography presentation of `style.align` for other
text-capable blocks.

The Pages owner clamps numeric style values and rejects unknown style keys on
fresh writes. Block padding/margin side values clamp to `0..240`; block border
width clamps to `0..12`, and `borderStyle` is `none` | `solid` | `dashed` |
`dotted`. `borderStyle: "none"` suppresses border paint even when
`borderColor` is present; legacy color-only blocks keep the historical
`1px solid` fallback. Block `backgroundImage` stores a sanitized Page media URL
and only paints when `backgroundType === "image"`, with `cover`/`center`
defaults. Gradient backgrounds remain the existing `style.background` string,
but the editor composes it from a sanitized linear/radial gradient model rather
than introducing a second data structure. Block responsive overrides are sparse
deltas: `responsive.mobile` or `responsive.tablet` may override only the
changed `props`, `style`, or `visibility` fields. The resolver applies section
overrides first and then block overrides through
`resolvePageDocumentForBreakpoint`.

Core block types:
- `heading`
- `text`
- `badge`
- `button`
- `image`
- `video`
- `gallery`
- `form`
- `list`
- `card`
- `collection`
- `filters`
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

Layout blocks normalize and validate as Page data. Current capability state:
`container`, `columns`, and `group` are editor-insertable, public insertable,
runtime-rendered as real blocks, assistant-emittable, and use
`publicDataBinding: "none"` with no pending reason. Assistant `page.upsert`
still gates block and section output through Page capabilities plus the
explicit staged data-bound exceptions.

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
- `heading`/`text`/`quote`: optional base-only `marks[]` for fragment
  formatting ranges. Supported marks are `{ "type": "bold" | "italic",
  "from": number, "to": number }`, `{ "type": "color" | "highlight", "from":
  number, "to": number, "color": string }`, and `{ "type": "link", "from":
  number, "to": number, "href": string }`. Marks are capped at 24, clamped to
  the plain text length, fail closed through Page color/link sanitizers, and
  normalize same-type conflicts deterministically while allowing cross-type
  overlap. Responsive overrides may not carry `props.marks`.
- `badge`: `text`, `variant` (`solid` | `soft` | `outline`), `size` (`2xs` |
  `xs` | `sm` | `md`), `shape` (`pill` | `rounded` | `square`), `weight`
  (`normal` | `medium` | `semibold` | `bold`), nullable `background`,
  nullable `textColor`, nullable allowlisted `icon` (`check`, `sparkles`,
  `star`, `zap`, `shield`, `heart`), and `iconPosition` (`start` | `end`).
- `button`: `label`, `href`, `target`, `variant`, `size`
- `image`: `assetId`, `src`, `alt`, `caption`, `fit`
- `collection`: `contentTypeId`, `queryId`, `limit`, `templateId`,
  `paginationMode` (`none` | `paged` | `load-more`, default `none`),
  `pageSize` (nullable; unset follows `limit`). Both numeric props clamp to
  the SINGLE owner bound `PAGE_COLLECTION_LIMIT_CLAMP` (1..24 from the widget
  contract's `contentListLimitMax`) — see the TASK-459-03 notes below.
- `filters`: `queryId`, `facets`, `aliases`, `layout` (`horizontal` |
  `sidebar`), `autoApply`, `showSearch`, `showCount`, `searchLabel`,
  `searchPlaceholder`, `applyLabel`. `facets[]` stores the canonical generic
  facet contract shared with the listing runtime
  (`core/services/search/filterContract.ts`): kinds
  `taxonomy`/`checkbox`/`radio`/`range`/`date-range`/`sort`, a schema field
  path (`data.*` or allowlisted system fields), an operator defaulted per
  kind, explicit option lists for option-backed kinds, and `field:dir` sort
  options. Fresh writes preserve reject-unknown on every nested facet record
  and cap the list at 24 facets; normalization canonicalizes through
  `normalizeListingFacetConfigs`, so fieldless non-sort facets drop
  deterministically. `aliases` is a bounded map of public query-param names to
  canonical runtime tokens, e.g. `{ "rooms": "data.rooms.in", "sort":
  "__sort", "page": "__page" }`; fresh writes reject invalid names/tokens and
  canonical `lq.*` params win over aliases when both are present.
- `form`: `formId`, `title`
- `list`: `items`, `ordered`
- `columns`: `count`, `gap`, `distribution`
- `group`: `direction`, `wrap`, `gap`

Pages v2 public/admin-preview rendering must keep the following block props
truthful:

- `text.format: "plain"` escapes and renders copy as text. `text.format:
  "rich"` renders a small sanitized HTML subset (`p`, `strong`, `em`, `i`,
  `code`, `ul`, `ol`, `li`, `br`, and safe `a[href]` with
  `rel="nofollow noreferrer"`), drops active content, and never uses raw
  `dangerouslySetInnerHTML`. Rich text is inline-editable on the canvas through
  the same shared authoring sanitizer (`sanitizeAuthoringRichTextHtml`) used by
  the panel and renderer, so allowlisted markup round-trips while dangerous
  tags/content and unsafe links fail closed.
- `button.variant` changes the anchor visual surface (`primary`, `secondary`,
  `ghost`, `link`), `button.size` changes anchor spacing/type scale, and the
  primary/accent surfaces consume `--coderso-section-accent` through inline
  styles on the anchor, not through generated utility-class availability.
- `badge` renders as a native Page V2 inline-flex pill with `data-page-badge`
  attributes. Badge size resolves through the Page typography token variables
  (`--text-2xs` through `--text-md`), colors are sanitized before store/render,
  and icon tokens are fixed to a small lucide allowlist; no widget runtime,
  widget registry, or widget editor participates.
- `heading`/plain `text`/`quote` marks render as React segments:
  `bold -> <strong>`, `italic -> <em>`, `link -> <a rel="nofollow noreferrer">`,
  `color -> <span style.color>`, and `highlight ->
  <span style.backgroundColor>`. The renderer re-normalizes stored marks before
  painting and never opens a broad `span style` HTML allowlist or
  `dangerouslySetInnerHTML` sink for marks.
- `image.fit` changes the public image object-fit class (`cover` or
  `contain`).
- `video.autoplay` emits `autoPlay` on the rendered `<video>` and forces the
  browser policy companions `muted` and `playsInline`; `video.title` emits
  `title` and `aria-label` on the rendered media element; unset/false autoplay
  preserves manual playback behavior.
- `card.image` renders a sanitized image above the card copy and `card.href`
  wraps the title in a safe link. Unsafe media/link values fail closed.
- `divider.tone` changes the public border color (`neutral`, `muted`,
  `accent`) while `divider.thickness` keeps controlling border width.

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
  with `publicDataBinding: "scoped-read-only"`. The public runtime resolves only
  visible/authorized sections, maps collection props through the content-list
  resolver with `statusScope: "published"`, reuses the forms runtime projection
  without adding a write route, and renders embeds only as hardened provider
  iframes or sanitized inline markup. Missing or invalid resources fail closed
  without leaking internal ids or raw errors.
- TASK-456 promoted `form` into the editor-insertable catalog: the Content
  panel ships a `formId` combobox (dynamic `optionsSource: "forms"` resolved
  by the editor shell through `listFormsCached()`, with an explicit "None" row
  for the nullable schema and a dangling-value marker for deleted forms) plus
  a `title` text control. The editor canvas renders the form block through
  the shared renderer in `layoutMode: "canvas-device"` as an inert preview
  (disabled fieldset, pointer events off, no submission nonce) fed by
  `pageEditorFormPreview.ts` from cached admin form details; the public
  submit pipeline is untouched. `form` stays `assistantEmittable: false`, and
  the `lead-form` SECTION deliberately stays gated
  (`reason: "form-section-boundary"`): a lead-form layout is a section
  composed with the form block (composite-first), not a separate section type.
- TASK-457 promoted `collection` into the editor-insertable catalog: the
  Content panel ships a `contentTypeId` combobox (dynamic
  `optionsSource: "contentTypes"` resolved through `listContentTypesCached()`),
  a `queryId` combobox (`optionsSource: "listingQueries"` SCOPED by the
  registry's `filterBy: "contentTypeId"` — only entry-sourced saved queries
  targeting the picked type resolve, and switching the content type clears the
  stored `queryId` in the same write), a `limit` slider (the schema clamp
  1..50 via the bounded-number upgrade, unitless readout), and a `templateId`
  combobox (`optionsSource: "listingTemplates"`). The editor canvas renders
  the collection block through the shared renderer in
  `layoutMode: "canvas-device"` as an inert preview (pointer events off) fed
  by `pageEditorCollectionPreview.ts` from the cached content types + entries
  clients: published entries only, runtime-parity mapping through the shared
  `mapPageCollectionBlockToContentListData` (which keeps the runtime's
  effective render cap of 24 entries), the "pick a content type" empty state
  for unbound blocks, and the runtime resolver's exact fail-closed error for
  dangling type ids. Saved queries/templates do not execute in the canvas —
  the preview approximates the listing with the type's published entries; the
  public runtime keeps resolving the real query/template server-side
  (TASK-418-06-L04). `collection` stays `assistantEmittable: false`, and the
  `collection` SECTION deliberately stays gated
  (`reason: "collection-section-boundary"`): a listing layout is a section
  composed with the collection block (composite-first).
- TASK-459-02 promoted `filters` into the editor-insertable catalog: the
  visitor-facing facet surface for any listing-driven page. The block binds a
  `queryId` to a saved listing query (the SAME query a sibling collection
  block lists, so one visitor filter state drives both), and the public
  runtime renders the shared `listing-filters` facet markup
  (`core/widgets/core/listingFilters.tsx`) through
  `resolveListingFiltersRuntimeData` — a plain GET form whose inputs use the
  canonical `lq.<queryId>.<field>.<op>` / `__sort` / `__q` names by default,
  or configured pretty aliases from `props.aliases` (`rooms`, `sort`, `q`,
  `page`, etc.). Aliases resolve to the same canonical tokens before runtime
  validation, so filtering, the visitor sort control, search, and pagination
  work WITHOUT JavaScript through the existing server-side pipeline
  (allowlist validation, rejected tokens dropped). The block also renders the
  result-count display
  (`data-page-filters-count`, the execution `total` per the TASK-459-01
  counts contract; truthful full-corpus values land with TASK-459-04). The
  Content panel ships a `queryId` combobox (unscoped
  `optionsSource: "listingQueriesAll"`), the generic facet builder
  (`input: "facets"` -> the `FacetListControl` primitive, field-driven by
  design), behavior toggles (`autoApply`, `showSearch`, `showCount`), and the
  label text fields; the Layout panel owns the `horizontal`/`sidebar`
  variant. The editor canvas renders the configured facet form inert (pointer
  events off, no live filtering, no runtime script) and shows a "pick a saved
  query" empty state for unbound blocks; the public runtime fails closed to
  the shared inert placeholder for unresolved or dangling queries. `filters`
  stays `assistantEmittable: false` (the blueprint composer binds RESOLVED
  query ids explicitly), and the `filters` SECTION deliberately stays gated
  (`reason: "listing-section-boundary"`): a filter layout is a section
  composed with the filters block (composite-first). Legacy assistant
  documents that attached `mode: "filters"` to a collection block normalize
  non-destructively into a filters + collection pair (same `queryId`; filter
  props move to the new filters block, listing props stay on the original
  collection) per the frozen TASK-459-01 decision; the blueprint composer
  emits the canonical filters block going forward.
- `embed` remains not editor-insertable or assistant-emittable.
- `icon` remains gated with `reason: "icon-runtime-renderer-pending"` until a
  real renderer, controls, and tests ship together.

The insertable catalog is test-frozen: guard tests in
`tests/vitest/pages/page-editor-control-registry.test.ts` and
`tests/vitest/ui/page-editor-v2-flow.test.tsx` assert the exact 11 insertable
sections, 17 insertable blocks (TASK-456 added `form`, TASK-457 added
`collection`, TASK-459-02 added `filters`), the capability reasons for all 6
gated sections and 3 gated blocks (`gallery`, `embed`, `icon`), and that the
gated entries stay absent from the command palette by entry title (`icon`
additionally stays the only `runtimeRenderer: "placeholder"` type). Promoting
or demoting any catalog entry is an intentional contract change that must
update those tests and this document together.

Page v2 runtime body scripts (TASK-459-02): the public v2 render path owns a
body-script emission seam mirroring the legacy widget registry —
`publicSite.tsx` registers required runtime scripts on a
`createWidgetRuntimeScriptRegistry()` instance from the prepared runtime
contract and threads `renderBodyScripts` into
`renderPublicPageV2RuntimeHtml`. Today exactly one script exists: the shared
listing runtime client (`getListingRuntimeClientScript()`, fetch-swap +
`history.pushState` for facet forms), emitted as
`data-coderso-runtime-script="listing-runtime"` exactly when the prepared
document flags `needsListingRuntimeScript` (a filters block bound to an
existing saved query rendered a live facet form). Pages without live filters
ship zero client JS, unchanged. The script swaps every element carrying
`data-listing-query-id` + `data-listing-block-id` for the bound query — the
filters block wrapper (count + form) and the collection block's shared
listing markup — and degrades to the plain GET submit when it fails.

Collection pagination and listing presentation (TASK-459-03):

- **Visitor pagination props.** The collection block stores `paginationMode`
  (`none` | `paged` | `load-more`) and a nullable `pageSize`. `none` stays the
  schema default — legacy documents normalize to it and render exactly as
  before. `paged` renders the shared numbered pager under the listing:
  a totals line ("N results", `data-content-list-total`), windowed page
  numbers (1 … 4 5 6 … 12, current page `aria-current="page"`), and
  Previous/Next. `load-more` keeps the single next-page anchor. All pager
  hrefs are server-rendered (no-JS safe) from the canonical page-href helper
  `buildContentListPageHref` (page 1 DROPS the page param; other pages set it
  on top of the current search params, so active filters survive paging).
  Listing-bound pagers ride `lq.<queryId>.__page` by default, or the filters
  block alias mapped to `__page` when one is configured; legacy content-type
  listings ride `cl.<blockId>.page`. The resolver's runtime meta carries
  `pageParamKey` + `search` so the widget builds every numbered href with the
  same owner helper. Pager anchors carry
  `data-listing-page-link="1"`: the TASK-459-02 listing runtime client
  intercepts them inside `data-listing-query-id` blocks for fetch-swap +
  `history.pushState`, and `needsListingRuntimeScript` now also flags paged,
  listing-bound collections (legacy `cl.*` pagers stay plain navigations).
  The editor canvas keeps all pagination affordances inert (TASK-457
  pointer-events discipline).
- **Filtered HTML cache.** Public Page v2 renders with listing-only dynamic
  bindings use the short-TTL site HTML cache. The cache signature accepts only
  structurally valid canonical `lq.<queryId>.<token>` params, legacy
  `cl.<blockId>.page`, and route-level `page`/`sort`; unknown params and
  overlong signatures render uncached instead of poisoning or fragmenting the
  cache. Pretty alias params still resolve server-side through the filters
  block alias registry; arbitrary aliases are not added to the global cache
  allowlist.
- **Clamp unification.** The old split (schema/editor 1..50 vs runtime 1..24)
  silently truncated authored values. The single bound is now
  `PAGE_COLLECTION_LIMIT_CLAMP = { min: 1, max: contentListLimitMax (24) }`,
  owned by the widget render contract and consumed by the document schema,
  the prop normalizers, the editor control clamps, and the runtime binding.
  Migration is normalize-on-read: stored documents with `limit` 25..50 read
  back as 24 — exactly what they already rendered — with no stored rewrite;
  fresh writes clamp the same way.
- **Listing template presentation.** A bound listing template's
  `config.style` (`columns` 1..6, `gap` xs..xl, `cardVariant`
  default/compact/minimal) and `config.emptyState` are now consumed at render
  bind (`mapListingTemplatePresentationToContentList`): columns map 1:1 onto
  the widget grid (extended to 6), the gap scale collapses onto
  none/sm/md/lg, `compact` selects the compact list variant and `minimal` the
  minimal card style, and the template's empty-state title/description
  replace the generic copy. Blocks without a template (or templates without
  style) keep today's grid defaults — no visual change for existing pages.
- **Dangling-route guard (frozen TASK-459-01 policy).** The resolver no
  longer falls back to `/<typeSlug>/:slug` when no ENABLED content route
  exists (the matcher can never match that pattern, so every such card link
  was a guaranteed 404). Instead card hrefs are SUPPRESSED: the resolved data
  carries `cardLinkMode: "missing-route"`, cards render unlinked with the
  explicit "links unavailable until a detail route is configured" note, and
  no rendered card may link to a URL `matchContentRoute` cannot match.
  Registering/enabling the content route in Site Settings restores the links
  on the next render. Listing rows that carry their own hrefs (template
  action hrefs, row-level `href` bindings) keep them — the guard only covers
  resolver-built detail links.
- **Auto entry-list routes.** `renderEntryListHtml` consumes
  `?page=N` and `?sort=<ContentListSort>` through the same listing pipeline
  primitives (validated sort enum with fallback, clamped page, shared
  navigation meta with canonical hrefs) at a fixed page size of 24
  (`contentListLimitMax`), and the list templates (default + theme
  `content-list`) render the shared `ContentListPager` plus an explicit
  empty state. Out-of-range pages clamp instead of 404ing.

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

Unbounded reference pickers (TASK-456/457) are registry `select` controls
flagged with an `optionsSource` (`"forms"`, `"contentTypes"`,
`"listingQueries"`, `"listingTemplates"`) instead of static `options`;
`pageEditorControlUiModel` maps them to a
`{ kind: "combobox", optionsSource, placeholder, allowNull, filterBy?, emptyMessage? }`
model and the editor shell resolves the named source through the cached admin
clients (`forms` -> `listFormsCached()`, `contentTypes` ->
`listContentTypesCached()`, `listingQueries`/`listingTemplates` -> the
listings client; id -> name) into the shared `ComboboxControl` primitive in
`core/admin/ui/pages/editorControls/` (searchable, keyboard accessible,
"None" row for nullable schema values, dangling-value marker).
Dynamic-source controls derive `nullable` from the owner schema default in
`pageBlockDefaultProps`. A registry `filterBy` names a sibling prop that
scopes the option list (TASK-457: listing queries scoped to the chosen
`contentTypeId`); future reference pickers must reuse this combobox contract
unchanged.

`pageEditorControlRegistry` additionally owns the Responsive panel contract
(TASK-425): `pageEditorDeviceMetadata` is the single source for the editor
device labels and canvas widths (Desktop 1080 / Tablet 744 / Mobile 390 —
bracketed by the public media bounds in `pageResponsiveCss.ts`),
`pageResponsiveHideToggles` defines the per-breakpoint hide-on-screen toggles
(the desktop toggle writes the BASE `visibility.visible`; tablet/mobile write
the existing `responsive[bp].visibility.visible` override containers — no new
schema paths), `pageSectionStackVerticalControl` is the section-only
vertical-layout toggle on `layout.stackVertical`, and
`projectPageResponsiveOverrideEntries` projects every responsive-capable
control of a target onto its Base / Override / Inherited state for the
panel's per-field override list. Reset affordances may only render for fields
with an actual override, and unsupported targets project no entries instead of
fake controls. The Responsive panel in `PageEditor.tsx` is the rendering
owner; the floating panel stays the sole control surface.

The editor shell contract (TASK-451-02-L01) adds two `PageEditor.tsx`-owned
behaviors on top of that surface. `resolveToolbarTargetLabel(target, {
fallbackToTypeName: true })` is the single owner of the floating-toolbar label:
it resolves the selected block/section TYPE display name ("Text tools",
"Statistic tools", "Quote tools", "Hero tools") and never leaks user-entered
block content or placeholder copy into the toolbar label or its `aria-label`;
content hints remain only where they already existed (layer rows, delete
dialogs, content panel header). Canvas gaps render hover-revealed
`SectionGapInsertZone` insertion points (`data-page-editor-section-gap`,
indices `0..sections.length`) that open the shared command palette pre-targeted
at the gap, and `addSection` splices the chosen section at that index instead
of appending; the persistent top-of-canvas `Add section` button keeps the
append behavior.

### Modular Authoring Surface (TASK-464)

`PageEditor.tsx` is the host shell for page chrome: loading/saving, preview,
publish, settings, revisions, assistant context, cached admin clients, and
site-token style bridging. Reusable authoring modules live under
`core/admin/ui/pages/editor/` and stay browser-safe:

- `pageEditorHostContract.ts` owns structural host types and extension slots.
  It must not value-import admin clients, server routes, DB/runtime loaders,
  provider SDKs, storage adapters, password hashing, or secret stores.
- `PageAuthoringCanvas.tsx` owns the Page v2 canvas frame, section shell,
  block frames, ghost add affordances, nested slot chrome, and inline-edit
  wiring. Rich text blocks render sanitized rich output on canvas and, when
  edited inline, commit `innerHTML` through the shared rich-text sanitizer
  instead of the plain-text inline sanitizer. It receives resolved site-token
  style values from the shell instead of reading settings itself.
- Canvas inline-mark interaction (plain text/heading/quote, desktop): a first
  click selects the block; a second single click enters inline edit with the
  caret at the click point (double-click also works). The floating mark toolbar
  is a sibling of the editable, so it snapshots the live DOM selection on its
  `mousedown` and each swatch/button applies against that snapshot rather than
  the async `selectionRange` state. The toolbar's `mousedown` preserves the
  selection for buttons (cancels the default) but allows the link URL `<input>`
  to focus and type; an `onBlur` guard keeps inline edit alive while focus is
  inside the toolbar. Applied color/highlight/link marks live on
  `block.props.marks` and paint as `data-page-text-mark` segments **while
  editing** (the contentEditable renders the marked children, mirroring the
  rich-text path); after applying a mark the selection is restored over the marked
  range so it is visible and can be re-colored in place. Commit still reads
  `innerText`, so `props.marks` remains the source of truth. Re-applying a
  different color/href over the same range replaces it in one click; the identical
  value toggles it off. The toolbar offers the brand/border design-token swatches
  (each previewing the exact `var(--color-*)` it applies) plus a native
  `<input type="color">` for an arbitrary sanitized hex.
- Color swatch previews reflect the LIVE resolved site theme. The editor canvas
  frame (`data-page-editor-canvas-frame`) carries the site **neutral**
  `--color-bg/-surface/-text` (via `toPageCanvasColorCssVariableMap`) so neutral
  block colors are WYSIWYG in-editor — the brand `--color-*` already resolve via
  the admin `@theme` and are intentionally not re-emitted on the frame (would shift
  editor chrome). The resolved site `getPageEditorColorPalette(siteTokens)` is
  threaded to the block/section/badge `ColorSwatchControl`s via a palette context
  around the floating panel, so their swatches preview the exact color they apply
  (TASK-477-02). A brand color *applied* to a block still resolves to the admin
  theme in-canvas (preview-only fix for brand; neutrals are fully WYSIWYG).
- `FloatingEditorToolbar.tsx` owns shared toolbar button chrome only. The
  full panel orchestration remains shell-owned until a future task extracts a
  generic non-Page-v2 panel engine.
- `PageEditorLayers.tsx` and `PageEditorCommandPalette.tsx` own the layers
  rows, command groups, and Page Template insertion picker UI. The parent
  shell still owns document mutation and template instantiation.
- `pageEditorOptions.ts` and `pageEditorLabels.ts` own neutral option/label
  derivation that can be reused by Pages, Page Templates, and Menu Design.

Pure editor derivation and mutation helpers live in
`core/services/pages/pageEditorState.ts` and
`core/services/pages/pageEditorMutationActions.ts`. They patch only Page v2
owner paths, keep sparse responsive overrides deterministic, and sanitize
section style writes before draft mutation.

Page Editor session controls are intentionally browser-local and Page-only:

- In-session undo/redo wraps the central `setDocumentDraft` path with bounded
  document+selection snapshots (cap 50). The stack resets after document load,
  save, settings save, and publish so persisted drafts never replay stale local
  mutations. Keyboard shortcuts (`Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z`,
  `Cmd/Ctrl+Y`) ignore editable targets and inline editing surfaces.
- Clipboard fragments use the `coderso/page-fragment@v1` payload with
  `kind: "section" | "block"`. Clipboard API writes are mirrored to
  `sessionStorage` as a same-session fallback. Paste always regenerates section
  and block ids, re-normalizes the fragment through the Page document owner
  before insertion, and inserts blocks after the selected block or at the end of
  the selected section while sections paste after the selected section.

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

### Responsive CSS Emission Contract

`core/services/pages/pageResponsiveCss.ts` owns the public delivery contract
for the cascade (TASK-423-01). It converts stored responsive deltas into
deterministic, selector-scoped `@media` rules so the public runtime can serve
desktop-resolved base markup plus media queries instead of flattening the
document to one breakpoint server-side:

- `buildPageResponsiveCss(document)` returns the stylesheet string;
  `buildPageResponsiveCssPlan(document)` additionally returns fail-closed
  diagnostics for deltas that cannot be expressed as CSS. Documents without
  responsive overrides emit an empty string (no empty `@media` shells).
- Breakpoint bounds come from the single owned constant
  `pageResponsiveMediaBounds`: tablet `(min-width: 640px) and
  (max-width: 1023px)`, mobile `(max-width: 639px)`. The bounds bracket the
  editor canvas device widths (1080 / 744 / 390). Tablet rules are
  range-bounded because mobile inherits the DESKTOP base, not tablet; an
  unbounded tablet `max-width` query would leak tablet overrides into mobile
  viewports.
- Rules are scoped through the stable renderer attributes
  (`data-section-id`, `data-block-id`, `data-page-section-content`,
  `data-page-block-element`, `data-page-block-text`; exported as
  `PAGE_SECTION_ID_ATTRIBUTE`, `PAGE_BLOCK_ID_ATTRIBUTE`,
  `PAGE_SECTION_CONTENT_ATTRIBUTE`, `PAGE_BLOCK_ELEMENT_ATTRIBUTE`,
  `PAGE_BLOCK_TEXT_ATTRIBUTE`). Section style rules target the section
  content element; visibility rules target the id node itself. Ids are
  CSS-string escaped; every declaration carries `!important` because the
  desktop base values are inline styles.
- Mapped deltas: section `layout` (`maxWidth`, `align`, `justify`, `columns`
  via the shared template column floors, and `stackVertical` — a
  merged-effective `true` forces `grid-template-columns: repeat(1, ...)`
  exactly like the renderer, an explicit `false` over a stacked base restores
  the template-floored count), section `style`
  (accent/background/radius/shadow), section `spacing` (padding sides, gap),
  block `style` (align/width/colors/background/opacity/radius/shadow/border/
  padding/margin), block typography
  (fontFamily/fontSize/fontWeight/lineHeight/letterSpacing, scoped to the
  block's `data-page-block-text` node — or the `data-page-block-element` node
  for the button — mirroring the renderer's text-target contract), and
  `visibility.visible: false` as `display:none`.
- Only schema-clamped numbers, enum-token lookups, and strictly validated
  color/gradient strings reach the stylesheet; anything else fails closed
  into diagnostics, never guessed CSS.
- Explicitly NOT CSS-expressible (diagnostics-only): block
  `responsive[bp].props` content overrides (no content-override contract
  exists yet), non-`visible` section visibility fields
  (`authOnly`/`anchor`/`startsAt`/`endsAt`), `maxWidth` overrides on
  `full-width` variants (the renderer pins `max-width: none`), typography
  overrides on non-typography-capable block types, explicit `null` typography
  overrides (clearing back to baked classes at one breakpoint cannot beat the
  inline desktop base), and any override on nodes hidden at the desktop base
  or in inactive `columns` slots, including `visible: true` restores — that
  markup is absent from the desktop-resolved base HTML.

### Responsive Delivery In The Public Runtime

The public runtime consumes the emission contract (TASK-423-02):

- `renderPublicPageHtmlInternal` (`core/server/publicSite.tsx`) renders the
  desktop-resolved base markup as before and, for requests without an
  explicit `previewDevice`, additionally calls
  `buildPageResponsiveCss(document)` over the unflattened normalized
  document. `renderPublicPageV2RuntimeHtml`
  (`core/site/renderPublicPage.tsx`) injects the result as a dedicated
  `<style data-page-responsive="true">` head element, so real visitors get
  one HTML payload whose overrides apply at real viewports.
- An explicit `previewDevice` (admin preview / editor parity) keeps the
  current flatten-to-one-breakpoint semantics and skips public CSS emission:
  preview output contains no `data-page-responsive` style element.
- Builder failures fail closed to desktop-only markup (no responsive style
  element), never malformed HTML.
- The emitted CSS lives inside the page HTML string, so the site HTML cache
  stays device-agnostic (`profileId|path` keys) and existing invalidation
  covers responsive delivery without a new cache surface.
- `pageRendererV2.tsx` binds its emitted scope hooks to the constants
  exported by `pageResponsiveCss.ts` (`PAGE_SECTION_ID_ATTRIBUTE`,
  `PAGE_BLOCK_ID_ATTRIBUTE`, `PAGE_SECTION_CONTENT_ATTRIBUTE`), keeping
  selector scoping and markup emission in lockstep.

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
Section-template wrappers (`data-page-media-split-zone`,
`data-page-timeline-item`, `data-page-gallery-section-item`,
`data-page-faq-item`, and `data-page-testimonial-item`) are emitted by the same
renderer path and compose existing child blocks instead of introducing
widget-template runtime dependencies.

For resolved `full-width` variants, the outer section band must not add the
default page gutter. The painted content node already owns background, spacing,
grid, and `max-width: none`; keeping wrapper `px`/`py` on the outer `<section>`
would leave white strips around hero/CTA backgrounds and break the full-bleed
authoring contract.

The shared renderer owns block frame render props for `PageBlockStyleV2`:
width/alignment classes, text/background variables, opacity, radius, border,
shadow, padding, and margin are applied before public runtime or admin preview
chrome wraps the block. Token-backed typography fields paint inline on the
block's text node(s) (`toPageBlockTypographyStyle`, marked
`data-page-block-text="true"`); for the button they merge into the anchor
element style (`toPageBlockElementStyle`). The same node paints on the editor
canvas (`PageSectionContent`) and the published front (`PageDocumentRender`).
Hidden block frames are omitted from public/shared
runtime output by default. Admin preview may opt into hidden blocks through the
renderer extension point and must render them as selectable ghost chrome instead
of public content.

Non-Page surfaces keep their widget contracts:
- widget templates,
- custom screens,
- detail pages,
- post/content block runtimes.

Those surfaces remain on `documentContract: "legacy-widget-block-contract"` and
own `WidgetBlock[]` data until a dedicated migration changes them. The Page
Templates contract is frozen by TASK-420-02 in the
"Page Templates (Reusable Page v2 Templates)" section below and implemented by
TASK-420-03, which also deleted the obsolete widget-template product surface
(routes, preview target, admin UI, cached clients).

## Site Shell (Global Navigation And Footer) — TASK-455

Navigation is a SITE concern, not a per-page section (the `navigation` Page
section stays gated by `runtime-navigation-boundary`). The global site shell
wraps EVERY public Page v2 render — published pages, the homepage, and the
tokenized preview (page and page-template previews included) — with a header
navigation and a footer:

- Settings keys (owned by `core/services/settings/settingsService.ts`,
  reject-unknown preserved): `site.navigationMenuId` and
  `site.footerTemplateId`, both nullable id strings. `null` means "no header
  nav" / "no footer".
- Resolver: `core/services/pages/publicSiteShell.ts` —
  `resolvePublicSiteShell()` returns
  `{ navigation: MenuWithItems | null, footerDocument: PageDocumentV2 | null }`.
  Only `published` menus and `published` page templates resolve; missing,
  draft, deleted, malformed-id, or unreadable references fail closed to `null`
  (never an error page). The admin write path validates references up front
  through `assertSiteShellMenuExists` / `assertSiteShellTemplateExists`
  (machine-readable `site_shell_menu_not_found` /
  `site_shell_template_not_found`, mapped to 400 by the settings route's
  `mapSettingsRouteError`). Draft references are accepted on write; publish
  status gates rendering only.
- Render placement: `core/server/publicSite.tsx` resolves the shell once per
  request (`resolveSiteShellRenderProps`), maps the menu tree through the
  canonical `navigationMenuMapping` helpers (`pageId` -> published page slug,
  safe hrefs), and threads `siteShell` + `siteName` through
  `renderPublicPageV2RuntimeHtml` into `DefaultRuntimePageShellV2`
  (`core/site/pageRuntimeV2.tsx`): `<SiteHeaderNav>` above and `<SiteFooter>`
  below the page `<main>`.
- Shell components live in `core/site/siteShell.tsx` and ship ZERO client
  JavaScript. Nested menu items render as native `<details>/<summary>`
  dropdown disclosures (single submenu depth; deeper descendants flatten into
  the dropdown); the mobile collapse is a CSS-only `<details>` toggle whose
  `[open]` state reveals the single shared link list via a sibling selector.
  Breakpoints reuse the owned `pageResponsiveMediaBounds` contract. Items with
  `logged_in` visibility are omitted from the anonymous public render.
- Header appearance (TASK-458-02): the published menu's public design
  snapshot in `menus.settings.published.appearance` (`MenuAppearance`, owned
  by `core/services/menus/normalizeMenuAppearance.ts`) drives the shell
  stylesheet; legacy envelopes without `published` fall back to the historical
  top-level `menus.settings.appearance`. `core/site/siteShellCss.ts`
  `buildSiteShellCss(appearance)`
  maps each normalized field (surface/link/hover/active colors incl.
  `transparent`, item gap, bar padding, alignment, font size/weight/transform,
  border color/width, shadow, sticky, dropdown direction, mobile mode) onto
  the same scoped rule set that used to be the static `SITE_SHELL_CSS`
  constant. FAIL-CLOSED DEFAULTS: `buildSiteShellCss(null)` and the
  all-defaults model reproduce the legacy stylesheet BYTE-IDENTICALLY (pinned
  by `tests/unit/pages/siteShellCss.test.ts`), so menus without a stored
  appearance render exactly as before. The public stylesheet is built only
  from schema-validated, clamped, enum-mapped values
  (`sanitizeMenuAppearance` re-runs on the render path) — raw stored input
  never reaches the CSS channel, and a missing/legacy/unparsable value
  degrades to the default look without throwing. Appearance resolves from the
  PUBLISHED snapshot only (top-level draft edits never leak); `publicSite.tsx`
  threads it as `siteShell.navigationAppearance` into `buildSiteShellCss` at
  the injection site in `renderPublicPage.tsx`.
- Footer content is a published Page Template document rendered through the
  SAME `PageDocumentRender` pipeline (`rootTag="div"` so the page keeps its
  unique `<main>` landmark) inside `<footer data-site-footer="true">`. Footer
  responsive CSS rides `buildPageResponsiveCss(document, { scopeSelector })`
  with the distinct `[data-site-footer="true"]` scope, concatenated after the
  page's own rules in the same `data-page-responsive` style block.
- Caching: public pages cache stores rendered HTML that embeds the shell, so
  settings writes/deletes touching either shell key clear the whole site cache
  (`clearSiteCache()` inside `settingsService` write paths). Menu/template
  content edits propagate via the normal site-cache TTL.
- Admin surface: shell attachment now lives on the Menus surface through
  `core/admin/ui/menus/SiteShellDialog.tsx`, opened from
  `core/admin/ui/menus/MenuListPage.tsx`. The dialog lazy-loads published menus
  (cached menus client) and published page templates (`pageTemplatesClient`)
  with a "None" option; an unpublished current selection stays listed and is
  marked "not published — hidden on site". Writes stay scoped to the existing
  settings PATCH and `site_shell_*` errors surface inline under the matching
  picker.

## Menu Design Editor And Editor Host Capabilities — TASK-458-03

The shared Page Editor v2 surface is bound to documents through the
`PageEditorHost` seam (`core/admin/ui/pages/PageEditor.tsx`; precedent:
`PageTemplateEditorPage`). TASK-458-03 extends the seam with generic,
optional capabilities and ships the menu DESIGN view on top of them:

- **`palette?: { sections?: PageSectionType[]; blocks?: PageBlockType[] }`** —
  host-side palette SCOPING. When present, the listed types INTERSECT the
  globally insertable options everywhere insert choices surface: command
  palette groups, canvas ghost tiles, gap inserts, and add-beside (all entry
  points list from the same scoped option sets). The palette can only NARROW
  the global capability tables, never widen them — gated types (the
  `navigation` section, `runtime-navigation-boundary`) stay gated even when
  listed. An empty `sections` palette also hides every section-insert
  affordance (gap zones, "Add section" buttons, the palette Sections group).
  Absent palette = the full catalog (page and page-template hosts unchanged).
- **`preview` is OPTIONAL** — hosts without a preview-token route omit it and
  the toolbar Preview affordance (plus the runtime preview dialog) is hidden,
  consistent with how `publish`/`revisions`/`autosaveDocument` degrade.
- **`appearancePanel?`** — a host-owned floating-toolbar panel rendered as
  the leading, selection-independent panel tab (and the initial active
  panel). It receives the CURRENT document draft plus the draft updater, so
  its edits ride the regular unsaved/save/publish discipline.
- **`canvasChrome?`** — host-owned chrome rendered inside the canvas frame
  above the document sections, fed the live draft + active device.
- **`mode`** gains `"menu"` (still inert — all behavior rides the explicit
  host fields).

> **STALE (superseded by TASK-499 / TASK-501 — see "menuDocumentV2 Document
> Contract" below).** The menu design view described in the bullets that
> follow (the `PageEditorHost`-seam editor, `MenuAppearancePanel.tsx`,
> `settings.menuAppearance` on the page document, and the
> `menuDesignDocument.ts` adapter) is the PRE-TASK-499 architecture. TASK-499
> replaced it with a dedicated `menuDocumentV2` contract persisted in the
> `menus.settings` envelope (`document` draft + `published.document`
> snapshot) and a `CanvasEditor`-shell Design tab
> (`core/admin/ui/menus/MenuDesignEditor.tsx`); TASK-501 added per-device
> (mobile) overrides, nav orientation, and per-block visibility on top. The
> host-capability seam notes above (palette scoping, optional `preview`,
> `appearancePanel`, `canvasChrome`, `mode:"menu"`) remain accurate for the
> `PageEditor` host contract itself. The nav-extras bullet's envelope
> semantics (`extras`, `menuNavExtras.ts`, per-key merge, published snapshot)
> are still live.

The menu design view (`/menus/:id/design`, `menus:read`, "Design" button in
the `MenuEditorPage` header; `core/admin/ui/menus/MenuDesignEditorPage.tsx`):

- Canvas chrome renders the LIVE public `SiteHeaderNav` for the menu's items
  (canonical `navigationMenuMapping` + cached page slugs) styled by the
  current appearance draft via `buildSiteShellPreviewCss(appearance,
  breakpoint)` (`core/site/siteShellCss.ts`) — the same rule sets as the
  public stylesheet with the matching breakpoint branch flattened (no
  `@media`), so the device switcher exercises the CSS-only mobile disclosure
  inside the width-constrained canvas frame. Item structure stays read-only
  here; the structure editor owns it.
- The appearance floating panel
  (`core/admin/ui/menus/MenuAppearancePanel.tsx`) exposes every
  `MenuAppearance` field through the SHARED control primitives (color
  swatches with transparent as a first-class swatch, segmented enums,
  bounded sliders, toggle). Edits patch `settings.menuAppearance` on the
  editor document draft.
- **`settings.menuAppearance`** is the menu-host vehicle on
  `PageDocumentSettingsV2`: strict on write (delegates to
  `normalizeMenuAppearance`; invalid values are `page_document_invalid` at
  `settings.menuAppearance`), fail-closed sanitize on stored read, absent
  stays absent (page/template documents never set it and round-trip
  byte-identically).
- **Nav extras** (restricted palette: `button` + `image` only, no insertable
  sections): blocks live in the single fixed "Navigation extras" section of
  the design document and persist in the `menus.settings` envelope as
  `extras`, owned by `core/services/menus/menuNavExtras.ts` —
  `normalizeMenuNavExtras` is strict (Page v2 block schema via the document
  normalizers + the type allowlist + clamped slot capacity; machine-readable
  `menu_nav_extras_invalid` with the offending `field`, mapped by
  `mapMenuError`), `resolveStoredMenuNavExtras` fails closed to an empty
  slot. `updateMenu` merges draft `appearance`/`extras` per envelope key
  (updating one never drops the other) and preserves the existing published
  snapshot on first edit of an already-published menu. The PUBLISHED extras
  snapshot renders in a dedicated `data-site-nav-extras` slot inside the shell
  header (`SiteHeaderNav extras` prop, `PageBlockFrame` + `PageBlockContent`,
  zero client JS); legacy menus without extras emit no slot markup and keep
  the byte-identical legacy stylesheet.
- The document <-> envelope adapter is
  `core/services/menus/menuDesignDocument.ts`
  (`buildMenuDesignDocument` / `resolveMenuDesignDraft` /
  `menuDesignEditorPalette`). Save rides the existing menu PATCH
  (`appearance` + `extras` top-level draft), publish rides `publishMenu` after
  the editor's draft-save-first coherence step and copies that draft to
  `menus.settings.published`; menus issue no preview tokens — the live canvas
  IS the preview.

## menuDocumentV2 Document Contract And Responsive Overrides — TASK-499 / TASK-501 / TASK-502 / TASK-504

The Design tab of a menu edits a dedicated document contract owned by
`core/services/menus/menuDocumentV2.ts` (NOT a Page v2 document). It persists
in the freeform `menus.settings` jsonb envelope as the top-level `document`
draft key and is copied to `settings.published.document` on publish; the front
renders the PUBLISHED snapshot only (`resolvePublishedMenuDocument`,
fail-closed to `null` ⇒ the default `SiteHeaderNav` + byte-identical
`buildSiteShellCss` look). No dedicated endpoint/RBAC/migration — the document
rides the validated `PATCH /menus/:id` (`menuUpdateSchema` allows
`document: object|null`; service-side strict validation maps to a 400
`menu_document_invalid` `ApiError` with the offending `path`).

**Document shape** (`MENU_DOCUMENT_SCHEMA_VERSION = 1`):
`{ schemaVersion: 1, sections: MenuSectionV2[] }` with at most 2 sections
(`menu-bar` renders; `menu-drawer` is a reserved type with zero editor/front
support — the front renders `sections[0]` only). A `menu-bar` section carries
`layout: MenuBarLayout` (the menu-bar subset of `MenuAppearance`) and up to 12
blocks: menu-native types (`nav-items`, `brand`, `search`, `account`,
`language`) plus page-leaf reuses (`cta-button`, `divider`, `spacer`) that
ride the Page v2 leaf validators. `nav-items` props are the `NavItemsProps`
appearance subset — including `orientation: "horizontal" | "vertical"`
(TASK-501; enum-validated in `normalizeMenuAppearance`, default `"horizontal"`
emits NO CSS). Writes go through `normalizeMenuDocumentV2ForWrite`
(schema-first, reject-unknown, throws `MenuDocumentError` with `path`); stored
reads go through `normalizeStoredMenuDocumentV2ForRead`, which is FAIL-CLOSED:
any invalid stored member degrades the WHOLE document to empty (designed blast
radius, asserted in `tests/vitest/services/menu-document-v2.test.ts`) — which
is why every new persisted key must be added to the section/block key
allowlists consciously.

**Responsive overrides (TASK-501 mobile v1; TASK-502 un-defers the tablet
breakpoint — Pages cascade):** `MENU_RESPONSIVE_BREAKPOINT_KEYS =
["tablet","mobile"]`. Desktop = base; tablet AND mobile each carry their OWN
sparse record and BOTH inherit from the DESKTOP base — mobile does NOT inherit
tablet (mirrors `pageResponsiveCss.ts`).

- `MenuSectionV2.responsive?: { tablet?, mobile?: { layout?, navProps? } }` — a
  SPARSE per-breakpoint record holding ONLY explicitly edited keys, lazily
  created by `patchMenuSectionForDevice` (desktop writes the BASE; tablet and
  mobile each write their own `responsive.<bp>` record; the editor badge shows
  Override on tablet/mobile once a key is set). Resolve-for-display =
  `resolveMenuSectionAppearanceForDevice(section, "tablet"|"mobile")` (base
  merged with ONLY that breakpoint's record; tablet never sees mobile and
  mobile never sees tablet). Override detection reads the RAW record
  (`readMenuSectionOverrideValue`), never the merge. Explicit Reset only
  (`clearMenuSectionOverride` — NO auto-remove-on-equality); empty
  `group`/`<bp>`/`responsive` parents are pruned on clear and on write per
  breakpoint (clearing the last tablet key removes `responsive.tablet` while a
  remaining mobile record survives).
- `MenuBlockV2.responsive?: { tablet?, mobile?: { visibility?: { visible } } }`
  on ALL block types (native and leaf) — "hide on tablet"/"hide on mobile" for
  any block, "show only on <bp>" for leaves (flat `visibility.visible:false` +
  the breakpoint `visible:true`). Flat leaf visibility WITHOUT a responsive
  record keeps the legacy render-skip semantics byte-unchanged. Helpers:
  `resolveMenuBlockVisibleForDevice(block, "tablet"|"mobile")` (tablet/mobile
  override ?? flat) / `setMenuBlockVisibleForDevice` (tablet|mobile ⇒ their own
  record, all block types; desktop ⇒ flat, leaf-only) /
  `clearMenuBlockVisibilityOverride`. `hasMenuBlockVisibilityOverride` is
  generalized to ANY breakpoint (true when `responsive.tablet?.visibility` OR
  `responsive.mobile?.visibility` is set) — it gates the CSS visibility plan
  and the front hand-off-to-CSS so a tablet-only override still emits hide
  rules and gets the anywhere-gate.
- Legacy documents WITHOUT `responsive` round-trip byte-identically; unknown
  breakpoint (`wide` etc.) / group / prop keys are rejected on write.

**Brand text (TASK-502):** `BRAND_PROP_KEYS = ["mode","href","image","text"]`.
`brand.props.text?: string` is string-only, trimmed, capped at 120 chars
(authoring-text cap — fail-SOFT clamp/slice, never throw-on-long; only a
non-string non-null `text` throws with the offending path; `null`/empty/
whitespace is OMITTED sparse). Fallback CHAIN, identical on front AND canvas:
`brand.props.text` → `siteName` (`site.name` setting) → `null` (renders
nothing). `createDefaultMenuBlock("brand")` and the legacy adapter stay
textless (inherit the site name). The canvas no longer renders the menu name.

**Device-defining nav props carve-out (TASK-502, conscious):**
`MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode","dropdownDirection"]` are
device-DEFINING, not overridable — they always write the BASE. On WRITE, either
key inside `responsive.*.navProps` throws `MenuDocumentError` with the offending
path (reject-unknown-in-context). On STORED READ the two keys get SPLIT,
non-destructive treatment (a fail-closed whole-doc degrade would be data loss
for 501-era records):
- `mobileMode` is NOT dead — the mobile CSS branch reads the mobile-RESOLVED
  appearance today — so a 501-era `responsive.mobile.navProps.mobileMode`
  override is HOISTED into the base appearance then the record is pruned
  (behavior-preserving: published mobile CSS is byte-identical before/after the
  migration; a junk value is prune-only, not hoisted).
- `dropdownDirection` is truly dead (desktop/tablet-branch-only, reads the
  base) ⇒ prune-only.
  Either way an override record left empty by the prune is itself pruned and
  the migrated doc round-trips clean through the WRITE normalizer, so the next
  autosave persists the hoisted+pruned form. Any OTHER unknown navProps key
  still degrades the whole doc (the carve-out is exactly these two keys). The
  editor renders "Mobile menu" ONLY on the Mobile device and "Dropdown
  direction" ONLY on Desktop/Tablet; both write the base and are NOT wrapped in
  `MenuResponsiveControlShell` (no badge, no reset, no responsive record).

**CSS emission** (`core/site/menuDocumentCss.ts`): ONE shared
`buildMenuRuleSets` feeds both `buildMenuDocumentCss` (front sheet) and
`buildMenuDocumentPreviewCss(doc, device)` (canvas flatten, no `@media`). All
rules are scoped under `[data-site-menu-doc="true"]` (every comma-list selector
member carries the prefix). Override deltas emit per-GROUP (a triggered group
re-emits all its declarations with explicit/neutral values) AFTER the
`mobileMode` disclosure/inline rules so overrides win by source order.
Orientation `vertical` emits `.site-nav-list{flex-direction:column;
align-items:stretch}` in the branch where it resolves.

- **Tablet branch (TASK-502):** tablet overrides emit per-GROUP delta rules in
  a NEW bounded `@media (min-width: 640px) and (max-width: 1023px)`
  (`pageResponsiveMediaBounds.tablet`) — bounded so tablet deltas never leak
  into mobile widths. A doc with ONLY mobile overrides (or none) emits NO
  tablet `@media` branch at all (zero responsive-branch drift). The canvas
  builder no longer maps tablet⇒desktop: the forced tablet branch = base +
  `desktopShared` (`dropdownRule` + `navNestingRules`) + tabletDelta.
- **Per-device visibility (TASK-502)** is CSS-gated and placed per RESOLVED
  tri-device visibility: hidden on desktop AND tablet ⇒ the shared
  `min-width:640px` branch (byte-stable for docs without tablet overrides);
  hidden on desktop ONLY (tablet-visible override) ⇒ a `min-width:1024px`
  `@media` (so it stays visible at 640–1023px); hidden on tablet ONLY ⇒ the
  bounded tablet branch; hidden on mobile ⇒ the mobile branch. Blocks visible
  on at least one device stay DOM-rendered (menu-native wrappers stamped with
  inert `data-menu-block-id` — for `nav-items` on the `<nav>` landmark
  ancestor, never `.site-nav-list`; leaf frames keep `PageBlockFrame`'s
  `data-block-id`) and hidden per branch via the doc-scoped dual selector
  `[data-menu-block-id="X"],[data-block-id="X"]{display:none}`; blocks visible
  on NEITHER device stay render-skipped. `buildMenuDocumentPreviewCss` emits NO
  visibility hide rule in ANY forced branch — canvas visibility is owned solely
  by the editor's dimmed-selectable GHOST gate (the hide rules target the
  `[data-menu-block-id]` SelectableBlock stamp and would display:none the ghost).
- **Nested sublists (TASK-502, DOC-SCOPED only — base sheet FORBIDDEN):** the
  recursive fly-out block (`.site-nav-sublist{display:none}` hide-by-default,
  the per-level `:hover`/`:focus-within` open pair to `display:grid`,
  `.site-nav-sublist>li{position:relative}`, the direction-aware nested
  `.site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}` —
  `bottom:0;top:auto` for `dropdownDirection:"top"` — and the group caret
  rule) is emitted ONLY inside the shared `min-width:640px` branch (desktop AND
  tablet); the mobile branch carries NO sublist hide/un-hide (the base sheet's
  `display:grid` + cumulative per-depth `padding-left:16px` keep all levels
  inline-indented). `buildSiteShellCss(null)` is byte-identical (no legacy CSS
  added — 502-03 legacy path reuses base-sheet class rules).
- **Divider context rules (TASK-502, per-divider-block, doc-scoped):** a doc
  WITH a divider emits the frame-as-line pair
  (`.site-header-inner [data-block-id="X"]{align-self:center;width:<thick>px;
  height:1.5em;background:<tone>}` — deliberately NO `display:` so it cannot
  out-specificity a visibility hide — plus inner `hr{display:none}`) in front
  AND preview; a doc WITHOUT a divider emits neither. Declarations derive only
  from already-validated enum/number props (injection-safe).

A no-override / mobile-only document emits NO tablet branch and its base output
changes from pre-502 ONLY by the unconditional structural divider/nested-sublist
rules (re-baselined ONCE, pinned in
`tests/unit/site/menu-document-render.test.tsx`); a mobile-only doc's mobile
branch is byte-identical to pre-502.

**Editor** (`core/admin/ui/menus/MenuDesignEditor.tsx`): the DeviceSwitcher
forks the appearance writers — Tablet AND Mobile edits each write their own
sparse override, Desktop writes the base — from event handlers only (no
setState-in-effect). Overridable appearance controls are wrapped in
`MenuResponsiveControlShell` (Base/Override/Inherited badge +
`data-menu-responsive-reset` Reset), panels show RESOLVED values, the canvas
scope cue reads "Tablet (overrides)" / "Mobile (overrides)" / "Desktop (base)";
per-block visibility shows the flat "Visible" toggle for leaves on Desktop and
the breakpoint override toggle on Tablet/Mobile. Content writes (brand/cta/
utility props) stay FLAT on every device. TASK-502 canvas WYSIWYG: the
`MenuDocumentCanvas` frame ROOT paints the seven site `--color-*` tokens
(shared `useCanvasSiteTokens` in `core/admin/ui/shared/` +
`toMenuCanvasColorCssVariableMap` in `core/ui/theme/tokenCss.ts`) so swatches
resolve against SITE tokens, not the admin theme — it must be the root because
the section Surface/Border rules emit onto the scope root and CSS custom
properties inherit downward only; the selection ring is re-pointed to an
`--admin-*` var. `getPageEditorColorPalette(siteTokens)` is passed as
`palette` to every `ColorSwatchControl`. Hidden blocks render as a dimmed,
selectable "Hidden" GHOST (the sole canvas visibility owner). The brand panel
adds a text-mode-only "Brand text" Input (sparse; empty deletes the prop); the
cta panel adds a "Size" SegmentedControl + "Open in new tab" toggle rendered
via the real leaf through a local `canvasMenuLeafToPageBlock` replica
(visibility forced true); the divider renders the real leaf frame (no literal
"—"); `NavItemsPreview` is recursive (grandchildren reachable, never dropped).

**Styling depth — brand style, per-level styling & cheap wins (TASK-504,
per-device):** No `schemaVersion` bump, no new route/RBAC/migration; nothing
new enters the base sheet (`buildSiteShellCss(null)` byte-identical), and
no-override docs stay byte-identical on both CSS builders — all new styling
ONLY overrides the hardcoded base from the `[data-site-menu-doc]` doc scope by
later source order.

- **`BrandStyle` (`brand.props.style`):** text-mode `fontSize`/`fontWeight`/
  `color`/`textTransform`/`letterSpacing` + image-mode `height`/`maxWidth`,
  validated by `normalizeBrandStyle` (reject-unknown KEYS with `path`; bad
  VALUES fail-SOFT → omitted, sparse; prune-empty ⇒ legacy brand byte-identical).
  NEW local clamp table `BRAND_STYLE_NUMBER_RANGES`: `fontSize [10,48]`,
  `letterSpacing [-2,8]` (NEGATIVE allowed — distinct from the nav `10..32`),
  `height [16,120]`, `maxWidth [40,400]`. `"style"` is the CONSCIOUS widening of
  `BRAND_PROP_KEYS`; its READ trap is asserted by round-trip. Brand IMAGE mode
  resolves its `<img>` src via the exported `resolveBrandImageSrc` (single home;
  front + canvas import it) sized by `height`/`maxWidth` (defect B1 fix).
- **`NavLevelStyle` / `NavItemsProps.levelStyles` (`{ 1?, 2? }`):** per-level
  link typography + state (`linkColor`/`linkHoverColor`/`linkHoverTextColor`/
  `linkActiveColor`/`fontSize`/`fontWeight`/`gap`/`paddingX`/`paddingY`) + submenu
  CONTAINER chrome for levels ≥1 (`background`/`borderColor`/`borderWidth`/
  `radius`/`shadow`/`minWidth`). Cap at **levels 0 / 1 / 2+**: level 0 = the
  EXISTING flat `.site-nav-link` base (NO new type, NOT re-emitted), `1` = first
  dropdown, `2` = "level 2 AND deeper" via a descendant selector. `NAV_LEVEL_NUMBER_RANGES`:
  `fontSize [10,32]`, `gap [0,32]`, `paddingX [0,40]`, `paddingY [0,32]`,
  `borderWidth [0,8]`, `radius [0,32]`, `minWidth [80,480]`. `normalizeNavItemsProps`
  SPLITS `levelStyles` off the raw props BEFORE the flat `NAV_ITEMS_PROP_KEYS`
  subset check and validates it via `normalizeNavLevelStyles` (reject-unknown
  OUTER level keys — only `"1"`/`"2"` — and per-level style keys); `"levelStyles"`
  is NOT added to `NAV_ITEMS_PROP_KEYS` (that const stays `... satisfies readonly
  (keyof MenuAppearance)[]`) — the carrier type widens to `Pick<…> & { levelStyles? }`.
  Its READ trap is asserted by round-trip (whole-doc blast radius).
- **Inheritance is PURE CSS cascade + source order (no runtime merge):** emit
  level 0, then 1, then 2, each only its own present overrides. Exact depth
  selectors (`${scope}` = `[data-site-menu-doc="true"]`):
  - Level 1 link: `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`
  - Level 1 container: `${scope} … > .site-nav-sublist, ${scope} … > .site-nav-sublist .site-nav-sublist`
  - Level 2 link: `${scope} … > .site-nav-sublist .site-nav-sublist .site-nav-link`
  - Level 2 container: the ANCHORED `${scope} … > .site-nav-sublist .site-nav-sublist`
    (NOT the short `.site-nav-sublist .site-nav-sublist`).
  The DESCENDANT combinators are deliberate: because the level-1 selectors also
  reach deeper links/containers, "level 2 inherits level 1 where unset" holds by
  cascade, and the specificity ordering L0 < L1 < L2 (and the anchored level-2
  container tying level-1's reach + winning by source order) makes deeper levels
  override. The strict-CHILD form (`… > .site-nav-sublist > li > .site-nav-link`)
  is REJECTED — it would make level 2 inherit level 0 instead of level 1.
- **Sublist chrome** (the level ≥1 CONTAINER fields) OVERRIDES the hardcoded
  base `.site-nav-sublist` chrome from the doc scope only; the base sheet is
  untouched.
- **Cheap wins:** per-link `linkPaddingX`/`linkPaddingY`/`linkRadius` group on
  `.site-nav-link`, a hover TEXT color (`linkHoverTextColor` on
  `.site-nav-link:hover`), and a current-page rule
  `:where([aria-current="page"])` colored by the EXISTING `linkActiveColor`.
  These four keys are first-class `MenuAppearance` vocabulary (so they ride
  `collectDeltaRules` per-device FREE) but carry **NO resolution default** (NOT
  seeded into `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS`) — emission
  is PRESENT-ONLY (each rule-group `base()` returns `null` unless authored) so a
  no-override doc gains ZERO new doc-sheet bytes. `aria-current="page"` is stamped
  FRONT-only: `activePath` is threaded `SiteHeaderMenuDocumentRender →
  NavItemsRender → SiteNavItem → SiteNavLink` (server-component-safe; producer
  wired via `renderPublicPageHtmlInternal` `requestPath`); the canvas preview
  stamps none (no route concept).
- **Per-device (tablet + mobile) brand & level channel:** brand `style` overrides
  ride the BLOCK responsive (`responsive[bp].style`; `normalizeMenuBlockResponsive`'s
  group-key gate widened to accept `"style"`, the READ twin of the `BRAND_PROP_KEYS`
  widening); level styles ride the SECTION responsive
  (`responsive[bp].navProps.levelStyles`). Both follow the Pages cascade (tablet
  AND mobile inherit DESKTOP; mobile ≠ tablet). Level LINK typography + brand base
  fold into the all-width base (mobile inherits desktop); level CONTAINER chrome
  folds into the ≥640 shared bucket (a harmless present-only no-op below 640 where
  the nav is inline). Neither dimension rides the scalar `collectDeltaRules`
  channel — each uses its OWN parallel resolve-and-diff vs DESKTOP into the bounded
  tablet `@media (min-width:640px) and (max-width:1023px)` and mobile
  `@media (max-width:639px)` buckets. Dedicated NEW helpers back the writes/resets
  (`patchMenuBrandStyleForDevice`/`clearMenuBrandStyleOverride`; a nested-path
  `patchMenuSectionForDevice` variant + nested raw-read with a DEEP prune chain)
  — the flat/visibility-only helpers cannot reach the nested paths. The canvas
  `buildMenuDocumentPreviewCss` force-open opens the WHOLE ancestor chain
  (levels 1..N) for the selected level, appended LAST (the single canvas-only add).

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
scoped public data-bound blocks, but they are not assistant-emittable: even
though TASK-456 made `form` and TASK-457 made `collection` editor-insertable,
assistant plans must not invent form or content-type/query references, so
both stay outside the assistant output vocabulary until an explicit assistant
policy ships.

## Page Templates (Reusable Page v2 Templates) — TASK-420-02 Frozen Contract

Status: contract frozen 2026-06-11 by TASK-420-02; implemented 2026-06-11 by
TASK-420-03 (storage, routes, preview, admin UI, cache, widget-template
surface deletion Ring 1). Everything below is the binding contract; changes
require reopening TASK-420-02.

Ring 2 verification outcome (recorded at implementation time, TASK-420-03):
the board claim "no active user data dependency" did NOT hold — grep + DB
check found live consumers (`templateInstaller`/`kitInstaller` solution-kit
seeding, the `template-section` core widget on custom screens/detail pages,
and existing `widget_templates` rows with revisions). Per this contract the
storage drop (`widget_templates` + `widget_template_revisions`) and the
template-section/installer deletion are split into an explicit follow-up
task; the legacy data-layer services (`widgetTemplateService`,
`widgetTemplateRevisionService`, `widgetTemplateCategoryService`,
`widgetTemplateSettings`, `templateSectionRuntime`) remain ONLY for those
consumers, with no admin product surface. The template-section widget keeps
its fail-closed placeholder rendering, and the bidirectional boundary guards
stay permanent.

Page Templates are reusable Page v2 documents built from `sections[]` and
`PageBlockV2` blocks. They are authored with the Page Editor v2 surface,
previewed through the token-gated runtime preview pipeline, and applied into
Pages by instantiating their sections with fresh ids. The legacy Advanced
Widgets/widget-template surface is replaced, not preserved (deletion plan at
the end of this section).

### Naming Guard (Mandatory)

The `pages` domain already owns three template-adjacent modules that MUST NOT
be touched or shadowed by this feature:

- `core/services/pages/pageTemplateService.ts` — theme shell template keys
  (`settings.template`, e.g. `landing`),
- `core/services/pages/pageSectionTemplates.ts` — section render templates
  for the shared renderer,
- `core/services/pages/pageTemplateBoundary.ts` — the document-contract
  boundary helpers (reused below).

New code uses the `pageTemplateLibrary` prefix:

- `core/services/pages/pageTemplateLibrarySchema.ts` — Bun-free owner module:
  payload schemas, `normalize*` helpers, domain errors, slug normalizer, and
  the pure `instantiatePageTemplateSections` apply helper. No import-time
  DB/settings/runtime coupling (Vitest lane).
- `core/services/pages/pageTemplateLibraryService.ts` — DB-backed CRUD +
  duplicate + preview model (Bun lane).
- `core/server/routes/pageTemplateRoutes.ts` — route module
  (orchestration-only; delegates to the service; maps errors through
  `mapPageTemplateError`).
- `core/admin/services/pageTemplatesClient.ts` — cached admin client.

API resource name: `page-templates`. Audit log actions:
`pages.template.create|update|delete|duplicate` with
`targetType: "page_template"`.

### Storage Model

New table `page_templates` (full migration artifacts required: SQL file,
`meta/*_snapshot.json`, `meta/_journal.json`):

- `id` uuid pk default random
- `name` text not null (1..160 after trim)
- `slug` text not null, unique index — deterministic, derived from `name`
  when omitted (trim, lowercase, `[^a-z0-9]+` -> `-`, strip edge dashes);
  conflicts reject with `page_template_slug_conflict` (409). No silent
  suffixing on direct writes.
- `description` text nullable (<= 500)
- `category` text nullable (<= 80, plain label; the settings-backed
  `widgets.templateCategories` registry is NOT reproduced)
- `status` text not null default `draft` (`draft | published`); `published`
  templates are offered by the Page editor insert/apply picker, `draft`
  templates are library-only. Invalid values reject with
  `page_template_status_invalid`.
- `document` jsonb not null — a full normalized `PageDocumentV2`
  (`schemaVersion: 2`, `sections[]`, `settings`, `seo`, `breakpoints`).
- `created_at`, `updated_at` timestamps.
- Indexes: unique `slug`, plus `status`, `name`, `updated_at`.

Document rules (schema-first, reject-unknown, explicit schemaVersion):

- Writes validate through the existing owner
  `normalizePageDocumentV2ForWrite` (strict mode: unknown fields reject with
  `page_document_unknown_field`, invalid values reject with
  `page_document_invalid`, `schemaVersion` must be `2`).
- Writes additionally run `assertPageTemplateInputBoundary`
  (`pageTemplateBoundary.ts`): any root `blocks[]` payload rejects with
  `page_template_legacy_widget_blocks_invalid`. `WidgetBlock[]` never enters
  `page_templates` rows.
- The inverse guard stays in force: `assertLegacyWidgetSurfaceBoundary`
  rejects Page v2 documents in legacy widget surfaces
  (`legacy_widget_surface_page_v2_document_invalid`), so no mixed-contract
  rows exist in either direction.
- Reads normalize through `normalizeStoredPageDocumentV2ForRead`
  (non-destructive defense; the table is new, so no legacy rows exist).
  A stored document that fails read normalization fails closed
  (`page_template_invalid`) on preview/apply — never partial rendering.
- Section/block ids inside `document` follow the Page v2 write rules (ids
  required, block ids unique, depth/children clamps).
- The template's own `settings`, `seo`, and `breakpoints` are stored (the
  editor edits a real Page document) but are IGNORED on apply — only
  `sections[]` are instantiated into target pages.

Row-level versioning: the document's `schemaVersion` is the authoritative
contract version; no separate row version column. A future v3 document bump
goes through the same owner module.

Revisions: intentionally NOT shipped in v1. The widget-template revision
flows (`widget_template_revisions`, revision routes, revision drawer) are
deleted with the surface, not ported. Target pages keep their own
`page_revisions` protection. If product later needs template revisions, that
is an explicit follow-up task, not silent scope.

Strict payload schemas (route-level `additionalProperties: false` on every
object, including nested ones):

```jsonc
// POST /page-templates
{
  "name": "Landing hero stack",          // required
  "slug": "landing-hero-stack",          // optional, derived from name
  "description": null,                    // optional
  "category": "marketing",               // optional
  "status": "draft",                      // optional, default draft
  "document": { "schemaVersion": 2, "sections": [ /* PageSectionV2 */ ] } // required
}
// PATCH /page-templates/:id — same fields, all optional, at least one key
// POST /page-templates/:id/duplicate — strict empty object {}
// POST /page-templates/:id/preview — { "ttlMinutes": 30 } (optional;
//   non-finite/non-number falls back to the default 30, numeric values are
//   rounded and clamped to 1..120 minutes)
```

Domain errors (machine-readable, mapped centrally by
`mapPageTemplateError`): `page_template_not_found` (404),
`page_template_invalid` (400), `page_template_slug_conflict` (409),
`page_template_status_invalid` (400),
`page_template_legacy_widget_blocks_invalid` (400), plus pass-through of
`page_document_invalid` / `page_document_unknown_field` mapped to
`page_template_invalid` (400) with the original field path in the message.

### Route Family (Internal Admin)

Single canonical path family — the widget-template dual-alias registration
(`/widget-templates` + `/widgets/templates`) is NOT reproduced:

- `GET    /page-templates` — list (`content:read`)
- `GET    /page-templates/:id` — detail (`content:read`)
- `POST   /page-templates` — create (`content:write`, CSRF)
- `PATCH  /page-templates/:id` — update (`content:write`, CSRF)
- `DELETE /page-templates/:id` — delete (`content:write`, CSRF)
- `POST   /page-templates/:id/duplicate` — server-owned copy
  (`content:write`, CSRF; strict empty payload; callers cannot supply
  replacement documents). Deterministic copy naming: name `"<name> (copy)"`,
  slug `<slug>-copy`, then `-copy-2`, `-copy-3`, ... on conflict (bounded at
  `-copy-100`; exhaustion rejects with `page_template_slug_conflict`). The
  copy is always created as `draft` regardless of source status, and the
  stored source document must pass stored-read normalization before copying
  (fail-closed, `page_template_invalid`).
- `POST   /page-templates/:id/preview` — issue preview token
  (`content:read`, CSRF; same permission as `POST /pages/:id/preview`).

Determinism details: `GET /page-templates` returns summaries (incl.
`sectionsCount`) ordered by `updated_at` descending; `:id` params that are
not UUIDs resolve to `page_template_not_found` (404) without a DB lookup.

RBAC decision (recorded): Page Templates map to the existing `content:*`
permission family used by Pages (`content:read` reads + preview issue,
`content:write` mutations). No new permission catalog entry; the obsolete
`widgets:read|write` mapping disappears with the widget-template surface.
Status flips (`draft` <-> `published`) ride `PATCH` under `content:write`;
there is no separate publish permission because templates have no standalone
public runtime exposure.

CSRF: all writes use the existing admin CSRF middleware. Rate limits: admin
routes use the existing `admin_read` / `admin_write` buckets; the public
`/preview` route stays in `public_read`. No new bucket (decision recorded per
TASK-420-02 Security Contract).

Apply/insert is NOT a server endpoint. Applying a template into a page is an
editor-side document edit: admin UI loads the template detail, instantiates
sections through the shared pure helper, and persists through the existing
Page write paths (`PATCH /pages/:id` / autosave), keeping the Page save path
single-owner.

### Apply / Replacement Semantics (Non-Destructive)

Owner helper (Bun-free, in `pageTemplateLibrarySchema.ts`):

```ts
instantiatePageTemplateSections(
  document: PageDocumentV2,
  deps?: { createId?: (prefix: "sec" | "blk") => string }
): PageSectionV2[]
```

- Returns deep-cloned `sections[]` where EVERY section id and EVERY block id
  (recursively through `slots`) is regenerated via `createPageDocumentId`
  (`sec_*` / `blk_*`). No id from the template document survives into the
  page, so: applying the same template twice never collides, and editing a
  template later never retro-affects pages it was applied to.
- `deps.createId` exists only for deterministic tests; production uses the
  `pageDocumentV2.ts` owner default.
- Only `sections[]` are instantiated. Template `settings`, `seo`, and
  `breakpoints` never touch the target page.
- Section/block content (props, styles, typography, responsive overrides,
  visibility incl. `anchor`) is carried verbatim; anchor uniqueness across
  the target page stays operator-owned, same as manual section authoring.
- Insertion position is an editor concern (append by default, insert-at-index
  allowed); the resulting page document must pass
  `normalizePageDocumentV2ForWrite` before save — fail-closed, no partial
  application.
- The template row is never mutated by apply (read-only source).

### Preview Contract (Token-Gated)

- `PreviewTargetType` gains `"page-template"` (owner:
  `core/services/pages/previewService.ts`; also `normalizeStoredTargetType`
  and `resolvePreviewTargetType` in `core/server/publicSite.tsx`).
- `POST /page-templates/:id/preview` response (existing preview shape):

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=page-template&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "sectionsCount": 3
}
```

- `GET /preview?type=page-template&token=<token>` validates the token
  (random, stored hashed, TTL per target type, `410 Preview expired`), loads
  the `page_templates` row, resolves it through
  `resolvePageTemplateInput(document, { renderMode: "preview-page",
  enforceFreshBoundary: true })`, and renders through the SAME public Page v2
  pipeline as page preview (`renderPublicPageV2RuntimeHtml`), including
  `?device=` flatten semantics and scoped data-bound block handling.
- Target-type separation is strict: a `type=page` token cannot render a
  template, a `type=page-template` token cannot render a page, and
  `WidgetBlock[]` documents can never reach this path (boundary assertion +
  v2-only storage). Unsupported blocks or unresolved data-bound documents
  fail closed (404/diagnostics), never best-effort rendering.
- `previewUrl` resolution, token redaction in labels/logs, and failure copy
  rules follow `_docs/PREVIEW_SPEC.md` unchanged. The pages-only `probe`
  extension is not adopted in v1.
- After the widget-template surface deletion,
  `GET /preview?type=widget-template&...` returns `404 Not Found` (the type
  no longer resolves); stale stored tokens fail closed via
  `normalizeStoredTargetType` -> `preview_token_invalid`.

### Admin Cache Contract

Per `_docs/ADMIN_CACHE.md` (TASK-420-03 updates that doc +
`_docs/ADMIN_CACHE_MAP.md` when shipping):

- Keys in `core/admin/services/cachePolicy.ts`:
  - `pageTemplates:list`
  - `pageTemplates:detail:<id>`
- TTL: default `cacheTtlMs.list` / `cacheTtlMs.detail` (5 minutes).
- `pageTemplatesClient.ts` follows the cached-client contract end-to-end:
  cache hydration, background revalidation, in-memory + localStorage
  envelopes, no mount-force refetch loops, dirty-state protection in the
  editor (background revalidation never overwrites unsaved edits).
- Invalidation + `cacheBus` broadcasts: create/update/duplicate broadcast
  `{ key: pageTemplates:list, action: "update" }` plus the touched detail
  key; delete broadcasts `invalidate` for list + detail.
- Admin SPA routes `/advanced/page-templates` (list) and
  `/advanced/page-templates/:id` (editor) register through the shared
  `adminPaths` / `AdminLink` / `prefetchAdminRoute` helpers; prefetch warms
  `pageTemplates:list` with `{ force: false }` only. TASK-460 keeps these
  technical routes stable but moves the visible entry point into the Pages list
  header as `Templates`; the Page Templates shell uses Pages-oriented active
  navigation and breadcrumbs.
- Deleted with the old surface: `widgetTemplates:list`,
  `widgetTemplates:detail:<id>`, `widgetTemplateCategories:list` keys, their
  cached clients, and the `/advanced/widgets/templates/:id` prefetch/route
  entries.
- Template documents contain no secrets; nothing secret-bearing enters
  browser cache/localStorage/debug payloads.

### Editor Surface Reuse Rule (Binding)

The Page Templates editor IS the Page Editor v2 surface bound to a template
document. It must consume, without forks:

- the same canvas renderer (`pageRendererV2.tsx`) and inline-edit contract
  (`pageInlineEditContract.ts`),
- the same control pipeline: `pageEditorControlRegistry.ts` ->
  `pageEditorControlUiModel.ts` adapter ->
  `core/admin/ui/pages/editorControls/*` primitives via the
  `RegistryControlWidget` routing in `PageEditor.tsx`,
- the same floating-panel-as-sole-control-surface model, per-block typography
  group, and responsive override semantics (`pageResponsiveCss.ts` scoping).

A parallel inspector, a template-specific raw-input panel, or any control
that bypasses the shared adapter is a contract violation and fails review.
Allowed differences are page-chrome only: the template metadata form
(name/slug/description/category/status) replaces page publish/SEO chrome, and
Page Settings panels that do not apply to templates (SEO, `showInNav`,
`collectionLink`, revision retention) are hidden in template mode while the
stored document keeps their normalized defaults.

**TASK-496 (shared editor-chrome shell — DONE 2026-06-30):** the page-editor
builder chrome is now the shared, purely-presentational shell
`core/admin/ui/shared/CanvasEditor.tsx` (in-content `PageHeader` + "Page builder"
sub-toolbar + separated `rounded-2xl border bg-card shadow-card` card + light
right-docked 280px collapsible rail + dark-correct dotted canvas), consumed by
Pages, Page Templates, AND Custom Screens (`panelPosition: "right" | "bottom"`;
controlled `panelOpen` with the host as the single source of truth). Pages + Page
Templates render through it **behavior-preserving** — the `PageDocumentV2` document
model, ops, cache, dirty/autosave, and preview pipeline are unchanged and all
`data-page-editor-*` hooks are intact; only the chrome is extracted. The
`mode:"menu"` designer keeps its legacy dark bottom panel. The previously orphaned
copy of `shared/CanvasEditor.tsx` is resolved (it BECAME this shell, with real
importers from both `ui/pages/` and `ui/custom-screens/`); the dark
`AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / authoring `canvasChrome.ts`
chrome is removed.

Assistant: the Page Templates editor advertises NO assistant active surface
in v1 (the `widget-template` active-surface kind and `widget-template.*`
action families are deleted with the old surface). A dedicated follow-up task
owns a future `page-template` assistant surface; until then the editor must
not advertise contracts it does not own.

### Obsolete Widget-Template Surface — Deletion Plan

Ring 1 — deleted unconditionally by TASK-420-03 (the reusable-template
product path; retired entry points must return explicit 404s, never render
old editors):

- Routes: `core/server/routes/widgetTemplateRoutes.ts` (both
  `/widget-templates*` and `/widgets/templates*` families, incl. preview,
  revisions, restore, duplicate), `widgetTemplateCategoryRoutes.ts`, and
  their registrations in `core/server/routes/index.ts`.
- Preview: the `widget-template` member of `PreviewTargetType`,
  `resolvePreviewTargetType`, the `/preview` handler branch in
  `core/server/publicSite.tsx` (~lines 855, 1404), and
  `core/services/widgets/widgetTemplatePreviewService.ts`.
- Services: `widgetTemplateService.ts`, `widgetTemplateRevisionService.ts`
  (and the widget-template branch of any settings helpers they own).
- Admin UI: `WidgetTemplateEditorPage.tsx`, `WidgetTemplateCategoryDrawer.tsx`,
  `WidgetTemplateRevisionDrawer.tsx`, `WidgetTemplatePreviewDialog.tsx`, the
  templates surface of `WidgetLibraryPage.tsx`, template paths in
  `WidgetCreateDialog.tsx`/`WidgetInsertDialog.tsx`,
  `hooks/useWidgetTemplates.ts`, the `/advanced/widgets/templates/:id` route
  in `AdminApp.tsx`/`adminRouteComponents.tsx`, and the legacy v1 builder
  `builder/TemplatePicker.tsx` path.
- Admin clients + cache: `widgetTemplatesClient.ts`,
  `widgetTemplateRevisionsClient.ts`, `widgetTemplateCategoriesClient.ts`,
  `widgetTemplatePreviewClient.ts`, the three `widgetTemplate*` cache keys in
  `cachePolicy.ts`, and prefetch wiring in `adminPrefetch.ts`.
- Assistant: the `widget-template` active-surface kind
  (`activeSurfaceHydration.ts`, `adminContextTypes.ts`,
  `cmsTargetResolver.ts`, follow-up resolver) and the `widget-template.*`
  action families (registry, schemas, executor, undo manifest, UI surfaces).
- Settings: the `widgets.templateCategories` registry surface.
- Docs: `_docs/CMS_API.md` widget-template routes, `_docs/WIDGETS.md`
  template sections, `_docs/PREVIEW_SPEC.md` `type=widget-template`,
  `_docs/ADMIN_CACHE*.md` keys, `_docs/CMS_SPEC.md` Advanced Widgets note.

Ring 2 — dependent legacy consumers (verify-then-delete, with explicit
follow-up split if blocked): the `template-section` core widget
(`core/widgets/core/templateSection.tsx`,
`core/services/widgets/templateSectionRuntime.ts`) still renders
widget-template rows on non-Page legacy surfaces (custom screens, detail
pages), and `core/services/templates/templateInstaller.ts` (solution kits,
`_docs/TEMPLATE_CONTRACTS.md`) seeds widget-template rows. TASK-420-03 must
re-verify the board's "no active user data dependency" claim at
implementation time (grep + DB check). If confirmed, drop `widget_templates`
+ `widget_template_revisions` (full migration artifacts) and delete the
template-section widget and installer seeding in the same closure. If any
live consumer remains, Ring 1 still ships in full, the tables stay, the
template-section widget keeps rendering its existing fail-closed placeholder
for unresolvable ids, and the storage drop is split into an explicit
follow-up task with rationale — never silent scope reduction.

Rejection guards stay permanent in both directions even after deletion:
fresh `sections[]` payloads into any legacy widget surface reject
(`legacy_widget_surface_page_v2_document_invalid`), and `blocks[]` payloads
into Page Templates reject (`page_template_legacy_widget_blocks_invalid`).

### Regression-Test Shape (Gates TASK-420-03)

- Vitest (Bun-free, `tests/vitest/*`): `pageTemplateLibrarySchema` suites —
  strict accept/reject for create/update payloads, unknown-field rejection at
  route and document level, `WidgetBlock[]`/root-`blocks[]` rejection, slug
  normalization determinism + conflict semantics, duplicate naming
  determinism, `instantiatePageTemplateSections` id-regeneration (all ids
  fresh, recursive slots, repeat-apply non-collision, template untouched),
  fail-closed behavior for invalid stored documents.
- Bun (runtime): route registration tests + `mapPageTemplateError` coverage;
  CRUD + RBAC (`content:read|write`) + CSRF behavior; preview token issue +
  `GET /preview?type=page-template` rendering; target-type separation tests
  (page token vs template token); retired-surface tests proving
  `/widget-templates*`, `/widgets/templates*`, and
  `/preview?type=widget-template` return explicit 404s.
- Admin cache/prefetch tests for the new keys and route prefetch entries.
- Read-only Claude drift audits per the TASK-420 family workflow.
- `bun --cwd core lint`, `bun --cwd core lint:types`.

### Documentation Updates At Implementation Time (TASK-420-03)

`_docs/CMS_API.md` (new route family + deleted widget-template family),
`_docs/PREVIEW_SPEC.md` (`type=page-template` target, `type=widget-template`
removal), `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` (keys),
`_docs/WIDGETS.md` (surface removal), `_docs/CMS_SPEC.md` +
`_docs/ARCHITECTURE.md` (surface naming), `_docs/TEMPLATE_CONTRACTS.md`
(Ring 2 outcome). They are intentionally not pre-edited here so shipped-API
docs keep describing only shipped behavior.
