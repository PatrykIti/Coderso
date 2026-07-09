# TASK-531-01-L02: Glow Model + Section-Gradient/Glow Render

# FileName: TASK-531-01-L02-Glow-Model-And-Section-Gradient-Glow-Render.md

**Parent Task:** TASK-531
**Parent Subtask:** TASK-531-01
**Priority:** High
**Category:** Content (Pages) / Site Render / Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the present-only `PageGlow` model on BOTH `PageBlockStyleV2` and
`PageSectionStyleV2` (type + clamps + allowlist + JSON schema + normalize in
`pageDocumentV2.ts`), and the RENDER wiring in `pageRendererV2.tsx`:

1. The SECTION gradient branch (grounding correction: the BLOCK gradient is ALREADY
   wired at `pageRendererV2.tsx:738`; only the SECTION path is missing).
2. A `composeGlowBoxShadow(glow)` helper composing the structured spec into ONE
   `box-shadow` string, merged into the block AND section box-shadow (appended after the
   enum `shadow` when both are present).

All 531 additions live in a clearly-labelled `// ── TASK-531` region in each file so
parallel worktrees (532/533/534) merge additively.

## Grounded anchors (verified 2026-07-09)

- `pageDocumentV2.ts`: `PageSectionStyleV2 :534`, `PageBlockStyleV2 :596`,
  `pageBlockStyleKeys :746`, section `assertKnownKeys` literal `:2495-2514`,
  **THREE `additionalProperties:false` style schemas that ALL gain `glow` in lockstep** —
  (a) `pageBlockStyleJsonSchema :1424` (nested-object precedent: `layer`/`decoration`/`marquee`
  objects with `additionalProperties:false`, `:1462-1502`), (b) `partialSectionStyleJsonSchema
  :1629` (the per-breakpoint RESPONSIVE-OVERRIDE section style, referenced once at `:1690`),
  and (c) the **inlined TOP-LEVEL section-style schema at `:1827-1850`** (validates
  `sections[].style`, `additionalProperties:false` at `:1830`) — the primary section style,
  a SEPARATE object from the partial; the precedent `surfacePreset`/`composition`/`fullBleed`
  appear in BOTH the partial (`:1648-1651`) AND this inlined schema (`:1845-1848`), so `glow`
  MUST too or a top-level `style.glow` fails `additionalProperties:false` at `:1830` (breaking
  the section-glow round-trip against the compiled `pageDocumentV2JsonSchema`).
  `normalizeSectionStyle :2488` (glow block goes after `fullBleed`, before the `partial`
  return `:2593`), `normalizeBlockStyle :2661` (glow block goes in the TASK-531 region near
  the existing composition fields), `readNumber` + `readOptionalSafeColor` (used by
  consumers; `readSafeColor :1905`, `readOptionalSafeColor :1908`), `numericSchema` helper
  (used across the block schema), `isRecord`/`RecordValue`, `assertKnownKeys :2013`.
- `pageRendererV2.tsx`: `toPageShadowValue :331`, `toGradientBackground :345-349`
  (**531 EDITS this** — relax its `isSafeAuthoringCssGradient(safe)` re-check to also accept
  `isSafeAuthoringCssBackgroundLayers(safe)`, else multi-layer never paints on block or
  section), `toPageSectionBoxShadow :396`, `toPageSectionStyle :405` (color `:409`, image
  `:413`, bleed return boxShadow `:432-439`, non-bleed return boxShadow `:446`),
  `toPageSectionBleedStyle :464`, `toPageBlockVisualStyle :714` (block gradient CALL SITE
  `:738`, boxShadow `:746`). `sanitizeAuthoringCssColor` / `sanitizeAuthoringCssBackground`
  already imported (`:80-81`); ADD `isSafeAuthoringCssBackgroundLayers` (exported by
  531-01-L01) to that append-only import block.

## Implementation pseudocode

### 1. Model (`pageDocumentV2.ts`, TASK-531 region)

