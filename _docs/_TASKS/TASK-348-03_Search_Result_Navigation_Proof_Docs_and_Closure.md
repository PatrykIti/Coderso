# TASK-348-03: Search Result Navigation Proof, Docs, and Closure
# FileName: TASK-348-03_Search_Result_Navigation_Proof_Docs_and_Closure.md

**Priority:** Medium
**Category:** Admin Tools + Search + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-348-01, TASK-348-02
**Status:** Done (2026-06-01)

---

## Overview

Close the remaining Search report note: result drawer/navigation behavior needs
richer fixture proof if Search is expected to open/edit specific result types.
This leaf is the family closure and must update reports, docs, board state, and
changelog only after the code leaves are genuinely proven.

## Sub-Tasks

- Build deterministic fixtures for page, entry, media, and user result types
  where the current product supports navigation.
- Exercise hover prefetch and select navigation through `resolveSearchDestination`.
- Document any intentionally unsupported result type with product rationale and
  disabled/neutral UI behavior.
- Add final Search Playwright evidence and supersession notes to the report.
- Move the TASK-348 family rows to Done only after implementation validation is
  complete.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/search/searchNavigation.ts` | Touch only if fixture proof exposes wrong destination mapping. |
| `core/admin/ui/search/SearchResults.tsx` | Touch only if unsupported result types need disabled/select-state clarity. |
| `tests/vitest/ui/search-navigation.test.tsx` | Add exact destination coverage for every supported result type. |
| `tests/vitest/ui/search-results.test.tsx` | Cover row selection and disabled unsupported rows if applicable. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md` | Add final resolution/evidence notes. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Update Search classification. |
| `_docs/_TASKS/README.md` | Move family rows only at closure time. |
| `_docs/_CHANGELOG/*` | Add implementation closure entry when this family is Done. |

## Implementation Pseudocode

```ts
const fixtures = [
  createPublishedPage({ title: "Search proof page" }),
  createContentEntry({ title: "Search proof entry" }),
  createMediaItem({ title: "Search proof media" }),
  createAdminUser({ name: "Search proof user" }),
];

for (const fixture of fixtures) {
  await search(fixture.title);
  const row = await findResultRow(fixture.title);
  await row.hover();
  assertPrefetchTarget(resolveSearchDestination(fixture));
  await row.click();
  assertAdminRouteChangedToExpectedDestination(fixture);
}
```

Data flow:

- Fixture creation uses existing route/service helpers.
- Search UI finds records through the same `/admin/api/search` path used by
  users.
- Navigation assertions use canonical admin helpers, not hand-built hrefs.

Error handling:

- Clean up only rows created by this proof pass.
- If media/user navigation is intentionally absent, record the product decision
  instead of inventing a route.
- If Playwright cannot run locally, keep the task open and record the blocker;
  do not claim closure from unit tests alone.

Regression-test shape:

- Pure Vitest covers `resolveSearchDestination`.
- UI tests cover selection callbacks.
- Playwright proves the full browser route transition for supported result
  types.

## Security Contract

No production route changes are required by the closure leaf.

- Endpoint visibility: unchanged.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Fixture hygiene: DB-backed proof must use uniquely scoped rows and delete only
  rows it created.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/search-navigation.test.tsx tests/vitest/ui/search-results.test.tsx`
- `bun test tests/integration/routes/search.test.ts`
- Focused Playwright `/admin/search` navigation proof
- `git diff --check`
- `bun run precommit` before the closure commit

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `_docs/_TASKS/TASK-348_Search_Tools_Report_Remediation.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Search result navigation is proven for every supported result type.
- Unsupported result types are not presented as clickable dead ends.
- The report clearly supersedes the original unresolved note.
- TASK-348 is closed only after code, tests, Playwright evidence, docs, and
  changelog are synchronized.

## Completion Evidence

- Done (2026-06-01): `resolveSearchDestination` covers page, entry, media, and
  user result destinations.
- Done (2026-06-01): `SearchResults` row tests cover prefetch and select
  callbacks, and focused Playwright CLI evidence proves page result navigation
  from `/admin/search` to `/admin/pages/:id`.
- Done (2026-06-01): Search reports, API/spec docs, user guide, task board, and
  changelog closure entry are synchronized.
