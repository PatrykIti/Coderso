# TASK-350-03: Analytics QA, Docs, and Closure
# FileName: TASK-350-03_Analytics_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Analytics + Playwright + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-350-01, TASK-350-02
**Status:** To Do

---

## Overview

Close the Analytics remediation family after export behavior and empty-data
semantics are proven.

## Sub-Tasks

- Re-run Analytics with an empty dataset and a published page fixture.
- Exercise every range option and verify loading does not show stale metrics as
  current.
- Exercise Top Content drawer Export and verify download or disabled state.
- Update reports, task board, and changelog with final evidence.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_ANALYTICS.md` | Add final resolution notes. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Update Analytics classification. |
| `docs/guide/screens/` | Update Analytics user guide if export/no-data semantics change. |
| `_docs/_TASKS/TASK-350_Analytics_Tools_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows at closure. |
| `_docs/_CHANGELOG/*` | Add implementation closure changelog. |

## Implementation Pseudocode

```text
1. Open /admin/analytics with no fixture rows and capture no-data UI.
2. Create/publish a uniquely scoped page fixture.
3. Reopen /admin/analytics and assert Top Content contains the fixture.
4. Open the drawer and click Export.
5. Assert download payload or disabled explanatory state.
6. Change every range option and assert final settled content matches API state.
7. Clean up the fixture and update report/task/changelog docs.
```

Data flow:

- Browser uses real admin UI.
- Route/API assertions are used only to confirm the UI-observed behavior.

Error handling:

- Keep the family open if export behavior cannot be verified in browser.
- Clean up only rows created by this closure pass.

Regression-test shape:

- Route/service tests for export if implemented.
- UI tests for empty/populated state.
- Playwright for integrated drawer/range behavior.

## Security Contract

No additional route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented by code
  leaves.
- Playwright evidence must not record credentials or hidden admin payloads.

## Testing Requirements

- All tests required by TASK-350-01 and TASK-350-02.
- Focused Playwright Analytics pass.
- `git diff --check`
- `bun run precommit` or configured commit hook.

## Documentation Updates Required

- Analytics report and overview report.
- Task board and changelog indexes.

## Acceptance Criteria

- Analytics report has no unclassified findings.
- Export behavior is proven as real or explicitly unavailable.
- Empty data states are truthful in current UI evidence.
