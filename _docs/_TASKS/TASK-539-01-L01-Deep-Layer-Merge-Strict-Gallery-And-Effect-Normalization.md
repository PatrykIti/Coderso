# TASK-539-01-L01: Deep Layer Merge, Strict Gallery, and Effect Normalization

# FileName: TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md

**Parent Subtask:** TASK-539-01
**Priority:** High
**Category:** Pages / PageDocumentV2 / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-539-01; post-TASK-540 audit pass
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

This leaf is the sole writer of the PageDocumentV2 source family and model-unit family.
TASK-547 already landed the flat-file split, so the sole-writer set is the landed FLAT
module set (no `pageDocumentV2/` directory is introduced):

```text
core/services/pages/pageDocumentV2.ts                         # explicit facade
core/services/pages/pageDocumentV2Types.ts
core/services/pages/pageDocumentV2Contract.ts
core/services/pages/pageDocumentV2Schema.ts
core/services/pages/pageDocumentV2Normalizer.ts
core/services/pages/pageDocumentV2Normalization.ts
core/services/pages/pageTextMarksV2.ts
core/services/pages/pageBlockJsonSchemaV2.ts
core/services/pages/pageSectionNormalizerV2.ts
core/services/pages/pageBlockNormalizerV2.ts
tests/vitest/pages/page-document-v2-test-helpers.ts
tests/vitest/pages/page-document-v2-facade.test.ts            # create (missing today)
tests/vitest/pages/page-document-v2.test.ts
tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts
tests/vitest/pages/page-document-v2-listing-and-settings.test.ts
tests/vitest/pages/page-document-v2-style-contracts.test.ts
tests/vitest/pages/page-document-v2-block-roundtrip.test.ts
tests/vitest/pages/task-534-interactivity-model.test.ts
```

Do not edit Page routes/services, Bun route tests, renderers, responsive CSS, editor UI,
TASK-541 sources/tests, parents/indexes/changelogs, DDL, dependencies, or any other
test. Read the post-TASK-540 files fresh before editing.

## Mandatory cohesive split

TASK-547 already landed the source split: the repair baseline's `pageDocumentV2.ts`
is now 217 lines (down from the pre-split 4,676) and `page-document-v2.test.ts` is
now 849 lines (down from the pre-split 3,279). Re-ground against those landed flat
files before adding behavior; do NOT create a `pageDocumentV2/` directory.

Landed module responsibilities are exact:

- `pageDocumentV2Types.ts`: schema version, enum/tuple vocabularies and their derived
  public type aliases, clamps, patterns, predicates, animated-icon/typography lookup,
  switcher-aria helpers, `PageDocumentError`/`PageDocumentErrorCode`, and the
  composite PageDocumentV2 public data types (including `PageGalleryItemV2` and the
  three dedicated responsive types).
- `pageDocumentV2Contract.ts`: defaults, prop keys, block/section capabilities, slot
  registry, list-item constructors, and active-slot lookup plus their types.
- `pageDocumentV2Schema.ts`: all PageDocumentV2 JSON-schema construction and its
  public schema.
- `pageDocumentV2Normalizer.ts`: factories, write/read entry points, breakpoint
  resolution, responsive clear helpers, publish stripping, `isPageDocumentError`,
  and `isLegacyOrVersionlessPageDocument`.
- `pageDocumentV2Normalization.ts`: internal mode/context types,
  record/array/key assertions, safe scalar readers, cloning, enum/number/ID
  primitives, SEO/collection/settings/styles/props/tree normalization, and legacy
  stored-read adapters.
- `pageTextMarksV2.ts`: text-mark mutation input types and normalization/apply/remove
  helpers.
- `pageBlockJsonSchemaV2.ts`, `pageSectionNormalizerV2.ts`, and
  `pageBlockNormalizerV2.ts`: the existing internal block/section schema and
  normalizer owners.
- `pageDocumentV2.ts`: explicit named `export { ... }` and
  `export type { ... }` clauses only (see the locked manifest). No `export *`,
  executable wrapper, cloned registry, or second constant definition.

Internal modules import owners directly rather than importing the facade, preventing
cycles. Preserve every baseline public value/type name and every existing external
import path. The dedicated facade test compares all 133 runtime names by `toBe`
against their direct owner exports and statically enforces the complete manifest.

The test split already landed except for the facade suite. Keep the landed split by
cohesive `describe` ownership and create the missing facade suite as the only new
test file:

- `page-document-v2.test.ts` (849 lines): core document/write/read/schema/error, base
  responsive, typography, and text-mark contracts.
- `page-document-v2-facade.test.ts` (MISSING — create): complete static facade
  manifest/owner map, compile-time type-import availability, exact runtime namespace,
  and direct-owner identity.
- `page-document-v2-tree-and-capabilities.test.ts`: prop enums/defaults, recursive
  slots, breakpoint tree resolution/clears, factories/publish stripping, and
  capabilities.
