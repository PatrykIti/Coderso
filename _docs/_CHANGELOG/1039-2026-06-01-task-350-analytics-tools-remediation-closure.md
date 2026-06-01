# 1039 - TASK-350 Analytics tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-350, TASK-350-01, TASK-350-02, TASK-350-03

## Key Changes

### Analytics

- Made Top Content range-scoped across the admin client, route, and service so
  the table, drawer, and export agree with the selected Analytics range.
- Added strict internal admin CSV export at
  `GET /analytics/top-content/export`, including `limit`, `rangeDays`, `type`,
  and `format=csv` validation.
- Wired the drawer Export button to a real CSV Blob download with loading,
  error, and no-rows-disabled states instead of closing the drawer.
- Added CSV escaping and formula-cell guarding for exported Top Content rows.
- Reworked KPI display semantics so empty workspaces show `-` and `No data
  yet`, quiet ranges show `No activity in range`, and new activity from a zero
  baseline shows `New`.
- Updated Top Content empty states to tell users to publish content or widen the
  date range, and cleared stale metrics/rows during failed range reloads.

## Validation

- `bun test tests/integration/routes/analytics.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/analytics/analyticsService.test.ts`
- `bun run test:vitest -- tests/vitest/admin/analyticsClient.test.ts tests/vitest/ui/analytics.test.tsx tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused browser proof for `/admin/analytics`: empty no-data labels, temporary
  published page fixture across all visible ranges, drawer CSV export containing
  the fixture row, and zero browser console/page errors. Temporary browser,
  auth, role, session, and page fixtures were removed after the pass.
