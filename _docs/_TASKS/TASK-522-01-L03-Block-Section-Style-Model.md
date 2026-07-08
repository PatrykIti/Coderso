# TASK-522-01-L03: Block + Section Composition STYLE Model

# FileName: TASK-522-01-L03-Block-Section-Style-Model.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits the STYLE regions of `core/services/pages/pageDocumentV2.ts`
(RE-GREP the symbols — 521 shifted these lines; numbers are post-521 actuals):
`PageBlockStyleV2` (`:481-521`) gains decoration/tilt/tiltGlare/layer/surfacePreset/
hoverEffect/marquee/composition; `PageSectionStyleV2` (`:440`) gains
surfacePreset/composition. Adds the shared enums + clamps, extends
`normalizeBlockStyle` + `normalizeSectionStyle` allowlists + branches, and mirrors
BOTH block-style AND section-style JSON-schema objects (inline + partial responsive).
Disjoint from L01 (block type) and the sanitizer.

## Grounded anchors

- `PageBlockStyleV2` `:481-521`; `normalizeBlockStyle` (grep `assertKnownKeys(input,
  pageBlockStyleKeys, …` — the block-style allowlist, `:2360`) — extend it.
- `PageSectionStyleV2` `:440`; `normalizeSectionStyle` `:2210` allowlist
  `["background","backgroundType","backgroundImage","accent","radius","shadow",…]`
  (`assertKnownKeys` at `:2217`).