- `page-document-v2-listing-and-settings.test.ts`: filters, collection pagination,
  section effects, settings effects/background, animated icon, and custom SVG.
- `page-document-v2-style-contracts.test.ts`: reveal/composition/glow, grid/span,
  borders, and all TASK-539 layer/gallery/effect/divider unit cases.
- `page-document-v2-block-roundtrip.test.ts` (413 lines): existing round-trip contract.
- `page-document-v2-test-helpers.ts`: fixtures/builders only; no hidden test
  registration or mutable shared state.

Move complete describes and shared fixtures, not arbitrary line ranges. Preserve every
existing assertion exactly unless this leaf intentionally changes that contract. Each
suite must run independently. All resulting human-authored production/test/support
files must be at most 1,000 physical lines.

## Locked facade manifest

The repair audit re-parsed
`core/services/pages/pageDocumentV2.ts` at the current post-TASK-547 HEAD
`3c470092`. The baseline has exactly 74 exported
type-alias names and 125 runtime names, with no default export or export-star. The
landed facade is a mixed-clause explicit facade: it uses explicit
`export type { ... } from "./owner"` and `export { ... } from "./owner"` clauses, and
value export blocks may carry per-specifier `type X` modifiers (the landed
`pageDocumentV2Contract` and `pageTextMarksV2` blocks do exactly that). This leaf adds
no import, local/direct declaration, alias, default export, or export-star.

The counts refer to explicit type-only facade names and runtime facade names.
`PageDocumentError` belongs only to the runtime manifest below (although a class
binding can also be used in TypeScript type positions). Names are sorted inside each
exact owner group. Flattening and sorting the groups is the canonical comparison.

### Baseline type manifest: 74 names

`pageDocumentV2Types.ts` owns these 39 baseline vocabulary types:

```text
AnimatedIconAnimation, AnimatedIconName, PageBackgroundType, PageBadgeIcon,
PageBadgeIconPosition, PageBadgeShape, PageBadgeSize, PageBadgeVariant,
PageBadgeWeight, PageBlockBorderStyle, PageBlockDecorationMotion,
PageBlockHoverEffect, PageBlockSlotKey, PageBlockType, PageBlockWidth,
PageBreakpoint, PageCollectionPaginationMode, PageColumnDistribution,
PageComposition, PageGroupDirection, PageLayerAnchor, PageMarqueeDirection,
PageScrollHintGlyph, PageSectionAlignment, PageSectionJustify,
PageSectionScrollEffect, PageSectionType, PageSectionVariant, PageShadowToken,
PageSurfacePreset, PageSwitcherVariant, PageTextColorMarkCapableBlockType,
PageTextMarkCapableBlockType, PageTiltStrength, PageTypographyCapableBlockType,
PageTypographyFontFamily, PageTypographyFontSize, PageTypographyFontWeight,
PageTypographyTextTransform
```

`pageDocumentV2Types.ts` also owns these 27 baseline composite types:

```text
PageBlockDecoration, PageBlockLayer, PageBlockMarquee,
PageBlockResponsiveOverrideV2, PageBlockStyleV2, PageBlockV2,
PageBlockVisibilityV2, PageBoxSpacingV2, PageCollectionLinkV2,
PageDocumentSeoV2, PageDocumentSettingsV2, PageDocumentV2, PageEffectsV2,
PageGlow, PageSectionBorderEdgeV2, PageSectionBorderV2, PageSectionLayoutV2,
PageSectionResponsiveOverrideV2, PageSectionSpacingV2, PageSectionStyleV2,
PageSectionV2, PageSectionVisibilityV2, PageTextColorMark,
PageTextHighlightMark, PageTextLinkMark, PageTextMark, PageTextStructuralMark
```

The remaining eight baseline types have these exact owners:

```text
pageDocumentV2Types.ts:
  PageDocumentErrorCode
pageDocumentV2Contract.ts:
  PageBlockCapabilitiesV2, PageBlockPublicDataBinding,
  PageBlockRuntimeRendererState, PageListItemV2, PageSectionCapabilitiesV2
pageTextMarksV2.ts:
  PageBlockTextMarkInput, PageBlockTextMarkRemoveInput
```

The only planned type additions are these four names, all owned by
`pageDocumentV2Types.ts`:

```text
PageBlockResponsiveLayerV2, PageBlockResponsiveStyleV2, PageGalleryItemV2,
PageSectionResponsiveStyleV2
```

The final explicit type-only manifest is therefore exactly 78 names. No other
baseline type may move owner, disappear, or be joined by another public type.

### Baseline runtime manifest: 125 names

`pageDocumentV2Types.ts` owns these 99 baseline runtime names: the 94 vocabulary
names below, plus `PageDocumentError`, plus the four TASK-547 switcher-aria names
`PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH`, `PAGE_SWITCHER_DEFAULT_ARIA_LABEL`,
`normalizeSwitcherAriaLabel`, and `resolveSwitcherAriaLabel`.

