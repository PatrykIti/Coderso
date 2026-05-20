# 868-2026-05-19 - TASK-271 Grid Columns widget follow-ups

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-271, TASK-271-01, TASK-271-02, TASK-271-03, TASK-271-04, TASK-271-05, TASK-271-06, TASK-271-07, TASK-325

## Summary

- Closed the Grid Columns widget-specific Playwright follow-up family with
  bounded runtime/editor expansion, synchronized docs/report evidence, and
  explicit shared-owner routing for residual truthfulness drift.

## Key Changes

### CMS Widgets

- Grid Columns now ships same-count layout presets, all-column Wizard labels,
  accessible move-button reorder, reverse-on-mobile, per-column visibility,
  optional `xl` / `2xl` spans, bounded per-column surface overrides, bounded
  overflow control, schema-owned min-height tokens, mobile min-height overrides,
  and per-column vertical alignment.
- The repeatable-slot adapter now reconciles drifted column metadata safely
  instead of duplicating phantom configs, runtime now renders all configured
  columns when no live repeatable slots exist yet, and live count controls plus
  add/remove actions no longer create new slot/config drift when real
  repeatable slots already exist.

### Admin UI and QA

- Grid Columns Visual and Advanced editors now expose truthful layout
  miniatures, column-count guidance, per-column behavior controls, truthful
  `masonry-lite` cardize locks, and focused guidance back to the shared
  Structure owner when slot instances already exist.
- Added focused runtime, editor-wave, and page-builder coverage for responsive
  spans, uncoupled overflow behavior, repeatable-slot sync, and the adapter/count
  regressions found during the audit passes.

### Documentation

- Rewrote the Grid Columns Playwright report into a closure matrix that maps
  every finding to TASK-256, TASK-271, TASK-325, a current-state note, or an
  explicit rejection.
- Synchronized `_docs/_WIDGETS/GRID_COLUMNS.md`, the `TASK-271` family docs,
  the task board, and this changelog to the final owner map.

## Validation

- `git diff --check` - passed
- `bun run lint` - passed
- `bun run test:vitest` - surfaced an unrelated early failure in `tests/vitest/ui/feature-grid-editor-wave.test.tsx`, then was stopped after the user redirected closeout to scoped validation
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx` - passed (`3` files, `37` tests)
- `bun run scan:security:strict` - passed
- `bun run precommit` - passed
- `bun run test:bun` - executed, but still fails outside Grid Columns scope with unrelated `solution kits`, `listing templates`, `detail-page/content-route`, and `assistantHouseProjectsCatalogPublicSite` failures under the shared DB workload; the user accepted scoped closeout for TASK-271
