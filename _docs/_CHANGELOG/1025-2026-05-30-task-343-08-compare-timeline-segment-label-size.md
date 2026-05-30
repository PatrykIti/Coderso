# 1025 - TASK-343-08 Compare Timeline segment label size

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-08, TASK-343

## Key Changes

### Widgets / Runtime

- Removed the hard-coded `text-xs` fallback from Compare Timeline segment
  badge base classes so `style.segmentLabelSize` now owns the rendered text
  size.
- Kept `segmentLabelSize="none"` as no explicit size class instead of an
  accidental `text-xs` output.

### QA / Docs

- Added renderer coverage that asserts the actual segment badge class for
  `none`, `xs`, `sm`, and `base`.
- Updated Compare Timeline widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget compare-timeline --session task-343-08-compare-timeline-rerun --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-08-compare-timeline-smoke-rerun.json --output-md .tmp/task-343-08-compare-timeline-smoke-rerun.md`
- Claude review: no blockers.

The first strict smoke attempt hung in the admin probe on the known first helper
start. After restarting `coderso-dev-core-host`, the strict Compare Timeline
smoke passed with `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
`metadataGaps=0`.
