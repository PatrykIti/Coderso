# 1223 - TASK-480 Dashboard Widgets & Configurable Panels

Date: 2026-07-05
Version: Unreleased
Tasks: TASK-480, TASK-480-01, TASK-480-01-L01, TASK-480-01-L02, TASK-480-02, TASK-480-02-L01, TASK-480-02-L02, TASK-480-02-L03, TASK-480-03, TASK-480-03-L01, TASK-480-03-L02, TASK-480-03-L03, TASK-480-03-L04, TASK-480-03-L05, TASK-480-04, TASK-480-04-L01, TASK-480-04-L02, TASK-480-04-L03, TASK-480-05, TASK-480-05-L01, TASK-480-05-L02, TASK-480-05-L03, TASK-480-06, TASK-480-06-L01, TASK-480-06-L02

## Key Changes

- Added admin Dashboard-owned `DashboardLayout` v1 and widget data contracts for 9 panel types, with strict reject-unknown normalization and a 24-widget limit.
- Added `dashboard_layouts` per-user storage via migration `0066_dashboard_layouts` (`created_at`, `updated_at`, `updated_by`, JSONB layout).
- Added internal admin routes for layout read/save/reset and saved/draft widget-data batches; writes require `dashboard:write` and CSRF, reads use `content:read`.
- Reused TASK-483 traffic aggregates for traffic counters/timeline widgets; no fake traffic fallback is emitted.
- Added cached admin client wrappers, cacheBus invalidation for saved layout/widget data, and uncached draft preview POST support.
- Rebuilt `/admin` Dashboard around a configurable panel builder with add/configure/move/resize/save/reset flows, including a non-modal configuration side panel so stale sheet overlays cannot block edit controls.
- Dispatched widgets through a typed **exhaustive renderer registry** (`DASHBOARD_WIDGET_RENDERERS` mapped over `DashboardWidgetType`; a missing type is a compile error) plus a matching `DASHBOARD_WIDGET_CATALOG`, replacing the earlier runtime `switch`.
- Made the configure panel **schema-driven**: each widget type publishes `configFields` descriptors that a generic `<WidgetConfigForm>` renders into controls, writing every change back through `normalizeDashboardWidgetConfig` (reject-unknown preserved) — no hand-written per-kind control branches.
- Added **pointer drag-and-drop** arrange (drag grip → `moveWidget`) and resize (corner handle → `resizeWidget`) via pure clamped helpers in `dashboardLayoutArrange.ts`, keeping the keyboard-operable toolbar nudges as the a11y baseline.
- Updated docs for API, data model, RBAC, cache, and dashboard widget behavior.

## Validation

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun test tests/integration/routes/dashboard.test.ts tests/security/codersoSecurityGate.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgetContract.test.ts tests/vitest/services/dashboardDataSources.test.ts tests/vitest/services/dashboardWidgetData.test.ts tests/vitest/admin/dashboardClient.test.ts tests/vitest/admin/permissionsCatalog.test.ts tests/vitest/ui/role-permission-risk.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx tests/vitest/admin/dashboardWidgetRegistry.test.ts tests/vitest/admin/dashboardLayoutArrange.test.ts tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx tests/vitest/ui-integration/dashboard-widget-host-dnd.test.tsx tests/vitest/ui-integration/dashboard-widget-config-form.test.tsx tests/vitest/ui-integration/dashboard-builder.test.tsx`
- `bun run db:migrate`
- `bun run gates:coderso`
- `bun run scan:security` (container image scan skipped because `SECURITY_SCAN_IMAGE` was not set; advisory local scanners passed)
- `playwright-cli -s=wf480smoke-r12 run-code --filename .tmp/task-480-smoke-code.js` via `.tmp/task-480-smoke-runner.ts`
  - Scenarios passed: desktop light load, add/configure, resize/reorder, save/reload mobile dark parity, reset, read-only permission boundary.
  - Console errors: 0 after filtering expected unauthenticated pre-login `/auth/me` checks.
  - Screenshots: `_docs/_workflows/_smoke/task-480-01-desktop-light-load.png`, `_docs/_workflows/_smoke/task-480-02-add-configure.png`, `_docs/_workflows/_smoke/task-480-03-resize-reorder.png`, `_docs/_workflows/_smoke/task-480-04-mobile-dark-saved.png`, `_docs/_workflows/_smoke/task-480-05-reset.png`, `_docs/_workflows/_smoke/task-480-06-readonly.png`.

## Notes

- Dashboard widgets are admin Dashboard-only and remain out of Page Builder,
  Widget Library, and `core/widgets/*`.
- Read-only audit findings corrected the stale migration index (`0066`, not
  `0064`), AJV route validation shape, lazy DB imports for Vitest-safe pure
  modules, cache validators, draft-preview client behavior, and low-risk
  `dashboard:write` catalog placement.
