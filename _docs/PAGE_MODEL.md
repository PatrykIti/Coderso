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
- The VERTICAL timeline variants (`default`, `compact`) draw a CONTINUOUS
  vertical axis line connecting the dots (TASK-533-03), reproducing the reference
  `.timeline:before` (aqua→fade rule) + `.timeline article:before` glow dots. The
  axis is a per-item connector segment (`data-page-timeline-axis` /
  `data-page-timeline-axis-line`) hoisted into the `relative` item box and spanning
  its FULL height (`inset-y-0`, so the item's own vertical padding is INSIDE the
  segment — no intra-item break); it bleeds its bottom by exactly the section content
  row gap so segment N reaches segment N+1's top, and the LAST item ends flush at its
  dot (`bottom:0`, no overshoot). The dot keeps a `box-shadow` glow off the section
  accent. This is ADDITIVE DOM — the existing `data-page-timeline-item/marker/content`
  hooks are retained; the `horizontal` variant is UNCHANGED. No model field and no
  author-controlled value: the axis/dot are fixed render structure tinted off the
  already-sanitized `--coderso-section-accent` (the bleed offset is the clamped numeric
  section gap). The `timeline` section is authored as a section TEMPLATE via the
  section-template picker.
- `gallery` remains a section template over existing child blocks. `cards`
  wraps child blocks in card surfaces while `grid` keeps the flat section grid;
  this does not ungate or redefine the standalone `gallery` block.
- `testimonials.cards` wraps child blocks in card surfaces while
  `testimonials.grid` keeps flat grid rendering.
- `cta.default`, `cta.centered`, and `cta.full-width` have distinct published
  alignment/min-height classes. Since TASK-525 `full-width` bleeds the background
  edge-to-edge (`100vw`) while its content stays capped/centered at
  `section.layout.maxWidth` (no longer `max-width: none`).
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
  `radius`, `shadow`, `borderColor`, `borderWidth`, and `borderStyle`
  (`textColor` rides the `sanitizeAuthoringCssColor` whitelist). TASK-532 threads
  a sanitized `textColor` onto the `text` block's **rich** (`format:"rich"`)
  render path too — previously only the plain `<p>` path honored it via the
  inherited `--coderso-block-text` var, while the rich wrapper `<div>` rendered
  colorless; the rich wrapper now sets inline `color` + a
  `[&_*]:text-[color:inherit]` child hint so an authored `textColor` paints the
  rich body (unset ⇒ byte-identical, no attribute leak);
