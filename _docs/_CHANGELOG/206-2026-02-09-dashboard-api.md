# 206-2026-02-09 - Dashboard API

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-099-02, TASK-099

## Summary
- Added dashboard API endpoint and route wiring for admin runtime data consumption.

## Key Changes
- Core/API:
  - Added `core/server/routes/dashboardRoutes.ts` with `GET /dashboard`.
  - Endpoint uses `content:read` permission guard.
  - Endpoint returns aggregated payload from `getDashboardData()`.
- Core/Server:
  - Registered dashboard routes in `core/server/routes/index.ts`.
- Tests:
  - Added `tests/integration/routes/dashboard.test.ts` to validate route registration (`GET /dashboard`).
- Docs/Tasks:
  - Updated `CMS_API.md` with Dashboard endpoint contract and sample response.
  - Marked `TASK-099-02` as done and updated board counters/statuses.
