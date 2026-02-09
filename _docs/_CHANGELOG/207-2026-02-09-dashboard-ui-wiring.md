# 207-2026-02-09 - Dashboard UI wiring

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-099-03, TASK-099

## Summary
- Wired admin Dashboard UI to runtime API payload and removed hardcoded dashboard data.

## Key Changes
- Admin/UI:
  - Added `core/admin/services/dashboardClient.ts` with `getDashboardData()` (`GET /dashboard`).
  - Updated `core/admin/ui/dashboard/DashboardPage.tsx`:
    - runtime fetch flow,
    - loading/error/retry states,
    - KPI mapping from dashboard payload.
  - Updated `core/admin/ui/dashboard/RecentEditsTable.tsx` to render API `recentEdits`.
  - Updated `core/admin/ui/dashboard/SecurityStatusCard.tsx` to render API security checks/status.
  - Updated `core/admin/ui/dashboard/SiteHealthCard.tsx` to render storage + security-derived health.
- Tests:
  - Added `tests/unit/admin/dashboardClient.test.ts`.
  - Updated `tests/unit/ui/dashboard.test.tsx`.
- Docs/Tasks:
  - Marked `TASK-099-03` and parent `TASK-099` as done.
  - Updated board counters and dashboard runtime notes in docs.
