# TASK-348: Search Tools Report Remediation
# FileName: TASK-348_Search_Tools_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + Search + API + UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Close every Search finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md` plus the Search-specific
Claude UX findings from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The report proves the route is reachable and can find a real published page, but
the visible authoring contract is incomplete:

- Date Range is an uncontrolled UI-only select and is not sent to the API.
- `Try:` can render as an empty label when recent searches are empty.
- No-results copy does not distinguish no indexed content, no query match, and
  too-narrow filters.
- Category helper copy remains stale after a completed search with zero
  categories.
- Search result navigation still needs explicit richer-fixture proof if the
  product expects opening/editing result types from Search.

This family keeps the fix focused on Search. It must not redesign global
navigation or reopen unrelated widget search-box work.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Date range | `SearchPage` renders `<Select defaultValue="last-7-days">`, while `useSearchResults` calls `searchAll(normalizedQuery, { limit })`. | `core/admin/ui/search/SearchPage.tsx`, `core/admin/ui/search/useSearchResults.ts`, `core/admin/services/searchClient.ts` |
| API query | `registerSearchRoutes` only parses `q` and `limit`; the service accepts only `{ limit }`. | `core/server/routes/searchRoutes.ts`, `core/services/search/searchService.ts` |
| Empty states | `SearchResults` receives only grouped items and cannot tell whether filters removed results or no index rows exist. | `core/admin/ui/search/SearchPage.tsx`, `core/admin/ui/search/SearchResults.tsx` |
| Suggestions | `Try:` maps `recentSearches`; no fallback chips are rendered when the list is empty. | `core/admin/ui/search/SearchPage.tsx`, `core/services/search/searchHistoryService.ts` |

## Sub-Tasks

- [x] TASK-348-01: Search Date Range API and Service Contract
- [x] TASK-348-02: Search Suggestions, Empty States, and Category UX
- [x] TASK-348-03: Search Result Navigation Proof, Docs, and Closure

## Implementation Order

1. Land the date-range schema/client/service contract first so UI work has a
   real backend state to describe.
2. Land Search UX state copy and suggestion chips after the API can return
   deterministic filtered results.
3. Close with richer fixtures, route/UI tests, report supersession notes, and
   board/changelog synchronization.

## Security Contract

This umbrella adds no routes itself. Leaf `TASK-348-01` changes an internal
admin read route and must preserve this contract:

- Endpoint visibility: internal admin only under `/admin/api/search`.
- Auth model: existing session cookie.
- RBAC: `content:read`.
- CSRF: not required for `GET`.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: Search query parameters must be normalized through
  explicit enums and clamped limits; unknown date-range values must fail closed
  to the default range or a validation error per leaf decision.
- Anti-abuse: no public write surface, nonce, signature/HMAC, or reCAPTCHA.
- Secret handling: never expose user email plaintext beyond the existing
  `piiEmail` safe lookup path.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/search.test.ts`
- `bun test tests/unit/search/searchHistoryService.test.ts` if suggestion
  source behavior changes
- `bun run test:vitest -- tests/vitest/admin/searchClient.test.ts tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx tests/vitest/ui/search-navigation.test.tsx`
- Focused Playwright pass for `/admin/search` with no data, matching data,
  non-matching data, and date-range filter states

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `docs/guide/screens/` Search guide if the user-visible filter semantics
  change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New closure changelog when the implementation family moves to Done

## Acceptance Criteria

- Every Search issue from the Playwright report and Claude UX addendum is either
  fixed in code or explicitly reclassified with evidence.
- Date range affects request payload and returned results, or the control is
  removed/disabled with truthful copy.
- Empty states are cause-specific and do not show stale Category or empty `Try:`
  affordances.
- Search navigation is proven with fixture rows for each supported result type
  or the unsupported types are documented as intentional.

## Completion Evidence

- Done (2026-06-01): Date Range is controlled in the Search page, serialized by
  the admin client/hook, validated by `/admin/api/search`, applied in
  `searchAll`, and documented in `_docs/CMS_API.md` plus `_docs/SEARCH_SPEC.md`.
- Done (2026-06-01): Search response metadata and UI state now distinguish
  minimum query length, no searchable content, no match, date range too narrow,
  and category filters too narrow; fallback `Try:` chips prevent empty
  affordances.
- Done (2026-06-01): Search navigation is covered by destination tests,
  row prefetch/select tests, and a focused Playwright CLI pass for page-result
  navigation from `/admin/search`.
- Done (2026-06-01): Search now hydrates recent searches and bounded
  query/date-range results from browser cache; final live Tools smoke confirmed
  `search:recent` and `search:results:*` keys after real admin navigation.
