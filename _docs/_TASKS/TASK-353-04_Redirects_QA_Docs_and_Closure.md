# TASK-353-04: Redirects QA, Docs, and Closure
# FileName: TASK-353-04_Redirects_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Redirects + Public Runtime + Playwright + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-353-01, TASK-353-02, TASK-353-03
**Status:** To Do

---

## Overview

Close the Redirects family after public runtime behavior and admin UI fixes are
proven.

## Sub-Tasks

- Create unique redirects for 301/302/307/308 and prove public responses.
- Prove disabled redirects do not execute.
- Prove loop prevention.
- Open/create/edit/delete redirects through the admin UI.
- Verify drawer accessibility console stays clean.
- Update reports, task board, and changelog.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_REDIRECTS.md` | Add final resolution notes and evidence. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Update Redirects classification. |
| `docs/guide/screens/` | Update Redirects guide if runtime/delete/pagination behavior changes. |
| `_docs/_TASKS/TASK-353_Redirects_Tools_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows at closure. |
| `_docs/_CHANGELOG/*` | Add final implementation changelog. |

## Implementation Pseudocode

```text
1. Create redirect fixtures through admin UI or route helpers.
2. Request each public source path and assert status/location.
3. Toggle one redirect inactive and assert public path no longer redirects.
4. Create loop fixture and assert runtime fails closed.
5. Exercise drawer open/edit/delete and pagination/empty state.
6. Clean up only created redirect rows.
7. Update reports and closure docs.
```

Data flow:

- Admin UI writes rows.
- Public runtime proves execution.
- Cleanup uses visible delete UI when supported, otherwise route helper.

Error handling:

- If public runtime cannot be started, keep the family open.
- Do not leave enabled test redirects that shadow shared local routes.

Regression-test shape:

- Bun service/route/runtime tests.
- Vitest UI accessibility/delete/pagination tests.
- Playwright integrated admin proof.

## Security Contract

No additional route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented by code
  leaves.
- Public redirect evidence must not include session cookies or admin URLs.

## Testing Requirements

- All tests required by TASK-353-01 through TASK-353-03.
- Focused Playwright Redirects pass.
- `git diff --check`
- `bun run precommit` or configured commit hook.

## Documentation Updates Required

- Redirects report and overview report.
- Redirects user guide if visible behavior changes.
- Task board and changelog indexes.

## Acceptance Criteria

- Redirects report has no unclassified findings.
- Public redirect execution is proven for all supported status codes.
- Admin UI is accessible and has no placeholder pagination/delete controls.