```ts
// ── TASK-531 REGION ───────────────────────────────────────────────────────────
export const PAGE_GLOW_BLUR_CLAMP = { min: 0, max: 120 } as const;    // px
export const PAGE_GLOW_SPREAD_CLAMP = { min: -40, max: 80 } as const; // px
export const PAGE_GLOW_OFFSET_CLAMP = { min: -80, max: 80 } as const; // px (x AND y)

export type PageGlow = {
  color: string;   // REQUIRED, sanitized via sanitizeAuthoringCssColor at write
  blur?: number;   // PAGE_GLOW_BLUR_CLAMP
  spread?: number; // PAGE_GLOW_SPREAD_CLAMP
  x?: number;      // PAGE_GLOW_OFFSET_CLAMP
  y?: number;      // PAGE_GLOW_OFFSET_CLAMP
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// PageBlockStyleV2 (:596): add `glow?: PageGlow;` inside its TASK-531 region.
// PageSectionStyleV2 (:534): add `glow?: PageGlow;` inside its TASK-531 region.

// pageBlockStyleKeys (:746): add "glow" (TASK-531 region).
// Section assertKnownKeys literal (:2495-2514): add "glow" (TASK-531 region).

// Shared glow normalizer (fail-soft numbers, REQUIRED sanitized color, reject-unknown
// nested keys). Returns undefined when color invalid ⇒ whole glow OMITTED:
const normalizeGlow = (
  value: unknown, mode: NormalizeMode, path: string
): PageGlow | undefined => {
  const g = (isRecord(value) ? value : {}) as RecordValue;
  assertKnownKeys(g, ["color", "blur", "spread", "x", "y"], path, mode); // fail-closed on unknown key
  const color = readOptionalSafeColor(g.color);   // hex/hex8/rgba/hsla/var(--color-*)/named or null
  if (typeof color !== "string" || color.length === 0) return undefined; // color REQUIRED, fail-soft omit
  const glow: PageGlow = { color };
  if (g.blur !== undefined)
    glow.blur = readNumber(g.blur, 24, PAGE_GLOW_BLUR_CLAMP.min, PAGE_GLOW_BLUR_CLAMP.max);
  if (g.spread !== undefined)
    glow.spread = readNumber(g.spread, 0, PAGE_GLOW_SPREAD_CLAMP.min, PAGE_GLOW_SPREAD_CLAMP.max);
  if (g.x !== undefined)
    glow.x = readNumber(g.x, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  if (g.y !== undefined)
    glow.y = readNumber(g.y, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  return glow;
};

// normalizeBlockStyle (:2661), TASK-531 region:
if (input.glow !== undefined) {
  const glow = normalizeGlow(input.glow, mode, `${path}.glow`);
  if (glow) result.glow = glow;   // omit when color invalid (present-only)
}
// normalizeSectionStyle (:2488), TASK-531 region (after fullBleed, before return):
if (input.glow !== undefined) {
  const glow = normalizeGlow(input.glow, mode, `${path}.glow`);
  if (glow) result.glow = glow;
}

// JSON schema — add the SAME glow object to ALL THREE additionalProperties:false style
// schemas, mirroring the `layer` object shape and the surfacePreset/composition/fullBleed
// precedent (which lives in both the partial :1648 and the inlined top-level :1845):
//   1. pageBlockStyleJsonSchema (:1424)                    — block style
//   2. partialSectionStyleJsonSchema (:1629)               — responsive-override section style
//   3. the inlined top-level section-style schema (:1827-1850, additionalProperties:false
//      at :1830) — the PRIMARY section style validating sections[].style; a SEPARATE object
//      from the partial. OMITTING it makes a top-level style.glow pass normalize but FAIL
//      the compiled pageDocumentV2JsonSchema (breaking the section-glow round-trip).
glow: {
  type: "object",
  additionalProperties: false,
  required: ["color"],
  properties: {
    color: { type: "string" },
    blur: numericSchema(PAGE_GLOW_BLUR_CLAMP.min, PAGE_GLOW_BLUR_CLAMP.max),
    spread: numericSchema(PAGE_GLOW_SPREAD_CLAMP.min, PAGE_GLOW_SPREAD_CLAMP.max),
    x: numericSchema(PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max),
    y: numericSchema(PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max),
  },
},
```

