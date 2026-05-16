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
later records them as Compare Timeline-only follow-up scope:

- U5 clear controls for style color fields: TASK-256-02 owns shared clear
  behavior. A TASK-260 leaf may add a Compare Timeline field only after the
  shared clear contract exists, and only through the existing clear helper.
- U4 `none` token semantics: TASK-256-02 owns `none` vs hidden/default behavior.
- U10 duplicated Visual/Advanced layout controls: TASK-256-01/TASK-256-05 own
  mode ownership and duplicated control classification.
- Any shared color-contrast validation primitive: do not create a
  Compare Timeline-only global color picker rule.

## Report Classification Matrix

| Report rows | Owner | TASK-260 action |
|---|---|---|
| R1, R6, R7, R8, R9 plus Compare Timeline-local R2-R5 semantics | TASK-260-01 | Repair renderer truthfulness, responsive grids, guide visibility, segment/track semantics, compatibility fallback, min-height, and overflow in `compareTimeline.tsx` without creating shared runtime helpers. |
| C1, C2, C3, W1, U2, U3, U6, U7, U8 | TASK-260-02 | Expand segment/highlight editing for both tracks, Wizard onboarding, preserved hidden-segment messaging, range validation feedback, marker-empty feedback, and friendly target-track labels. |
| C4, C5, W6, W10, W12 | TASK-260-03 | Improve axis step editing and step content controls: Visual add/remove buttons, step descriptions, bounded step-count expansion, optional step icons, and optional safe links. |
| W2, W3, W4, W5, W8, W9, W13, W14, U1, U9 plus W7 only if it stays widget-local | TASK-260-04 | Add Compare Timeline-owned layout, heading, typography, motion, track order, track background, marker-shape, variant preview, spacing help, and local contrast warning polish. |
| Source report refresh, widget docs, task-board/changelog closure | TASK-260-05 | Record fixed/deferred evidence after implementation leaves land. |
| U4, U5, U10 and any global editor/color/a11y helper | TASK-256 | Excluded from TASK-260 unless TASK-256-08 reclassifies a row as Compare Timeline-only future scope. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/compareTimeline.tsx` | `tests/vitest/widgets/compareTimeline.test.tsx`, `tests/vitest/widgets/renderer.test.tsx` | Add runtime SSR assertions for grid classes/styles, guide off-state, ARIA labels, schema changes, fallback style, layout fields, and backward compatibility. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`, `tests/vitest/pageBuilder/visualPanel.test.tsx` | Add editor-flow tests for both-track segments, Wizard segment controls, Visual add/remove step buttons, description fields, friendly Advanced labels, and new product controls. |
| Shared clear/none/mode contract adjacency | TASK-256 physical leaves | `tests/vitest/widgets/styleNoneTokens.test.tsx`, shared editor tests | Do not duplicate in TASK-260. Run only when a Compare Timeline leaf touches existing shared fields after the shared contract lands. |
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
- Anti-abuse: optional CTA/link fields must use the existing safe-href owner
  before render; no raw HTML, script, privileged token, or unbounded class-name
  field may be introduced.
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
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness/completeness
  changes.
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
  a TASK-260 leaf, routed to TASK-256 shared-contract scope, or explicitly
  deferred with a reason in TASK-260-05.
- Compare Timeline schema, defaults, normalizer, renderer, editors, tests, and
  docs stay synchronized for every new product field.
- TASK-260 leaves do not weaken or duplicate shared TASK-256 contracts.
- Admin preview and frontend rendering have textual Playwright evidence after
  implementation closure.
