# 1048 - TASK-358 Admin Access Logs remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-358, TASK-358-01, TASK-358-02, TASK-358-03, TASK-358-04

## Key Changes

### TASK-358-01 Access Logs Query, Filters, and Pagination

- Moved access log query normalization into the access service contract for
  strict `limit`, `q`/`query`, `status`, `userId`, `method`, `ip`, `from`,
  `to`, and `cursor` handling.
- Extended `GET /admin/api/access-logs` to accept strict method/IP/cursor
  query params, map malformed cursors to `access_log_cursor_invalid`, and
  return `{ items, nextCursor }`.
- Replaced static Access Logs pagination with keyset pagination ordered by
  `createdAt DESC, id DESC`, using `limit + 1` reads and opaque cursors.
- Reworked `/admin/access-logs` filters so search, status, exact `User ID`,
  presets, custom `from`/`to` dates, and cursor state all feed the server query.
- Added non-destructive custom range validation and expired-cursor recovery so
  the last successful rows remain visible.
- Added search match labels such as `Matched user email` to explain hidden-field
  matches without exposing additional raw PII.
- Removed the `access-custom-range` and `access-next-page` no-op controls from
  the no-op audit gate; the advanced filters/sliders surface remains owned by
  `TASK-358-04`.
- Updated Access Logs API/spec/user docs and the clickable Playwright report
  with the new query, cursor, and match-context behavior.

### Planning / QA

- Added the report-driven remediation family for the Admin Access Logs audit.
- Captured execution-ready scope for real session detail/revoke behavior,
  truthful user/custom-date/advanced filters, server-side pagination, search
  match explanation, and export behavior.
- Recorded the security contract for internal access log reads/exports and
  session revoke actions, including RBAC separation between `audit:read` and
  high-risk revoke permissions.
- Split the family into physical execution leaf files:
  `TASK-358-01` through `TASK-358-04`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: preserved current
  `success|failed`/`userId` query vocabulary, added method/IP query ownership,
  required a real session relation before revoke/session-detail actions,
  aligned export helper paths and rate buckets, and separated query vs
  advanced-filter leaf ownership.
- Follow-up drift pass preserved current wire params `q`, `from`, and `to`,
  removed unsupported `actorRole` filtering, made revoke server-resolve the
  target session/user instead of trusting browser hints, and applied the same
  JSON export or explicit `Response` passthrough rule as Audit Logs.

## Validation

- `bun test tests/unit/access/accessLogService.test.ts tests/integration/routes/accessLogs.test.ts`
  passed for service normalization, cursor pagination, route validation, and
  error mapping.
- `bun run test:vitest -- tests/vitest/admin/accessLogsClient.test.ts tests/vitest/validation/adminLogQuerySchemas.test.ts tests/vitest/ui/access-logs.test.tsx tests/vitest/ui/access-logs-table.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
  passed for admin client query params, strict AJV schema, UI custom-range and
  cursor behavior, table page controls, and no-op gate updates.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- `bun run gates:coderso` passed functional, ux, performance, security, and
  reliability gates.
- Playwright restricted-session smoke passed with an `audit:read` user,
  verifying custom range request params, exact userId filtering, Next with
  cursor, Previous without cursor, and `Matched user email` labels. Evidence
  screenshot: `.tmp/task-358-01-access-pagination.png`.
- Agent and Claude review both flagged the same drift before implementation:
  static pagination, disabled custom range, misleading user filter, lost response
  metadata, and missing match context. The cursor error-code discrepancy was
  resolved in favor of the task/API contract `access_log_cursor_invalid`.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`.