- `padding` and `margin` using `{ top, right, bottom, left }` spacing objects;
- token-backed typography (TASK-424), nullable with unset/`null` meaning
  "keep the baked classes" so pre-existing documents render identically:
  - `fontFamily`: `sans` | `display` (theme token refs emitted as
    `var(--font-sans/--font-display, <default stack>)`),
  - `fontSize`: `2xs` | `xs` | `sm` | `md` | `lg` | `xl` | `2xl` | `3xl` |
    `4xl` | `5xl` (theme scale refs emitted as `var(--text-*, <default size>)`),
  - `fontSizeCustom` (TASK-532, present-only): a fluid font-size string that
    **wins over the discrete `fontSize` token** at render (the token stays the
    fallback/unset state). Accepts ONLY a strict numeric-unit-clamp grammar —
    a bare number + allowlisted unit (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`) or a
    single `clamp()`/`min()`/`max()` of such lengths (e.g.
    `clamp(2.6rem,5vw,4.4rem)`, `1.45rem`), validated by
    `sanitizeAuthoringCssFontSize` at the write boundary (NEVER arbitrary CSS;
    64-char cap; rejects `url(`/`expression(`/`;`/`{`/`}`/`<`/`\`/`:`/comment
    escapes fail-closed to omitted). Responsive-capable (a per-device font-size
    string is CSS-expressible),
  - `fontWeight`: `normal` | `medium` | `semibold` | `bold` | `extrabold` |
    `black` (400/500/600/700/**800/900** — the last two added by TASK-532;
    heavier weights paint inline via `pageTypographyFontWeightCssValues`, not a
    baked `font-*` class),
  - `textTransform` (TASK-532, present-only enum): `none` | `uppercase` |
    `lowercase` | `capitalize`; `none` resets ⇒ the field is omitted so an
    un-authored block is byte-identical,
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
- `form`: `formId`, `title`, plus present-only presentation props
  `textareaRows`, `showSelectPrompt`, `loadingLabel`, `successBehavior`.
  `textareaRows` is bounded by the shared Form Embed limits;
  `successBehavior` accepts only `show-message-hide-form` or
  `show-message-keep-form`. These four presentation props are base-only:
  fresh responsive overrides reject them, absence emits no normalized key,
  and legacy documents retain their existing render bytes/default behavior.
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
  TASK-532 extends the SAME `divider` block (no new block type) with a
  present-only decorative **eyebrow-rule** variant: `divider.gradient` (boolean)
  swaps the `<hr>` for a slim `<span>` painting
  `linear-gradient(90deg, <tone-color>, transparent)` (the tone color comes only
  from the `pageDividerToneBorderColor` whitelist — no raw author string);
  `divider.width` (px, clamped 8–400, default 34) sets the short-rule length and
  `divider.align` (`left`/`center`/`right`) positions it via auto margins.
  With `gradient` unset the legacy `<hr>` is byte-identical.

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
  a `title` text control. Base-only presentation controls configure textarea
  rows, whether select fields render a blank prompt, the pending/loading label,
  and keep-form versus hide-form success behavior. The editor canvas and public
  runtime consume the same normalized mapping; these values are not responsive
  overrides and do not duplicate Form resource settings. The editor canvas
  renders the form block through
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
  shell still owns document mutation and template instantiation. The Layers
  popover (rendered in `PageEditor.tsx`, host of `LayerBlockRows`) self-bounds
  its height as an `absolute` box with
  `max-h-[min(72vh,calc(100dvh-8rem))] flex flex-col overflow-hidden` and puts a
  single `min-h-0 flex-1 overflow-y-auto overscroll-contain` scroll region on the
  section list, so a tall multi-section block tree scrolls as ONE list and every
  layer stays reachable (`shrink-0` header); `LayerBlockRows` recursion adds no
  nested scroll box (TASK-526).
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

### Page color boundary (TASK-541 / TASK-539 handoff)

The TASK-541 seam is the shared canonical color contract from
`core/services/theme/cssColorContract.ts`. Its `authoring` profile is now the
server trust boundary for Page persistence and rendering: the Page backend
sanitizer in `pageAuthoringSanitizers.ts` delegates the untouched raw argument
to `parseCssColorValue(raw, "authoring")` and then applies the exact
seven-token filter below. There is no separate legacy backend color branch.

The Page-owned sanitizer permits exactly these site-token references, in owner
order: `var(--color-primary)`, `var(--color-secondary)`,
`var(--color-accent)`, `var(--color-bg)`, `var(--color-surface)`,
`var(--color-text)`, and `var(--color-border)`. Other syntactically valid
`var(--color-*)` names fail closed. The canonical `authoring` profile governs
the rest of the grammar: bounded supported literals (hex, `rgb()`/`rgba()`,
`hsl()`/`hsla()`), `transparent`, and the allowlisted token references only.
Named values such as `currentColor` and `inherit` are rejected at the write
boundary because they are not part of the `authoring` profile.

The seven-token rule applies to `var(--color-*)`; the shared parser enforces
the canonical simple-color grammar, numeric ranges, and canonical output
before the token filter runs. Optional Page color fields stay present-only:
rejection or clear removes/omits the field and does not seed a resolution
default.

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
  (`authOnly`/`anchor`/`startsAt`/`endsAt`), typography
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

## Motion And Interaction Effects — TASK-521

Pages v2 carries a cohesive family of motion/interaction effects. Every effect is
**present-only** (emits zero bytes when unauthored — a legacy / no-effect document
normalizes and renders byte-identical to the pre-521 output), joins the
**reject-unknown allowlist** (`assertKnownKeys` + the strict
`pageDocumentV2JsonSchema` `additionalProperties: false`) with a round-trip test,
respects **`prefers-reduced-motion`** (both a CSS `motion-safe:`/`motion-reduce:`
guard AND a `matchMedia('(prefers-reduced-motion: reduce)').matches` early-return
in each runtime IIFE), and adds **no npm dependency, no DB migration, and no
`PAGE_DOCUMENT_SCHEMA_VERSION` bump** (stays `2`). All config rides existing jsonb
(`section.style`, `currentData.settings.effects`, `hero.style`, block props). Runtime
scripts are static dependency-free IIFEs emitted only on the front/preview render
path (`PageDocumentRender`) — never on the builder canvas (Hard Invariant 7:
canvas shows content at rest). Enums are `normalizeEnum`-guarded (fail-CLOSED on
write — an invalid enum VALUE throws `PageDocumentError`), numbers are `readNumber`
clamped (fail-soft), and colors run through `readSafeColor` (whitelist; alpha OK via
TASK-519).

### Section scroll effects (`PageSectionStyleV2`)

`section.style` gains two present-only keys:

- `scrollEffect` — `PageSectionScrollEffect`, one of
  `pageSectionScrollEffects = ["none", "reveal-fade", "reveal-up", "parallax"]`.
  `"none"` is omitted (present-only). `reveal-fade`/`reveal-up` are
  IntersectionObserver reveal-on-enter; `parallax` translates the section inner
  content on scroll (rAF).
- `parallaxIntensity` — number, clamped to
  `PAGE_PARALLAX_INTENSITY_CLAMP = { min: 0, max: 40 }` px of travel. Meaningful
  only when `scrollEffect === "parallax"`.

Applied on the FRONT (and preview) only — the builder canvas renders sections via
`PageSectionContent` and never emits the runtime or reveal/parallax wrapper.

### Animated-icon block (the `icon` block)

The previously non-functional `icon` block placeholder is now a real, insertable,
runtime-rendered animated-icon block built from a curated inline-SVG + CSS-keyframes
set (`core/services/pages/animatedIconGlyphs.tsx`) — no npm dependency, CSP-safe.
No new `pageBlockTypes` member was added; the existing `icon` member was implemented
(promoted into `realRuntimeBlockTypes` + `editorInsertableBlockTypes`, its
`pageBlockCapabilityReasons.icon` "pending" entry removed). `pageBlockPropKeys.icon`
extends to `["name", "label", "animation", "size", "color", "speed"]`:

- `name` — curated glyph name, resolved against the allowlist
  `animatedIconNames = ["sparkles", "star", "heart", "zap", "check", "shield",
  "arrow-right", "bell", "rocket", "loader"]` via `resolveAnimatedIconName` (a name
  not matching `^[a-z0-9-]{1,48}$` or not in the set falls back to `"sparkles"`).
  Default props stay `{ name: "sparkles", label: "" }`.
- `animation` — one of
  `animatedIconAnimations = ["none", "spin", "pulse", "bounce", "draw"]` (default
  `"none"`).
- `size` — number, clamped `ANIMATED_ICON_SIZE_CLAMP = { min: 16, max: 160 }` px
  (default `48`).
- `color` — `readSafeColor` (default `var(--primary)`).
- `speed` — keyframe duration, clamped
  `ANIMATED_ICON_SPEED_CLAMP = { min: 400, max: 4000 }` ms (default `1600`), driven
  through the `--anim-speed` custom property. `motion-reduce` pauses the keyframes.

Legacy documents never contain an `icon` block (it previously rendered `null` and
was non-insertable), so byte-identity is trivially preserved.

### Hero mouse-tilt (`hero.style.tilt`)

`hero.style.tilt` is a present-only 3D parallax-on-hover option,
`HeroTilt = "none" | "subtle" | "strong"` (`heroTilts`). Unlike the page/section
enums, hero `tilt` normalizes **fail-SOFT** through a hero-local `resolveHeroTilt`
(mirroring `resolveHeroMotionPreset`) — an unrecognized value falls back to `"none"`
(omitted, present-only) and never throws. `"none"`/unset renders byte-identical to
today. Enabled tilt wraps the hero in a CSS `perspective` and a tiny `mousemove`
runtime that sets a clamped `rotateX`/`rotateY` on the inner card; reduced-motion or
a coarse/touch pointer disables the tilt (no runtime effect).

### Per-page effects (`settings.effects` → `PageEffectsV2`)

`currentData.settings.effects` is a present-only ambient-effect sub-object
(`PageEffectsV2`), omitted entirely when empty:

- `cursorSpotlight` — boolean; enables a cursor-follow radial spotlight on the page
  root (`--spotlight-x`/`--spotlight-y` updated on `mousemove`, rAF).
- `spotlightColor` — `readSafeColor` (default `var(--primary)`), injected as
  `--spotlight-color`.
- `spotlightSize` — spotlight radius, clamped
  `PAGE_SPOTLIGHT_SIZE_CLAMP = { min: 120, max: 900 }` px, injected as
  `--spotlight-size`.

Reduced-motion or a coarse pointer disables the spotlight. The per-page settings
surface was relocated out of the full-height drawer into a compact panel in the same
right side-inspector rail as section/block settings, with a new **Effects** section
(TASK-521-05).

## Composable Hero Toolkit & Premium Effects — TASK-522

TASK-522 adds the composable TOOLKIT to build a rich, premium hero (a layered glass
card with floating badges, drifting orbs, a pulsing ring, a tilt-on-pointer card and
a drawn line-SVG, plus hover glow/lift and a ticker strip) inside Page Editor v2 —
NOT a one-off hero widget. It builds on TASK-521 and shares its invariants: every
addition is **present-only** (zero bytes when unauthored — a legacy / no-effect
document normalizes and renders byte-identical to the post-521 output), joins the
**reject-unknown allowlist** (`assertKnownKeys` + the strict `pageDocumentV2JsonSchema`
`additionalProperties: false`) with a round-trip test, respects
**`prefers-reduced-motion`** (a CSS `@media (prefers-reduced-motion: no-preference)`
gate around every keyframe binding AND, for the block-tilt runtime, a `matchMedia`
early-return), and adds **no npm dependency, no DB migration/DDL, no new route/RBAC,
and no `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (stays `2`). All config rides existing
jsonb (`block.style`, `section.style`, block props). Enums are `normalizeEnum`-guarded
(fail-CLOSED on write — an invalid enum VALUE throws `PageDocumentError`), numbers are
`readNumber`-clamped (fail-soft), and colors run through `readSafeColor`.

### Custom-SVG block (`customSvg`) — the one new `pageBlockType`

`customSvg` is a Page-owned block, not a configurable widget, and is the single new
`pageBlockType` member (the FIVE exhaustive
`Record<PageBlockType, …>` surfaces gain one entry each). `pageBlockPropKeys.customSvg
= ["svg", "drawIn", "drawSpeed", "label"]`, defaults `{ svg: "", drawIn: false, label:
"" }`:

- `svg` — untrusted inline SVG source, sanitized at BOTH write (`normalizeBlockProps`)
  and render by `core/services/pages/svgSanitizer.ts`. The shared immutable closed
  policy excludes author-controlled `class` and `style` on the root and descendants;
  unknown names are removed, while unsafe or malformed input fails closed. See
  `SECURITY_SPEC.md` § Pages custom-SVG sanitizer and renderer boundary.
- Sanitized text is parsed by `buildSafeSvgTree` without browser error recovery into a
  deeply frozen closed tree, bounded to 2,048 elements, depth 64, and 8,192 decoded
  text characters. The renderer traverses that tree into React elements through the
  complete explicit source-to-React prop map; author data never enters a
  `dangerouslySetInnerHTML` sink.
- The root aspect ratio is snapshotted from a strict finite four-number `viewBox`, or
  positive finite `width`/`height` fallback, before root `x`, `y`, `width`, `height`,
  and `transform` are removed. Renderer-owned layout clamps the ratio to 1/8..8, sets
  width to 100%, caps block size at 1,024 px, clips overflow, contains layout/paint,
  and disables pointer events. Safe descendant drawing geometry remains unchanged.
- Invalid input renders only the neutral placeholder. The verification contract covers
  editor, published, and preview paths and requires narrow/wide browser isolation and
  click-through smoke with zero console errors before task closure.
- `drawIn` — boolean; enables an optional stroke draw-in animation
  (`@keyframes cx-draw { to { stroke-dashoffset: 0 } }`, the reference `.draw-line`).
- `drawSpeed` — draw duration, clamped `PAGE_DRAW_SPEED_CLAMP = { min: 600, max: 6000 }`
  ms, driven through the `--draw-speed` custom property.
- `label` — a11y title text.

Legacy documents never contain a `customSvg` block, so byte-identity is trivially
preserved. Byte cap `PAGE_CUSTOM_SVG_MAX_BYTES = 24576` (24 KiB, measured via
`TextEncoder` — the sanitizer is isomorphic and also runs at render).

### Block style fields (`PageBlockStyleV2`) — decoration / tilt / layer / hover / surface / marquee / composition

`block.style` gains present-only keys (all reject-unknown + round-trip tested; only the
NUMERIC `layer.x/y/z` render per device — see below):

- `decoration?: PageBlockDecoration` — `{ motion, delay?, duration? }` turning any
  block into a layered floating decoration. `motion` ∈
  `pageBlockDecorationMotions = ["none", "float", "drift", "pulse", "orbit", "radiate"]`
  (`"none"` omitted). `float` = `.floating-chip` translateY; `drift` = `.hero-bg-orb`
  translate+scale; `pulse` = `.sun-ring`/`pulseRing` scale+opacity; `radiate` =
  `.map-pulse`/`mapPulse` concentric box-shadow ring; `orbit` = rotation. `delay`
  clamped `PAGE_DECORATION_DELAY_CLAMP = { min: 0, max: 4000 }` ms (staggering);
  `duration` clamped `PAGE_DECORATION_DURATION_CLAMP = { min: 2000, max: 16000 }` ms.
- `tilt?: PageTiltStrength` — `pageTiltStrengths = ["none", "subtle", "strong"]`; a
  perspective + `preserve-3d` pointer-tracking 3D tilt on any block, driven by the
  `[data-block-tilt]` runtime binding appended to `pageEffectsRuntime.ts`. Since
  TASK-528 the tilt transform rides the **surface FRAME** (`data-block-tilt` co-located
  with `data-surface`, so the WHOLE glass card tilts, not just its inner content); the
  CSS `perspective` sits on an ANCESTOR `[data-tilt-parent]` wrapper (see below).
- `tiltGlare?: boolean` — optional `.cx-glare` sheen sweep on a tilted block.
- `layer?: PageBlockLayer` — `{ x?, y?, z?, anchor? }` placement inside a layered
  canvas. `x`/`y` clamped `PAGE_LAYER_X_CLAMP`/`PAGE_LAYER_Y_CLAMP = { min: -50, max:
  150 }` %; `z` clamped `PAGE_LAYER_Z_CLAMP = { min: 0, max: 20 }`; `anchor` ∈
  `pageLayerAnchors` (9 grid positions). Only `x/y/z` vary per device (via
  `pageResponsiveCss.ts` `--layer-*` deltas); `anchor` is base-only.
- `surfacePreset?: PageSurfacePreset` — `pageSurfacePresets = ["none", "glass",
  "glass-grid", "radial-glow", "ambient-orbs"]`; one-click premium backgrounds.
- `surfaceTint?: string` (TASK-524-02) — present-only, alpha-capable glass/glow tint
  that seeds `--surface-glow`/`--deco-ring`/`--orb-color` **independent of**
  `style.background`. Sanitized at the write boundary via `sanitizeAuthoringCssColor`
  (`readOptionalSafeColor`); a bad color fails soft (key omitted, never `null`/`""`).
  It takes **precedence** over the 522 `style.background`-derived glow — the plain-color
  `background` remains a FALLBACK only when no `surfaceTint` is authored (a chip with a
  background and NO `surfaceTint` stays byte-identical to 522). A gradient/url tint is
  left out (invalid inside `radial-gradient()` → CSS falls back to the reference
  literal). Authored with the 519 alpha-capable swatch (hex8/`rgba()` round-trip);
  unlike the base-only surface fields it is **per-device** (see below).
- `hoverEffect?: PageBlockHoverEffect` — `pageBlockHoverEffects = ["none",
  "glow-reveal", "lift", "scale", "lift-glow"]`; hover interactivity (the reference
  `:hover:after` glow-reveal, `:hover` lift/scale).
- `marquee?: PageBlockMarquee` — `{ speed?, direction?, seamless? }` on a `group`/row
  block only (`@keyframes cx-ticker`). `speed` clamped `PAGE_MARQUEE_SPEED_CLAMP =
  { min: 8, max: 40 }` s; `direction` ∈ `pageMarqueeDirections = ["left", "right"]`;
  `seamless` duplicates the track for a gapless loop.
- `composition?: PageComposition` — `pageCompositions = ["flow", "layered"]`; a
  layout-block (`container`/`columns`/`group`) becomes an absolute positioning context
  for its `layer`-placed children.
- `revealDelay?: number` (TASK-525-02) — per-block scroll-reveal stagger, ms, clamped
  `PAGE_REVEAL_DELAY_CLAMP = { min: 0, max: 4000 }` (same bound as the decoration delay).
  Normalized via `readNumber` (`Number.isFinite` + clamp; NaN/Infinity fail-soft to 0)
  and emitted ONLY as the bounded `--reveal-delay` custom property (`${n}ms`) on the
  `[data-block-id]` frame — never a raw declaration/markup/URL. It feeds the per-block
  reveal `transition-delay` (see `PAGE_REVEAL_MOTION_CSS` below), so a revealing section's
  blocks CASCADE (each fades on its own delay) instead of fading as one unit — matching the
  reference `[data-delay]` cascade. Present-only (omitted when unset → byte-identical),
  BASE-ONLY (`responsive:false` — the reveal CSS is shared/static so a per-device delay is
  not expressible), reject-unknown + round-trip tested. Reveal stays JS-gated under
  `[data-reveal-armed]` + `motion-safe:`, so a `transition-delay` is inert under
  `prefers-reduced-motion` (no transition runs) — motion-neutral, no new runtime/keyframe.
- `glow?: PageGlow` (TASK-531) — an arbitrary COLORED box-shadow (the reference colored-glow
  shadows) as a **structured spec**, `{ color, blur?, spread?, x?, y? }`. `color` is REQUIRED
  and sanitized via `sanitizeAuthoringCssColor` at write (`readOptionalSafeColor`); an
  invalid/absent color OMITS the whole glow (present-only, fail-soft — never a partial glow).
  The numerics are clamped: `blur` `PAGE_GLOW_BLUR_CLAMP = { min: 0, max: 120 }` (default 24
  at render), `spread` `PAGE_GLOW_SPREAD_CLAMP = { min: -40, max: 80 }`, `x`/`y`
  `PAGE_GLOW_OFFSET_CLAMP = { min: -80, max: 80 }`. It composes at render via the shared pure
  `composeGlowBoxShadow` (`pageGlow.ts`) into a FIXED `"<x>px <y>px <blur>px <spread>px
  <color>"` template — NEVER a raw author string, re-sanitized + re-clamped at BOTH render
  boundaries (defence in depth). When the enum `shadow` token is ALSO set, the glow is
  APPENDED (`mergeShadows` → `"<enum-shadow>, <glow>"`) so both render (glow augments the
  token drop-shadow). Authored via the `block.style.glow.*` controls (color swatch + four
  numeric fields, `responsive:true` — a per-device glow rides the `pageResponsiveCss.ts`
  box-shadow branch). Reject-unknown nested key + round-trip tested; omitted when unset →
  byte-identical.
- `colSpan?: number` / `rowSpan?: number` (TASK-533-01) — a block can SPAN columns/rows
  in the section grid, reproducing the reference `.project-card.large{grid-row:span 2}` /
  `.offer-card.feature{grid-row:span 2}` (the Aurora card 2× taller). Both are clamped
  integers (`readOptionalClampedNumber` + `Math.trunc` against `PAGE_BLOCK_SPAN_CLAMP =
  { min: 1, max: 4 }`; NaN/Infinity/out-of-range fail-soft) and emit ONLY `gridColumn:
  "span N"` / `gridRow: "span N"` on the block FRAME — never a raw author value in a CSS
  declaration, markup, or URL. The span is emitted ONLY on the auto-flow grid path; it is
  SUPPRESSED for a block placed inside a per-column composition (where the parent owns the
  track placement), so it cannot fight explicit column placement. Present-only (unset ⇒ no
  `gridRow`/`gridColumn`, byte-identical to post-530); joins `pageBlockStyleKeys` +
  `pageBlockStyleJsonSchema` (`additionalProperties:false`); reject-unknown + round-trip
  tested. Authored via the `block.style.colSpan`/`rowSpan` number controls.

### Multi-layer background + gradient background type (TASK-531)

Both `block.style.background` and `section.style.background` (with `backgroundType:"gradient"`)
now accept a **safe multi-layer** value — a COMMA-SEPARATED list of gradient/color layers
(glow-over-gradient, the reference `.cta-card`/`art-*` look), e.g. `radial-gradient(circle at
82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)`.
The write sanitizer `sanitizeAuthoringCssBackground` allowlists the value PER top-level
comma-split layer (whole-value tripwire pre-pass → depth-0 comma split → each layer must be a
safe color or safe single gradient → `PAGE_BG_MAX_LAYERS = 6` cap; length-capped at
`PAGE_CSS_VALUE_MAX_LENGTH = 512`; fails CLOSED — see SECURITY_SPEC). The single-layer fast
path is unchanged (byte-identical). Both render boundaries re-gate on
`isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)` so a multi-layer
value actually PAINTS: the SSR inline path (`toGradientBackground` → `background-image`) and
the per-device RAW `<style>` path (`pageResponsiveCss.ts`). The SECTION gradient branch is NEW
(the block gradient was already wired) — a `section.style.backgroundType:"gradient"` now paints
via `background-image` on the content box AND, for a full-bleed section, on the `100vw` bleed
box; the gradient TYPE reuses the existing `backgroundType` `select` (`pageBackgroundTypes`
includes `"gradient"`), so no new control was needed.

### Section style fields (`PageSectionStyleV2`) — surface preset + layered canvas + full-bleed

`section.style` gains present-only `surfacePreset?: PageSurfacePreset` (same enum) and
`composition?: PageComposition` (`"layered"` makes the section a positioning context for
absolutely placed children).

`section.style` also gains a present-only `fullBleed?: boolean` (TASK-525-01). When `true`,
the section paints its background BOX edge-to-edge (a fixed-literal `100vw` bleed on the
OUTER `<section>` via `toPageSectionBleedStyle`: `width:100vw;margin-left/right:calc(50% -
50vw)`, carrying the sanitized background color/URL, clamped radius, and shadow) while its
CONTENT stays capped and centered at `layout.maxWidth` — the content `<div>`
(`toPageSectionStyle`) is `width:min(${maxWidth}, calc(100% - 40px));margin:0 auto` with a
fixed 20px side gutter, mirroring the reference `.container` inside a full-bleed section.
The bleed is keyed off `template.variant === "full-width" || style.fullBleed === true`
(`isPageSectionFullBleed`), so ANY section — not just the `full-width` template variant —
can bleed its background with contained content. This DECOUPLES the background bleed from
the content max-width: prior to 525 the `full-width` variant dropped the content cap
(`maxWidth:"none"`), spreading content to the viewport edges; now the background bleeds but
the content stays contained. Present-only (`false`/unset omitted → the non-bleed section is
byte-identical), device-uniform (`responsive:false` — the bleed is fixed render structure,
not a per-property CSS delta), reject-unknown + round-trip tested. Only fixed literals
(`100vw`, the 20px gutter) reach CSS — no author-controlled value. The section threads its `readSafeColor`-validated
`style.accent` into `--surface-glow`; blocks thread a plain-color `style.background`
(gradients/urls are left out — an invalid `radial-gradient()` retint).

`section.style` also gains a present-only `glow?: PageGlow` (TASK-531), the SAME structured
colored box-shadow spec + clamps + `composeGlowBoxShadow` render composition documented for the
block above (merged with the enum section `shadow` via `mergeShadows`, painted on the section
content box AND, for a full-bleed section, the `100vw` bleed box). Authored via the
`section.style.glow.*` controls (`responsive:true`). It joins the section `assertKnownKeys`
allowlist and ALL THREE `additionalProperties:false` section-style JSON schemas — the block
schema, the per-breakpoint `partialSectionStyleJsonSchema`, AND the inlined TOP-LEVEL
section-style schema (validating `sections[].style`) — in lockstep, mirroring the
`surfacePreset`/`composition`/`fullBleed` precedent, so a top-level `style.glow` round-trips
against the compiled `pageDocumentV2JsonSchema`. Present-only, reject-unknown, round-trip
tested; `PAGE_DOCUMENT_SCHEMA_VERSION` stays `2` (no migration).

### Asymmetric column ratio + per-edge section border (TASK-533)

`section.style` also gains two present-only fields (both reject-unknown + round-trip
tested; `PAGE_DOCUMENT_SCHEMA_VERSION` stays `2`, no migration):

- `columnTemplate?: string` (TASK-533-01) — a restricted `grid-template-columns` value
  (e.g. `"1.15fr .85fr"`, `"1fr 1.2fr"`, `"minmax(0,1fr) minmax(420px,.9fr)"`) that, when
  set, OVERRIDES the symmetric `pageSectionGridClass(columns)` with an inline
  `gridTemplateColumns` on the content grid, reproducing the reference intro (1/1.2fr) and
  realizacje (1.15/.85fr) ratios. This is the ONLY author-controlled STRING reaching a CSS
  VALUE position, so it goes through the NEW strict-allowlist sanitizer
  `sanitizeAuthoringGridTemplate` (`pageAuthoringSanitizers.ts`) at the write boundary: an
  up-front metacharacter reject (`;{}\<>@` backtick `/*` `url(` `expression(` and any `:`
  outside a function's parens) → paren-depth-aware TOP-LEVEL whitespace split (so
  `minmax(0, 1fr)` / `repeat(3, 1fr)` stay one track) → each track must match a tiny
  grammar (`<num>fr|px|%|rem|em`, `auto`, `minmax(min,max)`, `repeat(<int>,…)`), bounded
  `GRID_MAX_TRACKS = 12` / `GRID_MAX_REPEAT = 12`, minmax/repeat INNER tokens re-validated
  against a finite length pattern, and re-emitted in a CANONICAL no-inner-space form. It is
  a positive ALLOWLIST (not a blocklist); rejection ⇒ the field is OMITTED (present-only,
  fail-soft) and never emitted raw. It is a single React inline-style value (no CSS-rule
  interpolation, so no rule-injection surface) AND additionally sanitizer-gated. Curated
  `pageColumnTemplatePresets` back the "Column ratio" control (every preset round-trips
  unchanged). Unset ⇒ symmetric `grid-cols-N`, byte-identical to post-530. DISJOINT from
  the 531 gradient/multi-layer relaxation surface (does NOT touch
  `isSafeAuthoringCssGradient` / `sanitizeAuthoringCssBackground`).
- `border?: PageSectionBorderV2` (TASK-533-02) — a per-edge section border
  (`{ top?, right?, bottom?, left? }`, each `{ color?, width?, style? }`), at minimum
  top+bottom for the reference `border-block` (`.intro-strip{border-block:1px solid
  rgba(255,255,255,.1)}`), full four-edge supported. Each `color` is sanitized via
  `sanitizeAuthoringCssColor` (through `readOptionalSafeColor`) — the only sanctioned color
  path; each `width` is clamped `PAGE_SECTION_BORDER_WIDTH_CLAMP = { min: 0, max: 16 }` px
  via `readOptionalClampedNumber`; each `style` is `normalizeEnum`-validated against the
  fixed border-style enum. It emits fixed `border-{edge}-color/-width/-style` declarations
  on the NORMAL content box AND, for a full-bleed section, on the `100vw` bleed box — never
  the paint-empty full-bleed content box, and never a raw author value in a free CSS
  position. The nested `style.border.<edge>.color` optimistic client-state path is also
  routed through `sanitizeAuthoringCssColor` in `pageEditorMutationActions.ts` (the length-4
  override path the `[group,key]` destructure would otherwise leave unsanitized). It joins
  the section `assertKnownKeys` allowlist and BOTH `additionalProperties:false` section-style
  JSON schema mirrors (the per-breakpoint `partialSectionStyleJsonSchema` AND the inlined
  top-level section-style schema) in lockstep. Present-only: omitted whole-object when no
  edge is authored ⇒ byte-identical to post-530. Authored via the per-edge
  `section.style.border.*` controls.

### Per-device scope (bounded + honest)

Only the NUMERIC `layer.x/y/z` offsets AND the `surfaceTint` COLOR vary per breakpoint —
`pageResponsiveCss.ts` emits per-property `--layer-*` declarations plus, for
`surfaceTint` (TASK-524-02), per-breakpoint `--surface-glow`/`--deco-ring`/`--orb-color`
retargets under the tablet/mobile `@media` rule (serialized `!important` so the delta
beats the inline base custom prop; gated, like the base resolver, on a plain
non-gradient tint AND an active `surfacePreset`/`hoverEffect`/decoration motion ∈
`{radiate,pulse,drift,float}`). Class/data-attr effect deltas remain NOT CSS-expressible
against the inline base, so `decoration`/`surfacePreset`/`hoverEffect`/`tilt`/
`composition`/`marquee` stay BASE-ONLY (identical on every breakpoint, their controls
`responsive: false`); a decoration is HIDDEN on mobile via the existing per-device block
visibility (`display:none`), not "kept but animation-off".

### Surface+effect co-location — one node, `translate:` anchor (TASK-524-01)

Before 524, `PAGE_COMPOSITION_EFFECTS_CSS` wrote the `[data-layer-anchor]` self-offset
via `transform: translate(…)`, so a transform-writing effect (`float`/`drift`/`pulse`/
`orbit` decoration, `lift`/`lift-glow`/`scale` hover) would have clobbered the anchor
offset on the same node — 522 therefore routed the effect onto an INNER wrapper while
`data-surface` stayed on the frame, so only the inner content animated and the glass
surface stayed static. 524-01 switches the nine anchor rules to the **independent CSS
`translate:` property** (`translate:-100% -100%`, etc.), a separate composited channel
from `transform`. `splitBlockComposition` (`pageRendererV2.tsx`) now keeps a transform
decoration/hover **co-located with `data-surface`/`data-layer` on the SAME frame node**,
so the whole glass card floats/lifts with its content (matching the reference
`.floating-chip`). **TASK-528 completes the co-location for TILT too**: the tilt
transform now rides the **FRAME** (`data-block-tilt` co-located with `data-surface`),
so the ENTIRE glass card tilts on hover (was: tilt on an inner descendant, so only the
inner content tilted while the glass card stayed flat). Because CSS `perspective` must
sit on an ANCESTOR of the transformed node, `renderPageBlockWithFrame` wraps the frame
in a present-only `[data-tilt-parent]` perspective wrapper (`splitBlockComposition`
exposes `tiltParent`; the frame no longer carries `data-tilt-parent`) — omitted unless
the block authors tilt, so non-tilt frames render byte-identically. The tilt uses the
`translate:`-property anchor (524-01) so the anchor offset composes with the tilt
`transform`; the one rare untested combo is tilt AND a transform-decoration on the same
block (they contend on the frame `transform` — the reference never combines them: chips
float, the card tilts). The glass/glass-grid surfaces gained `overflow:hidden` (524-03) so the
node's own box clips to its inline border-radius throughout the transform (anchored
chips are `[data-layer]` SIBLINGS in `.cx-layered-canvas`, never DOM children, so they
are never clipped). The `translate:` property is a CSS Transforms L2 feature
(Chrome/Edge 104, Firefox 72, Safari 14.1; universal on the 2026 evergreen baseline);
the swap is motion-neutral (static offsets), so `prefers-reduced-motion` is unchanged.

### Composition CSS + runtime

The static composition CSS (`core/services/pages/pageCompositionEffects.tsx`,
`PAGE_COMPOSITION_EFFECTS_CSS`) + the resolvers (`resolveBlockCompositionAttrs` /
`resolveSectionCompositionAttrs` → `data-deco`/`data-surface`/`data-hover`/`data-layer`/
`data-composition`/`data-marquee`/`data-block-tilt` attributes + CSS custom properties)
are emitted once in `PageDocumentRender` (front/preview only, never the builder canvas)
when a 522 effect is authored, alongside 521's runtime. The block-tilt (+ glare)
pointer math is a small documented duplication of `hero.tsx`'s `HERO_TILT_SCRIPT`
appended to the shared `pageEffectsRuntime.ts` as a self-gated `[data-block-tilt]`
binding (its own `matchMedia('(pointer:fine)')` gate; reuses the module reduced-motion
early-return).

## Page Canvas Background & Occlusion-Proof Cursor Spotlight — TASK-523

TASK-523 extends the same page-settings + page-render seams landed by TASK-521,
riding existing `currentData.settings` jsonb with **no migration, no
`PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), no npm dependency**. Both deliverables
are **present-only** (omitted when unset ⇒ `defaultSettings` and legacy/post-522
documents AND the `<Root>` stay byte-identical) and join the **reject-unknown
allowlist** (`assertKnownKeys` + strict `pageDocumentV2JsonSchema`
`additionalProperties: false`) with round-trip tests.

### `settings.background` — per-page canvas background

`settings.background` is a present-only per-page canvas background: a safe solid color
OR CSS gradient. It normalizes on write (`normalizeSettings`) and re-sanitizes at render
(`PageDocumentRender`, defence-in-depth) through the SINGLE color/gradient path
`sanitizeAuthoringCssBackground` — a value that fails the sanitizer returns `null` and
the key is dropped (fail-soft). When present it is emitted as an inline
`style.background` on the page `<Root>`, overriding the default `min-h-screen bg-white
text-slate-950` utility; when absent, `rootStyle` stays `undefined` and `<Root>` is
byte-identical to post-522. The compact page-settings panel exposes a **Design →
"Page background"** control (the shared color-only `ColorSwatchControl`, alpha-capable
via the TASK-519 custom input) that writes `settings.background` onto the LIVE document
draft via `setDocumentDraft` (persisted on every save/publish, mirroring the spotlight
color; clearing drops the key). **Gradients are model/import-only** — they round-trip
and render through `settings.background`, but the panel widget authors solid colors only.

**Gradient hardening (was TASK-523 FU-1, landed here).** `isSafeAuthoringCssGradient`
(`pageAuthoringSanitizers.ts`) now rejects any `url(` token AND any top-level
comma-separated multi-layer form (`isSingleGradientLayer` — one gradient head + its
balanced parens and nothing after the matching close paren). This closes the
`linear-gradient(...), url(//evil/beacon.png)` outbound-fetch layer and the nested
`radial-gradient(circle,url(//x))` case that the pre-523 charset admitted as an inert
malformed gradient. The charset already excluded `;`/`{`/`}`/`<`/`>`/`:` (no declaration
or `</style>` breakout); this closes the residual `url()`-layer surface too.

### Occlusion-proof cursor spotlight (`PAGE_SPOTLIGHT_CSS`)

The 521 cursor-follow spotlight overlay previously painted at `z-0`, BEHIND opaque
section backgrounds, so the glow was only visible through translucent glass/SVG
surfaces. TASK-523-02 makes it occlusion-proof:

- The overlay's **static layering is a NON-gated base rule**:
  `position:fixed;inset:0;z-index:30;mix-blend-mode:screen;pointer-events:none`. It sits
  ABOVE opaque section content and ADDS light (screen blend) without hiding content or
  blocking clicks. The moving `radial-gradient` stays inside
  `@media (prefers-reduced-motion: no-preference)`, so reduced-motion users get a
  correctly-layered but MOTIONLESS (no-gradient) overlay.
- **Nav-safe:** the overlay z-index (`30`) is STRICTLY BELOW the front sticky nav
  (`sticky z-40`) so screen-blend never tints the menu bar. The inequality holds because
  `<Root>` forms no stacking context and nav + `PageDocumentRender` are sibling fragment
  children; it is FRAGILE (a future `transform`/`filter`/`opacity`/`will-change`/
  `isolation` ancestor would trap the fixed overlay above the nav) so it is HELD IN A
  TEST, and `isolation:isolate` is the deliberate NON-choice on `<Root>`.
- The only other author-controllable surface in the same root stacking context is a
  layered-canvas `[data-layer]` (`layer.z` → `z-index`); its bound
  `PAGE_LAYER_Z_CLAMP.max` was lowered from `40` to `20`, STRICTLY BELOW the overlay's
  `30`, so no authored layer can reach the spotlight and occlude the glow. Invariant:
  `PAGE_LAYER_Z_CLAMP.max (20) < overlay z-index (30) < nav z-index (40)`.

## Declarative Interactivity — Tabs/Switcher, Filterable Gallery, Polish — TASK-534

TASK-534 (Bundle D of the page-toolkit fidelity program; absorbs TASK-527) adds a
cohesive family of DECLARATIVE interactivity, closing `_TMP-cms-ograniczenia.md` §1
("Brak interaktywności JS") and reproducing `_docs/projekty-domow-wow-site`. Every
addition is **present-only** (omitted when unauthored ⇒ the document AND HTML stay
byte-identical to post-530/535), joins the **reject-unknown allowlist**
(`assertKnownKeys` + strict `pageDocumentV2JsonSchema` `additionalProperties: false`)
with a round-trip test, and needs **no npm dependency, no DB migration, no
`PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), no new route/RBAC**. The behaviour
rides the **ONE existing** `pageEffectsRuntime.ts` `<script>` as static,
dependency-free IIFE clauses (no interpolation of stored data) and is
`prefers-reduced-motion` + keyboard + aria-tablist safe.

### Segmented `switcher` / tabs block (absorbs TASK-527)

`switcher` is a NEW `pageBlockTypes` member added the `customSvg` way — ATOMICALLY
across every exhaustive `Record<PageBlockType, …>` surface (`pageBlockTypes`,
`pageBlockPropKeys`, `pageBlockDefaultProps`, `realRuntimeBlockTypes`,
`editorInsertableBlockTypes`, `layoutBlockTypes`, `pageBlockRenderDefaults.ts`,
`pageEditorOptions.ts` `blockOptionCopy`, `pageEditorControlRegistry.ts`
`pageBlockControlRegistry`, and the test-tree `pageEditorBlockLabels`) so root `tsc`
stays green. Its N labelled panels live in SIX new `panel:1..panel:6`
`pageBlockSlotKeys` slots; `switcher` joins `layoutBlockTypes` so
`getPageBlockActiveSlotKeys` returns its panel slots (schema + normalize slot
validation read `pageBlockCapabilities[type].slots`). Props: `variant`
(`normalizeEnum` fail-closed), `activeIndex` (clamped), and up to six free-text tab
`{label}` records (rendered as escaped React TEXT nodes — never
`dangerouslySetInnerHTML`). Optional base-only `ariaLabel` is present-only,
trimmed, bounded to 160 characters, rejected when blank/wrong-type/overlong on
fresh writes, and never seeded into defaults or responsive overrides. Its editor
control is the non-responsive `Tab list label`; the renderer uses the authored
value as the tablist accessible name and otherwise retains the existing generic
fallback without adding a stored key. The renderer emits a real `role="tablist"` with N
`role="tab"` (roving `tabindex`, `aria-selected`, `aria-controls`) and N
`role="tabpanel"` (`aria-labelledby`, resting `hidden` on inactive panels for no-JS
progressive enhancement). The runtime clause toggles the active panel on click and
roves selection on ArrowLeft/Right/Up/Down/Home/End; it sits BEFORE the reduced-motion
whole-IIFE early-return so it works for reduce users (the crossfade is CSS
`motion-safe:`-guarded).

### Filterable gallery/portfolio

Present-only `filterable` + `filterCategories` props on the EXISTING `gallery` block,
plus an optional per-item `category` — a SPACE-SEPARATED SET of single kebab tokens
`^[\w-]{1,48}$`, out-of-pattern tokens DROPPED fail-soft at BOTH write and render. The
renderer emits a `role="tablist"` chip bar (`[data-gallery-filter]`, `[data-filter]`
chips) above the grid and stamps each figure with `[data-filter-item]` +
`data-category`; the runtime shows/hides items on chip click via
`cat.split(" ").indexOf(f)` (token-split — no substring false positive, no
`innerHTML`/`eval`). Unset ⇒ `renderGallery` output is byte-identical. The `gallery`
block is now editor-insertable (its `gallery-editor-controls-pending` capability reason
is cleared now that the filter/layout controls shipped).

### Polish — noise overlay, scroll-hint, magnetic

- **Noise/grain overlay** — present-only `PageEffectsV2.noiseOverlay` (page root) and
  `PageSectionStyleV2.noiseOverlay` (section). Paints a STATIC self-generated
  SVG-turbulence layer (`pageInteractivityGlyphs.tsx` data-URI — no asset, no author
  color, no `sanitizeAuthoringCssBackground` relaxation). Renders identically under
  reduced-motion; `[data-noise-host]{position:relative}` supplies the positioning
  context for the `inset:0` overlay. CSS/static — does NOT widen `anyMotion`.
- **`scrollHint` block** — a NEW `pageBlockTypes` member (customSvg pattern): a
  CSS-keyframe-only `aria-hidden` dot/chevron (`glyph` enum, `normalizeEnum`
  fail-closed) with an optional `sr-only` `label`. The bob is `@media
  (prefers-reduced-motion: no-preference)`-gated; NO runtime.
- **Magnetic button** — present-only `PageBlockStyleV2.magnetic` (`readBoolean`). A NEW
  clause in `PAGE_EFFECTS_RUNTIME_SOURCE` (after the 522 `[data-block-tilt]` clause)
  attracts `[data-magnetic]` toward the pointer, transforms only, rAF + `passive`,
  clamped ±14px. Placed AFTER the reduced-motion early-return (motion suppressed for
  reduce) behind its own `matchMedia('(pointer:fine)')` gate (no magnet on touch).

### Runtime — one `<script>`, split placement + CSS

All three clauses live in the single `PAGE_EFFECTS_RUNTIME_SOURCE`; the SINGLE emit in
`PageDocumentRender` carries them, its `anyMotion` predicate OR-widened (append-only) by
a new `usesInteractivityRuntime(document)` resolver (`pageCompositionEffects.tsx`) that
returns true only for RUNTIME-BEARING surfaces (switcher / filterable gallery /
magnetic) — scrollHint + noise are CSS/static and do NOT widen it. Interaction TOGGLES
(switcher, filter) sit BEFORE the reduced-motion early-return (accessibility — they must
work for reduce users); the magnetic MOTION clause sits AFTER it. Idempotent via the
existing per-window init flag (535). `PAGE_INTERACTIVITY_CSS` (present-only emit) styles
the tab bar (horizontal-scroll on mobile), pill/underline selected states via
`var(--primary)`, panel crossfade + filter fade + magnetic transition (all inside
`prefers-reduced-motion: no-preference`), while the FUNCTIONAL `[hidden]` / `.is-hidden`
`display:none` rules sit OUTSIDE the guard so tabs/filters WORK for reduce users.

## Page V2 Strict Contract Hardening — TASK-539

TASK-539 is the post-audit remediation pass over the TASK-534/535 page-toolkit
surface. It hardens the PageDocumentV2 contract (canonical gallery, strict
responsive style types, parsed background paint, shared grid placement), fixes
the public renderer (marquee replica identity, timeline geometry, transform
hosts), makes public breakpoint CSS match the normalized model, and replaces the
effects-runtime all-or-nothing flag with one reusable per-root controller.
Everything is **present-only** and **byte-identical when unauthored**: a legacy
or no-effect document normalizes and renders exactly as before,
`PAGE_DOCUMENT_SCHEMA_VERSION` stays `2`, and no route, DDL, dependency, or
RBAC change ships.

### Strict canonical gallery model

`gallery` block `items[]` rows are canonical `{ src, alt, caption, category? }`
objects owned by `core/services/pages/pageGalleryV2.ts`:

- Limits: `PAGE_GALLERY_ITEMS_MAX = 120` rows, `PAGE_GALLERY_SRC_MAX = 2048`,
  `PAGE_GALLERY_ALT_MAX = 500`, `PAGE_GALLERY_CAPTION_MAX = 2000`.
- A nonempty `src` must equal the media sanitizer output byte-for-byte;
  `alt`/`caption` must already equal their trimmed form. The empty draft
  sentinel `{ src:"", alt:"", caption:"" }` persists and counts toward the
  limit; caption-only placeholders are legal. The public renderer emits a node
  only when media or caption exists.
- The optional `category` is a space-separated stack of 1..12 owner-valid kebab
  tokens (`^[\w-]{1,48}$`), capped at 587 characters total. Writes reject
  unknown gallery keys and legacy aliases at the exact nested path
  (`page_document_unknown_field`) and reject wrong shapes, missing required
  fields, unsafe nonempty media URLs, invalid category values, duplicate
  tokens, or limit overflow (`page_document_invalid`).
- **Legacy reads are preserved non-destructively.** Stored reads slice to the
  first 120 raw rows, resolve legacy aliases with pinned precedence
  (`src > url > image > assetUrl`, `alt > title > ""`,
  `caption > title > label > name > description > ""`), trim, cap, re-sanitize
  the source, deduplicate category tokens, and rebuild fresh canonical objects
  without mutating caller data.

### Shared grid placement classification

`core/services/pages/pageBlockGridPlacement.ts` is the single Bun-free source
for where a section-root block paints in the rendered grid. Consumers never
re-derive the rule:

- `"block-frame"` — ordinary root grid cell (the default resolved template).
- `"section-template-wrapper"` — timeline/gallery/FAQ/testimonials roots wrapped
  by template chrome.
- `"none"` — nested slot children, per-column composition, and non-default
  `media-split` layouts.
- The Page editor classifies with `{ includeHiddenBlocks: true }`; the public
  renderer and responsive CSS use the public visible-root set (`false`). Spans
  (base or responsive-only) stamp `[data-page-block-grid-item]="<blockId>"` on
  the one legal target only when the renderer's shared has-any-span predicate
  fires; wholly unauthored spans emit neither hook nor CSS, and nested
  descendants never carry a grid hook or span declaration.

### Responsive typography, spans, and layers

Public breakpoint CSS (`pageResponsiveCss.ts` — explicit facade over
orchestration/section/block/declarations/contracts modules) matches the
normalized model:

- Typography-capable blocks emit sanitized `fontSizeCustom` (strict
  numeric-unit or single `clamp()`/`min()`/`max()` grammar) as `font-size` and
  present `textTransform`, including an explicit `"none"` reset, as
  `text-transform`, scoped to the block text node (or the button's visual
  element).
- Responsive layers carry only present `x`/`y`/`z`; `anchor` is rejected at
  write and dropped at read, and a responsive layer without a normalized base
  layer is unreachable. The present-key merge emits exactly the authored keys —
  zero is a real reset, and inherited desktop values are never re-emitted.
- The dedicated responsive style types (`PageSectionResponsiveStyleV2`,
  `PageBlockResponsiveStyleV2`, `PageBlockResponsiveLayerV2`) and their strict
  schemas exclude every base-only/structural key (section
  `scrollEffect`/`parallaxIntensity`/`surfacePreset`/`composition`/`fullBleed`/
  `noiseOverlay`/`columnTemplate`/`border`; block
  `decoration`/`tilt`/`tiltGlare`/`surfacePreset`/`hoverEffect`/`marquee`/
  `composition`/`revealDelay`/`magnetic`). `style.column` remains schema-valid
  for editor/breakpoint resolution and emits the exact `not_css_expressible`
  diagnostic at the public boundary.

### Parsed paint and full bleed

- `parseAuthoringCssBackgroundPaint` (owned by the page authoring sanitizers)
  splits a validated background into an exact `image` substring (the gradient
  layers with original spelling) plus an optional canonical final `color` via
  TASK-541's `parseCssColorValue(raw, "authoring")`. Consumers emit
  `paint.image` only as `background-image` and `paint.color` only as
  `background-color`; the unsplit author string is never interpolated. The raw
  value rejects up front on any C0/C1 control, non-ASCII whitespace, BOM,
  unsafe function/protocol/at-rule, imbalance, empty layer, or over-cap layer
  stack (`PAGE_BG_MAX_LAYERS = 6`, `PAGE_CSS_VALUE_MAX_LENGTH = 512`).
- Grid lengths accept unitless zero in any all-zero decimal spelling; every
  nonzero number requires `fr|px|%|rem|em`, including inside
  `minmax`/`repeat`.
- Responsive background/radius/shadow/glow declarations target the section root
  for a full-width template or base `fullBleed === true`, and section content
  otherwise; a device override can never switch that target. The `fullBleed`
  structural field itself is base-only.

### Transform variables and composition host

- `pageCompositionEffects.tsx` owns one fixed transform host
  attribute/selector (`data-page-transform-host` / `[data-page-transform-host]`)
  and exactly eleven custom-property names (`--cx-reveal-y`, four
  `--cx-decoration-*`, two `--cx-hover-*`, two `--cx-tilt-*`, two
  `--cx-magnetic-*`). The single host formula composes reveal, decoration,
  hover, tilt, and magnetic channels; the renderer stamps the same host on
  section reveal wrappers, ambient orbs, and block-owned transform effects.
- Layer anchors stay on the independent CSS `translate` property so a
  transform-writing effect never clobbers the anchor offset. `PAGE_LAYER_Z_CLAMP`
  stays `0..20`, strictly below the spotlight overlay (`30`) and nav (`40`).
- Every lift/glow-reveal `::before`/`::after` overlay carries
  `pointer-events:none` so real pointer clicks, drags, and text selection reach
  the underlying interactive content.

### Marquee replica identity and unsafe fallback

- An authored `seamless:true` marquee renders one rail with two equal adjacent
  segments only when the outer group's normalized active-slot child subtree is
  recursively replica-safe. `video`, `form`, `collection`, `filters`, `embed`,
  and nested authored marquees are unsafe by the exhaustive
  `PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE` map; any unsafe direct or deep
  descendant degrades deterministically to the same one-canonical-segment
  fallback as `seamless:false` — no replica marker, namespace, clone render, or
  duplicated script/nonce/global-runtime/network-bearing surface.
- An approved replica carries `[data-page-marquee-replica]`, `aria-hidden`,
  and native `inert`. Local DOM/SVG `id`s and identifier-bearing data hooks are
  namespaced through separate eligibility sets
  (`pageRendererReplicaIdentity.ts`), and `url(#...)`/`aria-*`/`htmlFor`
  references rewrite only targets backed by a locally emitted id. Two
  styling-only aliases (`data-page-marquee-replica-block-style-scope` and
  `data-page-marquee-replica-tilt-layer-style-scope`) retain the canonical
  original block id so responsive CSS can style both segments; they are not
  selection/runtime identities and leak to no other output. The outer group's
  legal root grid target stays one canonical node outside both segments.

### Timeline geometry

- `pageRendererTimelineGeometry.ts` owns `PageTimelineItemGeometry` /
  `resolvePageTimelineItemGeometry`. Compact items use `py-2` with an 18 px
  marker center; default uses `py-3` with 22 px. A horizontal or single-item
  timeline has `axis:null`. Vertical multi-item rows return exact first,
  interior, and final segment tops and bottoms: the first segment starts at the
  first marker center, non-final segments bleed only the negative row gap, and
  the final segment ends at the final marker center.

### Per-root effects runtime

- `pageEffectsRuntime.ts` emits one static dependency-free IIFE that reuses or
  installs `window.__codersoPageEffectsV2` and calls `init(document)`. Every
  emitted main/footer copy invokes the reusable controller; the parser-order
  rescan discovers later main/footer markup while binder-specific `WeakSet`s
  keep each element bound exactly once (reveal, parallax, spotlight, switcher,
  gallery, tilt, magnetic). The rescan is parser-order only: a footer template
  renders after main, so the page shell emits a second main/footer script copy
  that the controller deduplicates through the shared `WeakSet`s. There is no
  `MutationObserver`; authoring a block requires a new render, not a live DOM
  mutation.
- Listener passivity is per-event: `keydown` binds with `{passive:false}`
  because switcher/gallery arrow-key roving calls `preventDefault`, while every
  other listener (pointer, scroll, resize) stays `{passive:true}`. This is a
  fixed invariant; regressing to a blanket `{passive:true}` re-introduces the
  console error "Unable to preventDefault inside passive event listener" and
  breaks arrow-key navigation under the keyboard contract.
- Every binder rejects a candidate that is or descends from a marquee replica
  before listener/state attachment, so the inert replica keeps visual hooks
  without becoming interactive. Spotlight writes only `--spotlight-x`/`--spotlight-y`
  on the matched `[data-page-spotlight]` root; tilt and magnetic write/reset
  only their fixed transform custom properties, never the whole `transform`.
- Switcher/gallery bind before the reduced-motion branch (functional under
  reduce); reveal/parallax/spotlight/tilt/magnetic run only after it, so
  reduced-motion users get neutral, visible content with zero motion.

### Present-only byte identity

- Every TASK-539 key joins the reject-unknown allowlist (`assertKnownKeys` +
  strict `pageDocumentV2JsonSchema` `additionalProperties: false`) with a
  round-trip test. Un-authored keys emit zero bytes: no-override documents
  return `{ css: "", diagnostics: [] }` from the responsive builder, no-effect
  documents gain no grid hook, replica alias, or style byte, and legacy render
  output stays byte-identical.

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

For resolved `full-width` variants (and any `style.fullBleed` section), the outer
section band must not add the default page gutter. Since TASK-525 the background is
DECOUPLED from the content cap: the OUTER `<section>` carries the `100vw` full-bleed
BACKGROUND box (`toPageSectionBleedStyle`) while the inner content node stays
capped/centered at `section.layout.maxWidth` (no longer `max-width: none`) with a fixed
20px side gutter. Keeping wrapper `px`/`py` on the outer `<section>` would leave white
strips around hero/CTA backgrounds and break the full-bleed authoring contract.

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

Non-Page active editors keep domain-owned section/block contracts. Custom
Screens V4 own `document.sections[].blocks[]`; Posts and content/detail editors
own their bounded block documents. Retained widget-template/detail rows may
still pass through `documentContract: "legacy-widget-block-contract"` and a
`WidgetBlock[]` read/runtime adapter, but that compatibility label is not an
authoring surface. The Page Templates contract is frozen by TASK-420-02 in the
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

## menuDocumentV2 Document Contract And Responsive Overrides — TASK-499 / TASK-501 / TASK-502 / TASK-504 / TASK-506 / TASK-508 / TASK-542

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

**Deterministic IDs and topology (TASK-542):** `MENU_DOCUMENT_KEYS =
["schemaVersion","sections"]` is an exact-key gate at the DOCUMENT level — any
unknown top-level key (e.g. a legacy flat `blocks`/`overrides` shape) throws on
write and fails the whole stored read. Write-mode IDs must match
`^[a-z][a-z0-9_-]{0,159}$`; stored-read ID allocation is DETERMINISTIC and
NON-PERSISTING: a valid non-colliding legacy ID is preserved verbatim, a
missing/invalid ID gets the stable structural-path fallback
(`sec-<i>-<type>` / `blk-<section>-<type>-<block>`), and a collision gets the
next free numeric suffix (marker bytes reserved BEFORE slicing so a
maximum-length duplicate stays in grammar). Repeated reads of the same legacy
payload yield byte-identical documents with NO persistence rewrite. Topology is
asserted at the document level: at most 2 sections, `sections[0].type ===
"menu-bar"`, at most one `menu-drawer` (reserved), exactly one `menu-bar`;
`MenuSectionV2` and `MenuBlockV2` keys are reject-unknown allowlists that every
new persisted key must join (the fail-closed read trap above).

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

**Scrolled/floating-state colors, menu-bar card radius, custom shadow & brand
icon/combo (TASK-520):** No `schemaVersion` bump (`MENU_DOCUMENT_SCHEMA_VERSION`
stays `1`), no route/RBAC/migration; `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`
are UNTOUCHED so `buildSiteShellCss(null)` stays byte-identical. All new keys are
**present-only** (zero bytes when unauthored ⇒ legacy docs byte-identical) and
join a reject-unknown allowlist + a round-trip test (fail-closed READ trap). The
new bar keys are held OUT of `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS`,
so they have NO seeded resolver default and their editor controls render NO
`ControlDefaultHint` (per the 507 `value===undefined ⇒ null` guard).

- **Menu-bar extra keys (`MenuBarLayout`, intersection extension — NOT
  `MenuAppearance` members).** A NEW sibling allowlist `MENU_BAR_EXTRA_KEYS` gates
  six non-appearance keys; `normalizeMenuBarLayout` is SPLIT — the appearance
  subset routes through `normalizeAppearanceSubset` (over `MENU_BAR_LAYOUT_KEYS`
  only), the extra keys through local fail-soft value normalizers; a key in
  NEITHER allowlist throws `MenuDocumentError(path.key)`, bad VALUES fail-soft
  (omit):
  - `radius?: number` (0..40 px, `MENU_BAR_LAYOUT_NUMBER_RANGES.radius`) — the
    level-0 floating-card border-radius (submenu `NavLevelStyle.radius` was ≥1
    only). Per-device via the existing `section.responsive[bp].layout` channel.
  - `shadowCustom?: string` — a validated raw `box-shadow` value that OVERRIDES
    the `shadow` none|sm|md enum at emission (the enum stays the quick preset, the
    custom string is the escape hatch; owner token `0 18px 50px rgba(0,0,0,.24)`).
  - `surfaceColorScrolled?` / `borderColorScrolled?` (`normalizeMenuColorValue`,
    alpha OK) + `borderWidthScrolled?` (0..8, reuses `borderWidth` range) +
    `shadowScrolled?` (none|sm|md) + `shadowCustomScrolled?` (validated box-shadow,
    OVERRIDES `shadowScrolled`) — the **scrolled/floating-state variants**. Each
    unset variant falls back to the corresponding BASE key (back-compat: a sticky
    bar with no scrolled variant looks identical scrolled and at rest).
- **Custom box-shadow validator (`normalizeMenuBoxShadowValue`,
  security-critical).** Accepts ONLY a bounded grammar: optional leading `inset`,
  up to 4 length values (`-?\d+(px|rem|em)`), and ONE color token validated via
  `normalizeMenuColorValue`, comma-repeated up to 4 layers, total ≤200 chars;
  the whitespace split is BRACKET-AWARE (`rgba(0,0,0,.24)` is ONE token, split
  only at bracket-depth 0) and leading-dot alpha is canonicalized consistent with
  the 519 color input. REJECTS any `url(`, `expression(`, `javascript:`,
  `image-set(`, `/*`, `<`, `>`, `{`, `}`, `;`, `@`, backslash, or off-grammar
  token. Invalid ⇒ dropped (present-only, fail-soft).
- **Brand icon mode + graphic-with-text combo (`BrandProps`/`BrandStyle`).**
  `BRAND_PROP_KEYS` gains `"icon"`, `"showText"`; `BRAND_STYLE_KEYS` gains
  `"iconColor"`, `"iconSize"`; `BRAND_STYLE_NUMBER_RANGES` gains `iconSize
  [12,64]`. `BrandProps.mode` widens to `"text" | "image" | "icon"`.
  - `icon?: string` — a validated kebab lucide name (`normalizeBrandIconName`
    pattern `^[a-z0-9-]{1,64}$`, fail-soft omit) resolved at RENDER against
    `lucideKebabIconComponents` (the lucide set = effective allowlist; an
    unknown/unresolvable name falls through to the text/site-name chain — never a
    broken mark). Icon color via `iconColor` (`normalizeMenuColorValue`, alpha OK
    via 519) and size via `iconSize`.
  - `showText?: boolean` — the graphic-with-text COMBO. When a graphic mode
    (`"image"|"icon"`) ALSO sets `showText:true`, `BrandRender` emits the graphic
    AND the text wordmark side by side. Unset `showText` = today's exclusive
    text-XOR-graphic behavior (back-compat).
- **Scroll-state machine (front only).** `SiteHeaderMenuDocumentRender` emits a
  tiny dependency-free idempotent inline IIFE (no npm dep, respects
  `prefers-reduced-motion`) that toggles `data-scrolled` on the header past a
  small threshold — emitted ONLY when a scrolled variant is authored AND the bar
  is sticky (a legacy/non-sticky/no-variant doc emits NO script). The CSS emits
  `[data-scrolled="true"]` scrolled-variant declarations; the base paints at rest.

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

**Modern styling — base reset, visible defaults & 5 bundles (TASK-506,
per-level + per-device):** Same invariants — no `schemaVersion` bump, no new
route/RBAC/migration, `buildSiteShellCss(null)` byte-identical, no-override docs
byte-identical on both CSS builders, PRESENT-ONLY emission from the doc scope.

- **F1 base-record reset.** The desktop `bp===null` branch of every
  `patch*ForDevice` helper already deletes-on-`undefined` + prunes to the legacy
  byte-stable shape, so F1 is a thin named API over it: `clearMenuSectionBase`
  (flat level-0 scalar/layout), `clearMenuNavLevelStyleBase` (per-level 1/2),
  `clearMenuNavChromeBase` (dedicated — prunes `props.navChrome`→`props`, NOT the
  flat scalar wrapper), `clearMenuBrandStyleBase` (prunes `props.style`→`props`).
  **A base reset of the last authored field round-trips byte-identical to a
  never-authored doc** (asserted per surface at the model AND render layer).
  `MENU_NAV_DEVICE_DEFINING_KEYS` (`mobileMode`/`dropdownDirection`) are EXCLUDED
  (they carry resolution defaults). Raw base readers
  (`readMenuNavLevelStyleBaseValue` / `readMenuSectionBaseValue` /
  `readMenuNavChromeBaseValue` / `readMenuBrandStyleBaseValue`) feed the editor's
  `hasBaseValue` predicate so Reset shows on any control with an explicit OWN value.
- **F2 resolved-default provider.** `resolveMenuControlDefault(section, device,
  level, key) → { value, sourceLabel }` (section-only, 4-param; `level` ∈
  `0 | 1 | 2 | "base"`) is the SINGLE model source the editor reads — it never
  hardcodes a default and an unset slider shows the RESOLVED value, not
  `range.min`. It is a FULL CASCADE WALK, not a single hop: tablet/mobile unset
  RECURSES through the provider on `"desktop"` (label kept "Inherited from
  desktop") so a compound device×level-unset case can never surface `(undefined)`;
  an unset level N (1/2) walks shallower LEVELS, then the level-0 nav-base/navChrome
  value, then the theme/base default; gated present-only numerics (indicator/divider/
  pill sizes) return `{ value: undefined, sourceLabel: "Off"/"Not applied" }` (never
  `range.min`); the modern enum/bool defaults read the EXPORTED `NAV_CHROME_DEFAULTS`
  (`submenuPlacement:"right"`, `showCaret:true`, `indicator:"none"`,
  `flyoutAnimation:"none"`, …) mirroring today's implicit CSS. Exported model consts
  `MENU_SHELL_DEFAULT_LINK_{PX,PY,RADIUS}` (12/8/6) + `NAV_FONT_SIZE_INHERITED` (16)
  keep it self-contained (no CSS/editor import cycle).
- **Level-0 home = Option B: `NavItemsProps.navChrome`.** A NEW sub-record parallel
  to `levelStyles`, split off in `normalizeNavItemsProps` BEFORE the flat
  `NAV_ITEMS_PROP_KEYS` subset, with its own `NAV_CHROME_KEYS` reject-unknown
  allowlist + partitions + `NAV_CHROME_NUMBER_RANGES` + prune-empty-to-legacy, and a
  FULL parallel helper family (`patchMenuNavChromeForDevice` / `resolveMenuNavChrome`
  / `readMenuNavChrome{Override,Base}Value` / `clearMenuNavChromeBase` +
  `collectChromeDeltaRules` in the CSS layer). `MenuAppearance` / `BRAND_PROP_KEYS` /
  `NAV_ITEMS_PROP_KEYS` unchanged. It holds B4 pill + the level-0 variants of
  B1/B2/B3 — NOT `flyoutAnimation` (a levels-≥1 CONTAINER field; writing it under
  navChrome reject-unknown throws).
- **The 5 modern bundles** (per-level on `NavLevelStyle` 1/2 + per-device):
  - **B1 item separators** — orientation-aware: level-0 top bar ⇒ VERTICAL
    `border-inline-end` on `.site-nav-list > .site-nav-item:not(:last-child)`;
    dropdown (levels ≥ 1) ⇒ HORIZONTAL `border-block-end` on the dedicated
    single-member `… > .site-nav-sublist > li:not(:last-child)`. Fields
    `itemDivider{Show,Color,Width(1..8),Style(solid|dashed|dotted)}`.
  - **B2 indicator** — a `::before` bar (caret keeps `::after`, so they coexist on
    group parents) with `position:relative` added to the link;
    `indicator(none|underline|overline)`/`indicatorColor`/`indicatorThickness(1..6)`/
    `indicatorGrow` (`scaleX` vs `opacity` reveal) shown on `:hover`/`:focus-visible`/
    `:where([aria-current="page"])`; plus `hoverUnderline`, `transitionMs(0..400)`,
    `hoverLift(0..8)`. Link-level ⇒ re-emits at mobile.
  - **B3 caret + flyout** — `showCaret:false` suppresses the caret `::after`
    (`content:none`); `caretRotateOnOpen` rotates 180° on `:hover`/`:focus-within`;
    `flyoutAnimation(none|fade|slide)` reveals the sublist. **(TASK-508 R2 rewrote
    this reveal — see the TASK-508 subsection below: the old
    `display …ms allow-discrete` + `@starting-style` machinery was cosmetically inert
    and is GONE; the reveal now drives visible motion with `visibility`+`opacity`
    +`transform`.)**
  - **B4 pill + dropdown padding** — level-0 `navPill{Background,Radius(0..40),
    PaddingX(0..40),PaddingY(0..32)}` on `.site-nav-list`; levels ≥ 1
    `containerPaddingX(0..40)`/`containerPaddingY(0..32)` on the container selector
    (≥640-only).
  - **B5 nested placement** — `submenuPlacement(right|bottom|left)` on LEVEL 2 only,
    emitted on the anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` selector with
    all-four-offset resets (right=`left:100%;right:auto;top:0;bottom:auto`,
    bottom=`left:0;top:100%;…`, left=`right:100%;left:auto;top:0;…`), preserving the
    504 specificity and the base `dropdownDirection` first-dropdown rule. Its
    per-device tablet override rides a STANDALONE delta (≥640-only, never mobile).
- **Per-device deltas** mirror 504: `collectLevelDeltaRules` (levelStyles) +
  `collectChromeDeltaRules` (navChrome) diff vs DESKTOP with the ≥640-only vs
  all-width `linkOnly` split. Every new per-level key ∈ `NAV_LEVEL_STYLE_COMPARE_KEYS`
  and every navChrome key ∈ the navChrome compare list — else the per-device delta
  silently drops (fail-closed trap, asserted by test).

**Nesting forms — link centering, perceptible flyout, unified direction & accordion
(TASK-508).** Same doc-scoped `buildMenuRuleSetsForDocument` family; present-only,
no `schemaVersion` bump, `buildSiteShellCss(null)` + no-override docs byte-identical.

- **R1(a) corrected container default hints (model-only).** The base sheet always
  paints `.site-nav-sublist{min-width:180px;padding:6px}`, mirrored into
  `menuDocumentV2.ts` as `MENU_SHELL_SUBLIST_MIN_WIDTH=180` /
  `MENU_SHELL_SUBLIST_PADDING=6` (NOT into `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`
  — keeps the base sheet untouched). `resolveNavKeyThemeDefault` now returns the REAL
  defaults: `minWidth ⇒ {180,"Default 180px"}`, `containerPaddingX/Y ⇒ {6,"Default 6px"}`
  (removed from `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`), so the editor hint + slider
  thumb read 180/6 instead of `undefined`/`range.min`. The level-0 pill controls
  (`navPillRadius`/`navPillPaddingX/Y`) STAY gated. **Hint/thumb-only** — CSS emission
  (`levelContainerDecls`, present-only on the STORED value) is unchanged.
- **R1(b) `NavLevelStyle.linkAlign` (`left|center|right`).** Emits `text-align` on the
  dropdown link (`LEVEL_LINK_SELECTORS[lvl]`); since `.site-nav-link` is `display:block`
  filling the `min-width:180px` container, `center` centers the label. Present-only,
  per-device (∈ `NAV_LEVEL_STYLE_COMPARE_KEYS` + re-emits at mobile via `linkOnly`),
  levels 1/2.
- **R2 robust `flyoutAnimRule` (the confirmed BUG fix).** The reveal now drives visible
  motion with visibility+opacity+transform: at REST the sublist is overridden to
  `display:grid;visibility:hidden;opacity:0` (+`transform:translateY(-6px)` for slide) on
  the NON-`:hover` sublist selectors; SHOWN on `:hover`/`:focus-within` it is
  `visibility:visible;opacity:1;transform:none`; the transition is
  `opacity ${dur}ms[,transform ${dur}ms],visibility 0s linear ${dur}ms` — the delayed
  `visibility` on close keeps the box visible + interactive through the fade/slide-out
  (so CLOSE animates), `visibility 0s` on open makes it interactive from frame 0.
  `visibility:hidden` = exact reachability parity with `display:none` (non-focusable,
  non-clickable, a11y-hidden) ⇒ zero-JS hover/focus-within reachability preserved; the
  `display:none→grid` toggle (`navNestingRules`) is byte-unchanged (its display:grid-on-hover
  is now redundant-but-harmless). NO `@starting-style`/`allow-discrete`/`display`-in-transition.
  Present-only: unset/`"none"` ⇒ early-return `[]` ⇒ byte-identical. `previewForceOpenLevel`
  emits `display:grid;visibility:visible;opacity:1;transform:none` on the (0,4,0) level-1
  AND anchored (0,5,0) level-2 selectors so the canvas force-open reveals the flyout.
- **R3a `NavChromeStyle.submenuDirection` (`right|down|up|left`).** One nav-global control
  applying CONSISTENTLY across ALL nested depths. Emitted as TWO rules in `desktopShared`
  reading `baseNavChrome` — rule A on the precise first-dropdown selector (0,4,0) and
  rule B on the anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` — each resetting ALL FOUR
  offsets (`down⇒left:0;top:100%;right:auto;bottom:auto`, `up⇒left:0;bottom:100%;top:auto;
  right:auto`, `right⇒left:100%;top:0;right:auto;bottom:auto`, `left⇒right:100%;top:0;
  left:auto;bottom:auto`) to avoid a double-anchor stretch. Emitted BEFORE
  `submenuPlacementRule` so a granular level-2 `submenuPlacement` still WINS (coexistence
  precedence). ≥640-only; **base-only** (like `dropdownDirection`: NOT in
  `NAV_CHROME_COMPARE_KEYS`, tablet inherits via the flatten — a per-device override is
  dead data). Unset ⇒ ZERO bytes ⇒ `dropdownDirection`/`submenuPlacement` byte-identical.
- **R3b `NavChromeStyle.submenuMode` (`flyout|accordion`).** Accordion renders sublists
  IN-FLOW under a vertical top bar as one downward block: `.site-nav-list{flex-direction:
  column;align-items:stretch}` + `.site-nav-sublist{position:static;box-shadow:none;
  border:0;min-width:0}` + `.site-nav-sublist{padding-left:16px}`, revealed via the SAME
  untouched `display:none→grid` hover/focus-within toggle (zero-JS). ≥640-only,
  `desktopShared`, base-only (NOT in `NAV_CHROME_COMPARE_KEYS`). Flyout is the default +
  present-only: a flyout-mode doc emits ZERO accordion bytes; accordion gates the R2
  flyout reveal OFF (no `visibility:hidden` over static content).
- **Reject-unknown / value partitions.** Each new key joins its allowlist
  (`linkAlign → NAV_LEVEL_STYLE_KEYS`; `submenuDirection`/`submenuMode → NAV_CHROME_KEYS`)
  + exactly one value partition (`NAV_LINK_ALIGNS`/`SUBMENU_DIRECTIONS`/`SUBMENU_MODES`) +
  a `NAV_CHROME_DEFAULTS` hint entry (the level-agnostic hint provider also serves the
  levels-1/2 `linkAlign` hint). Bad enum VALUE fails soft (OMITTED); unknown KEY throws
  `MenuDocumentError`+path. `core/site/siteShell.tsx` needs ZERO markup change.

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
retired for Pages and is rejected by the strict action plan schema. Custom
Screen V4 mutations use screen-owned `section`/`block` actions. Retained
widget-template actions are legacy data-maintenance compatibility only; they
must not be advertised as reusable-template authoring. Current reusable Page
layouts use Page Templates and Page-owned `sections[]`.

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
