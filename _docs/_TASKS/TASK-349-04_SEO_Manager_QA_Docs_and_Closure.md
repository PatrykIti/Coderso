# TASK-349-04: SEO Manager QA, Docs, and Closure
# FileName: TASK-349-04_SEO_Manager_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** SEO + Playwright + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-349-01, TASK-349-02, TASK-349-03
**Status:** Done (2026-06-01)

---

## Overview

Close the SEO Manager family only after public metadata parity, audit/scoring,
and UI-only controls are proven in the current tree.

## Sub-Tasks

- Re-run the SEO Manager Playwright pass with a published page fixture.
- Prove admin drawer save updates public `<title>` and meta description.
- Prove save recalculates score/issues or triggers scoped audit refresh.
- Prove audit checkbox behavior or disabled state.
- Update reports and task board with final evidence.
- Add implementation closure changelog after code is done.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEO_MANAGER.md` | Add dated resolution notes and final evidence. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Move SEO classification from partially works to resolved or precisely scoped residual. |
| `docs/guide/screens/` | Update SEO Manager user guide if semantics changed. |
| `_docs/_TASKS/TASK-349_SEO_Manager_Tools_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows to Done at closure. |
| `_docs/_CHANGELOG/*` | Add final implementation changelog. |

## Implementation Pseudocode

```text
1. Create a unique published page fixture.
2. Run SEO audit so the page appears in SEO Manager.
3. Edit title and description in the drawer.
4. Reload SEO Manager and assert persisted values plus recalculated issue state.
5. Request the public page and assert HTML metadata.
6. Exercise empty/filter states with a narrowed query.
7. Clean up only the fixture rows created by this pass.
8. Update reports and task/changelog indexes.
```

Data flow:

- Browser actions must use the same admin route and API client as production.
- Public verification must use the public HTTP runtime, not only service-level
  assertions.

Error handling:

- If public runtime verification cannot run because DB/server is unavailable,
  keep the family open and record the blocker.
- If a broader SEO product decision remains unresolved, create a follow-up task
  instead of closing with ambiguous copy.

Regression-test shape:

- Bun runtime test proves public output.
- Vitest UI tests prove admin state and controls.
- Playwright proves integrated admin save and public read.

## Security Contract

No new route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented in the
  code leaves.
- Test fixtures must not commit credentials, session cookies, or hidden SEO
  draft data.

## Testing Requirements

- All tests required by TASK-349-01 through TASK-349-03.
- Focused Playwright SEO Manager pass.
- `git diff --check`
- `bun run precommit` or the configured commit hook.

## Documentation Updates Required

- SEO Manager report and overview report.
- Task board and changelog indexes.
- User guide when visible SEO behavior changes.

## Acceptance Criteria

- The original SEO report has no unclassified findings.
- Current evidence proves admin SEO save -> public HTML output.
- Task and changelog indexes match the final statuses.

## Closure Notes

Done (2026-06-01): reports, user/API/page-model docs, task board, and changelog
entry `1038` were synchronized after Bun runtime tests, Vitest UI/client tests,
lint/typecheck, and focused Playwright evidence.
