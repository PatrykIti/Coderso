# TASK-291: Timeline Widget Playwright Product Followups

# FileName: TASK-291_Timeline_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256-01, TASK-256-04, TASK-299
**Status:** Done (2026-05-22)

---

## Overview

Create the Timeline-specific follow-up backlog from
`_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`.

TASK-256 owns shared widget-contract mechanisms found across many reports.
TASK-291 owns only the Timeline widget work that belongs to the current widget
owners:

- `core/widgets/core/timeline.tsx`;
- `core/admin/ui/widgets/editors/TimelineEditors.tsx`;
- `tests/vitest/widgets/timeline.test.tsx`;
- `tests/vitest/ui/timeline-editor-wave.test.tsx`;
- Timeline widget docs and report evidence.

This family must not hide shared widget-platform repairs inside a Timeline-only
patch. If a fix requires a shared editor patch helper, shared ARIA helper,
global color-contrast validator, or generic clear/none-token behavior, the
shared mechanism lands through TASK-256 first and TASK-291 consumes it only for
Timeline.

## Closure Outcome

- TASK-291 is now closed for all Timeline-local runtime, editor, test, report,
  and widget-doc work.
- Shared contrast guidance is consumed through exact owner `TASK-299`.
- `W4` remains an explicit Timeline-local deferral: per-step label placement
  was rejected because only the global `layout.labelPosition` contract stays
  deterministic across the supported layouts.
- `W8` remains an explicit no-code/static decision: Timeline does not persist a
  motion schema or runtime animation classes in this family.

## Scope Boundary

TASK-291 implements report rows that are specific to `timeline` data, rendering,
editor affordances, or product surface.

TASK-291 explicitly excludes these shared mechanisms:

- NEW Visual editor race condition root cause: TASK-256-01 owns the shared
  atomic block update path in `VisualPanel`, `WizardPanel`, `AdvancedPanel`, and
  `WidgetEditorProps`. TASK-291 may only add Timeline-specific mode payload
  normalization after that shared path exists.
- Shared ARIA policy: TASK-256-04 owns reusable accessibility rules only.
  TASK-291-03 owns Timeline's concrete renderer labels, `aria-current`, hidden
  emoji icons, and list/section names.
- Broad cross-widget accessibility buckets must route Timeline-specific report
  rows into TASK-291 instead of implementing the same Timeline editor or
  renderer changes inside TASK-256-06-03.
- W7 color-contrast validation: routed to `TASK-299`, which owns the reusable
  shared contrast-guidance contract already consumed by Timeline color
  controls. TASK-291 records Timeline-specific proof in TASK-291-07, but must
  not invent a one-off contrast checker or close W7 through a generic
  TASK-256/TASK-256-08 reference.

## Report Classification Matrix

| Report rows | Owner | TASK-291 action |
|---|---|---|
| NEW Visual mode race | TASK-256-01 | Shared atomic update lands in TASK-256-01; TASK-291-07 records Timeline-specific proof after the shared fix exists but does not implement the shared editor contract. |
| C1, C2, C3, C4, U7 | TASK-291-01 | Make Wizard edit the full normalized step set, add Wizard status authoring, icon, accent, and intentional remove UX, and warn on hidden title output. |
| U1, U2, U3, U4, U5, U8, U9, W2 | TASK-291-02 | Add visual mode cards, mode-change messaging, date input validation/picker decisions, no-status/default-upcoming Visual UX, field guidance, grouped marker controls, spacing help, and drag reorder while preserving button fallback. |
| C5, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10 | TASK-291-03 | Repair Timeline renderer output: mobile dates, responsive chronology/milestone layouts, section/list/step ARIA, emoji hiding, connector sizing, card line semantics, and short-timeline density. |
| W3, W4, W6, W10, U6 | TASK-291-04 | Add Timeline-owned marker/accent model: inherited accent, per-step label position, numbered markers, icon-in-marker rendering, safe whole-step links, and icon color/background controls. |
| W1, W5, W9, W11, W12 | TASK-291-05 | Add Timeline-owned typography weight, padding/max-width/min-height tokens, horizontal chronology/milestone composition, and optional section header fields. |
| W8 | TASK-291-06 | Add or explicitly defer Timeline-local motion presets with reduced-motion safety and no shared runtime-script invention. |
| Report refresh, widget docs, board/changelog closure | TASK-291-07 | Refresh report evidence, widget docs, changelog, board, and validation once implementation leaves land. |
| W7 | TASK-299 | Excluded from TASK-291 implementation; record Timeline-specific adoption and closure proof through the exact shared contrast owner. |

