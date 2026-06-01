# TASK-354-04: Tools Playwright Regression Matrix and Report Drift Guard
# FileName: TASK-354-04_Tools_Playwright_Regression_Matrix_and_Report_Drift_Guard.md

**Priority:** High
**Category:** Playwright + Admin Tools + QA Automation + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353
**Status:** Done (2026-06-01)

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
- Add controlled-option payload checks for SEO audit checks, Backup include
  options, and Import / Export include options.
- Add runtime-effect evidence rows for SEO, Backups, and Redirects.
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
  effects: Array<{
    name: string;
    expected:
      | "public-html"
      | "artifact-or-external-worker"
      | "public-redirect"
      | "payload-change";
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
  for (const effect of testCase.effects) {
    await assertRuntimeEffectEvidence(page, effect);
  }
}
```

Data flow:

- Matrix defines routes/controls/fixtures.
- Matrix defines runtime-effect rows:
  - SEO Manager save -> public page `<title>`/description.
  - Backups create -> completed artifact or explicit external-worker boundary.
  - Redirect create -> public HTTP redirect response.
  - Option-group toggles -> request payload change or disabled/static state.
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
- Playwright/report validator fails closure if runtime-effect evidence rows are
  missing for SEO, Backups, or Redirects.
- Payload tests fail if report-listed option groups are uncontrolled and still
  submitted with default/static payloads.

## Security Contract

No product route changes are required, but the audit creates scoped fixtures and
exercises admin writes:

- Endpoint visibility: all writes use existing internal admin routes; public
  checks are read-only runtime checks.
- Auth model: authenticated admin session only, or a scoped internal API key
  where the existing route supports it.
- RBAC: use the route-required permissions (`content:read/write`,
  `settings:read/write`, `backups:read/write`).
- CSRF: required for admin POST/PATCH/DELETE requests; the audit must use the
  normal admin client/session flow.
- Rate-limit bucket: `admin_read`/`admin_write` for admin calls and
  `public_read` for public runtime checks.
- Reject-unknown validation: fixture payloads must pass the same strict schemas
  as production; the audit must not use raw DB writes to bypass route schemas
  except for documented cleanup fallbacks.
- Anti-abuse: audit must not create public write endpoints or bypass nonce,
  signature/HMAC, CAPTCHA, or other public-write contracts.
- Secret handling: scripts/reports must not commit credentials, cookies,
  session IDs, provider keys, pepper values, or backup/import artifact contents.
- Fixture hygiene: create uniquely scoped IDs/slugs and clean only those rows.

## Testing Requirements

- Matrix/report unit tests if added.
- Focused Tools Playwright script against local admin.
- Runtime-effect evidence checks for SEO, Backups, and Redirects.
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
- No report can claim runtime completion without public/effect evidence for the
  surfaces that claimed a runtime effect.

## Closure Notes

Done (2026-06-01): `scripts/tools-audit-matrix.ts` and
`tests/unit/tools/toolsAuditMatrix.test.ts` validate all six Tools routes,
report files, report sections, per-task closure IDs, no stale Redirects partial
status, observable control effects, runtime-effect rows, fixture plans, and
cleanup plans. The Tools README now documents the matrix run command.