### 2. Render (`pageRendererV2.tsx`, TASK-531 region)

```ts
// ── TASK-531 REGION — relax the render-side gradient re-gate (toGradientBackground :345)
// The write sanitizer (531-01-L01) now ACCEPTS multi-layer, but toGradientBackground
// RE-CHECKS its output through isSafeAuthoringCssGradient (which requires a SINGLE layer),
// so without this change the relaxed sanitizer never paints a multi-layer value on block
// OR section. Trust the already-allowlisted sanitizer return: accept single OR multi-layer.
// import { isSafeAuthoringCssBackgroundLayers } from "./pageAuthoringSanitizers"; // append-only
const toGradientBackground = (value: string | null | undefined) => {
  if (!value) return undefined;
  const safe = sanitizeAuthoringCssBackground(value);
  return safe && (isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe))
    ? safe
    : undefined;
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// ── TASK-531 REGION — glow composer (adjacent to toPageShadowValue :331) ───────
// Compose the structured spec into ONE box-shadow declaration. color already
// sanitized at write, but re-sanitize at render (defence in depth) — return "" on
// a bad color so it composes to nothing. NEVER interpolate a raw author string.
const composeGlowBoxShadow = (glow: PageGlow | undefined): string | undefined => {
  if (!glow) return undefined;
  const color = sanitizeAuthoringCssColor(glow.color);
  if (!color) return undefined;
  const x = clampGlowNum(glow.x, PAGE_GLOW_OFFSET_CLAMP);
  const y = clampGlowNum(glow.y, PAGE_GLOW_OFFSET_CLAMP);
  const blur = clampGlowNum(glow.blur ?? 24, PAGE_GLOW_BLUR_CLAMP);
  const spread = clampGlowNum(glow.spread, PAGE_GLOW_SPREAD_CLAMP);
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
};
// Merge enum shadow + glow: comma list = two stacked shadows; glow AUGMENTS the enum.
const mergeShadows = (enumShadow?: string, glow?: string): string | undefined =>
  enumShadow && glow ? `${enumShadow}, ${glow}` : (glow ?? enumShadow);
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// toPageBlockVisualStyle (:714) — replace the boxShadow line (:746):
boxShadow: mergeShadows(toPageShadowValue(style.shadow), composeGlowBoxShadow(style.glow)),

// toPageSectionStyle (:405) — SECTION gradient branch (grounding correction: block is
// already wired). Compute a gradient background-image, mirroring the block path:
const backgroundGradient =
  section.style.backgroundType === "gradient"
    ? toGradientBackground(section.style.background)   // uses relaxed sanitizer (531-01-L01)
    : undefined;
// In BOTH the full-bleed and non-bleed return objects, backgroundImage becomes:
//   backgroundImage: backgroundImage ?? backgroundGradient,   // image url OR gradient
// and boxShadow becomes:
//   boxShadow: mergeShadows(toPageSectionBoxShadow(section.style.shadow), composeGlowBoxShadow(section.style.glow)),
// (The full-bleed content-box return currently has no backgroundImage/boxShadow — the
//  PAINT lives on the bleed box; see toPageSectionBleedStyle below.)

// toPageSectionBleedStyle (:464) — the bleed box paints the background/shadow, so it
// ALSO gains the gradient branch + glow merge so a full-bleed gradient/glow bleeds
// edge-to-edge (same backgroundGradient + mergeShadows wiring).
```

