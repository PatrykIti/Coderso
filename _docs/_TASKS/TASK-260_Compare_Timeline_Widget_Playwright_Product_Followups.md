# TASK-260: Compare Timeline Widget Playwright Product Followups

# FileName: TASK-260_Compare_Timeline_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256-07
**Status:** To Do

---

## Overview

Create the Compare Timeline-specific follow-up backlog from
`_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md`.

TASK-256 owns shared widget-contract drift from Playwright reports. TASK-260
owns only the Compare Timeline product/runtime/editor work that belongs to the
current widget owners:

- `core/widgets/core/compareTimeline.tsx`;
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`;
- `tests/vitest/widgets/compareTimeline.test.tsx`;
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`;
- Compare Timeline docs and report evidence.

This family must not hide generic widget-contract repairs inside a
Compare Timeline patch. If a leaf needs a shared editor helper, global
`Clear`/`none` rule, shared color-contrast validator, or reusable ARIA/runtime
contract, split that work back to TASK-256 or a new shared-contract task first.

## Scope Boundary

TASK-260 implements report rows that are specific to `compare-timeline` data,
rendering, editor affordances, or product surface.

TASK-260 explicitly excludes these shared-contract rows unless TASK-256-08
later assigns them to an exact physical follow-up task:

- U4 `none` token semantics: TASK-256-02 owns `none` vs hidden/default behavior.
- U5 missing `Clear` controls for `trackLabelColor`, `stepLabelColor`, and
  `mutedStepColor`: TASK-256-02 owns shared clearable color behavior. A
  Compare Timeline implementation may only consume the shared helper after it
  lands.
- U10 duplicated Visual/Advanced layout controls: TASK-256-08 must create or
  assign an exact future physical shared-mode task before this row is closed.
  TASK-260 must not move shared layout-token ownership between modes.
- W7 color-contrast validation: TASK-256-08 must classify it into an exact
  shared/future physical owner. TASK-260 does not implement contrast validation
  or advisory warnings.
- W8 scroll-triggered motion: deferred from TASK-260 unless a later product
  task approves a runtime script contract. TASK-260-04 may add only static,
  SSR-safe visual polish.

## Report Classification Matrix

| Report rows | Owner | TASK-260 action |
|---|---|---|
| R1, R6/W11, R7, R8, R9 plus Compare Timeline-local R2-R5 semantics | TASK-260-01 | Repair renderer truthfulness, responsive grids, guide visibility, segment/track semantics, compatibility fallback, min-height, and overflow in `compareTimeline.tsx` without creating shared runtime helpers. |
| C1, C2, C3, W1, U2, U3, U6, U7, U8 | TASK-260-02 | Expand segment/highlight editing for both tracks, add explicit both-track highlight support, Wizard onboarding, preserved hidden-segment messaging, range validation feedback, marker-empty feedback, and friendly target-track labels. |
| C4, C5, W6, W10, W12 | TASK-260-03 | Improve axis step editing and step content controls: Visual add/remove buttons, step descriptions, step-count expansion to a bounded `3-10` range, optional plain-text step icons, and optional safe step/segment links through the existing widget safe-href owner. |
| W2, W3, W4, W5, W9, W13, W14, U1, U9 | TASK-260-04 | Add Compare Timeline-owned layout, heading, typography, track order, track background, marker-shape, variant preview, and spacing help. W7 and W8 stay outside TASK-260. |
| Source report refresh, widget docs, task-board/changelog closure | TASK-260-05 | Record fixed/deferred evidence after implementation leaves land. |
| U4 | TASK-256-02 | Excluded from TASK-260. Shared `none` token semantics decide whether size token `none` hides output or means default sizing. |
| U5 | TASK-256-02 | Excluded from TASK-260. Shared clearable color behavior must cover `trackLabelColor`, `stepLabelColor`, and `mutedStepColor` before Compare Timeline consumes it. |
| U10 | TASK-256-08 future physical task | Excluded from TASK-260 until TASK-256-08 assigns an exact shared-mode/mode-ownership task for duplicated Visual/Advanced layout controls. |
| W7 | TASK-256-08 future physical task | Excluded from TASK-260 until a shared or explicit future contrast-validation contract exists. |
| W8 | Future runtime-motion product task through TASK-256-08 | Excluded from TASK-260 because scroll-triggered reveal needs a broader runtime script/motion contract. |

