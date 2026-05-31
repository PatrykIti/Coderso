# 970 - Widget UI mode drift cleanup closure

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Closed the remaining widget editor ownership drift program after removing the
  last cross-mode Wizard/Visual overlaps that were still user-facing in normal
  editing flows.
- Synchronized widget source-of-truth docs, shared widget contract notes, task
  notes, and historical Playwright evidence with the live read-only-summary,
  setup-action, and Visual-owned authoring model now shipped in code.
- Hardened the Playwright widget-contract smoke harness so admin probes retry
  fixture opens after dirty-dialog navigation, accept already-mounted editors,
  isolate browser sessions per widget, and avoid cross-widget state
  contamination during full strict runs.
- Added targeted admin smoke evidence for the previously drifting widgets and
  finished with a green strict 38-widget full rerun:
  `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, `metadataGaps=0`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Targeted Vitest/Playwright reruns for timeline, spacer, divider, stack,
  feature-grid, testimonials, gallery-mosaic, team, navigation, footer,
  split-layout, toggle-block, and search-box
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-full-rerun-2026-05-26-final5.*`
