# TASK-539: Page V2 Post-Audit Remediation II

# FileName: TASK-539_Page_V2_Post_Audit_Remediation_II.md

**Priority:** High
**Category:** Pages / Builder / Public Render / Responsive CSS / Runtime / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-521–535, TASK-538, TASK-540; collision dependencies TASK-478/TASK-481
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at implementation closure)

---

## Overview

TASK-535 remains closed. This new family owns only residuals revealed by the
later repository/runtime audit: dead responsive controls, shallow nested layer
merging, strict-gallery gaps, unsafe/invalid CSS grammar edges, transform
clobbering, incomplete render hooks/geometry, and page-runtime initialization
that misses a later footer document.

All model additions/corrections are JSONB-only and schema version 2 remains
unchanged. No endpoint, DDL, dependency, or new product primitive is introduced.
Optional fields remain present-only; no-effect and no-override documents keep
their normalized JSON and rendered bytes unchanged unless the task explicitly
repairs an already-authored broken value.

## Shared contracts fixed by this family

- `mergePageBlockLayerPresentKeys` performs present-key deep merge for only the
  nested `layer` record and is the one owner used by preview and public CSS.
- Gallery writes accept only the canonical strict item shape; stored legacy
  aliases use a deterministic read adapter.
- `parseAuthoringCssBackgroundPaint` returns separate gradient image layers and
  an optional final color. Every consumer uses the same parse result.
- Unitless grid lengths accept only zero; nonzero values require an allowlisted
  CSS unit.
- The renderer uses one present-only transform host with independently owned
  `--cx-*` channels for reveal, decoration, hover, tilt, and magnetic; layer
  anchoring remains on the independent `translate` property.
- A shared global initializer rescans the supplied root/document on every emitted
  script and uses per-element ownership (`WeakSet` or equivalent); it deduplicates
  listeners without blocking later footer discovery.

## Security Contract

- **Routes:** no new route. Existing Page admin writes/previews stay internal,
  session/API-key authenticated, RBAC- and CSRF-protected, and strict at the
  PageDocumentV2 boundary. Public Page rendering remains read-only.
- **CSS/markup:** grid/background/color/category values use positive allowlists
  at write and render. Responsive raw `<style>` emission revalidates the same
  parsed value and never interpolates an unvalidated author string.
- **Runtime:** emitted scripts are static literals, use no `eval`, `Function`, or
  user-data `innerHTML`, and preserve reduced-motion/pointer gates.
- **Anti-abuse:** no public write is added; nonce/captcha do not apply.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-539-01 | Page model, schema, and normalization | TASK-539-01-L01, L02 | ⏳ To Do |
| TASK-539-02 | Grid and background sanitizer corrections | TASK-539-02-L01, L02 | ⏳ To Do |
| TASK-539-03 | Gallery controls, gating, and responsive canvas | TASK-539-03-L01..L04 | ⏳ To Do |
| TASK-539-04 | Independent transform channels | TASK-539-04-L01, L02 | ⏳ To Do |
| TASK-539-05 | Renderer behavior and geometry corrections | TASK-539-05-L01, L02 | ⏳ To Do |
| TASK-539-06 | Responsive CSS parity | TASK-539-06-L01, L02 | ⏳ To Do |
| TASK-539-07 | Per-root idempotent effects runtime | TASK-539-07-L01, L02 | ⏳ To Do |
| TASK-539-08 | Tests, docs, smoke, and closure | TASK-539-08-L01 | ⏳ To Do |

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| H-05 magnetic hook missing; H-06 footer not initialized | 539-04/L01 + 539-05/L01 + 539-07/L01 | rendered-document selector test and main+footer real interaction |
| H-07 responsive custom font/transform; H-08 spans | 539-06/L01 | emitted media CSS and computed desktop/mobile styles/geometry |
| H-09 gallery authoring; M-18 loose item schema | 539-01/L01 + 539-03/L01..L04 + 539-05/L01 | strict round-trip/reject and author→filter flow |
| M-06 shallow `layer` merge; M-11 z clamp | 539-01/L01 + 539-03/L01 + 539-06/L01 | base+partial device merge and 0..20 UI/model parity |
| M-07/M-08 transform collisions | 539-04/L01 + 539-05/L01 | combined reveal+hover+tilt+magnetic+layer computed transforms |
| M-09 marquee; M-10 glow pointer events | 539-04/L01 + 539-05/L01 | single rail geometry and click-through |
| M-12 shrink-to-fit; M-17 timeline endpoint | 539-05/L01 | bounding-box geometry assertions |
| M-13 responsive full-bleed paint; M-14 color as image | 539-02/L01 + 539-05/L01 + 539-06/L01 | split paint and 100vw breakpoint geometry |
| M-15 divider no-op; M-16 unitless grid | 539-01/L01 + 539-02/L01 + 539-03/L01 + 539-05/L01 | stale-prop cleanup, gating/render effect, and sanitizer corpus |
| L-01 false cursor residue; L-02 orphan parallax intensity | 539-01/L01 + 539-03/L01 | byte identity and visibility/normalization tests |
| II-M-01 Page fixed rail clearance | 539-03/L03 + L04 | 320/390/480 px usable canvas geometry |

## Single-writer order and collision guards

Land strictly `539-01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`. Each leaf owns
its declared source files; 539-05 is the sole `pageRendererV2.tsx` writer and
539-06 the sole `pageResponsiveCss.ts` writer. Consumer helper names must match
the owning model/sanitizer/composition leaf exactly.

TASK-539 does not run in-place while TASK-478 or TASK-481 is active. Forbidden
foreign paths are copied exactly into every implementation dispatch from those
tasks' current ownership lists. Use an isolated worktree or land after both,
rebase/read the current files, and rerun the contract audit. TASK-539 fixes its
narrow canvas locally in `PageEditor.tsx` and must not edit TASK-540's
`CanvasEditor.tsx`, `ScreenAuthoringCanvas.tsx`, or Custom Screen paths.
TASK-542 overlaps site-shell behavior/tests; 539 lands first and the streams never
run in parallel.

## Testing Requirements

- Every source leaf updates or creates the behavior tests needed by its own targeted
  gate before running that gate. Later proof leaves add cross-contract/property cases;
  they must not defer or re-baseline a source-owner expectation.
- `bun --cwd core lint:types` and `bun --cwd core lint` after every source leaf.
- Targeted Page model/sanitizer/composition/renderer/responsive/runtime/control/UI
  Vitest suites; targeted Bun page/site-shell runtime suites where real runtime
  behavior is involved.
- Registered `tests/integration/routes/pages.test.ts` coverage for canonical gallery
  round-trip, nested reject-unknown 400/no-persistence, and error mapping.
- About five independent post-audit lenses and the exact changed tests again.
- At least nine real Playwright flows: deep gallery/filter, magnetic/reduced
  motion, main+footer runtime, all transform effects combined, device typography+
  spans, responsive full-bleed/background, marquee geometry, glow/timeline
  click-through/geometry, and narrow Page editor.
  Assert computed styles, geometry, DOM/ARIA state, light/dark, and zero console
  errors.

## Documentation Updates Required

Update `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md`, relevant Page developer/
user docs and control documentation. At closure create changelog 1251 and close
all descendants without reopening TASK-535.