## Source Report Ledger

| Finding | Owner | Closure rule |
|---|---|---|
| C1 | TASK-260-02 | Edit segments on both tracks in highlight mode and keep rendering tied to the chosen highlight targets. |
| C2 | TASK-260-02 | Preserve segment data in `dual-track` and show explicit hidden-until-highlight copy. |
| C3 | TASK-260-02 | Add beginner-safe Wizard segment setup when highlight mode is enabled. |
| C4 | TASK-260-03 | Add Visual `Add step` and `Remove step` controls with min/max disabled states. |
| C5 | TASK-260-03 | Add Wizard/Visual step description controls. |
| W1 | TASK-260-02 | Add backward-compatible both-track highlight support through `highlight.targetTrackIds`. |
| W2 | TASK-260-04 | Add Compare Timeline-owned label font-weight tokens. |
| W3 | TASK-260-04 | Add bounded section padding tokens. |
| W4 | TASK-260-04 | Add bounded max-width tokens. |
| W5 | TASK-260-04 | Add optional section heading/subtitle fields. |
| W6 | TASK-260-03 | Expand the step count from `3-6` to bounded `3-10`. |
| W7 | TASK-256-08 future physical task | Do not implement in TASK-260. |
| W8 | Future runtime-motion product task through TASK-256-08 | Do not implement in TASK-260. |
| W9 | TASK-260-04 | Add render-order controls without rewriting canonical track IDs. |
| W10 | TASK-260-03 | Add optional step/segment links only through `normalizeWidgetSafeHref()`. |
| W11 | TASK-260-01 | Duplicate evidence for R6; close with the same color fallback proof. |
| W12 | TASK-260-03 | Add bounded plain-text step icons. |
| W13 | TASK-260-04 | Add bounded track background token support. |
| W14 | TASK-260-04 | Add bounded marker shape token support. |
| U1 | TASK-260-04 | Add visual variant preview cards. |
| U2 | TASK-260-02 | Add non-destructive variant-switch copy for preserved segments. |
| U3 | TASK-260-02 | Add immediate `from > to` feedback before normalization. |
| U4 | TASK-256-02 | Do not implement in TASK-260. |
| U5 | TASK-256-02 | Do not implement in TASK-260; includes `trackLabelColor`, `stepLabelColor`, and `mutedStepColor`. |
| U6 | TASK-260-02 | Add fallback-label help for unlabeled segments. |
| U7 | TASK-260-02 | Warn when a track has no active markers. |
| U8 | TASK-260-02 | Display Advanced target track labels with stable IDs. |
| U9 | TASK-260-04 | Add spacing token help text/tooltips. |
| U10 | TASK-256-08 future physical task | Do not implement in TASK-260. |
| R1 | TASK-260-01 | Fix step-count-aware desktop grids while preserving mobile single-column output. |
| R2 | TASK-260-01 | Add static section labeling through `aria-label` or `aria-labelledby`. |
| R3 | TASK-260-01 | Add static track row semantics and readable labels. |
| R4 | TASK-260-01 | Add static marker state labels; do not use `aria-pressed` or `aria-selected` unless markers become controls. |
| R5 | TASK-260-01 | Add readable segment labels. |
| R6 | TASK-260-01 | Add fallback before the `color-mix()` enhancement. |
| R7 | TASK-260-01 | Add min-height for empty/minimal track rows. |
| R8 | TASK-260-01 | Make `guides.enabled=false` remove guide borders. |
| R9 | TASK-260-01 | Add overflow-safe track/segment rendering. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/compareTimeline.tsx` | `tests/vitest/widgets/compareTimeline.test.tsx`, `tests/vitest/widgets/renderer.test.tsx` | Add runtime SSR assertions for grid classes/styles, guide off-state, ARIA labels, schema changes, fallback style, layout fields, and backward compatibility. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`, `tests/vitest/pageBuilder/visualPanel.test.tsx` | Add editor-flow tests for both-track segments, Wizard segment controls, Visual add/remove step buttons, description fields, friendly Advanced labels, and new product controls. |
| Shared clear/none/mode contract adjacency | TASK-256 physical leaves | `tests/vitest/widgets/styleNoneTokens.test.tsx`, shared editor tests | Do not duplicate in TASK-260. Run only when a Compare Timeline leaf touches existing shared fields after the shared contract lands. |
| Safe step/segment links if TASK-260-03 implements W10 | `core/widgets/core/widgetSafeHref.ts`, `core/widgets/core/compareTimeline.tsx`, `CompareTimelineEditors.tsx` | `tests/vitest/widgets/compareTimeline.test.tsx`, editor wave tests | Reuse `normalizeWidgetSafeHref`; do not add a Compare Timeline-only URL sanitizer. |
| Widget docs and source report | `_docs/_WIDGETS/COMPARE_TIMELINE.md`, `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` | docs diff checks | Update fixed/deferred status and final usage contract after each implementation wave. |

