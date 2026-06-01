# 1050 - TASK-360 Admin UI cross-cutting remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-360, TASK-360-01, TASK-360-02, TASK-360-03, TASK-360-04, TASK-360-05, TASK-360-06, TASK-360-07

## Key Changes

### Planning / QA

- Added the cross-cutting remediation family for shared Admin UI defects from
  the summary audit report.
- Captured shared contracts for current-user permission snapshots, confirm
  dialogs, export dialog behavior, no-op control gates, drawer accessibility
  gates, server-side query/pagination conventions, and final evidence closure.
- Linked the shared work to TASK-355 through TASK-359 so area tasks can adopt
  common patterns instead of one-off fixes.
- Split the family into physical execution leaf files:
  `TASK-360-01` through `TASK-360-07`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: added shared
  `downloadAdminExport` helper ownership, explicit `xlsx` no-op prevention,
  canonical rate-limit bucket names, stable locator requirements, and final QA
  evidence ownership for Settings cleanup.
- Follow-up drift pass changed shared export helper examples to JSON export or
  async-job responses unless router `Response` passthrough is implemented, and
  expanded drawer accessibility coverage to Audit and Access Logs detail
  drawers.

### Implementation

- Completed `TASK-360-01` permission snapshot contract: `/auth/me` now returns
  redacted effective permissions and safe role labels, admin client code
  normalizes the snapshot, `AdminAuthProvider` exposes shared `can(permission)`,
  sidebar/route guards consume the helper, and permission-denied API failures
  trigger auth snapshot refresh.
- Completed `TASK-360-02` shared confirm action pattern with backward-compatible
  props, action objects, typed confirmation, internal pending/error handling,
  and focus return.
- Completed `TASK-360-03` shared export dialog contract: enabled submit now
  requires `onExport`, unsupported surfaces show unavailable copy, Excel is no
  longer offered as an active no-op, and `downloadAdminExport()` covers JSON
  file/job export responses under canonical admin API paths.
- Completed `TASK-360-05` drawer and sheet accessibility gate: mobile user
  details, Audit details, Access Log details, IP Allowlist, Webhooks, Email
  Logs, and Integration drawers now bind Radix title/description semantics, and
  future drawer tests can reuse the shared no-warning assertion helper.

## Validation

- `bun test tests/unit/auth/rbac.test.ts tests/integration/routes/auth.test.ts`
- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts tests/vitest/admin/authClient.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/shared-dialog-contracts.test.tsx tests/vitest/ui/dialogs.test.tsx tests/vitest/admin/adminExportClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/audit-details.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui-integration/integrations.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`.
