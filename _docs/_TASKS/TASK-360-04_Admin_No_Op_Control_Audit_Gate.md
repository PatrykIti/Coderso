# TASK-360-04: Admin No-Op Control Audit Gate
# FileName: TASK-360-04_Admin_No_Op_Control_Audit_Gate.md

**Priority:** High
**Category:** Admin UI + QA Gates + UX Truthfulness
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** To Do

---

## Overview

Create a repeatable Admin UI gate so active-looking controls from the audit
reports cannot silently remain or regress into no-op behavior.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- Users, Audit Logs, Access Logs, and Settings report files under
  `_docs/PLAYWRIGHT/31-05-2026-admin/`
- `core/admin/ui/**`
- Existing admin UI Vitest/Playwright harness owners

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Admin UI test helper/module | Add explicit control expectation model for known report-driven controls. |
| Targeted UI tests | Assert each fixed/deferred control has handler, disabled state, or hidden state. |
| Release-gate docs/scripts if promoted | Update `scripts/coderso-release-gates.ts`, workflow files, and `_docs/CODERSO_RELEASE_GATES.md` if this becomes a gate. |
| Contributor docs | Document no active controls without real handler or unavailable state. |

## Implementation Pseudocode

```ts
type ControlExpectation =
  | { name: string; expected: "has-handler" }
  | { name: string; expected: "disabled"; reasonPattern: RegExp }
  | { name: string; expected: "hidden" };
```

Data flow:

- Each area task registers report-driven control expectations in targeted tests.
- Tests exercise controls through the rendered UI rather than brittle global DOM
  scanning.
- Controls intentionally not implemented must assert disabled/hidden/unavailable
  state with user-facing copy.
- Gate becomes part of the relevant admin UI command only after it is stable.

Error handling:

- Tests should fail with the control name and owning task/report row.
- Icon-only controls require accessible names or stable test ids.
- Controls with async handlers must prove visible success/error or route change,
  not just a click event.
- Radix Selects and icon-only controls from the audited surfaces require stable
  accessible names and/or test ids before the gate can be considered closed.

## Security Contract

- Endpoint visibility: none; QA/testing/docs task.
- Auth/RBAC/CSRF/rate-limit: unchanged, but adopting controls must keep their
  route-level security contracts.
- Reject unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: test fixtures and failure output must not print secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest/Playwright tests for known controls:
  Users reset/filter/notifications, Access Logs revoke/session/sliders, Audit
  actions/export, Storage Test Connection, Email Export Logs, General
  logo/favicon/timezone, Site Performance, Sessions link-buttons, Login Alerts
  placeholders.
- If promoted to release gate, run `bun run gates:coderso` and update gate docs.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gate-owned
- Admin contributor docs/no-op policy
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Every known no-op control has a test expectation.
- Intentional unavailable controls are disabled/hidden with explicit copy.
- Audited icon-only controls and Radix Select triggers have stable names or test
  ids for regression automation.
- New active no-op regressions are caught by targeted tests or documented gate.