**Design notes.** `clampGlowNum(v, clamp)` truncates + clamps a possibly-undefined number
(default 0), so the render helper is defensive even against an unclamped stored value.
Glow composes to a single 4-part `box-shadow` (offset-x offset-y blur spread color); when
the enum `shadow` is also set, the two are comma-joined so BOTH render (glow augments the
token drop-shadow). Section gradient reuses `toGradientBackground`, which this leaf RELAXES (its
`isSafeAuthoringCssGradient(safe)` re-check now also accepts
`isSafeAuthoringCssBackgroundLayers(safe)`) so the 531-01-L01-relaxed
`sanitizeAuthoringCssBackground` actually PAINTS multi-layer. Relaxing this single shared
helper makes multi-layer work on BOTH section and block — the block gradient CALL SITE
(`:738`) is UNCHANGED (it already calls `toGradientBackground`), so no per-target render
edit is needed for the block. A section gradient paints via `background-image` (CSS
gradients are images), coexisting with the existing `background-color`/image branches
(only one backgroundType is active at a time).

## Regression-test shape (delegated to 531-01-L04, asserted here)

- Round-trip: `glow:{color:"rgba(142,232,255,.22)",blur:45,y:18}` on a block AND a section
  normalizes → re-normalizes byte-identically; unset glow omits the key (present-only).
- Reject-unknown: `style.glow.wobble` → `PageDocumentError`; JSON schema
  `additionalProperties:false` rejects it too.
- Fail-soft: `glow.color:"expression(alert(1))"` → glow OMITTED; `glow.blur:9999` → 120;
  `glow.spread:-999` → -40; missing `color` → glow OMITTED.
- Render: `composeGlowBoxShadow({color:"#8ee8ff",blur:45,y:18})` === `"0px 18px 45px 0px #8ee8ff"`;
  `mergeShadows(md, glow)` === `"<md-string>, <glow>"`; block/section with glow emit the
  merged boxShadow; SECTION with `backgroundType:"gradient"` emits the gradient
  backgroundImage (single AND MULTI-LAYER — assert the reference `.cta-card` two-layer value
  survives to `backgroundImage`, proving the `toGradientBackground` re-gate relax); BLOCK
  with `backgroundType:"gradient"` and the same MULTI-LAYER value emits it too (the `:738`
  call site is unchanged but now paints multi-layer because the shared helper is relaxed);
  no-glow/no-gradient docs render byte-identical to post-530.
- **Lane:** model round-trip in `tests/vitest/pages/page-document-v2.*.test.ts` (or the
  existing model test the closure owns); render in
  `tests/vitest/pages/page-renderer-v2.test.tsx` (Vitest — model/render lane).

## Hard Invariants

1. `glow` present-only — omitted when unauthored OR when its `color` is invalid; legacy /
   no-glow docs byte-identical.
2. `glow` is STRUCTURED — composed at render via `composeGlowBoxShadow` into a fixed
   `box-shadow` template; NEVER a raw author string; re-sanitized at render (defence in
   depth); when `shadow` enum also present, glow is APPENDED (`"<enum>, <glow>"`).
3. SECTION gradient branch mirrors the already-wired block path; both call the shared
   `toGradientBackground` helper, which THIS leaf relaxes (its post-sanitizer re-check now
   accepts `isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)`)
   so the relaxed `sanitizeAuthoringCssBackground` actually PAINTS multi-layer on BOTH
   block and section; the block `:738` call site is unchanged; the full-bleed bleed box
   also gains the gradient/glow.
4. `"glow"` joins `pageBlockStyleKeys` + the section `assertKnownKeys` literal + ALL THREE
   `additionalProperties:false` JSON schemas — block `:1424`, partial section `:1629`, AND
   the inlined top-level section `:1827-1850` (`required:["color"]`) — in lockstep; unknown
   nested key rejects (`assertKnownKeys`). Omitting the inlined top-level schema silently
   breaks the top-level section-glow round-trip.
5. No new `pageBlockType`, no new enum member; all additions in a labelled TASK-531 region.