## Source Report Ledger

| Finding | Owner | Closure rule |
|---|---|---|
| NEW | TASK-256-01 | Shared atomic update must be fixed by TASK-256-01; TASK-291-07 records Timeline-specific proof only after that owner lands. |
| C1 | TASK-291-01 | Wizard renders and edits every normalized step from 3 to 8. |
| C2 | TASK-291-01 | Wizard can set and preserve step status without forcing `upcoming`; Visual no-status/default-upcoming UX is U5 in TASK-291-02. |
| C3 | TASK-291-01 | Wizard can remove a chosen step with min-count guard and recoverable/confirmed UX. |
| C4 | TASK-291-01 | Wizard exposes beginner-safe icon and accent controls. |
| C5 | TASK-291-03 | Horizontal milestone connectors size from layout/available gap instead of fixed `4rem`. |
| W1 | TASK-291-05 | Add bounded title font-weight tokens with defaults and renderer tests. |
| W2 | TASK-291-02 | Add drag reorder only with accessible keyboard/button fallback preserved. |
| W3 | TASK-291-04 | Add global accent fallback plus per-step override clarity. |
| W4 | TASK-291-04 | Add per-step label-position override only if renderer remains deterministic. |
| W5 | TASK-291-05 | Add bounded padding/margin or section spacing tokens instead of raw classes. |
| W6 | TASK-291-04 | Add numbered marker mode without breaking existing dot markers. |
| W7 | TASK-299 | Do not implement contrast validation in TASK-291; close this row through the exact shared contrast owner plus Timeline-specific proof. |
| W8 | TASK-291-06 | Add CSS-safe motion presets or explicitly keep Timeline static with a no-code decision; any shared runtime-motion need must name an exact future task before closure. |
| W9 | TASK-291-05 | Add bounded max-width tokens; no raw class string fields. |
| W10 | TASK-291-04 | Add optional whole-step link through `normalizeWidgetSafeHref()`. |
| W11 | TASK-291-05 | Add a truthful horizontal dated milestone/chronology composition or defer with exact rationale. |
| W12 | TASK-291-05 | Add optional Timeline header title/description fields. |
| U1 | TASK-291-02 | Add visual mode preview cards/icons instead of a mode-only dropdown. |
| U2 | TASK-291-02 | Explain mode-to-variant effects after TASK-256-01 makes updates atomic. |
| U3 | TASK-291-02 | Add date picker or strict date-format feedback without destroying `dateLabel`. |
| U4 | TASK-291-02 | Add helper text for raw fields such as icon/accent/date. |
| U5 | TASK-291-02 | Add explicit no-status option to Visual status controls and ensure `undefined` omits status badges instead of silently defaulting to `upcoming`. |
| U6 | TASK-291-04 | Support icon-in-marker plus marker/icon color controls. |
| U7 | TASK-291-01 | Warn when `titleSize: none` hides titles. |
| U8 | TASK-291-02 | Group per-step marker/accent controls so dense timelines stay scannable. |
| U9 | TASK-291-02 | Add spacing token help text/tooltips. |
| R1 | TASK-291-03 | Alternating layout must keep dates visible on mobile. |
| R2 | TASK-291-03 | Chronology date column must avoid fixed-width overflow. |
| R3 | TASK-291-03 | Horizontal milestones must have responsive behavior better than uncontrolled wrap. |
| R4 | TASK-291-03 | Current step renders `aria-current="step"` on the step container. |
| R5 | TASK-291-03 | Timeline step list has an accessible name. |
| R6 | TASK-291-03 | Timeline section has an accessible name or labelled heading. |
| R7 | TASK-291-03 | Decorative emoji/icon output is hidden from assistive tech unless explicitly labelled. |
| R8 | TASK-291-03 | Duplicate of C5; close with connector proof. |
| R9 | TASK-291-03 | `lineStyle` affects axis/guide semantics, not card borders. |
| R10 | TASK-291-03 | Short timelines render with bounded minimum height/density. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/timeline.tsx` | `tests/vitest/widgets/timeline.test.tsx`, `tests/vitest/widgets/renderer.test.tsx` | Add schema/default/SSR assertions for new fields, ARIA, responsive layout markers, safe links, motion classes, and backward compatibility. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/TimelineEditors.tsx` | `tests/vitest/ui/timeline-editor-wave.test.tsx`, `tests/vitest/pageBuilder/visualPanel.test.tsx` | Add editor-flow tests for all-step Wizard editing, no-status selection, mode previews, date feedback, reorder fallback, grouped controls, and hidden-title warnings. |
| Shared atomic mode contract | TASK-256-01 owners | `tests/vitest/pageBuilder/visualPanel.test.tsx`, `tests/vitest/pageBuilder/wizardPanel.test.tsx`, `tests/vitest/pageBuilder/advancedPanel.test.tsx` | TASK-291 runs Timeline editor proof only after the shared helper/API lands. |
| Shared contrast validation | TASK-299 shared owner | Shared UI/contrast tests plus Timeline-specific editor proof | TASK-291 does not add one-off contrast validation and TASK-291-07 closes W7 only through exact TASK-299 evidence. |
| Widget docs and source report | `_docs/_WIDGETS/TIMELINE.md`, `_docs/_WIDGETS/README.md`, `_docs/WIDGETS.md`, `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` | docs diff checks | Update fixed/deferred status and final usage contract after each implementation wave; remove stale "bez dat" summaries where Timeline dates are already part of the live model. |

