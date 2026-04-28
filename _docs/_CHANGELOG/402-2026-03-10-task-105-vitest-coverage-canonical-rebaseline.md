# 402. TASK-105 Vitest Coverage Canonical Rebaseline

**Date:** 2026-03-10  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Coverage Workflow
- Added `scripts/run-vitest-coverage.ts` as the canonical full-lane Vitest coverage runner.
- Switched `test:coverage` to the new runner so the repo now always writes the authoritative full-lane summary to `coverage/vitest/coverage-summary.json`.
- Updated testing docs to point at the canonical summary path instead of relying on ad-hoc report directories.

### Coverage Rebaseline
- Previous “authoritative” comparisons were reading a stale `/tmp/nextless-vitest-cov/coverage-summary.json` artifact.
- Fresh canonical full-lane snapshot from `coverage/vitest/coverage-summary.json` is now:
  - `60.75%` statements
  - `51.40%` branches
  - `65.24%` functions
  - `63.65%` lines
- Corrected widget-editor aggregate from the canonical full-lane run:
  - `core/admin/ui/widgets/editors/*` -> `99.17%` lines / `77.13%` branches across `40` tracked files

### Remaining Focus
- The real low-line widget-editor backlog is now much smaller than the stale `/tmp` artifact suggested.
- Current visible widget-editor hotspots are `EntryTeaserEditors`, `FooterEditors`, `PricingPlansEditors`, `TeamEditors`, `StatsKpiEditors`, `NavigationEditors`, `DividerEditors`, and `LogoCloudEditors`.
