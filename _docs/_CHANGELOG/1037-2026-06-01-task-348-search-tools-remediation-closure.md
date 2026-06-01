# 1037 - TASK-348 Search Tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-348, TASK-348-01, TASK-348-02, TASK-348-03

## Key Changes

### Search

- Added a strict Search `dateRange` contract with default `last-7-days`,
  validation for `last-7-days`, `last-30-days`, `last-12-months`, and
  `all-time`, and HTTP 400 rejection for unknown values.
- Wired Date Range through the Search page, hook, client, admin route, and
  `searchAll`; finite ranges now filter page, entry, and user `updatedAt`
  timestamps plus media `createdAt`.
- Added aggregate-only Search response metadata so the UI can distinguish no
  searchable content, no query match, and date-range-filtered matches.
- Added fallback `Try:` chips, current-result category helper copy, and
  cause-specific empty states for category and content-type filters.
- Covered Search result destination mapping plus row prefetch/select behavior,
  and documented the resolved Playwright report findings.

## Validation

- `bun test tests/integration/routes/search.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/search/searchServiceDateRange.test.ts`
- `bun run test:vitest -- tests/vitest/search/searchService.test.ts tests/vitest/admin/searchClient.test.ts tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx tests/vitest/ui/search-navigation.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused Playwright CLI probe for `/admin/search`: temporary admin/page
  fixtures, fallback chip visible, recent page visible in default range, older
  page hidden in `Last 7 days`, older page visible in `All time`, and page
  result navigation to `/admin/pages/:id`.
