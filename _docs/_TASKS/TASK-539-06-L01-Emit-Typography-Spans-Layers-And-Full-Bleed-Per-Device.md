# TASK-539-06-L01: Emit Typography, Spans, Layers, and Full-Bleed per Device

# FileName: TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md

**Parent Subtask:** TASK-539-06
**Priority:** High
**Category:** Pages / Responsive CSS / Public Front
**Estimated Effort:** Large
**Dependencies:** TASK-539-01-L01, TASK-539-02-L01, TASK-539-03-L05, TASK-539-05-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Sole-writer scope

This leaf is the only writer of:

- `core/services/pages/pageResponsiveCss.ts` — stable explicit facade;
- `core/services/pages/pageResponsiveCssContracts.ts`;
- `core/services/pages/pageResponsiveCssDeclarations.ts`;
- `core/services/pages/pageResponsiveCssSection.ts`;
- `core/services/pages/pageResponsiveCssBlock.ts`;
- `core/services/pages/pageResponsiveCssOrchestration.ts`;
- `tests/vitest/pages/page-responsive-css.test.ts`;
- `tests/vitest/pages/page-responsive-css-fixtures.ts`;
- `tests/vitest/pages/page-responsive-css-section.test.ts`;
- `tests/vitest/pages/page-responsive-css-block.test.ts`;
- `tests/vitest/pages/page-responsive-css-security.test.ts`.

The current production facade is about 965 lines and the current test is about 1,278
lines. Split them before adding behavior. Do not edit the Page model, sanitizer,
placement owner, renderer, runtime, editor, or TASK-539 closure suite.

## Modular split contract

Keep `pageResponsiveCss.ts` as an import-side-effect-free facade with explicit named
exports only. Preserve every existing public name and type used by the renderer,
site-shell CSS, menu CSS, public render, and tests. Do not use `export *`.

Use this one-way dependency graph:

```text
pageResponsiveCss.ts (explicit facade)
  -> pageResponsiveCssOrchestration.ts
     -> pageResponsiveCssSection.ts / pageResponsiveCssBlock.ts
        -> pageResponsiveCssDeclarations.ts
           -> pageResponsiveCssContracts.ts
```

- `Contracts` owns public hooks (including
  `PAGE_TILT_PARENT_LAYER_ATTRIBUTE`), media bounds/queries, options, diagnostics,
  plan types, and shared collector types. The facade explicitly re-exports them;
  renderer is a consumer, never their owner.
- `Declarations` owns selector escaping/scoping, deterministic rule serialization,
  declaration helpers, and fixed safe value mappings.
- `Section` owns section layout/style/spacing/visibility projection.
- `Block` owns block props/style/typography/layer/span/visibility projection.
- `Orchestration` owns recursive section/block traversal, block paths, media blocks,
  diagnostics ordering, `buildPageResponsiveCssPlan`, and `buildPageResponsiveCss`.

Import `PageSectionResponsiveStyleV2`, `PageBlockResponsiveStyleV2`, and
`PageBlockResponsiveLayerV2` through the explicit Page model facade and use them in
collector/helper signatures. Do not reconstruct a local responsive style shape or
cast a responsive override back to `Partial<PageSectionStyleV2>` /
`PageBlockStyleV2`.

The split tests share typed fixture builders through the test-support module but each
`.test.ts` file must run independently. Keep constants/orchestration/identity in the
original suite, section behavior in the section suite, block/placement behavior in the
block suite, and hostile selector/paint/raw-style cases in the security suite. Every
listed production/test/support file must finish at no more than 1,000 physical lines.

## Implementation Pseudocode

### Layer deltas

Consume the exact model owner:

```ts
const mergedLayer = mergePageBlockLayerPresentKeys(
  block.style?.layer,
  styleOverride.layer
);

for (const key of ["x", "y", "z"] as const) {
  if (!Object.prototype.hasOwnProperty.call(styleOverride.layer ?? {}, key)) continue;
  emit the merged, finite value for only that key;
}
```

Do not emit inherited `y`/`z` merely because the device authored `x`; the desktop
inline declaration already supplies inherited values. Zero is a present reset and must
emit. Do not deep-merge any other nested style record. Responsive `anchor` is rejected
or removed by TASK-539-01 and has no declaration path; defense-in-depth input carrying
it emits no anchor CSS.

Retain the existing frame versus hoisted tilt/layer-wrapper target decision, using
the responsive-Contracts-owned `PAGE_TILT_PARENT_LAYER_ATTRIBUTE` through the
explicit facade rather than a literal selector.

### Typography

For typography-capable blocks only:

```text
present fontSizeCustom -> sanitizeAuthoringCssFontSize -> font-size
present textTransform, including "none" -> fixed enum -> text-transform
```

Route button typography to its visual element and other capable blocks to their text
hook. Invalid custom sizes and non-typography targets emit exact-key
`not_css_expressible`/unsafe diagnostics and no declaration. Do not invent a custom
font-family grammar or seed a default.

### Grid placement and spans

Carry the owning `PageSectionV2` and exact `PageBlockPath` through orchestration. The
public CSS plan represents the public visible-root policy, so call
`resolvePageBlockGridPlacement(section, blockPath, {
  includeHiddenBlocks: false
})`; never copy its classification:

```ts
const target = resolvePageBlockGridPlacement(section, blockPath, {
  includeHiddenBlocks: false,
});
if (target === "none") {
  diagnose each authored style.colSpan/style.rowSpan key as not_css_expressible;
} else {
  target `[data-page-block-grid-item="<escaped normalized block id>"]`;
  emit `grid-column:span N` and/or `grid-row:span N` from present clamped integers;
}
```

The same shared attribute selector covers the actual block frame and the actual
section-template wrapper. Nested blocks, real per-column composition, and resolved
non-default media-split paths remain `none` exactly as TASK-539-03-L05 defines.
A hidden assigned sibling is excluded from this public classification, matching the
public renderer. CSS may be emitted only when the renderer's shared predicate stamps
the hook: legal placement plus at least one authored base/tablet/mobile `colSpan` or
`rowSpan`. Responsive-only spans therefore have a real DOM target, while a wholly
unauthored span emits neither hook nor CSS.

### Structured paint and base-resolved surface targeting

Use `parseAuthoringCssBackgroundPaint` for section and block gradient/background
branches. Emit `paint.image` only as `background-image` and `paint.color` only as
`background-color`; preserve validated image-layer bytes and canonical final-color
bytes. Apply explicit `none`/transparent resets without interpolating the unsplit
author string.

For a full-width template or base `style.fullBleed === true`, responsive background,
radius, shadow, glow, and other paint-box declarations target the section root.
Otherwise they target section content. Max-width/alignment/grid/spacing stay on
content; visibility stays on root. This decision uses only the base-normalized section
and resolved template. A responsive override can never change the paint target.

TASK-539-01 makes the complete structural/effect list base-only, not only
`fullBleed`. Collector code must neither read nor diagnose responsive section
`scrollEffect`, `parallaxIntensity`, `surfacePreset`, `composition`, `fullBleed`,
`noiseOverlay`, `columnTemplate`, or `border`, nor responsive block `decoration`,
`tilt`, `tiltGlare`, `surfacePreset`, `hoverEffect`, `marquee`, `composition`,
`revealDelay`, or `magnetic`. Those members are absent from the dedicated responsive
types/schema and rejected/dropped before this layer. Base values may still determine
an existing target or runtime seam (for example base `fullBleed`, base `tilt`, or an
active base surface for `surfaceTint`); they are never device deltas.

### Selectors, errors, and identity

- Escape normalized IDs through `escapeAuthoringCssString`.
- Validate the trusted optional scope selector before use.
- Use exact shared attribute constants; never interpolate a local copy.
- Sort declarations and retain document traversal/media ordering.
- Diagnostics include scope, normalized id, breakpoint, exact key, and the existing
  reason vocabulary.
- Do not add compatibility diagnostics for model-forbidden base-only style fields:
  they cannot reach a normalized plan. Keep the intentional structural exception
  exact: accepted responsive `style.column` (numeric assignment or explicit `null`
  reset) emits `{key:"style.column",reason:"not_css_expressible"}`. Unsupported
  content props keep the existing props diagnostic, while `heading`/`text`
  `props.align` remains the one explicit props projection. Existing unsafe-value,
  capability, absent-markup, visibility, and scope diagnostics are not weakened.
- No override returns exactly `{ css: "", diagnostics: [] }`; no empty media shell or
  new facade byte is emitted for unauthored documents.
- Isolate an invalid field to its diagnostic/declaration; never emit a raw fallback.

## Regression-test shape

Before the source gate, update and split the existing expectations to prove:

- stable facade exports and exact media/selector contracts;
- independent test-file execution and unchanged legacy/orchestration snapshots;
- present-only `x/y/z`, zero resets, and no responsive anchor path;
- compile-time collector/helper contracts consume the facade-owned responsive types;
  static source assertions reject local broad-style casts or duplicated responsive
  key lists;
- a table covering all eight forbidden section-style and all nine forbidden
  block-style keys proves normalized stored reads never feed them into this builder,
  the builder emits no CSS or compatibility diagnostic for them, and valid siblings
  still project. This is paired with TASK-539-01's schema/write/read matrix rather
  than testing an impossible broad override by weakening types;
- accepted numeric and `null`-reset `style.column` values pin the exact
  `not_css_expressible` diagnostic, and unsupported props pin their existing
  diagnostic plus the `heading`/`text` `props.align` projection exception;
- sanitized custom font size and explicit `text-transform:none`;
- both legal placement targets use the shared attribute, while every `none` class
  diagnoses without inert CSS; include hidden-assigned-sibling public classification,
  base-only span, responsive-only span, and wholly unauthored span/hook handoff;
- parsed section/block paint keeps image/color separate; base/template full-bleed
  paint targets root, capped paint targets content, and no device override can switch
  that target;
- hostile IDs/scope/paint fail closed, declaration order is deterministic, and
  no-override output is byte-identical.

Do not move the new TASK-539 cross-contract matrix into these files; L02 alone owns it.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts tests/vitest/pages/page-responsive-css-section.test.ts tests/vitest/pages/page-responsive-css-block.test.ts tests/vitest/pages/page-responsive-css-security.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun any named failing file once in isolation. A test may be re-baselined only for the
intended contract above, never to conceal source drift.