The 94 vocabulary names:

```text
ANIMATED_ICON_NAME_PATTERN, ANIMATED_ICON_SIZE_CLAMP,
ANIMATED_ICON_SPEED_CLAMP, GALLERY_CATEGORY_PATTERN,
GALLERY_FILTER_CATEGORY_MAX, PAGE_BLOCK_BORDER_WIDTH_CLAMP,
PAGE_BLOCK_BOX_SPACING_CLAMP, PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
PAGE_BLOCK_MAX_TREE_DEPTH, PAGE_BLOCK_SPAN_CLAMP, PAGE_COLLECTION_LIMIT_CLAMP,
PAGE_CUSTOM_SVG_MAX_BYTES, PAGE_DECORATION_DELAY_CLAMP,
PAGE_DECORATION_DURATION_CLAMP, PAGE_DIVIDER_WIDTH_CLAMP,
PAGE_DOCUMENT_SCHEMA_VERSION, PAGE_DRAW_SPEED_CLAMP, PAGE_FILTERS_MAX_FACETS,
PAGE_GLOW_BLUR_CLAMP, PAGE_GLOW_OFFSET_CLAMP, PAGE_GLOW_SPREAD_CLAMP,
PAGE_LAYER_X_CLAMP, PAGE_LAYER_Y_CLAMP, PAGE_LAYER_Z_CLAMP,
PAGE_MARQUEE_SPEED_CLAMP, PAGE_PARALLAX_INTENSITY_CLAMP,
PAGE_REVEAL_DELAY_CLAMP, PAGE_SECTION_BLOCK_COLUMN_CLAMP,
PAGE_SECTION_BORDER_WIDTH_CLAMP, PAGE_SPOTLIGHT_SIZE_CLAMP,
PAGE_TEXT_MARK_MAX, PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP, SWITCHER_MAX_PANELS,
animatedIconAnimations, animatedIconNames, isPageTextColorMarkCapableBlockType,
isPageTextMarkCapableBlockType, isPageTypographyCapableBlockType,
pageBackgroundTypes, pageBadgeIconPositions, pageBadgeIcons, pageBadgeShapes,
pageBadgeSizes, pageBadgeVariants, pageBadgeWeights, pageBlockBorderStyles,
pageBlockDecorationMotions, pageBlockHoverEffects, pageBlockSlotKeys,
pageBlockTypes, pageBlockWidths, pageBreakpoints, pageButtonSizes,
pageButtonTargets, pageButtonVariants, pageCollectionPaginationModes,
pageColumnDistributions, pageColumnTemplatePresets, pageCompositions,
pageDividerAligns, pageDividerTones, pageFiltersBlockLayouts,
pageFiltersFacetKinds, pageFiltersFacetOperators, pageGalleryLayouts,
pageGroupDirections, pageHeadingLevels, pageImageFits, pageLayerAnchors,
pageMarqueeDirections, pageSectionAlignments, pageSectionJustify,
pageSectionScrollEffects, pageSectionTypes, pageSectionVariants,
pageShadowTokens, pageSurfacePresets, pageTextAlignments,
pageTextColorMarkCapableBlockTypes, pageTextFormats,
pageTextMarkCapableBlockTypes, pageTiltStrengths,
pageTypographyCapableBlockTypes, pageTypographyFontFamilies,
pageTypographyFontFamilyCssValues, pageTypographyFontSizeCssValues,
pageTypographyFontSizes, pageTypographyFontWeightCssValues,
pageTypographyFontWeights, pageTypographyTextTransforms,
resolveAnimatedIconName, scrollHintGlyphs, switcherVariants
```

The remaining 26 baseline runtime names have these exact owners:

```text
pageDocumentV2Contract.ts:
  createPageListItem, getPageBlockActiveSlotKeys, pageBlockCapabilities,
  pageBlockDefaultProps, pageBlockPropKeys, pageSectionCapabilities
pageDocumentV2Schema.ts:
  pageDocumentV2JsonSchema
pageTextMarksV2.ts:
  applyBlockTextMark, normalizeBlockTextColorMarks, normalizeBlockTextMarks,
  removeBlockTextMark
pageDocumentV2Normalizer.ts:
  clearBlockResponsiveOverride, clearResponsiveOverride,
  createDefaultPageDocumentV2, createPageBlockV2, createPageDocumentId,
  createPageSectionV2, isLegacyOrVersionlessPageDocument, isPageDocumentError,
  normalizePageDocumentV2, normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead, resolvePageBlockForBreakpoint,
  resolvePageDocumentForBreakpoint, resolvePageSectionForBreakpoint,
  toPublishedPageDocumentV2
```

The only planned runtime additions are these seven
`pageDocumentV2Types.ts` constants:

