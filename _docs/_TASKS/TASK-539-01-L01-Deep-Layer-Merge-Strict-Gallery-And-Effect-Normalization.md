# TASK-539-01-L01: Deep Layer Merge, Strict Gallery, and Effect Normalization

# FileName: TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md

**Parent Subtask:** TASK-539-01
**Priority:** High
**Category:** Pages / PageDocumentV2 / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-539-01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

Sole source writer: `core/services/pages/pageDocumentV2.ts`. This leaf also owns the
expectation updates required by its source gate in
`tests/vitest/pages/page-document-v2.test.ts`,
`tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`, and
`tests/vitest/pages/task-534-interactivity-model.test.ts`.

Do not edit renderers, responsive CSS, editor UI, route tests, parents, indexes, or
changelogs. Update the three named unit suites before running this leaf's gate.
The current drift is grounded at `resolvePageBlockForBreakpoint` around
`:4568-4598`, the generic array schema around `:1421-1424,1702-1703`, gallery
normalization around `:3730-3765`, effects around `:2786-2822`, and parallax around
`:3051-3071`.

## Implementation Pseudocode

Export the exact present-key helper:

```ts
export function mergePageBlockLayerPresentKeys(
  base: PageBlockStyleV2["layer"],
  override: PageBlockStyleV2["layer"]
): PageBlockStyleV2["layer"] {
  if (!base && !override) return undefined;
  return { ...(base ?? {}), ...(override ?? {}) };
}
```

Only `layer` gains present-key merging. Do not deep-merge padding, margin,
decoration, glow, or other nested records whose replacement semantics are existing
contracts. `resolvePageBlockForBreakpoint` must use the helper when composing its
style. TASK-539-06 imports the same helper for CSS collection.

Export the canonical item shape:

```ts
export type PageGalleryItemV2 = {
  src: string;
  alt: string;
  caption: string;
  category?: string;
};

export const PAGE_GALLERY_ITEMS_MAX = 120 as const;
export const PAGE_GALLERY_ALT_MAX = 500 as const;
export const PAGE_GALLERY_CAPTION_MAX = 2_000 as const;
export const PAGE_GALLERY_CATEGORY_TOKEN_MAX = 48 as const;
export const PAGE_GALLERY_CATEGORY_TOKENS_MAX =
  GALLERY_FILTER_CATEGORY_MAX; // 12; one shared existing product bound
export const PAGE_GALLERY_CATEGORY_MAX = 587 as const; // 12 * 48 + 11 spaces
```

Replace the gallery `items` generic array schema with a bounded object item schema
that has `additionalProperties: false`, requires `src`, `alt`, and `caption`, and
allows only the optional bounded category-token set. `items.maxItems` is exactly
`PAGE_GALLERY_ITEMS_MAX`; `alt`, `caption`, and `category` use the exact exported bounds
above. Category normalization accepts at most 12 space-separated tokens, each matching
the existing safe token vocabulary with maximum length 48, and the schema also caps the
joined string at 587 bytes. These constants are consumed directly by both schema and
normalizer; no numeric mirror is allowed.

Refactor gallery normalization to receive `(value, mode, path)`:

```ts
function normalizeGalleryItems(value, mode, path): PageGalleryItemV2[] {
  if (mode === "write") {
    // require array + canonical object keys only
    // reject aliases and unknown keys with PageDocumentError(page_document_invalid, path)
    // accept src === "" only for the existing caption-only placeholder behavior
    // otherwise require sanitizeAuthoringMediaUrl(src) byte-for-byte safe
    // validate alt/caption with PAGE_GALLERY_*_MAX and every bounded category token
  }
  // stored-read: accept legacy string/url/image/assetUrl/title/label/name/description
  // rebuild exactly {src, alt, caption, category?}; drop unsafe URL/category material
}
```

The write route must never silently discard an unknown nested key. Stored-read is the
only alias adapter. The renderer will later consume only `PageGalleryItemV2` while
still rechecking URLs/categories at its trust boundary.

Normalize effect reachability:

```ts
if (input.cursorSpotlight === true) {
  result.cursorSpotlight = true;
  // only now retain safe spotlightColor/spotlightSize
}
if (input.noiseOverlay === true) result.noiseOverlay = true;

const effect = normalize scrollEffect first;
if (effect === "parallax" && input.parallaxIntensity !== undefined) {
  retain clamped intensity;
}
```

`false` spotlight, spotlight dependants without spotlight, and intensity without
parallax are omitted in both write normalization and stored read. Keep noise
independent.

Two related model corrections belong here because later CSS cannot express them
without owner support:

- In a partial responsive block style, preserve explicit
  `textTransform: "none"`; continue omitting base `"none"`.
- After base and responsive styles are normalized, reject a responsive `layer` on
  write when the base block has no layer structure. On stored read, remove only that
  unreachable responsive layer while preserving other responsive keys.
- For divider props, when `gradient !== true`, omit stale `width` and `align` so
  stored no-op configuration is not perpetuated; legacy reads remain render-safe.

## Error and compatibility behavior

- Known write failures use `PageDocumentError("page_document_invalid", ..., path)`.
- Never generate IDs, mutate schema version, or rewrite the source stored document.
- Valid canonical gallery and layer documents round-trip deterministically.
- No optional key is seeded into defaults. An unauthored document remains
  normalized-byte-identical.

## Test ownership and handoff

This leaf updates the three named Vitest suites before its source gate and covers strict
nested rejection, aliases read-only, present-key layer merge/reset, unreachable
responsive layer behavior, responsive `textTransform:"none"`, exact gallery count/text/
category bounds, spotlight/parallax cleanup, divider cleanup, and legacy identity.
TASK-539-01-L02 owns only the additive registered-route persistence proof; it must not
re-baseline these unit expectations.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts
git diff --check
```

If a named test fails, rerun that file alone before classifying the failure.
