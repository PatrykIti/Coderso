# TASK-354-05: Cross Tools QA, Docs, and Closure
# FileName: TASK-354-05_Cross_Tools_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Admin Tools + QA + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-354-01, TASK-354-02, TASK-354-03, TASK-354-04
**Status:** To Do

---

## Overview

Close the cross-tools family after the shared standards, seed-admin fix, and
Playwright/report guard are proven.

## Sub-Tasks

- Reconcile statuses of TASK-348 through TASK-353 and confirm no finding is
  hidden under TASK-354.
- Run or inspect the final Tools matrix output.
- Verify seed-admin pepper behavior in targeted tests.
- Update overview and Claude UX reports with final resolution notes.
- Update board and changelog indexes.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md` | Mark cross-tools UX and seed-admin findings resolved or explicitly residual. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Add final cross-family status matrix. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/README.md` | Add runbook/matrix pointer if added. |
| `_docs/_TASKS/TASK-354_Cross_Tools_UX_and_Bootstrap_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows at closure. |
| `_docs/_CHANGELOG/*` | Add final implementation changelog. |

## Implementation Pseudocode

```text
1. Build a requirement list from overview + Claude UX report.
2. For each requirement, map to TASK-348..TASK-354 closure evidence.
3. Run final Tools Playwright matrix or inspect fresh evidence artifact.
4. Run seed-admin pepper tests.
5. Update reports with exact pass/residual classification.
6. Sync task board and changelog.
```

Data flow:

- Reports provide requirement source.
- Per-family task closures provide implementation evidence.
- Matrix output provides browser-level proof.

Error handling:

- Do not close TASK-354 if any per-tool finding lacks owner/evidence.
- If a per-tool family intentionally defers scope, document the follow-up task
  and rationale.

Regression-test shape:

- Report matrix validator.
- Seed-admin pepper test.
- Final Playwright Tools pass.

## Security Contract

No additional route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented by code
  leaves.
- Reports must not expose credentials, cookies, backup artifacts, import bundle
  secrets, or pepper values.

## Testing Requirements

- All tests required by TASK-354-01 through TASK-354-04.
- Final focused Tools Playwright matrix pass.
- `git diff --check`
- `bun run precommit` or configured commit hook.

## Documentation Updates Required

- Claude UX review report.
- Tools overview report.
- Tools Playwright README/runbook.
- Task board and changelog indexes.

## Acceptance Criteria

- Cross-tools report findings are all mapped to closed evidence or explicit
  residual tasks.
- Seed-admin pepper behavior is fixed and tested.
- The final Tools audit matrix is current.
