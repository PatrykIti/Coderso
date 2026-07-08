# TASK-521-06: Tests, Docs & Closure

# FileName: TASK-521-06-Tests-Docs-Closure.md

**Parent Task:** TASK-521
**Priority:** High
**Category:** Tests / Docs / Closure
**Estimated Effort:** Medium
**Status:** ✅ Done
**Depends on:** TASK-521-01..05 (all landed).

---

## Scope

Cross-cutting hardening + documentation + closure. Own the aggregate test pass,
the model/design docs, and the closure record. Does NOT re-implement feature code
(that is 521-01..05). Sole writer of the docs listed below + the closure changelog
entry text.

## Aggregate test + gate pass

Run and green ALL of:
- Root `tsc -p tsconfig.json --noEmit` (covers `tests/`, not just `core/`) AND
  `bun --cwd core lint:types` (per the typecheck-scope memory).
- Vitest lane (where ALL new 521 tests live): the page model round-trips
  (`tests/vitest/pages/page-document-v2.test.ts`), the `renderToString` SSR-shape
  render suites (`tests/vitest/pages/page-renderer-v2.test.tsx`), the descriptor
  suite (`tests/vitest/pages/page-editor-control-registry.test.ts`), the hero
  suites (`tests/vitest/widgets/hero*.test.tsx`), the admin panel
  (`tests/vitest/admin/*`), and the jsdom behavioral suites
  (`tests/vitest/content/*`). The new 521 model/SSR/runtime tests are Vitest, NOT
  Bun — `tests/unit/pages/` is reserved for Bun DB/service integration + the Ajv
  `validation.test.ts`, and no new 521 test is authored there.
- Bun lane: `bun test` re-runs the PRE-EXISTING Bun suites (no new 521 file lands
  there) — confirm they stay green; re-run named files if the full glob shows
  spurious timeout flakes. The Ajv `validation.test.ts` round-trip of the new icon
  block / section-style / settings.effects keys is asserted in its Vitest home
  (`tests/vitest/pages/page-document-v2.test.ts`, `ajv.compile`).
- `gates:coderso` (lint, security scans) — the effect runtimes must clear semgrep
  (no `eval`/`new Function` in the SHIPPED source; the tests' `new Function()` to
  exercise the IIFE lives in test files only).

## Docs to update (521-06 owns these)

- **`_docs/PAGE_MODEL.md`** — document `PageSectionStyleV2.scrollEffect`/
  `parallaxIntensity`, `PageDocumentSettingsV2.effects` (`PageEffectsV2`), and the
  `icon` block's new props (`animation`/`size`/`color`/`speed`) + present-only /
  reject-unknown / reduced-motion contract.
- **`_docs/WIDGETS.md`** — the `hero.style.tilt` option and the animated `icon`
  block (curated inline-SVG + CSS-keyframes set, no dependency).
- **`_docs/DESIGN_TOKENS.md`** — the effect enums/clamps, the `--spotlight-*` /
  `--anim-speed` custom properties, and the `prefers-reduced-motion` guarantee.
- If the `icon` block's capability flip changes any widget-pack/coverage doc,
  reconcile it (the block is a PAGE block, not a composite widget — likely no
  `modulePackMatrix` change; verify).

## Playwright smoke (owner mandate: ≥5 real-flow scenarios PER AREA)

Per the smoke-five-scenarios memory, run ≥5 distinct real-flow scenarios per area
(section effects, animated icon, hero tilt, per-page spotlight + compact panel),
light + dark, 0 console errors, screenshots to `_docs/_workflows/_smoke/`, on the
live admin (`coderso-dev-core-host`, `http://coderso-a.localhost:5173/admin/`) +
real front (`:3000`). Cover: deep nesting (effects on nested/columned sections),
override/reset cycles (set→clear each effect returns to byte-identity),
every-control-visible-effect (each control produces a measurable computed-style /
attribute change), cross-device (desktop/tablet/mobile), publish→front parity, AND
the reduced-motion emulation path (all motion off, content visible). Assert the
Acceptance Criteria of the parent (§ Acceptance) as computed styles / DOM state.

## Closure record

- Closure changelog number is assigned at closure as the then-current next-free.
  RESOLVED at closure to **1234**
  (`_docs/_CHANGELOG/1234-2026-07-08-task-521-page-motion-effects.md`) — 519=1232
  and 520=1233 landed first (1229–1231 reserved for 511/517/518).
- Record the residual follow-ups (e.g. configurable scroll threshold, additional
  curated icons/animations, section-effect on nested blocks) as explicit OPEN
  items — do not silently drop scope.

## Definition of done

All gates green; PAGE_MODEL / WIDGETS / DESIGN_TOKENS updated; ≥5-per-area
Playwright smoke passes light + dark with 0 console errors; parent Acceptance
Criteria verified LIVE; closure documented under changelog 1234.