## Sub-Tasks

- [ ] TASK-260-01: Compare Timeline Renderer Truthfulness and Accessibility
- [ ] TASK-260-02: Compare Timeline Segment Editing and Highlight Model
- [ ] TASK-260-03: Compare Timeline Axis Steps and Content Controls
- [ ] TASK-260-04: Compare Timeline Layout Typography and Visual Polish
- [ ] TASK-260-05: Compare Timeline Report Docs and Closure

## Implementation Order

1. Complete TASK-256-07 classification first so shared-contract rows stay out of
   this family.
2. Complete TASK-260-01 before editor expansion when renderer behavior affects
   what controls can truthfully claim.
3. Complete TASK-260-02 before axis/content expansion if segment controls need
   final track/highlight semantics.
4. Complete TASK-260-03 before broad layout polish because new step content may
   affect responsive rendering and editor density.
5. Complete TASK-260-04 after functional controls land.
6. Complete TASK-260-05 last with report evidence, docs, changelog, board sync,
   and final validation.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Worktree note: `_docs/_TASKS/README.md` is a shared hotspot while multiple
  agents are creating task families. Re-read it immediately before patching and
  add only the TASK-260 rows/stat change.
- Stage only selected TASK-260 files plus required Compare Timeline docs,
  report, changelog, and task-board rows.
- Verify `git diff --cached --name-only` before every commit so TASK-257,
  TASK-258, TASK-256, or unrelated Playwright work does not enter this scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted widget field must be added to
  `compareTimelineSchema`, normalized in `normalizeCompareTimelineData()`, and
  covered by validator tests.
- Anti-abuse: optional CTA/link fields must use `normalizeWidgetSafeHref()` in
  `core/widgets/core/widgetSafeHref.ts` before render; no raw HTML, script,
  privileged token, or unbounded class-name field may be introduced.
- Secret handling: no secrets in widget data, diagnostics, Playwright evidence,
  DOM attributes, or browser storage.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when SSR
    renderer output changes
  - `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` when
    VisualPanel/editor ownership behavior changes
  - `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if
    TASK-260-03 changes the shared safe-href helper contract
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    when a leaf touches existing clear/none-adjacent style fields
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` plus targeted release-gate suites when a leaf
    changes accessibility, public runtime output, or release-gated behavior
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` with fixed,
  deferred, or routed status for every TASK-260 report row.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` when data, editor, runtime, or
  user-facing behavior changes.
- Update `_docs/WIDGETS.md` only if a source-of-truth widget contract changes;
  Compare Timeline-only field additions belong in the widget doc.
- Update `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md`
  only if pack readiness/completeness changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-260-05 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every finding in `REPORT_COMPARE_TIMELINE_WIDGET.md` is either implemented by
  a TASK-260 leaf, routed to an exact TASK-256 physical owner or future
  physical task, or explicitly deferred with a reason in TASK-260-05.
- Compare Timeline schema, defaults, normalizer, renderer, editors, tests, and
  docs stay synchronized for every new product field.
- TASK-260 leaves do not weaken or duplicate shared TASK-256 contracts.
- Admin preview and frontend rendering have textual Playwright evidence after
  implementation closure.