```text
PAGE_GALLERY_ALT_MAX, PAGE_GALLERY_CAPTION_MAX, PAGE_GALLERY_CATEGORY_MAX,
PAGE_GALLERY_CATEGORY_TOKENS_MAX, PAGE_GALLERY_CATEGORY_TOKEN_MAX,
PAGE_GALLERY_ITEMS_MAX, PAGE_GALLERY_SRC_MAX
```

and this one `pageDocumentV2Normalizer.ts` function:

```text
mergePageBlockLayerPresentKeys
```

The final facade is therefore exactly 78 explicit type names plus 133 runtime names,
211 entries in total. No internal helper, schema fragment, normalizer, or
compatibility alias may widen it.

### Facade proof owned by this leaf

Create `tests/vitest/pages/page-document-v2-facade.test.ts` as the sole facade
manifest test. It must be Bun-free and independently runnable. Its fixtures contain
the exact owner maps above, with the four/eight planned additions merged into the
expected final maps.

Use the TypeScript compiler AST (not regex-only presence checks) to parse the facade
source and execute this exact proof:

1. Require every top-level statement to be an `ExportDeclaration` with a string
   module specifier and a nonempty `NamedExports` clause. Reject imports, direct
   declarations, `export default`, `export *`, namespace exports, aliases
   (`propertyName`), and duplicate exported names.
2. Accept the landed mixed-clause layout: type groups use declaration-level
   `export type { ... } from`, and value groups use declaration-level
   `export { ... } from` but MAY carry per-specifier `type X` modifiers (the landed
   `pageDocumentV2Contract` and `pageTextMarksV2` blocks do exactly that).
   Declaration-only applies to this leaf's OWN additions: the four new types join the
   `pageDocumentV2Types` type clause/type specifiers and the eight new runtime values
   join value clauses as plain specifiers; no new import, direct declaration, alias,
   default export, or export-star is added. Compare the sorted
   `{name, ownerModule}` arrays to the exact 78-name and 133-name maps above. This
   catches extra types as well as missing/present-only checks and pins every direct
   owner.
3. Type-import all 78 explicit type names from the facade in one compile-time
   fixture and use them in a type tuple/map so none is an unused decorative import.
4. Import the facade namespace and assert
   `Object.keys(facade).sort()` equals the exact sorted 133-name runtime list.
5. Import every runtime name from its owner module and assert
   `facade[name]` is `toBe(owner[name])` for all 133 entries. This applies equally
   to primitives, functions, `PageDocumentError`, arrays, objects, registries, and
   `pageDocumentV2JsonSchema`; representative sampling is insufficient.

## Exact model contract

### Gallery shape and limits

Own and explicitly export:

```ts
export type PageGalleryItemV2 = {
  src: string;
  alt: string;
  caption: string;
  category?: string;
};

export const PAGE_GALLERY_ITEMS_MAX = 120 as const;
export const PAGE_GALLERY_SRC_MAX = 2048 as const;
export const PAGE_GALLERY_ALT_MAX = 500 as const;
export const PAGE_GALLERY_CAPTION_MAX = 2_000 as const;
export const PAGE_GALLERY_CATEGORY_TOKEN_MAX = 48 as const;
export const PAGE_GALLERY_CATEGORY_TOKENS_MAX = GALLERY_FILTER_CATEGORY_MAX; // 12
export const PAGE_GALLERY_CATEGORY_MAX = 587 as const; // 12 * 48 + 11 spaces
```

The gallery-item schema is an object with `additionalProperties:false`, requires
`src`, `alt`, and `caption`, allows only optional `category`, sets the required-string
`maxLength` values from `PAGE_GALLERY_SRC_MAX`, `PAGE_GALLERY_ALT_MAX`, and
`PAGE_GALLERY_CAPTION_MAX`, and sets `items.maxItems` from
`PAGE_GALLERY_ITEMS_MAX`. Its optional `category` property is exactly:

```ts
{
  type: "string",
  minLength: 1,
  maxLength: PAGE_GALLERY_CATEGORY_MAX,
  pattern: galleryCategoryTokenStackPattern
}
```

Build `galleryCategoryTokenStackPattern` by removing only the leading `^` and trailing
`$` from `GALLERY_CATEGORY_PATTERN.source`, then wrapping that owner token source as
`^(?:TOKEN)(?: (?:TOKEN)){0,COUNT-1}$`, where `COUNT` is
`GALLERY_FILTER_CATEGORY_MAX`. Do not introduce a second handwritten token grammar or
count. It accepts exactly 1..12 owner-valid tokens separated by one ASCII space, with
no leading, trailing, or repeated spaces.
The schema and normalizer import one vocabulary owner; numeric or regex mirrors are
forbidden. JSON Schema is responsible only for the syntactic shape and bounds and may
accept repeated tokens. The write normalizer separately enforces uniqueness; do not
claim that the schema pattern proves uniqueness.

Implement one mode-aware normalizer:

```ts
function normalizeGalleryItems(
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageGalleryItemV2[];
```

Write mode:

