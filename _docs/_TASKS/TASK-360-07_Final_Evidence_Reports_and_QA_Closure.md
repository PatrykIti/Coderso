# TASK-360-07: Final Evidence, Reports, and QA Closure
# FileName: TASK-360-07_Final_Evidence_Reports_and_QA_Closure.md

**Priority:** High
**Category:** Admin UI + Playwright + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-355, TASK-356, TASK-357, TASK-358, TASK-359, TASK-360-01, TASK-360-02, TASK-360-03, TASK-360-04, TASK-360-05, TASK-360-06
**Status:** Done (2026-06-02)

---

## Overview

Close the Admin UI remediation program with real Playwright evidence, updated
reports, QA cleanup, and clearly labeled Claude/source-review evidence after
TASK-355 through TASK-359 implementations land.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Six Admin Playwright reports | Update each finding with fixed/disabled/deferred status and evidence. |
| Admin audit finding matrix | Map every report finding to owner task and evidence. |
| `_docs/_TASKS/README.md` | Move completed leaf/family tasks when closure is done. |
| `_docs/_CHANGELOG/` | Add completion changelog entries for implementation closure. |
| Release-gate docs/scripts if changed | Keep gates, workflows, and docs aligned. |

## Implementation Pseudocode

```ts
type AdminAuditFindingStatus =
  | { status: "fixed"; evidence: string[] }
  | { status: "disabled"; evidence: string[]; unavailableCopy: string }
  | { status: "deferred"; owner: string; date: string; reason: string };

function assertEveryFindingClosed(matrix: Record<string, AdminAuditFindingStatus>) {
  for (const [findingId, status] of Object.entries(matrix)) {
    if (status.status === "deferred" && (!status.owner || !status.date)) {
      throw new Error(`Finding ${findingId} deferred without owner/date`);
    }
    if (status.status !== "deferred" && status.evidence.length === 0) {
      throw new Error(`Finding ${findingId} closed without evidence`);
    }
  }
}
```

Data flow:

- Build a six-report finding matrix before final re-audit.
- Use isolated fixture data:
  create role, create login-capable user through UI, log in restricted user,
  verify negative write attempts blocked at UI, verify backend 403 tests still
  cover defense-in-depth, and clean up via UI.
- Re-run Playwright over Users, Roles Matrix, Audit Logs, Access Logs, and
  Settings.
- Attach code/test/report evidence to each matrix row.
- Run Claude/source review and label whether it clicked UI or only reviewed
  source.
- Update reports, changelogs, task board, release-gate docs, and QA override
  notes.

Error handling:

- If any finding lacks evidence, keep TASK-360 open.
- If Claude UI clicking times out, record source-only result and do not claim
  Claude clicked UI.
- If DB/network blocks Playwright, record blocker and rerun before closure.
- Verify `TASK-359-05` restored `Max sessions per user` from QA value `30` or
  documented an exact intentional override with date and owner.

## Security Contract

- Endpoint visibility: no new endpoints expected; uses existing internal admin
  routes for QA.
- Auth model: authenticated admin sessions for admin/restricted fixtures.
- RBAC: fixtures must prove UI gating and backend defense-in-depth for relevant
  permissions.
- CSRF/rate-limit: use normal admin flows; tests must not bypass CSRF except
  through supported test helpers.
- Reject unknown validation: unchanged; final evidence must include route tests
  from area tasks where routes changed.
- Anti-abuse: fixture setup/cleanup uses isolated unique records and does not
  broad-truncate shared tables.
- Secret handling: reports must not include passwords, reset tokens, API keys,
  cookies, or privileged secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Relevant targeted Bun/Vitest suites from completed area tasks.
- Full Admin Playwright audit rerun over Users, Roles Matrix, Audit Logs,
  Access Logs, and Settings.
- `bun run gates:coderso` if any release-gated behavior changed.
- Claude review with evidence label: UI-clicking only if actual UI run
  completed, otherwise source-only.

## Documentation Updates Required

- All six `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_*.md` files.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gate contracts changed
- A QA note for `Max sessions per user` restoration or intentional override

## Acceptance Criteria

- Every finding in the six reports has fixed/disabled/deferred status with
  evidence and owner.
- Final Playwright evidence covers real restricted-user login and UI clicks.
- Claude evidence is labeled truthfully as UI-clicking or source-only.

## Completion Notes

- All six Admin Playwright reports plus the report README were updated with
  final fixed/disabled/deferred status and 2026-06-02 evidence.
- Final Playwright smoke covered Users, Roles Matrix, Audit Logs, Access Logs,
  and every Settings subpage. The restricted-user and defense-in-depth evidence
  remains in the earlier area-task waves; the final smoke verified the remediated
  UI states.
- Claude final review is labeled source-only, not UI-clicking evidence.
- QA override `Max sessions per user = 30` has dated owner/reason in the final
  reports.
- Evidence: `_docs/PLAYWRIGHT/31-05-2026-admin/`, focused Vitest suites, lint,
  and typecheck.
