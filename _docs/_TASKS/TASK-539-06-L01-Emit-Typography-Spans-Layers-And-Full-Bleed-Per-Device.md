# TASK-539-06-L01: Emit Typography, Spans, Layers, and Full-Bleed per Device

# FileName: TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md

**Parent Subtask:** TASK-539-06
**Priority:** High
**Category:** Pages / Responsive CSS / Public Front
**Estimated Effort:** Large
**Dependencies:** TASK-539-05-L01, TASK-539-02-L01, TASK-539-01-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Sole source writer: `core/services/pages/pageResponsiveCss.ts`. This leaf also owns
compatibility-expectation updates required before its source gate in
`tests/vitest/pages/page-responsive-css.test.ts`. Current missing
typography/spans are around `:596-843`; layer merge/emission around `:596-769`; section
paint around `:436-513,905-908`.

## Implementation Pseudocode

Replace shallow layer composition with the exact model owner:

```ts
const mergedLayer = mergePageBlockLayerPresentKeys(
  block.style?.layer,
  styleOverride.layer
);
const mergedStyle = {
  ...(block.style ?? {}),
  ...styleOverride,
  ...(mergedLayer ? { layer: mergedLayer } : {}),
};
```

Do not deep-merge other nested style records. Base-layer reachability has already been
enforced by TASK-539-01. Continue targeting the tilt/layer wrapper when the renderer
hoists placement; emit x/y/z only when the override contains that present key, using
the merged value for parity.

Add typography branches:

```text
fontSizeCustom override -> sanitizeAuthoringCssFontSize -> font-size
textTransform override, including explicit "none" -> text-transform
```

Only typography-capable blocks receive them. Invalid/unreachable values yield the
existing `not_css_expressible`/unsafe diagnostic and no raw declaration.

For `colSpan`/`rowSpan`, import and target the exact
`PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` owned by TASK-539-04-L01 and emitted by
TASK-539-05-L01,
never an inner frame known to be wrapped. Emit fixed `grid-column:span N`
and `grid-row:span N` from clamped integers. Extend traversal context to classify
default/template-grid targets versus per-column/media-split no-target paths; the latter
produce a deterministic `not_css_expressible` diagnostic.

For section surface overrides, choose one paint target from the base full-bleed
contract:

```ts
const paint = isSectionFullBleed(section, template) ? root : content;
```

Background, radius, shadow, and glow ride `paint`; max-width, alignment, grid and
spacing remain on content. Responsive `fullBleed` itself remains base-only and
diagnostic if found in a stored override.

Use `parseAuthoringCssBackgroundPaint` for section and block gradient/background
branches. Emit parsed image and color to distinct declarations, with explicit
transparent/none reset behavior matching base rendering. Never interpolate the raw
unsplit background value.

## Selector/error/identity rules

- Continue escaping normalized ids and validating any trusted scope prefix.
- Sort declarations as today for deterministic output.
- Diagnostics include scope/id/breakpoint/exact key and existing reason vocabulary.
- No override means zero emitted CSS bytes. A document without these authored keys
  retains current CSS byte identity.

## Gate test ownership and validation

Update existing responsive CSS expectations before this source gate. TASK-539-06-L02
owns only additive cross-device/property cases afterward and must not re-baseline these
landed expectations.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts
git diff --check
```

Rerun the named failing test file once in isolation before classifying the failure.
