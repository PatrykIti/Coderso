# TASK-535: Audit Remediation for TASK-522…530 (Page v2 Composable Effects)

# FileName: TASK-535_Audit_Remediation_522_530_Page_Effects.md

**Priority:** High
**Category:** Pages (Page v2) / Site Render / Security (defence-in-depth) / Docs
**Estimated Effort:** Medium
**Dependencies:**
- TASK-522 (Composable Hero Toolkit & Premium Effects — changelog 1235)
- TASK-523 (Page Canvas Background & Occlusion-Proof Cursor Spotlight — 1237)
- TASK-524 (Composable Effects Single-Node Co-location & Surface Tint — 1239)
- TASK-525 (Full-Bleed Background & Per-Block Staggered Reveal — 1238)
- TASK-528 (Whole-Card Tilt — Perspective on an Ancestor — 1241)
- TASK-529 (Cursor Spotlight Viewport-Coord Fix — 1240)
- TASK-530 (Page Editor Sliders Fine ±1 Step — 1242)

This is the post-merge audit-remediation task for the whole 522…530 Page v2
composable-effects program. No code dependency beyond those seams; it corrects
regressions/edge-cases the program introduced and hardens the shared render/
sanitizer paths.

**Status:** ✅ Done (2026-07-09)
**Closure changelog:** 1243.

---

## Overview

A cross-task audit of the merged 522…530 program found one HIGH correctness
regression, several MEDIUM edge-cases across the shared render/runtime seams, SVG
sanitizer hygiene gaps, render-parity re-sanitize gaps, and doc-truth drift. All
remediation is **present-only / jsonb-only**: NO npm dependency, NO DB
migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO route/RBAC
change. Every path a page without the relevant effect touches normalizes AND
renders byte-identical to pre-535; `prefers-reduced-motion` gates are unchanged.

## Findings & fixes

### HIGH — tilt + layer containing-block regression

A block authoring BOTH `tilt` AND `style.layer` placed the layered chip in the
wrong position. The 528 tilt fix wraps a tilted frame in a `[data-tilt-parent]`
`perspective:1200px` wrapper; a non-`none` `perspective` establishes a
**containing block** for absolutely-positioned descendants, so the layered-canvas
CSS made the FRAME resolve its `--layer-*` offsets against the WRAPPER instead of
the `.cx-layered-canvas` (regressing TASK-522-05-L02).

- **Fix (`pageRendererV2.tsx`):** `splitBlockComposition` hoists the LAYER
  PLACEMENT (`data-layer` + `data-layer-anchor` + base `--layer-x/y/z`) onto the
  wrapper ONLY when tilt AND layer are BOTH authored (`hoistLayerToWrapper`), so
  the WRAPPER is the absolutely-positioned layered child (offsets resolve against
  the canvas; the 524 anchor `translate:` rides the wrapper) while the tilt
  transform stays on the inner frame. `renderPageBlockWithFrame` stamps the base
  `--layer-*` + `data-layer*` on the `withTiltParent` wrapper for that case.
- **Per-device retarget (`pageResponsiveCss.ts`):** custom props inherit DOWNWARD
  only, so a per-device `--layer-*` on the child frame can never reach the wrapper.
  New `PAGE_TILT_PARENT_LAYER_ATTRIBUTE` = `data-tilt-parent-for` is stamped on the
  wrapper (hoisted case only); `collectBlockDeclarations` routes the per-device
  layer offsets to a `wrapper` bucket targeting `[data-tilt-parent-for="<id>"]`
  when the base style is tilt+layer, else keeps them on the frame. Layer-only case
  byte-identical.

### MEDIUM

- **Reveal `--reveal-delay` inheritance double-bind.** The custom prop INHERITS, so
  an un-delayed nested child inherited its container's delay (defeating stagger).
  Fixed by resetting `--reveal-delay:0ms` in the per-frame reveal rule (inline
  authored var still wins the cascade). `pageRendererV2.tsx` `PAGE_REVEAL_MOTION_CSS`.
- **Full-bleed horizontal-scroll guard.** A `width:100vw` bleed box counts the
  scrollbar gutter → spurious horizontal scrollbar. Present-only `overflowX:"clip"`
  root guard (`docHasFullBleedSection`); `clip` NOT `hidden` (hidden would break
  `position:sticky` descendants). `pageRendererV2.tsx`.
