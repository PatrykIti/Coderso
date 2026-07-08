# TASK-522-01-L06: Model + Sanitizer + CSS + Runtime Unit Tests

# FileName: TASK-522-01-L06-Model-Sanitizer-CSS-Runtime-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Tests
**Estimated Effort:** Medium
**Status:** ✅ Done

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
  block round-trips (clean svg + drawIn + drawSpeed + label); svg/drawIn/label
  SERIALIZE WITH DEFAULTS when unauthored (`svg:""`, `drawIn:false`, `label:""` PRESENT
  — default-seeded, NOT omitted), `drawSpeed` is the only present-only prop (absent
  unless authored); `drawSpeed:99999`→6000; unknown prop rejects; `<script>` svg →
  `svg === ""` (sanitizer, equals default — NOT "omitted").
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
- **UNQUOTED remote-ref on an ALLOWLISTED href tag (`<use>`) — each returns `""`
  (the in-walk local-# check sets `rejected`):** `<svg><use href=http://evil#x/></svg>`,
  `<svg><use href=//evil/x#y/></svg>`, `<svg><use xlink:href=http://evil#x/></svg>`;
  a QUOTED local `<svg><use href="#g"/></svg>` still PASSES.
- **NON-ALLOWLISTED tag with a `data:`/remote href (`<image>`) — asserts a STRIPPED
  `<svg>`, NOT `""`:** `<svg><image href=data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=/></svg>`
  → the **tag-allowlist DROPS the non-allowlisted `<image>` tag** (`image ∉ ALLOWED_TAGS`)
  BEFORE the local-# href check runs, and `data:image/svg+xml` is not a tripwire, so the
  function returns a stripped `<svg></svg>` — assert the output contains no
  `data:`/`http`/`//`/`<image` token (do NOT assert `=== ""`; do NOT add `image` to the
  allowlist to force `""`).
- **Fail-closed comment/CDATA pre-pass — each returns `""`:**
  `<svg><!-- x --><path d="M0 0"/></svg>` and `<svg><![CDATA[<path/>]]></svg>` both reject
  on the pre-pass (`<!--`/`<![CDATA[` present) — assert `=== ""`.
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
- **Hover glow both halves (finding 1):** the base `::after` selector list names BOTH
  `[data-hover="glow-reveal"]::after` AND `[data-hover="lift-glow"]::after` with a
  `content`/`position:absolute`/`radial-gradient` background (not `glow-reveal` alone),
  and BOTH selectors get `position:relative;overflow:hidden` — asserting `lift-glow`
  renders its glow half, not just the transform lift.
- `resolveBlockCompositionAttrs(undefined)` empty; each style field → expected
  `data-*`/vars (`layer` → `--layer-x/y/z` + `data-layer-anchor`, not raw left/top);
  `perspectiveParent`/`glare` flags.
- **Color threading (parent Security Contract §2 / L04 design note, finding 4):**
  a BLOCK with `surfacePreset`/`hoverEffect`/`decoration:"radiate"|"pulse"` AND a
  PLAIN-color `style.background` (e.g. `#ff0088`) — `resolveBlockCompositionAttrs` sets
  `--surface-glow` (and `--deco-ring`/`--orb-color` where applicable) to that color; a
  GRADIENT `style.background` (`linear-gradient(...)`) yields NO `--surface-glow` key
  (invalid in `radial-gradient()`); with NO background the custom prop is ABSENT (CSS
  falls back to the reference aqua/violet literal). A SECTION with an authored `accent`
  threads via `resolveSectionCompositionAttrs` identically (sections have the real
  `accent` field; blocks do NOT, so the block resolver reads `style.background` — this
  keeps `lint:types`/root `tsc` green, no `style.accent` on a block). Confirms
  author-controlled retint is wired, not just documented.

### `tests/vitest/pages/pageEffectsRuntime.test.ts` (append)

- Runtime source contains `data-block-tilt` + reduced-motion/`pointer:fine` guards;
  jsdom exercise (test-only `new Function`) sets/clears `transform` + glare props;
  coarse-pointer emulation attaches nothing.

## Validation commands

- From REPO ROOT (vitest is root-only — `vitest.config.ts` include `tests/vitest/**`,
  run via `test:vitest`; `core/package.json` has NO vitest and its `test` is a stub,
  so `--cwd core` resolves `tests/vitest/…` to a nonexistent `core/tests/…` → "No test
  files found"): `vitest run tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/svg-sanitizer.test.ts
  tests/vitest/pages/page-composition-effects.test.ts
  tests/vitest/pages/pageEffectsRuntime.test.ts` (or the whole lane via
  `bun run test:vitest`).
- Root `tsc -p tsconfig.json --noEmit` + `bun --cwd core lint:types` green.

## Hard Invariants

1. All new 522-01 tests are Vitest; none in `tests/unit/` (Bun).
2. `new Function` appears ONLY in test files (never shipped source — semgrep).
3. Every new model key has a round-trip + reject-unknown assertion; every XSS vector
   asserted neutralized.
</content>
