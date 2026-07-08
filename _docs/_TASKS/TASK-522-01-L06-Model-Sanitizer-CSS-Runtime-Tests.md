# TASK-522-01-L06: Model + Sanitizer + CSS + Runtime Unit Tests

# FileName: TASK-522-01-L06-Model-Sanitizer-CSS-Runtime-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Tests
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Authors the Vitest suites for every 522-01 output (block type +
props model L01, sanitizer L02, style model L03, composition CSS + resolvers L04,
runtime binding L05). Pure model/unit lane (Vitest); NO Bun file (see 522-06). NO
production code.

## Test files + shapes

### `tests/vitest/pages/page-document-v2.test.ts` (append)

- **Block type (L01):** `pageBlockTypes` includes `"customSvg"`;
  `pageBlockPropKeys.customSvg` === `["svg","drawIn","drawSpeed","label"]`; the
  capability report marks it `editorInsertable:true`, runtime `"real"`; a `customSvg`
  block round-trips (clean svg + drawIn + drawSpeed + label); empty svg / false drawIn
  omitted; `drawSpeed:99999`→6000; unknown prop rejects; `<script>` svg → svg omitted.
- **Style model (L03):** round-trip decoration/tilt/tiltGlare/layer/surfacePreset/
  hoverEffect/marquee/composition on a block; surfacePreset/composition on a section;
  present-only omission (`tilt:"none"`, `surfacePreset:"none"`, `composition:"flow"`);
  fail-closed enum VALUES throw `PageDocumentError` in write mode
  (`decoration.motion:"explode"`, `tilt:"spin"`, `surfacePreset:"drop-table"`,
  `hoverEffect:"hack"`, `layer.anchor:"nope"`, `marquee.direction:"up"`);
  clamps (`layer.z:99999`→40, `marquee.speed:0.1`→8, `decoration.duration:1`→2000);
  unknown key `style.wobble` throws; `responsive.tablet.style.layer` round-trips;
  legacy block/section byte-identical.
- **Ajv:** the extended block-style + section-style + customSvg-props schemas
  (`additionalProperties:false`) accept the new shapes and reject an extra prop
  (`ajv.compile(pageDocumentV2JsonSchema)`).

### `tests/vitest/pages/svg-sanitizer.test.ts` (new)

- Reference `house-line` passes (keeps `<path>`, `stroke="url(#lineGlow)"`,
  `<linearGradient>`); plain shapes pass; each straightforward XSS vector (see
  522-01-L02 list) returns `""`; byte-cap enforced (via `TextEncoder`); idempotent.
- **mXSS / parser-differential corpus** (the regex sanitizer's true risk) — each
  returns `""`: comment-hidden tags (`<svg><!--><script>…`), CDATA payloads
  (`<![CDATA[<script>…`), unbalanced-quote desync (`<path fill="a onload=alert(1) />`),
  slash-separated handlers (`<svg/onload=…>`, `<rect/onclick=…/>`), duplicate/nested
  `<svg>`, `xmlns`-switch, entity-encoded `javascript:`/`#`.
- **Short-path draw-in:** a pasted SVG with a SHORT `<path>` sanitizes to a value that
  (per 522-02-L01) carries `pathLength="1"` when drawIn is on — assert the sanitized
  output preserves an injected `pathLength="1"` (draw-in completes length-independent).
- **Isomorphic:** `sanitizeSvg` runs with the Node `Buffer` global deleted/undefined
  (simulate the browser bundle) without throwing.

### `tests/vitest/pages/page-composition-effects.test.ts` (new)

- `PAGE_COMPOSITION_EFFECTS_CSS` has the `prefers-reduced-motion: no-preference` gate
  + every keyframe (`cx-float/drift/pulse/radiate/orbit/ticker/draw`); surface presets,
  `.cx-orb`/`.cx-marquee-viewport`/`.cx-marquee-track` base rules, all 9
  `[data-layer-anchor="…"]` transforms, and the scoped
  `[data-composition="layered"] [data-layer]` rule are OUTSIDE the gate (static);
  the marquee animation binds `.cx-marquee-track` (NOT `[data-marquee] > *`); draw-in
  uses `stroke-dasharray:1`.
- `resolveBlockCompositionAttrs(undefined)` empty; each style field → expected
  `data-*`/vars (`layer` → `--layer-x/y/z` + `data-layer-anchor`, not raw left/top);
  `perspectiveParent`/`glare` flags.

### `tests/vitest/pages/page-effects-runtime.test.ts` (append)

- Runtime source contains `data-block-tilt` + reduced-motion/`pointer:fine` guards;
  jsdom exercise (test-only `new Function`) sets/clears `transform` + glare props;
  coarse-pointer emulation attaches nothing.

## Validation commands

- `bun --cwd core vitest run tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/svg-sanitizer.test.ts
  tests/vitest/pages/page-composition-effects.test.ts
  tests/vitest/pages/page-effects-runtime.test.ts`
- Root `tsc -p tsconfig.json --noEmit` + `bun --cwd core lint:types` green.

## Hard Invariants

1. All new 522-01 tests are Vitest; none in `tests/unit/` (Bun).
2. `new Function` appears ONLY in test files (never shipped source — semgrep).
3. Every new model key has a round-trip + reject-unknown assertion; every XSS vector
   asserted neutralized.
</content>