1. Require an array and reject more than 120 raw rows. Draft rows count.
2. Require each row to be a plain record. Run `assertKnownKeys` against exactly
   `src/alt/caption/category`, so `url`, `image`, `assetUrl`, `title`, `label`,
   `name`, `description`, and arbitrary keys throw
   `page_document_unknown_field` at `${path}.${index}.${key}`.
3. Require own string `src`, `alt`, and `caption` fields. Missing/wrong-type values
   throw `page_document_invalid` at the exact item/field path. Bound the raw strings
   before any repair: `src.length <= PAGE_GALLERY_SRC_MAX`,
   `alt.length <= PAGE_GALLERY_ALT_MAX`, and
   `caption.length <= PAGE_GALLERY_CAPTION_MAX`. Reject over-limit input; never
   truncate a write.
4. Permit `src === ""`. A nonempty `src` must equal
   `sanitizeAuthoringMediaUrl(src)` byte-for-byte or reject as
   `page_document_invalid`. Both `alt` and `caption` must equal their `.trim()`
   results byte-for-byte; empty strings are legal. Reject outer whitespace instead of
   silently canonicalizing any required write string.
5. Persist the exact `{src:"",alt:"",caption:""}` draft sentinel. Also permit a
   caption-only placeholder (`src===""`, nonempty caption). An alt-only/all-empty row
   is still canonical persistence data; the public renderer later emits no node until
   media or caption exists.
6. If present, `category` must have `typeof value === "string"` and raw length
   `1..PAGE_GALLERY_CATEGORY_MAX`. Split it on the literal ASCII space, require
   `1..GALLERY_FILTER_CATEGORY_MAX` tokens, require every token to match
   `GALLERY_CATEGORY_PATTERN`, require `tokens.join(" ") === value`, and require
   `new Set(tokens).size === tokens.length`. This independently enforces one ASCII
   separator, the owner token length/pattern, and uniqueness without trimming or
   repairing. Empty, leading/trailing/repeated-space, non-ASCII-whitespace, invalid,
   duplicate, 13-token, 49-character-token, and 588-character-total writes reject as
   `page_document_invalid` at the category path. Omit the key instead of accepting
   `category:""`.
7. Return newly built objects; never mutate or retain input records.

Stored-read mode:

1. Slice the raw array to its first `PAGE_GALLERY_ITEMS_MAX` rows before adapting or
   filtering, so invalid/legacy rows cannot pull row 121 into the bounded document.
2. Accept the current legacy string form as the source candidate with empty alt and
   caption. For records, select the first own string candidate in these exact orders:
   `src > url > image > assetUrl`, `alt > title > ""`, and
   `caption > title > label > name > description > ""`. A higher-precedence own
   string wins even when it is empty; wrong-typed candidates are skipped when
   searching the ordered aliases.
3. For each selected `src`, `alt`, and `caption`, call `.trim()` first and then
   `.slice(0, exportedBound)`. Pass only the resulting bounded source to
   `sanitizeAuthoringMediaUrl`; use its safe result, or `""` when it rejects.
   Split category on whitespace, retain only safe tokens, deduplicate in first-seen
   order, cap at 12, and omit an empty category.
4. Rebuild only `{src,alt,caption,category?}`. Preserve canonical alt-only rows and
   the exact `{src:"",alt:"",caption:""}` sentinel; do not retain the old
   `if (!src && !caption) return []` filter. Drop non-record/non-string junk and a
   record with no recognized own string field, but never mutate even frozen input.

`normalizeBlockProp("gallery","items",...)` passes `mode` and the exact prop path.
Valid canonical rows and normalize→normalize results are deterministic.

### Strict responsive styles, layer merge, and resolution

`pageDocumentV2Types.ts` owns and exports dedicated section and block responsive style contracts.
Do not reuse a broad base style behind a responsive override:

```ts
export type PageSectionResponsiveStyleV2 = Partial<
  Omit<
    PageSectionStyleV2,
    | "scrollEffect"
    | "parallaxIntensity"
    | "surfacePreset"
    | "composition"
    | "fullBleed"
    | "noiseOverlay"
    | "columnTemplate"
    | "border"
  >
> & {
  scrollEffect?: never;
  parallaxIntensity?: never;
  surfacePreset?: never;
  composition?: never;
  fullBleed?: never;
  noiseOverlay?: never;
  columnTemplate?: never;
  border?: never;
};

export type PageBlockResponsiveLayerV2 = Pick<PageBlockLayer, "x" | "y" | "z"> & {
  anchor?: never;
};

export type PageBlockResponsiveStyleV2 = Partial<
  Omit<
    PageBlockStyleV2,
    | "layer"
    | "decoration"
    | "tilt"
    | "tiltGlare"
    | "surfacePreset"
    | "hoverEffect"
    | "marquee"
    | "composition"
    | "revealDelay"
    | "magnetic"
  >
> & {
  layer?: PageBlockResponsiveLayerV2;
  decoration?: never;
  tilt?: never;
  tiltGlare?: never;
  surfacePreset?: never;
  hoverEffect?: never;
  marquee?: never;
  composition?: never;
  revealDelay?: never;
  magnetic?: never;
};

export type PageSectionResponsiveOverrideV2 = {
  layout?: Partial<PageSectionLayoutV2>;
  style?: PageSectionResponsiveStyleV2;
  spacing?: Partial<PageSectionSpacingV2>;
  visibility?: Partial<PageSectionVisibilityV2>;
};

export type PageBlockResponsiveOverrideV2 = {
  props?: Record<string, unknown>;
  style?: PageBlockResponsiveStyleV2;
  visibility?: Partial<PageBlockVisibilityV2>;
};
```

