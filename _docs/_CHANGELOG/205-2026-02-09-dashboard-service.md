# 205-2026-02-09 - Dashboard service

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-099-01, TASK-099

## Summary
- Added backend dashboard aggregate service with typed payload and tests, replacing mock-only data foundation.

## Key Changes
- Core/Services:
  - Added `core/services/dashboard/dashboardTypes.ts` with `DashboardPayload` contract.
  - Added `core/services/dashboard/dashboardService.ts` for:
    - totals aggregation (`pages`, `content_entries`, `media`, `users`),
    - merged `recentEdits` list (page/entry/media),
    - storage summary (`usedBytes`, optional limit/percent),
    - security summary checks (`csrf`, `rateLimit`, `headers`, `sessionPolicy`).
- Tests:
  - Added `tests/unit/dashboard/dashboardService.test.ts` with:
    - deterministic unit checks for storage/security heuristics,
    - DB-seeded aggregate test for merge/sort/mapping behavior.
- Docs/Tasks:
  - Marked `TASK-099-01` as done.
  - Moved `TASK-099` to in-progress with `099-02/099-03` pending.
  - Updated `CMS_SPEC` and `ARCHITECTURE` with dashboard aggregate notes.
