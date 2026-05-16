# TASK-271: Grid Columns Widget Playwright Product Followups

# FileName: TASK-271_Grid_Columns_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Grid Columns + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-05-01, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Grid Columns follow-up family for
`_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.

This family owns only product and UX improvements that are local to
`grid-columns`. Shared widget-contract repairs stay in TASK-256, especially
the TASK-256-05-01 structural leaf that already owns Grid Columns contract drift.
Do not use TASK-271 to duplicate slot/config synchronization, public placeholder
gating, CSS-variable picker semantics, asymmetric/masonry truthfulness, or
span-sum validation that TASK-256 already captured.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/gridColumns.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `tests/vitest/widgets/gridColumns.test.tsx`
- `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/tmp/grid-columns/README.md`
- `_docs/_WIDGETS/tmp/grid-columns/MATRIX.md`
- `_docs/WIDGETS.md`
- `_docs/TESTING_STRATEGY.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-271 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| C1 slot/config desync and manual synchronization | `REPORT_GRID_COLUMNS_WIDGET.md:63,150-160,217` | TASK-256-03, TASK-256-05-01 | Shared repeatable-slot/config contract. |
| C2 CSS-variable color picker fallback | `REPORT_GRID_COLUMNS_WIDGET.md:64,132,218` | TASK-256-05-01 | Shared token-aware color control contract when existing controls accept `var(...)`. |
| C4/C5/U4 span preview, sum validation, and current-sum indicator | `REPORT_GRID_COLUMNS_WIDGET.md:66-67,91,224-225` | TASK-256-05-01 | Shared truthful-control and invalid-layout feedback for existing span controls. |
| U3 Advanced cardize controls visible when inactive | `REPORT_GRID_COLUMNS_WIDGET.md:90,166-171,227` | TASK-256-05-01 | Shared mode ownership and inactive-control truthfulness. |
| U6 masonry-lite forces cardize while switch stays off | `REPORT_GRID_COLUMNS_WIDGET.md:93,121-133,216` | TASK-256-05-01 | Existing control/renderer truthfulness. |
| U7/P1 public column labels | `REPORT_GRID_COLUMNS_WIDGET.md:94,190,214,250` | TASK-256-03, TASK-256-05-01 | Public runtime must not leak editor metadata. |
| P2 public `Empty column.` placeholder | `REPORT_GRID_COLUMNS_WIDGET.md:104,191,215` | TASK-256-03, TASK-256-05-01 | Public placeholder safety. |
| P3 overflow caused by invalid span sums | `REPORT_GRID_COLUMNS_WIDGET.md:105` | TASK-256-05-01 first, TASK-271-03 only if residual product guard remains | Validation/preview is shared; optional overflow containment is local only if still needed after TASK-256. |
| Asymmetric variant has no effect with explicit spans | `REPORT_GRID_COLUMNS_WIDGET.md:121,124,246` | TASK-256-05-01 | Existing variant control truthfulness. |

TASK-271 may depend on the TASK-256 result, but it must not restage those repairs
inside its own implementation leaves.

## TASK-271 Scope Matrix

| Report finding | TASK-271 owner | Notes |
|---|---|---|
| C3 Wizard labels only columns 1 and 2 | TASK-271-01 | Grid Columns editor onboarding and all-column Wizard coverage. |
| U1 gap labels lack scale context | TASK-271-06 | Editor copy and expanded spacing tokens. |
| U2 variant cards have no visual miniatures | TASK-271-01 | Grid Columns Visual selector affordance. |
| U5 `Column configs` label is misleading | TASK-271-01 | Rename to user-facing column count/config copy after TASK-256 sync lands. |
| U8 predefined layout templates | TASK-271-01 | Grid Columns-local span preset application. |
| W7 drag-and-drop reorder columns | TASK-271-02 | Local repeated-column management, with keyboard move fallback. |
| W3 reverse on mobile | TASK-271-03 | Responsive product behavior for column order. |
| W4 per-column visibility | TASK-271-03 | Hide/show per breakpoint with safe runtime output. |
| W6 XL/2XL breakpoint support | TASK-271-03 | Optional schema/render expansion for wide monitors. |
| P3 overflow containment after span validation | TASK-271-03 | Only if TASK-256 leaves a legitimate residual guardrail. |
| W1 per-column style overrides | TASK-271-04 | Column surface overrides layered on existing cardized wrapper semantics. |
| W9 overflow control per column | TASK-271-04 | Local style behavior for cardized/media-heavy columns. |
| W2 min-height controls and P4 mobile empty space | TASK-271-05 | Height tokens and mobile-safe compact behavior. |
| W5 per-column vertical alignment | TASK-271-05 | Column-level alignment override, not global `layout.align` replacement. |
| W10 limited gap tokens | TASK-271-06 | Add missing bounded spacing tokens; current code already has separate `gapX`/`gapY`. |
| W8 custom CSS class per column | TASK-271-07 | Do not add raw arbitrary class strings in this family; closure must either reject it or route it to a future safe-class policy task. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-271-07 | Final documentation and evidence pass. |

## Sub-Tasks

- [ ] TASK-271-01: Grid Columns Wizard, Presets, and Editor Guidance
- [ ] TASK-271-02: Grid Columns Reorder and Column Management
- [ ] TASK-271-03: Grid Columns Responsive Order, Visibility, and Wide Breakpoints
- [ ] TASK-271-04: Grid Columns Per-Column Surface and Overflow
- [ ] TASK-271-05: Grid Columns Height and Cross-Axis Alignment
- [ ] TASK-271-06: Grid Columns Gap Tokens and Density Controls
- [ ] TASK-271-07: Grid Columns Report, Docs, Changelog, and Closure

## Implementation Order

1. Rebase over or complete TASK-256-05-01 first. TASK-271 leaves must build on
   its resolved slot/config, placeholder, picker, variant, and span-validation
   contracts.
2. Complete TASK-271-01 first because Wizard copy, presets, and variant
   previews define the editor entry path used by later schema fields.
3. Complete TASK-271-02 before adding per-column style/responsive fields so
   reorder tests cover the final repeated-column data shape.
4. Complete TASK-271-03 before surface/height styling if visibility or wide
   breakpoint fields affect runtime class generation.
5. Complete TASK-271-04, TASK-271-05, and TASK-271-06 in sequence. They all touch
   `gridColumns.tsx`, `GridColumnsEditors.tsx`, and the same test files.
6. Complete TASK-271-07 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-271*` files, Grid Columns owner files, Grid Columns tests,
  Grid Columns docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-271 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Grid Columns schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: do not add raw HTML, raw script, arbitrary unbounded class strings,
  or browser-stored secrets to column data.
- Secret handling: no secrets in widget data, diagnostics, browser cache, or
  Playwright reports.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, slot rendering, or shared renderer context changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing, padding, clear, or token semantics change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if widget registry/default
  wiring changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Grid Columns pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Grid Columns report finding is either owned by TASK-256, covered by a
  TASK-271 physical leaf, or explicitly rejected/deferred by TASK-271-07 with a
  reason.
- TASK-271 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `grid-columns`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