The forbidden lists are exact. Section `scrollEffect`, `parallaxIntensity`,
`surfacePreset`, `composition`, `fullBleed`, `noiseOverlay`, `columnTemplate`, and
`border` are base-only/structural. Block `decoration`, `tilt`, `tiltGlare`,
`surfacePreset`, `hoverEffect`, `marquee`, `composition`, `revealDelay`, and
`magnetic` are base-only/structural. Do not add any of them to a responsive defaults
map, CSS diagnostic path, editor write, or compatibility mirror.

`style.column` deliberately remains in `PageBlockResponsiveStyleV2`: the editor and
breakpoint resolver support it, while the public front cannot re-parent the
desktop-authored DOM at a media query. TASK-539-06 must therefore emit its exact
`style.column` / `not_css_expressible` diagnostic instead of silently generating an
inert rule for both a numeric assignment and an explicit `null` reset. The allowed
block `props` override channel likewise retains its existing CSS-expressible
`heading`/`text` `props.align` exception and explicit diagnostics for other content
overrides.

The `anchor?: never` and every forbidden `?: never` member are mandatory. A plain
`Pick`/`Omit` relies on excess-property checking and can still admit a broader typed
variable through structural assignment. `pageDocumentV2Types.ts` owns all five responsive
types above. The `pageDocumentV2.ts` facade explicitly includes
`PageSectionResponsiveStyleV2`, `PageBlockResponsiveLayerV2`, and
`PageBlockResponsiveStyleV2` in its named `export type { ... }` declaration; none is
redefined or exported through `export *`.

Add compile-time contracts (for example `expectTypeOf` plus individual
`@ts-expect-error` assignments) that:

- accept representative allowed section paint and block typography/span/`column`
  values;
- reject every one of the eight section forbidden keys and nine block forbidden
  keys, including variables typed as the corresponding broad base style;
- accept responsive layer `x/y/z`, reject an object literal carrying `anchor`, and
  reject a variable typed as `PageBlockLayer` even when its runtime value currently
  contains only `x/y/z`.

Type proof alone is insufficient because untyped JSON reaches the write boundary.
`pageDocumentV2Schema.ts` therefore owns dedicated strict responsive style definitions/refs with
`additionalProperties:false`:

- the section definition contains only the allowed properties from the partial
  section style contract and contains none of the eight forbidden keys;
- the block definition contains only allowed block style properties, references a
  layer object whose only properties are `x/y/z`, and contains none of the nine
  forbidden keys or `anchor`;
- responsive block schemas use the responsive block style ref, never the base
  `pageBlockStyle` ref; responsive section schemas use the dedicated responsive
  section style definition, never the complete/partial base style object.

Reuse the base owners for each allowed property's enum, bounds, and nested schema;
do not duplicate grammars or numeric values. Schema tests compare the exact responsive
property-key sets, accept representative allowed values (including `style.column`),
and reject every forbidden key and `layer.anchor`.

`pageDocumentV2Normalization.ts` owns readonly forbidden-key tuples matching the lists above and
dedicated mode-aware normalizers:

```ts
function normalizeSectionResponsiveStyle(
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionResponsiveStyleV2 | undefined;

function normalizeBlockResponsiveStyle(
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageBlockResponsiveStyleV2 | undefined;
```

For write mode, each normalizer checks known forbidden keys before the normal
reject-unknown allowlist and throws `page_document_invalid` at the exact authored
field path (`${path}.${key}`). Presence means an own enumerable key even when its
JavaScript value is `undefined`; do not use a value-only truthiness test. An arbitrary
unknown key still throws `page_document_unknown_field` at its exact path. For
stored-read mode, make a fresh
candidate without the known forbidden own keys, normalize the remaining allowed keys,
and preserve all valid siblings. Drop `layer.anchor` with the same semantics. Never
delete from or retain the caller's object. Prune only a now-empty layer, then a
now-empty style, then a now-empty breakpoint override; a sibling `layout`, `spacing`,
`visibility`, `props`, or allowed style key must survive.

