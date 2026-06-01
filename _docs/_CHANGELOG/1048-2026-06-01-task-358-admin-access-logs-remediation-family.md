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

### TASK-358-02 Session Detail and Revoke Access Contract

- Added nullable `access_logs.session_id` with SQL and Drizzle metadata
  migration artifacts, plus runtime access logging of the authenticated
  `ctx.sessionId` for future rows.
- Added deterministic access-log session state/capability resolution for
  active, current, revoked, expired, missing, failed, system, and historical
  rows.
- Gated raw session detail fields (`sessionId`, `userId`, `current`,
  `expiresAt`, `revokedAt`) behind `settings:read`; `audit:read` users receive
  only row state and unavailable copy.
- Added `POST /admin/api/access-logs/:id/revoke` with strict UUID params,
  strict body validation, `settings:write`, CSRF, `admin_write`, server-side
  target resolution from `access_logs.session_id`, self-lockout protection,
  expired/missing mapped errors, and already-revoked idempotency.
- Wired `/admin/access-logs` drawer actions to real Settings Sessions focus and
  typed revoke confirmation, including cross-user session focus through gated
  `userId`.
- Updated Settings Sessions to honor `sessionId`/`userId` query focus and mark
  the selected linked session.
- Removed the old access-log view/revoke no-op controls from the no-op audit
  gate and updated API, audit, guide, task, and Playwright report docs.

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
- `bun test tests/unit/access/accessLogService.test.ts tests/integration/routes/accessLogs.test.ts`
  passed after TASK-358-02 for session state resolution, strict revoke params,
  self-lockout, expired/missing session handling, already-revoked idempotency,
  route validation, and audit refs.
- `bun run test:vitest -- tests/vitest/admin/accessLogsClient.test.ts tests/vitest/validation/adminLogQuerySchemas.test.ts tests/vitest/ui/access-logs.test.tsx tests/vitest/ui/access-logs-table.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx`
  passed after TASK-358-02 for CSRF client behavior, strict schemas, real
  view/revoke UI flow, drawer fixtures, no-op gate updates, and related settings
  UI coverage.
- `bun --cwd core lint` passed after TASK-358-02.
- `bun --cwd core lint:types` passed after TASK-358-02.
- Playwright TASK-358-02 cross-user smoke passed with a restricted
  `audit:read` user and a `settings:read/write` user: restricted view/revoke
  stayed disabled without leaking `sessionId`, settings user opened
  `/admin/settings/security/sessions?sessionId=<id>&userId=<targetUserId>`,
  sent one `POST /admin/api/access-logs/<id>/revoke`, and saw
  `Session already revoked`. Evidence screenshot:
  `.tmp/task-358-02-session-revoke.png`.
- Agent and Claude review both flagged the same drift before implementation:
  static pagination, disabled custom range, misleading user filter, lost response
  metadata, and missing match context. The cursor error-code discrepancy was
  resolved in favor of the task/API contract `access_log_cursor_invalid`.
- Agent and Claude review for TASK-358-02 flagged cross-user session focus,
  strict revoke param validation, and audit-only session detail redaction drift;
  the final implementation threads gated `userId` to Settings Sessions, validates
  UUID params, and redacts raw session detail without `settings:read`.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`.
