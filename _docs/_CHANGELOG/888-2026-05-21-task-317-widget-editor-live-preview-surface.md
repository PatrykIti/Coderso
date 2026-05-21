# 888. TASK-317 widget editor live preview surface

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-317

## Key Changes

### Shared builder preview surface

- `BlockSettings` now renders a shared read-only live preview row for the
  selected widget through the real `WidgetRenderer` contract in
  `editor-preview` mode.
- The shared surface can merge transient `previewState.dataPatch` data into the
  rendered preview block without mutating saved widget JSON by itself.

### Tests and docs

- Added focused page-builder proof for the `BlockSettings -> WidgetRenderer`
  seam so live preview is covered at the shared owner layer instead of by
  widget-local mock shells.
- Updated preview spec, Navigation report routing, task board, and TASK-317
  closeout notes so the old shared live-preview gap no longer points to an open
  follow-up.

## Validation

- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
