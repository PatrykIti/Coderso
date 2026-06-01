# TASK-351-04: Backups QA, Docs, and Closure
# FileName: TASK-351-04_Backups_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Backups + DB Tests + Playwright + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-351-01, TASK-351-02, TASK-351-03
**Status:** To Do

---

## Overview

Close the Backups family after include options, lifecycle/artifacts, and table
UX are proven in the current tree.

## Sub-Tasks

- Run DB-backed backup service and route tests with env loaded.
- Run Playwright through schedule update/restore, manual create, status
  progression, download/restore/delete state, and pagination.
- Verify audit logs for create/restore/delete do not include secrets.
- Update reports, task board, and changelog with final evidence.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_BACKUPS.md` | Add dated resolution notes and evidence. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Update Backups classification. |
| `docs/guide/screens/` | Update Backups guide for include/artifact/queue semantics. |
| `_docs/_TASKS/TASK-351_Backups_Tools_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows at closure. |
| `_docs/_CHANGELOG/*` | Add final implementation changelog. |

## Implementation Pseudocode

```text
1. Load repo env with `set -a && source .env && set +a`.
2. Verify DATABASE_URL connectivity before DB tests.
3. Create a uniquely scoped manual backup through the UI.
4. Capture include payload, row state, status transition, artifact metadata, and action availability.
5. Exercise download/restore/delete only against the created backup.
6. Restore schedule settings changed during the test.
7. Update reports and closure docs.
```

Data flow:

- Playwright uses admin UI.
- Route/API checks verify row state and cleanup only for created backup IDs.

Error handling:

- If DB is unavailable, pause DB/runtime tests and record the blocker; do not
  claim closure.
- If backup execution is intentionally external, prove the UI exposes that
  external-worker boundary.

Regression-test shape:

- Unit/service lifecycle tests.
- Route validation/RBAC tests.
- UI interaction tests.
- Playwright integrated proof.

## Security Contract

No additional route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented by code
  leaves.
- Test artifacts must be cleaned up without truncating shared backup tables.
- Reports must not include artifact contents or secret values.

## Testing Requirements

- All tests required by TASK-351-01 through TASK-351-03.
- `set -a && source .env && set +a` before DB-backed commands when `.env`
  exists.
- Focused Playwright Backups pass.
- `git diff --check`
- `bun run precommit` or configured commit hook.

## Documentation Updates Required

- Backups report and overview report.
- Backups user guide if visible behavior changes.
- Task board and changelog indexes.

## Acceptance Criteria

- Backups report has no unclassified findings.
- Queue/artifact/action behavior is proven or explicitly documented as external.
- DB fixtures and artifacts from validation are cleaned up safely.