`normalizeSectionResponsive` and `normalizeBlockResponsive` call only these dedicated
responsive style normalizers. `normalizeBlockResponsive` receives the already
normalized base style (or performs the equivalent ordered reachability check), so a
nonempty responsive layer without a nonempty normalized base layer throws
`page_document_invalid` at the exact
`...responsive.<breakpoint>.style.layer` path on write. Stored read removes only that
unreachable layer and applies the same empty-record pruning while retaining siblings.

Also export exactly:

```ts
export function mergePageBlockLayerPresentKeys(
  base: PageBlockStyleV2["layer"],
  override: PageBlockResponsiveLayerV2 | undefined
): PageBlockStyleV2["layer"] {
  if (!base && !override) return undefined;
  const merged: NonNullable<PageBlockStyleV2["layer"]> = { ...(base ?? {}) };
  for (const key of ["x", "y", "z"] as const) {
    if (override && Object.prototype.hasOwnProperty.call(override, key)) {
      merged[key] = override[key];
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}
```

The helper copies only own present `x/y/z` keys from `override`; it must never spread,
clone, or cast a broad override into the result. Only nested `layer` receives
present-key merge. `padding`, `margin`, `decoration`, `glow`, and all other nested
records retain existing replacement behavior.

`resolvePageBlockForBreakpoint` first performs the normal base/override style spread,
then computes the merged layer from `base.style?.layer` and
`override.style?.layer`. When the helper returns a layer, assign it as an own
`style.layer` key; when it returns `undefined`, delete/omit the possibly spread
`style.layer` key before deciding whether the style record itself is empty. This
prevents an `undefined` own key and prevents the raw override layer from surviving.
Resolve nested slots without mutating the source. TASK-539-06 imports this exact
symbol through the facade.

Compile-time contracts call the helper with legal `x/y/z` override values and use
separate `@ts-expect-error` (or equivalent negative type assertions) for an object
literal carrying `anchor` and for a variable typed as `PageBlockLayer`; testing only
the responsive document type is insufficient. Runtime tests pin
`Object.prototype.hasOwnProperty.call(resolved.style, "layer")` for both the
defined-merge and omitted-merge cases, the exact resolved layer value, and no mutation
of frozen base/override inputs.

Base style normalizers remain responsible for every forbidden field and keep their
existing semantics. Responsive `textTransform:"none"` is an allowed explicit reset
and survives normalization and breakpoint resolution, while base
`textTransform:"none"` remains omitted. No responsive input is routed through the
broad base partial-style normalizer.

### Effect and divider reachability

- `normalizeEffects` emits `cursorSpotlight:true` only when true and retains safe
  `spotlightColor`/bounded `spotlightSize` only inside that branch.
  `cursorSpotlight:false` and orphan dependants leave no keys. `noiseOverlay:true`
  remains independent.
- In the base section-style normalizer, normalize `scrollEffect` first. Retain bounded
  `parallaxIntensity` only when the normalized effect is `"parallax"`; otherwise omit
  it in write and stored read. Both keys are forbidden in responsive style.
- After divider props normalize, retain `width` and `align` only when
  `gradient===true`; remove stale values in both modes without mutating input.
- No corrected optional field joins a default emission map.

## Implementation Pseudocode

The following is execution order, not a second source contract; every public name,
bound, path, and ownership rule remains the one defined above.

```text
edit only the source/test owner paths listed in Scope and ownership
split the oversized source and test files by the locked cohesive responsibilities
wire pageDocumentV2.ts as named re-exports of the direct owners only

normalizeGalleryItems(value, mode, path):
  write -> validate raw count, exact keys/types/bounds/bytes/category uniqueness
           throw the locked PageDocumentError code at the exact failing path
           rebuild canonical rows without retaining or mutating input
  stored-read -> slice raw rows to PAGE_GALLERY_ITEMS_MAX, apply exact alias
                 precedence, bound then sanitize, canonicalize category, and rebuild
                 only canonical keys

normalizeSectionResponsiveStyle / normalizeBlockResponsiveStyle:
  write -> reject known base-only keys as page_document_invalid, then reject any
           other unknown key as page_document_unknown_field at its exact path
  stored-read -> copy without forbidden keys, normalize allowed siblings, and prune
                 only empty layer/style/breakpoint records

mergePageBlockLayerPresentKeys(base, override):
  copy base, copy only own present x/y/z override keys, never copy anchor
resolvePageBlockForBreakpoint(...):
  perform the existing spread, replace its layer with the helper result, omit an
  undefined layer own key, then recurse through slots without input mutation

run the owned schema/type/runtime matrices:
  prove the exact 78-type/129-runtime facade and owner map, strict gallery,
  responsive forbidden-key, layer reachability/present-key, effect/divider,
  idempotence, byte-identity, and frozen-input cases
run every exact validation gate below and enforce <=1000 lines per touched file
```

## Error and compatibility rules

