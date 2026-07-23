# 1235 - TASK-522 Composable Hero Toolkit & Premium Effects — Custom-SVG Block, Floating-Drift Decorations, Tilt-On-Any-Block, Layered Canvas, Glass/Glow + Hover Presets & Ticker

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-522, TASK-522-01, TASK-522-01-L01, TASK-522-01-L02, TASK-522-01-L03, TASK-522-01-L04, TASK-522-01-L05, TASK-522-01-L06, TASK-522-02, TASK-522-02-L01, TASK-522-02-L02, TASK-522-02-L03, TASK-522-03, TASK-522-03-L01, TASK-522-03-L02, TASK-522-04, TASK-522-04-L01, TASK-522-04-L02, TASK-522-05, TASK-522-05-L01, TASK-522-05-L02, TASK-522-05-L03, TASK-522-05-L04, TASK-522-05-L05, TASK-522-06

## Key Changes

Adds the composable TOOLKIT to build a rich, premium hero (a layered glass card with
floating badges, drifting orbs, a pulsing ring, a tilt-on-pointer card + a drawn
line-SVG, plus hover glow/lift and a ticker) inside Page Editor v2 — NOT a one-off
hero widget. Builds ON TASK-521 (lands strictly after it) and shares its invariants:
every addition is **present-only** (emits ZERO bytes when unauthored; a legacy /
no-effect document normalizes AND renders **byte-identical** to the post-521 output),
joins its **reject-unknown allowlist** (`assertKnownKeys` + strict
`pageDocumentV2JsonSchema` `additionalProperties:false`) with a round-trip test, and
respects **`prefers-reduced-motion`** (BOTH a CSS
`@media (prefers-reduced-motion: no-preference)` gate around every keyframe binding AND
a `matchMedia('(prefers-reduced-motion: reduce)').matches` early-return in the
block-tilt runtime IIFE). **NO npm dependency** (hand-rolled SVG sanitizer + inline
CSS keyframes + 521's runtime), **NO DB migration / DDL, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump** (stays `2`), **NO new route/RBAC** — all config
rides existing jsonb (`block.style`, `section.style`, block props) plus the ONE new
`customSvg` block type. Landed strictly in order 522-01 → 522-02 → 522-03 → 522-04 →
522-05 → 522-06 (single-writer files + documented additive seams in
`pageRendererV2.tsx` / `pageEditorControlRegistry.ts` / `pageEditorOptions.ts` /
`pageEffectsRuntime.ts`, all disjoint from 521's regions).

- **Composition MODEL + sanitizer + CSS + runtime infra (522-01,
  `core/services/pages/pageDocumentV2.ts` + NEW
  `core/services/pages/svgSanitizer.ts` + NEW
  `core/services/pages/pageCompositionEffects.tsx` + `pageEffectsRuntime.ts` append):**
  the shared effect vocabulary — `pageBlockDecorationMotions`
  (`none`/`float`/`drift`/`pulse`/`orbit`/`radiate`), `pageTiltStrengths`,
  `pageSurfacePresets` (`none`/`glass`/`glass-grid`/`radial-glow`/`ambient-orbs`),
  `pageBlockHoverEffects` (`none`/`glow-reveal`/`lift`/`scale`/`lift-glow`),
  `pageCompositions` (`flow`/`layered`), `pageLayerAnchors`, `pageMarqueeDirections` —
  plus the clamps (`PAGE_DECORATION_DELAY_CLAMP` 0..4000 ms,
  `PAGE_DECORATION_DURATION_CLAMP` 2000..16000 ms, `PAGE_LAYER_X/Y_CLAMP` -50..150 %,
  `PAGE_LAYER_Z_CLAMP` 0..40, `PAGE_MARQUEE_SPEED_CLAMP` 8..40 s,
  `PAGE_DRAW_SPEED_CLAMP` 600..6000 ms, `PAGE_CUSTOM_SVG_MAX_BYTES` 24576). The ONE
  new `pageBlockType` `customSvg` (props `svg`/`drawIn`/`drawSpeed`/`label`) is
  introduced atomically across the five exhaustive `Record<PageBlockType,…>` surfaces.
  `PageBlockStyleV2` gains present-only `decoration`/`tilt`/`tiltGlare`/`layer`/
  `surfacePreset`/`hoverEffect`/`marquee`/`composition`; `PageSectionStyleV2` gains
  `surfacePreset`/`composition`. Static `PAGE_COMPOSITION_EFFECTS_CSS` +
  `resolveBlockCompositionAttrs`/`resolveSectionCompositionAttrs`. The block-tilt
  (+ glare) `[data-block-tilt]` binding is appended to the shared
  `pageEffectsRuntime.ts` (its own `matchMedia('(pointer:fine)')` gate; reuses the
  module reduced-motion early-return; the ~4-line pointer math is a documented minimal
  duplication of `hero.tsx`'s unimportable `HERO_TILT_SCRIPT`).
- **SVG SANITIZER — the core new security surface
  (`core/services/pages/svgSanitizer.ts`, 522-01-L02):** a dependency-free
  **allowlist** sanitizer applied at BOTH write (`normalizeBlockProps` for `customSvg`)
  AND render (defence-in-depth before `dangerouslySetInnerHTML`), isomorphic (byte cap
  via `TextEncoder`). Fail-closed pre-pass strips HTML comments + CDATA; fail-closed
  tripwires reject the whole SVG (`<script`, `<foreignObject`, `<!ENTITY`/`<!DOCTYPE`
  XXE, `on*=`, `javascript:`/`vbscript:`/`data:text/html`, `expression(`/`behavior:`/
  `-moz-binding`, non-`#` `url(`, non-local `href`/`xlink:href`/`<use>`, over-cap);
  the allowlist walk keeps only allowlisted tags/attributes (the `style` attribute is
  DROPPED); a fail-closed post-walk residual-`<`/unbalanced-quote check returns `""`.
  Neutral fallback on any failure — never partial injected markup.
- **Custom-SVG block — render + editor (522-02, `pageRendererV2.tsx`
  `case "customSvg"` + `pageEditorControlRegistry.ts pageBlockControlRegistry.customSvg`
  + `pageEditorOptions.ts blockOptionCopy.customSvg`):** the sanitized inline `<svg>`
  renders on front + canvas with an optional stroke draw-in (`@keyframes cx-draw` via
  `--draw-speed`); controls for `svg`/`drawIn`/`drawSpeed`/`label` + palette copy.
- **Floating-drift decoration + block-frame composition (522-03,
  `pageRendererV2.tsx toPageBlockRenderProps` merge + `renderPageBlockWithFrame`
  inner effect wrapper + `pageUniversalBlockControls` decoration group):** any block
  becomes a layered decoration; the frame-level composition attrs (layer/surface/
  marquee) land on the real `[data-block-id]` frame while transform-writing effects
  ride an inner effect wrapper (no anchor/effect transform collision).
- **Tilt-on-any-block (522-04, `pageUniversalBlockControls` tilt group):** generalizes
  521's hero tilt to any card/block (render via the 522-03 frame resolver, runtime via
  the 522-01 `[data-block-tilt]` binding); optional glare sheen.
- **Layered canvas + glass/glow + hover + ticker (522-05, `pageRendererV2.tsx`
  `PageSectionRender` surface/canvas + layout-block canvas + group marquee +
  `pageResponsiveCss.ts` per-device `--layer-x/y/z` deltas + section/block/group
  controls):** a section or layout-block `composition:"layered"` absolutely positions
  `layer`-placed children (z-indexed, per-device offsets); `surfacePreset` paints
  glass/grid/radial-glow/ambient-orbs; `hoverEffect` adds glow-reveal/lift/scale;
  a `group` block `marquee` auto-scrolls its children (`@keyframes cx-ticker`,
  seamless loop). The page-root composition `<style>` + block-tilt runtime emit only on
  the front/preview render path (`PageDocumentRender`), never on the builder canvas
  (Hard Invariant 7/8), and only when a 522 effect is authored.
- **Per-device scope (bounded + honest):** only the NUMERIC `layer.x/y/z` offsets vary
  per breakpoint (`pageResponsiveCss.ts` `--layer-*` deltas). `decoration`/
  `surfacePreset`/`hoverEffect`/`tilt`/`composition`/`marquee` are BASE-ONLY (controls
  `responsive:false`); a decoration hides on mobile via existing per-device block
  visibility, not "kept but animation-off".
- **Security:** the `customSvg` allowlist sanitizer at write + render; decoration/tilt/
  surface/hover/marquee/composition enums are `normalizeEnum` fail-CLOSED, numbers
  `readNumber`-clamped, colors `readSafeColor`-validated (author retint threaded into
  `--surface-glow`); the block-tilt runtime is a STATIC dependency-free IIFE reading
  only validated DOM `data-*`/CSS custom properties, emitted via static-`__html`
  `dangerouslySetInnerHTML`.
- **Docs:** `_docs/PAGE_MODEL.md` (new § Composable Hero Toolkit & Premium Effects —
  `customSvg` block, block/section style fields, per-device scope, composition CSS +
  runtime), `_docs/DESIGN_TOKENS.md` (new toolkit enums/clamps table + the
  `--deco-*`/`--layer-*`/`--draw-speed`/`--marquee-speed`/`--surface-glow`/`--orb-*`/
  `--glare-*` custom properties + `prefers-reduced-motion` guarantee),
  `_docs/WIDGETS.md` (composable-hero toolkit, no widget-pack row), and
  `_docs/SECURITY_SPEC.md` (new § Pages custom-SVG sanitizer boundary) updated.
- **Tests:** all new 522 model/SSR/render/descriptor/sanitizer/CSS/runtime tests live
  in the Vitest lane (`tests/vitest/pages/page-document-v2*.test.ts` new-block-type +
  style-field round-trip + reject-unknown + fail-soft + Ajv `additionalProperties`,
  `page-renderer-v2.test.tsx` customSvg case + block-frame composition attrs + section
  surface/canvas + marquee + present-only byte-identity, `page-editor-control-registry.test.ts`
  descriptors, NEW `svg-sanitizer.test.ts` XSS/mXSS corpus, NEW
  `page-composition-effects.test.ts` resolvers/CSS, `pageEffectsRuntime.test.ts`
  block-tilt binding, `page-responsive-css.test.ts` `--layer-*` deltas); the
  pre-existing Bun lanes (incl. `tests/integration/runtime/pages-runtime.test.ts`) stay
  green. All gates green (`bun --cwd core lint`/`lint:types`, root
  `tsc -p tsconfig.json --noEmit`, `bun run test:bun`, `bun run test:vitest`,
  `gates:coderso`). The ≥5-scenario-per-area LIVE Playwright smoke (custom-SVG block +
  decoration + tilt + layered canvas + glass/glow + hover + ticker, composed side-by-side
  vs the reference wow-site hero, light + dark) is run by the orchestrator post-merge
  (the dev host serves the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- Richer SVG upload / asset-pipeline authoring (currently paste-only into a single-line
  control; a multiline SVG widget is a possible future foundation extension).
- Additional decoration variants and surface presets beyond the initial set.
- Per-child layer drag-authoring on the layered canvas (currently numeric x/y/z + anchor
  controls only).
- Class/data-attr effect deltas per breakpoint (currently only numeric `layer.x/y/z`
  vary per device; decoration/surface/hover/tilt/composition/marquee are base-only).