- **`baseSectionClassName` predicate mismatch.** The section utility-gutter class
  keyed off ONLY the `full-width` variant while the bleed box keyed off the shared
  `isPageSectionFullBleed`; a `style.fullBleed`-only section kept a doubled
  `px-4 py-6` gutter. Routed the class off the SAME predicate.
- **Stale `not_css_expressible` diagnostic.** 525 decoupled bleed from the content
  cap (the `max-width:none` pin is gone), so a full-bleed `maxWidth` override IS
  CSS-expressible. `collectSectionDeclarations` mirrors the base content div
  (`width` + `max-width`) instead of the stale diagnostic. `pageResponsiveCss.ts`.
- **Two-document spotlight overlay double-stack.** The `<main>` page + `SiteFooter`
  each render a `PageDocumentRender`; the viewport-fixed spotlight overlay is a
  page-global singleton (two stack → double brightness). New `documentRole` /
  `peerSpotlightOn` props + `documentUsesSpotlight` export emit the overlay exactly
  once; idempotent stylesheets stay per-document (footer-only effect still styled).
  `pageRendererV2.tsx`, `siteShell.tsx`, `pageRuntimeV2.tsx`.
- **Runtime double-init.** The runtime `<script>` can emit twice (main + footer);
  self-guards on `PAGE_EFFECTS_RUNTIME_INIT_FLAG` window flag (first statement),
  any later copy is a no-op. `pageEffectsRuntime.ts`.

### SVG sanitizer hygiene (`svgSanitizer.ts`, defence-in-depth)

- Case-insensitive root gate vs case-sensitive walk → uppercase `<SVG>` leaked its
  children unwrapped: `ALLOWED_TAG_CANONICAL` case-insensitive lookup, re-emit
  canonical (camelCase preserved).
- Self-closing root + trailing-junk bypass → FAIL-CLOSED unless the first `<svg…>`
  is an OPEN tag; self-closing root accepted only when the WHOLE input is that
  single self-closed root.
- Valueless/boolean attr leak → attr rebuild keeps only allowlisted `name=value`
  pairs; `TAG_REEMIT_RE` attr body is quote-balanced so an unbalanced-quote tag
  trips the fail-closed residual guard instead of being silently stripped.
  Self-closing tags preserved.

### Render-parity re-sanitize (`pageCompositionEffects.tsx`, defence-in-depth)

- `resolveBlockCompositionAttrs` / `resolveSectionCompositionAttrs` re-sanitize the
  glow source (`surfaceTint`/`background`/`accent`) at RENDER with
  `sanitizeAuthoringCssColor` (parity with the spotlight/canvas-bg render path);
  valid input unchanged, unexpected value drops the glow. Removed the dead
  `[data-tilt-parent]{perspective:1200px}` CSS rule (perspective is inline since 528).

### Doc-truth

- Board 522…530 rows renumbered to true post-merge changelog numbers (523→1237,
  524→1239, 525→1238, 528→1241) + re-ordered.
- `DESIGN_TOKENS.md` / `PAGE_MODEL.md` `PAGE_LAYER_Z_CLAMP` → `0..20` (523 lowering).
- Intent/scope comments: `revealDelay` is a stagger WITHIN a revealing section
  (inert by design outside one, not widened to a standalone trigger);
  `resolveSliderStep` fractional branch is sub-unit only (typography fractional
  steps come from the explicit registry step).

## Tests (owned)

`page-renderer-v2.test.tsx`, `page-responsive-css.test.ts`,
`pageEffectsRuntime.test.ts`, `page-composition-effects.test.ts`,
`svg-sanitizer.test.ts`, `cursorSpotlight.test.tsx`,
`sectionScrollEffect.test.tsx`, `page-editor-v2-flow.test.tsx`. See changelog 1243
for the per-file assertion list.

## Gates (all green at closure)

- `bun --cwd core lint` / `bun --cwd core lint:types` — pass.
- root `tsc -p tsconfig.json --noEmit` — pass (exit 0).
- `test:bun` — 1495 pass / 1 skip / 0 fail (260 files).
- `test:vitest` — changed 8 files 408/408; broad `pages/` + `content/` 646/646.
- `gates:coderso` — 5/5.

## Open follow-ups

- **INFO (deferred):** live ≥5-scenario-per-area light+dark Playwright smoke of the
  remediated flows deferred to the orchestrator post-merge (dev host serves the
  MAIN tree).
- **INFO:** the KNOWN rare untested combo from 528 (one block authoring BOTH tilt
  AND a transform-decoration contend on the frame `transform`) is unchanged — the
  reference never combines them.
