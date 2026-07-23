# TASK-522-06: Tests, Docs & Closure

# FileName: TASK-522-06-Tests-Docs-Closure.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Tests / Docs / Closure
**Estimated Effort:** Medium
**Status:** ✅ Done
**Depends on:** TASK-522-01..05 (all landed).

---

## Scope

Cross-cutting hardening + documentation + closure. Owns the aggregate test/gate
pass, the model/design docs, and the closure record. Does NOT re-implement feature
code (that is 522-01..05).

## Aggregate test + gate pass

Green ALL of:
- Root `tsc -p tsconfig.json --noEmit` (covers `tests/`, not just `core/`) AND
  `bun --cwd core lint:types` (per the typecheck-scope memory: `bun --cwd core
  lint:types` covers `core/` only — the root `tsc` is required so a test excess-prop
  error surfaces).
- Vitest lane (where ALL new 522 tests live): page model round-trips
  (`tests/vitest/pages/page-document-v2.test.ts` — new-block-type + style-field
  round-trips, reject-unknown, Ajv `additionalProperties:false`), SSR-shape renders
  (`tests/vitest/pages/page-renderer-v2.test.tsx` — customSvg case, block-frame
  composition attrs, section surface/canvas, marquee, page-root emit), the descriptor
  suite (`tests/vitest/pages/page-editor-control-registry.test.ts`), the SVG
  sanitizer unit suite (`tests/vitest/pages/svg-sanitizer.test.ts`, XSS vectors), the
  composition-CSS/resolver suite (`tests/vitest/pages/page-composition-effects.test.ts`),
  and the runtime IIFE suite (extending the ACTUAL landed 521 runtime test
  `tests/vitest/pages/pageEffectsRuntime.test.ts` — camelCase; the kebab
  `page-effects-runtime.test.ts` does NOT exist — with the block-tilt
  binding). New 522 tests are Vitest, NOT Bun — `tests/unit/pages/` stays reserved for
  Bun DB/service integration + the Ajv `validation.test.ts`; no new 522 file lands
  there.
- Bun lane: `bun test` re-runs the PRE-EXISTING Bun suites (no new 522 file there) —
  confirm they stay green; re-run named files if the full glob shows spurious timeout
  flakes.
- `gates:coderso` (lint, security scans) — the sanitizer + runtime must clear semgrep
  (no `eval`/`new Function` in SHIPPED source; the test `new Function()` to exercise
  the IIFE lives only in test files).

## Docs to update (522-06 owns these)

- **`_docs/PAGE_MODEL.md`** — the `customSvg` block + its props; the new
  `PageBlockStyleV2` fields (decoration/tilt/tiltGlare/layer/surfacePreset/hoverEffect/
  marquee/composition) + `PageSectionStyleV2.surfacePreset`/`composition`;
  present-only / reject-unknown / reduced-motion contract; the SVG sanitizer allowlist
  + tripwires (security).
- **`_docs/WIDGETS.md`** — the composable-hero toolkit (custom-SVG block, decoration,
  block tilt, layered canvas, glass/glow + hover presets, ticker) as page-block
  building blocks (no dependency), and that it composes a hero like the reference
  wow-site.
- **`_docs/DESIGN_TOKENS.md`** — the effect enums/clamps, the composition CSS custom
  properties (`--deco-delay`/`--deco-duration`/`--layer-*`/`--draw-speed`/
  `--marquee-speed`/glare), and the `prefers-reduced-motion` guarantee.

## Playwright smoke (owner mandate: ≥5 real-flow scenarios PER AREA)

Per the smoke-five-scenarios memory, ≥5 distinct real-flow scenarios per area
(custom-SVG block, decoration, tilt, layered canvas, glass/glow + hover, ticker),
light + dark, 0 console errors, screenshots to `_docs/_workflows/_smoke/`, on the
live admin + real front. Cover: deep nesting (effects on nested/columned/layered
blocks), override/reset cycles (set→clear returns to byte-identity),
every-control-visible-effect, cross-device (desktop/tablet/mobile), publish→front
parity, AND reduced-motion emulation (animations off, static surfaces still present).
**Compare side-by-side to the reference wow-site hero** (`_docs/projekty-domow-wow-site/`
running at `localhost:5180`/served) — the acceptance bar is composing a hero that
matches the reference's floating badges + tilt card + glass/glow + drawn SVG. Assert
the parent Acceptance Criteria as computed styles / DOM state, not checklist ticks.

## Closure record

- Closure changelog number = then-current next-free (grep `_docs/_CHANGELOG/`
  highest+1). As of authoring highest on disk is 1233 (519=1232/520=1233; 521
  pending); 522 lands AFTER 519/520/521 and takes the then-next-free. Do NOT edit
  `_CHANGELOG/*` or `_TASKS/README.md`; PIN the resolved number in the closure note
  text only.
- Record residual follow-ups (e.g. richer SVG upload/asset pipeline, additional
  decoration variants, per-child layer drag-authoring, more surface presets) as
  explicit OPEN items — do not silently drop scope.

## Definition of done

All gates green; PAGE_MODEL / WIDGETS / DESIGN_TOKENS updated; ≥5-per-area Playwright
smoke passes light + dark with 0 console errors measured side-by-side vs the
reference; parent Acceptance Criteria verified LIVE; closure documented under the
then-current next-free changelog.
</content>
