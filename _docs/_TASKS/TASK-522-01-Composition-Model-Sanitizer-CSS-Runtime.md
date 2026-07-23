# TASK-522-01: Composition + Decoration MODEL + SVG Sanitizer + Composition CSS + Runtime Infra

# FileName: TASK-522-01-Composition-Model-Sanitizer-CSS-Runtime.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Schema (JSON model) / Security / Site Render / Accessibility
**Estimated Effort:** Large
**Status:** ✅ Done
**Depends on:** TASK-521 (all landed — EXTENDS the shared `pageEffectsRuntime.ts`
module and reuses its global reduced-motion early-return + the curated-SVG + keyframes
CSS precedent). NOTE: the hero tilt PRIMITIVE lives in `hero.tsx`'s `HERO_TILT_SCRIPT`
(not the runtime module, and 522 does not import `hero.tsx`), so 522-01-L05 REPRODUCES
its ~4-line pointer math in a new self-gated `[data-block-tilt]` binding — a documented
minimal duplication, not an in-module reuse.

---

## Scope

Foundation subtask. Defines the entire 522 vocabulary + model + security sanitizer
+ static CSS + runtime extension, imported read-only by every later subtask. **Sole
writer of `core/services/pages/pageDocumentV2.ts`** (all model regions + the atomic
`customSvg` type-introduction), the NEW files `svgSanitizer.ts` and
`pageCompositionEffects.tsx`, and the block-tilt APPEND seam of the 521-owned
`pageEffectsRuntime.ts`. Also performs the ONE atomic exhaustive-`Record` stub in
`pageEditorOptions.ts` + `pageEditorControlRegistry.ts` required by the new block
type (see Coordination in the parent).

## Leaves

- **522-01-L01** — `customSvg` block type + props model + normalize + JSON schema +
  the atomic exhaustive-`Record<PageBlockType,…>` stubs.
- **522-01-L02** — dependency-free SVG allowlist sanitizer (`svgSanitizer.ts`).
- **522-01-L03** — block/section STYLE model (decoration / tilt / tiltGlare / layer /
  surfacePreset / hoverEffect / marquee / composition) + normalize + JSON schema.
- **522-01-L04** — composition CSS module + attr/class resolvers
  (`pageCompositionEffects.tsx`).
- **522-01-L05** — `pageEffectsRuntime.ts` block-tilt generalization + glare (521
  APPEND seam).
- **522-01-L06** — model / sanitizer / CSS / runtime unit tests (Vitest).

## Shared vocabulary (defined once here; imported read-only by 522-02..05)

Enums: `pageBlockDecorationMotions` `["none","float","drift","pulse","orbit","radiate"]`
(authoritative def in leaf 522-01-L03; `"none"` = the present-only reset that
`normalizeBlockStyle` omits, `"radiate"` = the `.map-pulse`/`@keyframes mapPulse`
concentric-ring variant),
`pageTiltStrengths` `["none","subtle","strong"]`, `pageSurfacePresets`
`["none","glass","glass-grid","radial-glow","ambient-orbs"]`, `pageBlockHoverEffects`
`["none","glow-reveal","lift","scale","lift-glow"]`, `pageCompositions`
`["flow","layered"]`, `pageLayerAnchors`
`["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]`,
`pageMarqueeDirections` `["left","right"]`.
Clamps: `PAGE_DECORATION_DELAY_CLAMP {0,4000}`, `PAGE_DECORATION_DURATION_CLAMP
{2000,16000}`, `PAGE_LAYER_X_CLAMP {-50,150}`, `PAGE_LAYER_Y_CLAMP {-50,150}`,
`PAGE_LAYER_Z_CLAMP {0,40}`, `PAGE_DRAW_SPEED_CLAMP {600,6000}`,
`PAGE_MARQUEE_SPEED_CLAMP {8,40}`, byte cap `PAGE_CUSTOM_SVG_MAX_BYTES = 24576`.

## Hard Invariants (subtask)

1. Every field present-only; `defaultStyle`/`defaultBlockStyle` unchanged.
2. Reject-unknown allowlist + JSON-schema mirror + round-trip test per key.
3. Enums fail-closed (write mode throws), numbers/colors/SVG fail-soft.
4. No new dependency; no migration; no schemaVersion bump.
5. The atomic type-introduction keeps typecheck green across all three files in ONE
   land; enrichment is a later additive seam.

## Definition of done

Model + sanitizer + CSS + runtime land in strict leaf order (L01→L06); all new
vocabulary exported; 522-02..05 can import read-only; L06 tests green; typecheck
green after the atomic type-introduction.
</content>