## Sub-Tasks

- [x] TASK-291-01: Timeline Wizard Step Authoring and Status UX
- [x] TASK-291-02: Timeline Editor Mode Preview Date Guidance and Reorder UX
- [x] TASK-291-03: Timeline Renderer Accessibility Axis and Responsive Correctness
- [x] TASK-291-04: Timeline Marker Accent Numbering and Step Link Model
- [x] TASK-291-05: Timeline Layout Typography Header and Container Controls
- [x] TASK-291-06: Timeline Motion Presets and Reduced-Motion Policy
- [x] TASK-291-07: Timeline Report Docs Changelog and Closure

## Implementation Order

1. Complete or consume TASK-256-01 before relying on atomic mode/variant updates.
2. Complete TASK-291-03 renderer correctness before adding new renderer-facing
   product controls.
3. Complete TASK-291-01 and TASK-291-02 before marker/layout expansions so the
   editor can expose new fields without hidden state.
4. Complete TASK-291-04 before TASK-291-05 when marker/link fields affect
   layout density or header composition.
5. Complete TASK-291-06 after the base renderer is stable.
6. Complete TASK-291-07 last with report evidence, docs, changelog, board sync,
   and final validation.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Worktree note: `_docs/_TASKS/README.md` is a shared hotspot while multiple
  agents are creating task families. Re-read it immediately before patching and
  add only TASK-291 rows/stat changes.
- Stage only selected TASK-291 files plus required Timeline docs, report,
  changelog, and task-board rows.
- Verify `git diff --cached --name-only` before every commit so adjacent widget
  families do not enter this scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted widget field must be added to
  `timelineSchema`, normalized in `normalizeTimelineData()`, and covered by
  validator tests.
- Anti-abuse: optional CTA/whole-step links must use
  `normalizeWidgetSafeHref()` before render; no raw HTML, script, privileged
  token, unbounded class-name, or user-authored JavaScript field may be
  introduced.
- Secret handling: no secrets in widget data, diagnostics, Playwright evidence,
  DOM attributes, or browser storage.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when SSR
    renderer output changes
  - `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` only
    as dependency proof after TASK-256-01 changes shared VisualPanel ownership
  - `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if
    TASK-291-04 changes safe-link behavior
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    when a leaf touches existing `none`/clear-adjacent style fields
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` plus targeted release-gate suites when a leaf
    changes accessibility, public runtime output, or release-gated behavior
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed, deferred, or
  routed status for every TASK-291 report row.
- Update `_docs/_WIDGETS/TIMELINE.md` when data, editor, runtime, or
  user-facing behavior changes.
- Update `_docs/_WIDGETS/README.md` and `_docs/WIDGETS.md` when their Timeline
  summaries still describe the widget as date-free; broader shared widget
  contract changes remain outside TASK-291.
- Update `_docs/ARCHITECTURE.md` when its widget inventory still describes
  Timeline as date-free.
- Update `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md`
  only if pack readiness/completeness changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-291-07 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every finding in `REPORT_TIMELINE_WIDGET.md` is either implemented by a
  TASK-291 leaf, routed to an exact physical owner task (for example
  `TASK-256-01` or `TASK-299`), or explicitly deferred with a reason in
  TASK-291-07.
- Timeline schema, defaults, normalizer, renderer, editors, tests, and docs stay
  synchronized for every new product field.
- TASK-291 leaves do not weaken or duplicate shared TASK-256 contracts.
- Admin preview and frontend rendering have textual Playwright evidence after
  implementation closure.
