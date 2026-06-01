# TASK-354-04: Tools Playwright Regression Matrix and Report Drift Guard
# FileName: TASK-354-04_Tools_Playwright_Regression_Matrix_and_Report_Drift_Guard.md

**Priority:** High
**Category:** Playwright + Admin Tools + QA Automation + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353
**Status:** To Do

---

## Overview

Prevent the next Tools audit from repeating the shallow first pass. The overview
report explicitly says the first pass clicked controls but did not prove
end-to-end behavior for every tool.

## Sub-Tasks

- Create a durable Tools Playwright matrix covering all six Tools routes.
- For each route, list required clickable controls, expected observable effect,
  data fixture needs, and cleanup path.
- Add report drift checks so each per-tool report includes Worked, Did Not Work,
  Why, Fix Path, Source References, and final classification.
- Add no-op button detection for report-listed controls.
- Add fixture lifecycle helpers that create and clean only scoped test data.
- Document how to run the Tools audit locally.

## Files To Change

| File | Required change |
|---|---|
| `scripts/` | Add or extend a Tools Playwright audit script if current ad hoc commands are not durable. |
| `tests/unit/` | Add report/matrix validation tests if a machine-readable matrix is introduced. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/README.md` | Add runbook and matrix summary if missing. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Add final matrix/drift guard notes. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_*.md` | Update per-tool reports only when classifications change after remediation. |

## Implementation Pseudocode

```ts
type ToolAuditCase = {
  route: string;
  heading: string;
  controls: Array<{
    name: string;
    selector: string;
    expected: "download" | "route-change" | "dialog" | "api-call" | "disabled";
  }>;
  fixtures: ToolFixturePlan;
  cleanup: ToolCleanupPlan;
};

for (const testCase of matrix) {
  await page.goto(adminUrl + testCase.route);
  await expect(page.getByRole("heading", { name: testCase.heading })).toBeVisible();
  for (const control of testCase.controls) {
    await assertObservableControlEffect(page, control);
  }
}
```

Data flow:

- Matrix defines routes/controls/fixtures.
- Script runs browser checks and writes evidence.
- Report validator ensures docs match matrix output.

Error handling:

- If fixture setup fails, mark the affected case as fixture-blocked, not passed.
- Cleanup must target only created IDs/slugs.
- Browser credentials/session tokens must stay outside committed reports.

Regression-test shape:

- Unit test validates matrix has all six routes.
- Unit test validates report files exist for each matrix route.
- Playwright script fails when a control has no observable effect and is not
  disabled.

## Security Contract

No product route changes are required.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Anti-abuse: audit must not create public write endpoints or bypass nonce
  contracts.
- Secret handling: scripts/reports must not commit credentials, cookies,
  session IDs, provider keys, or backup/import artifact contents.

## Testing Requirements

- Matrix/report unit tests if added.
- Focused Tools Playwright script against local admin.
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Tools Playwright README/runbook.
- Tools overview report.
- Per-tool reports with supersession notes after implementation.

## Acceptance Criteria

- Tools audit coverage is executable and not just prose.
- All six Tools routes have route, control, fixture, and cleanup coverage.
- No report can claim closure without a matching matrix evidence row.