- Responsive channels accept the new fields at the MODEL level for free:
  `PageBlockResponsiveOverrideV2.style?: PageBlockStyleV2` (`:523-535`),
  `PageSectionResponsiveOverrideV2.style?: Partial<PageSectionStyleV2>` (`:539-555`) — so a
  per-device override of ANY new style field round-trips in the schema.
  **BUT per-device RENDER is BOUNDED (verified — do NOT overclaim).** `pageResponsiveCss.ts`
  emits only per-PROPERTY CSS declarations into `@media` rules; it explicitly documents
  (its header + fail-closed diagnostics) that class / data-attr / content deltas at a
  breakpoint are NOT CSS-expressible against the inline desktop base. The data-attr /
  class effects (`decoration.motion`, `surfacePreset`, `hoverEffect`, `tilt`,
  `composition`, `marquee`) are stamped BASE-ONLY by the frame/section resolvers (they
  read `block.style` / `section.style`, NOT the merged-per-breakpoint style), so a
  per-device override of them round-trips in the model yet renders IDENTICALLY on every
  breakpoint (silent no-op). ONLY the numeric `layer.x/y/z` offsets actually vary per
  device — and only because 522-05-L02 adds a dedicated `--layer-x/y/z` per-breakpoint
  custom-prop delta emit to `pageResponsiveCss.ts`. THEREFORE (option (a), matches parent
  Acceptance #7): the effect controls (decoration/surface/hover/tilt/composition/marquee)
  are authored `responsive:false` so authors are not offered a per-device control that
  no-ops; only `layer.x/y/z` controls are `responsive:true`. Per-device "hide the badge"
  is done with the EXISTING per-device block visibility (`display:none`); "keep the badge
  but drop only its animation on mobile" is NOT deliverable this task.
- Helpers: `normalizeEnum` (`:1681`, fail-closed write), `readNumber` (`:1676`),
  `readSafeColor` (`:1643`), `assertKnownKeys` (`:1751`).
- JSON schema: block-style schema object + `partialBlockStyleJsonSchema` (grep) and
  section-style `sections.items.properties.style` (`:~1449`) +
  `partialSectionStyleJsonSchema` (`:~1285`), all `additionalProperties:false`.

## Implementation pseudocode

```ts
// (1) Shared vocabulary (top-of-file const block, this leaf's region):
// "none" is the FIRST member (clears the decoration — omitted on normalize, mirroring
// tilt/surfacePreset) so the select has a valid reset path (no bogus '' option, which
// would fail normalizeEnum + the `options: readonly string[]` type). "radiate" is the
// concentric box-shadow ring pulse matching the reference `.map-pulse`/@keyframes
// mapPulse (distinct from "pulse" = `.sun-ring`/pulseRing scale+opacity).
export const pageBlockDecorationMotions = ["none","float","drift","pulse","orbit","radiate"] as const;
export type PageBlockDecorationMotion = (typeof pageBlockDecorationMotions)[number];
export const pageTiltStrengths = ["none","subtle","strong"] as const;
export type PageTiltStrength = (typeof pageTiltStrengths)[number];
export const pageSurfacePresets = ["none","glass","glass-grid","radial-glow","ambient-orbs"] as const;
export type PageSurfacePreset = (typeof pageSurfacePresets)[number];
export const pageBlockHoverEffects = ["none","glow-reveal","lift","scale","lift-glow"] as const;
export type PageBlockHoverEffect = (typeof pageBlockHoverEffects)[number];
export const pageCompositions = ["flow","layered"] as const;
export type PageComposition = (typeof pageCompositions)[number];
export const pageLayerAnchors = ["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"] as const;
export type PageLayerAnchor = (typeof pageLayerAnchors)[number];
export const pageMarqueeDirections = ["left","right"] as const;
export type PageMarqueeDirection = (typeof pageMarqueeDirections)[number];
export const PAGE_DECORATION_DELAY_CLAMP = { min: 0, max: 4000 } as const;
export const PAGE_DECORATION_DURATION_CLAMP = { min: 2000, max: 16000 } as const;
export const PAGE_LAYER_X_CLAMP = { min: -50, max: 150 } as const;
export const PAGE_LAYER_Y_CLAMP = { min: -50, max: 150 } as const;
export const PAGE_LAYER_Z_CLAMP = { min: 0, max: 40 } as const;
export const PAGE_MARQUEE_SPEED_CLAMP = { min: 8, max: 40 } as const;

export type PageBlockDecoration = { motion: PageBlockDecorationMotion; delay?: number; duration?: number };
export type PageBlockLayer = { x?: number; y?: number; z?: number; anchor?: PageLayerAnchor };
export type PageBlockMarquee = { speed?: number; direction?: PageMarqueeDirection; seamless?: boolean };

// (2) PageBlockStyleV2 — append present-only fields (see parent Schema plan).
// (3) PageSectionStyleV2 — append surfacePreset?, composition?.

// (4) normalizeBlockStyle — extend allowlist + partial-aware branches:
assertKnownKeys(input, [/* …existing… */,
  "decoration","tilt","tiltGlare","layer","surfacePreset","hoverEffect","marquee","composition"], path, mode);

if (input.decoration !== undefined) {
  const d = input.decoration as Record<string, unknown> ?? {};
  assertKnownKeys(d, ["motion","delay","duration"], `${path}.decoration`, mode); // reject unknown NESTED keys
  const motion = normalizeEnum(d.motion, pageBlockDecorationMotions, "none", `${path}.decoration.motion`, mode);
  if (motion !== "none") {                         // "none" ⇒ omit the whole decoration (reset path)
    const deco: PageBlockDecoration = { motion };
    if (d.delay !== undefined) deco.delay = readNumber(d.delay, 0, PAGE_DECORATION_DELAY_CLAMP.min, PAGE_DECORATION_DELAY_CLAMP.max);
    if (d.duration !== undefined) deco.duration = readNumber(d.duration, 6000, PAGE_DECORATION_DURATION_CLAMP.min, PAGE_DECORATION_DURATION_CLAMP.max);
    result.decoration = deco;                       // present-only (only when authored, non-none)
  }
}
if (input.tilt !== undefined) {
  const t = normalizeEnum(input.tilt, pageTiltStrengths, "none", `${path}.tilt`, mode);
  if (t !== "none") result.tilt = t;               // present-only: omit "none"
}
if (input.tiltGlare !== undefined && input.tiltGlare === true) result.tiltGlare = true;
if (input.layer !== undefined) {
  const l = input.layer as Record<string, unknown> ?? {};
  assertKnownKeys(l, ["x","y","z","anchor"], `${path}.layer`, mode); // reject unknown NESTED keys
  const layer: PageBlockLayer = {};
  if (l.x !== undefined) layer.x = readNumber(l.x, 0, PAGE_LAYER_X_CLAMP.min, PAGE_LAYER_X_CLAMP.max);
  if (l.y !== undefined) layer.y = readNumber(l.y, 0, PAGE_LAYER_Y_CLAMP.min, PAGE_LAYER_Y_CLAMP.max);
  if (l.z !== undefined) layer.z = readNumber(l.z, 0, PAGE_LAYER_Z_CLAMP.min, PAGE_LAYER_Z_CLAMP.max);
  if (l.anchor !== undefined) layer.anchor = normalizeEnum(l.anchor, pageLayerAnchors, "center", `${path}.layer.anchor`, mode);
  if (Object.keys(layer).length) result.layer = layer;   // present-only
}
if (input.surfacePreset !== undefined) {
  const s = normalizeEnum(input.surfacePreset, pageSurfacePresets, "none", `${path}.surfacePreset`, mode);
  if (s !== "none") result.surfacePreset = s;       // present-only
}
if (input.hoverEffect !== undefined) {
  const h = normalizeEnum(input.hoverEffect, pageBlockHoverEffects, "none", `${path}.hoverEffect`, mode);
  if (h !== "none") result.hoverEffect = h;         // present-only
}
if (input.composition !== undefined) {
  const c = normalizeEnum(input.composition, pageCompositions, "flow", `${path}.composition`, mode);
  if (c !== "flow") result.composition = c;         // present-only
}
if (input.marquee !== undefined) {
  const mq = input.marquee as Record<string, unknown> ?? {};
  assertKnownKeys(mq, ["speed","direction","seamless"], `${path}.marquee`, mode); // reject unknown NESTED keys
  const marquee: PageBlockMarquee = {};
  if (mq.speed !== undefined) marquee.speed = readNumber(mq.speed, 18, PAGE_MARQUEE_SPEED_CLAMP.min, PAGE_MARQUEE_SPEED_CLAMP.max);
  if (mq.direction !== undefined) marquee.direction = normalizeEnum(mq.direction, pageMarqueeDirections, "left", `${path}.marquee.direction`, mode);
  if (mq.seamless === true) marquee.seamless = true;
  if (Object.keys(marquee).length) result.marquee = marquee;  // present-only
}

// (5) normalizeSectionStyle — extend allowlist with ["surfacePreset","composition"]
//     + the same two present-only branches (surfacePreset omit "none",
//     composition omit "flow").
// NOTE: decoration.color / glass tint colors are authored on the EXISTING
// block.style.background / textColor / borderColor (readSafeColor) — no new color
// field is introduced here (colors stay whitelisted by the existing style path).
```

## JSON-schema mirror (all `additionalProperties:false`, lockstep)

Add the new keys to BOTH block-style schema objects (inline block style + the
partial responsive-override block style) AND both section-style objects (inline
`sections.items.properties.style` `:~1449` + `partialSectionStyleJsonSchema`
`:~1285`). Nested object schemas:
```jsonc
decoration: { type:"object", additionalProperties:false,
  required:["motion"],
  properties:{ motion:{ enum:[...pageBlockDecorationMotions] },
    delay:{ type:"number", minimum:0, maximum:4000 },
    duration:{ type:"number", minimum:2000, maximum:16000 } } },
tilt: { enum:[...pageTiltStrengths] },
tiltGlare: { type:"boolean" },
layer: { type:"object", additionalProperties:false, properties:{
  x:{type:"number",minimum:-50,maximum:150}, y:{type:"number",minimum:-50,maximum:150},
  z:{type:"number",minimum:0,maximum:40}, anchor:{ enum:[...pageLayerAnchors] } } },
surfacePreset: { enum:[...pageSurfacePresets] },
hoverEffect: { enum:[...pageBlockHoverEffects] },
composition: { enum:[...pageCompositions] },
marquee: { type:"object", additionalProperties:false, properties:{
  speed:{type:"number",minimum:8,maximum:40}, direction:{ enum:[...pageMarqueeDirections] },
  seamless:{type:"boolean"} } },
```

## Regression-test shape (delegated to 522-01-L06, asserted here)

- Round-trip each field; `decoration.motion:"none"`/`tilt:"none"`/
  `surfacePreset:"none"`/`composition:"flow"` omitted (present-only — `"none"` is the
  decoration RESET path, whole `decoration` object dropped); `"radiate"` round-trips
  (map-pulse variant); invalid enum VALUE (`decoration.motion:"explode"`,
  `tilt:"spin"`, `surfacePreset:"drop-table"`, `hoverEffect:"hack"`) throws
  `PageDocumentError` in write mode; unknown NESTED key throws
  (`decoration:{motion:"float",foo:1}`, `layer:{x:0,evil:1}`,
  `marquee:{speed:18,bad:1}`); `layer.z:99999` clamps to 40; `marquee.speed:0.1`
  clamps to 8; unknown key `style.wobble` throws; a `responsive.tablet.style.layer`
  round-trips (validates against the partial schema — proves the mirror).
- A legacy block/section (none of the new keys) is byte-identical.
- **Lane:** Vitest `tests/vitest/pages/page-document-v2.test.ts`.

## Hard Invariants

1. Present-only; `defaultBlockStyle`/`defaultStyle` unchanged.
2. Allowlist + BOTH inline AND partial JSON-schema objects updated in lockstep
   (block + section).
3. Enums fail-closed; numbers clamp; unknown key rejects.
4. Colors ride the existing whitelisted style path (no new raw color field).
</content>
