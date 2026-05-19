# 868-2026-05-19 - TASK-271 Grid Columns widget follow-ups

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-271, TASK-271-01, TASK-271-02, TASK-271-03, TASK-271-04, TASK-271-05, TASK-271-06, TASK-271-07, TASK-313

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
  instead of duplicating phantom configs, and live count controls no longer
  create new slot/config drift when real repeatable slots already exist.

### Admin UI and QA

- Grid Columns Visual and Advanced editors now expose truthful layout
  miniatures, column-count guidance, per-column behavior controls, and focused
  guidance back to the shared Structure owner when slot instances already exist.
- Added focused runtime, editor-wave, and page-builder coverage for responsive
  spans, per-column overrides, repeatable-slot sync, and the adapter/count
  regressions found during the audit passes.

### Documentation

- Rewrote the Grid Columns Playwright report into a closure matrix that maps
  every finding to TASK-256, TASK-271, TASK-313, a current-state note, or an
  explicit rejection.
- Synchronized `_docs/_WIDGETS/GRID_COLUMNS.md`, the `TASK-271` family docs,
  the task board, and this changelog to the final owner map.

## Validation

- `git diff --check` - passed
- `bun run lint` - passed
- `bun run test:vitest` - passed
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx` - passed
- `bun run scan:security:strict` - passed
- `bun run precommit` - passed
- `bun run gates:coderso` - passed
- `bun run test:bun` - executed, but still fails in unrelated assistant DB coverage outside Grid Columns scope:
  `tests/unit/assistant/actionExecutorService.db.test.ts`