- Unknown gallery keys/aliases use `page_document_unknown_field` with exact nested
  paths. Invalid types, missing required fields, unsafe URLs, invalid categories,
  every known forbidden responsive style key, responsive anchor/base-layer
  reachability, and over-limit input use `page_document_invalid` with exact internal
  paths. Arbitrary unknown responsive keys remain `page_document_unknown_field`.
- Do not change `mapPageError`; its existing unknown-field mapping exposes
  `details.path`, while invalid mapping intentionally does not.
- No ID generation, schema-version, route, DDL, dependency, renderer, or editor change.
- Stored-read adapters never rewrite persistence and never mutate caller objects.
- Legacy documents without repaired fields and unauthored/default documents retain
  normalized JSON identity.

## Unit regression shape

The owned Vitest files must cover:

- the dedicated facade suite's AST-enforced exact 78-type and 133-runtime owner
  maps (accepting the landed mixed-clause layout), all-type import fixture, exact
  runtime `Object.keys`, and all-133 direct-owner `toBe` identity table;
- each resulting file under the 1,000-line ceiling;
- layer merge of base `{y,z,anchor}` plus override `{x,z}` (present keys, override
  precedence), own-key presence when defined, own-key omission when undefined,
  unrelated nested-record replacement, frozen-input no mutation, and nested slots;
- responsive `anchor` JSON-schema rejection, write error at the exact path, and
  read-only drop; responsive `x/y/z` schema acceptance; compile-time responsive
  `x/y/z` acceptance plus rejection of both an `anchor` object literal and a
  `PageBlockLayer` variable; explicit facade type availability;
- table-driven compile-time and JSON-schema rejection for all eight forbidden
  section-style keys (`scrollEffect`, `parallaxIntensity`, `surfacePreset`,
  `composition`, `fullBleed`, `noiseOverlay`, `columnTemplate`, `border`) and all
  nine forbidden block-style keys (`decoration`, `tilt`, `tiltGlare`,
  `surfacePreset`, `hoverEffect`, `marquee`, `composition`, `revealDelay`,
  `magnetic`); schema property-set assertions prove they are absent while
  representative allowed section paint and block typography/span/`column` keys
  remain accepted;
- table-driven write normalization for every forbidden key, pinning
  `page_document_invalid` and its exact
  `sections.<n>...responsive.<breakpoint>.style.<key>` path; separate arbitrary-key
  cases retain `page_document_unknown_field`;
- table-driven stored reads for every forbidden key, including mixed objects with
  allowed style and non-style siblings, prove only the forbidden key is dropped,
  frozen inputs are unchanged, and empty layer/style/breakpoint records are pruned
  without deleting `layout`, `spacing`, `visibility`, `props`, or allowed style
  siblings;
- responsive layer without base write error/read drop with sibling preservation;
- responsive `textTransform:"none"` reset and base omission;
- canonical gallery exact round-trip, draft sentinel persistence/count, caption-only
  and alt-only rows, 120/121 boundaries, `src`/`alt`/`caption` cap and cap+1,
  outer-whitespace rejection for every required string, and category schema/write
  matrices covering empty/invalid values, 48/49-character tokens, 12/13 tokens,
  587/588 total characters, and duplicates. Schema tests assert that the canonical
  duplicate-token shape may pass JSON Schema while the write normalizer rejects it;
  normalizer tests also reject bad spacing/non-ASCII whitespace. Also cover unsafe
  URLs, missing/wrong types, arbitrary keys, and every legacy alias exact unknown
  path;
- stored-read string/alias precedence for every ordered candidate (including empty
  higher-precedence strings), trim-before-cap, source sanitize-after-cap,
  cap/cap+1, alt-only/all-empty preservation, dedupe, unsafe input, frozen-input no
  mutation, deterministic second pass, and canonical-only output;
- spotlight/noise/parallax reachability and divider gradient gating;
- normalize→normalize idempotence and legacy/no-repaired-field byte identity;
- a responsive-style coverage matrix that proves every newly narrowed style key is
  either publicly projectable or the deliberately schema-valid structural
  `style.column` diagnostic case (numeric assignment and `null` reset); unsupported
  block `props` retain their explicit diagnostics. No forbidden/base-only key may
  normalize into a silent responsive setting.

Update `task-534-interactivity-model.test.ts` canonical gallery fixtures so every
fresh-write row includes required `caption`; do not weaken its filter assertions.
When moving the existing Page model suites, replace currently noncanonical
TASK-541 color fixtures and expectations with their canonical authoring forms; this
leaf owns those test files, so later sanitizer leaves must not rebaseline them.
L02 owns no unit case.

## Validation

Run these exact gates after the final L01 working tree exists:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-document-v2-facade.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts tests/vitest/pages/page-document-v2-listing-and-settings.test.ts tests/vitest/pages/page-document-v2-style-contracts.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The workflow line check measures the union of production/test files changed from its
verified pre-TASK-539 baseline through the final tree. Every result must be `<=1000`.
Rerun a named failing file alone before classifying it.
