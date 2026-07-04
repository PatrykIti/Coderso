# TASK-479-26-L07: Tools Tests
# FileName: TASK-479-26-L07-Tools-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-26
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Add the Vitest render/integration suites that lock in the visual restyle of the six
Tools screens (L01–L06) without re-asserting business logic already covered by the
existing Tools suites. Each new suite proves the redesigned structure renders, that
data-derived values come from seeded real data (not prototype mocks), and that the
preserved actions/handlers still fire.

- **Goal:** New suites under `tests/vitest/ui-integration/tools-*-restyle.test.tsx`
  that render each restyled Tools page with seeded cache/service stubs and assert the
  prototype-shaped structure + preserved wiring, plus a green re-run of the existing
  Tools suites.
- **Owning module/service:** `tests/vitest/ui-integration/` (new suites) covering
  `core/admin/ui/{search,seo,analytics,backups,import-export,redirects}/**`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane, Bun-free admin/UI),
  the prototype screens `_docs/_PROTOTYPE/src/pages/tools/*`, and L01–L06 of this
  subtask for the exact assertions each screen owns.
- **Out of scope:** No new product code, no API/route tests, no migration of runtime
  tests into Vitest for coverage. Do NOT duplicate the behavioral assertions already in
  the existing Tools suites (search/seo/analytics/backups/import-export/redirects) — the
  new suites assert restyle structure + preserved handlers only.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Create six focused suites in the **repo test idiom** — NOT React Testing Library (this
repo has no `@testing-library/react`, `jest-dom`, or `user-event`). Each file opens with
`// @vitest-environment happy-dom`, imports `{ renderAdminUi }` from
`tests/utils/adminRouterRender` for a single SSR snapshot (it returns an HTML string), and
— for interaction — mounts with `createRoot` + `React.act` (set
`IS_REACT_ACT_ENVIRONMENT = true`) then queries the real DOM via
`container.querySelector`/`.textContent` and dispatches native events, exactly like
`tests/vitest/ui/seo-manager.test.tsx` and
`tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`. There is NO `screen`,
`render`, `getByRole`, `fireEvent`, or `toBeInTheDocument`. Seed the cache/service modules
the same way the existing Tools suites do (`vi.mock` the `@/services/*Client` reads + prime
the `getCached*` helpers to return the seed synchronously; stub `useAdminRouter`
navigate/prefetch for Search). Do NOT hand-roll a new provider tree, and do NOT assert
lazy/inactive/grid content the SSR `renderAdminUi` snapshot never emits.

```tsx
// Shared shape for all six suites (repo idiom — no RTL):
//   // @vitest-environment happy-dom
//   import React from "react";
//   import { createRoot } from "react-dom/client";
//   import { expect, test, vi } from "vitest";
//   import { renderAdminUi } from "../../utils/adminRouterRender";
//   (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
//   const mount = (node: React.ReactNode) => { /* createRoot + React.act(render);
//     return { container, cleanup } */ };
// Use renderAdminUi(<Page/>) for static structure (HTML string); use mount(<Page/>) +
// container.querySelector + node.dispatchEvent when an action must fire a real handler.

// tools-search-restyle.test.tsx — seed getCachedRecentSearches (objects with `.query`) +
// stub useSearchResults + useAdminRouter
test("renders centered grouped search and preserves navigation", () => {
  const { container, cleanup } = mount(<SearchPage />);
  expect(container.querySelector("h1")?.textContent).toMatch(/search/i);       // centered heading
  const input = container.querySelector<HTMLInputElement>('input[placeholder*="Search pages"]');
  expect(input).not.toBeNull();                                                // hero input drives query
  // clicking a recent chip calls the existing setQuery; clicking a grouped result calls
  // navigateSpy with resolveSearchDestination(item) — NOT a hand-built href.
  cleanup();
});

// tools-seo-restyle.test.tsx — prime getCachedSeo with 3 SeoDocumentItems of known
// score/status/issues
test("derives the stat row from seeded SEO data + opens audit", () => {
  const html = renderAdminUi(<SeoManagerPage />);
  expect(html).toContain("Avg");          // avg computed from the seeded scores (no mock delta)
  expect(html).not.toContain("Indexed pages");                       // dropped (no backing field)
  // Issues/Optimized/Warnings reflect analysisStatus/metaStatus from the seed; mount(...) +
  // dispatch click on the "Run audit" button -> SeoAuditDialog node appears.
});

// tools-analytics-restyle.test.tsx — prime getCachedOverview (totals/current/previous +
// trend) + getCachedTopContent
test("renders KPI cards + area/bar charts + top-content from seeded analytics", () => {
  const html = renderAdminUi(<AnalyticsPage />);
  expect(html).toContain("Published Pages");   // from buildAnalyticsKpiCards (NOT "Visitors")
  expect(html).toMatch(/traffic/i);            // area SectionCard (overview.trend)
  expect(html).not.toMatch(/\bsources\b/i);    // donut dropped (no overview.sources)
  // top-content drawer opens via the onViewAll action (mount + dispatch click).
});

// tools-backups-restyle.test.tsx — prime getCachedBackups (items incl. a `complete` + a
// `failed`) + getCachedBackupSchedule
test("renders schedule + status + backups table with preserved actions", () => {
  const html = renderAdminUi(<BackupsPage />);
  expect(html).toContain("Automatic backups");   // schedule SectionCard (real BackupSchedule)
  expect(html).not.toMatch(/GB of/i);            // no used/total quota; no next-run line
  // mount(...) + dispatch click on the "Delete backup" button -> ConfirmActionDialog node.
});

// tools-import-export-restyle.test.tsx — prime getCachedImportHistory with known
// ImportHistoryItems
test("renders per-target export cards + import dropzone + recent imports", () => {
  const html = renderAdminUi(<ImportExportPage />);
  expect(html).toContain("Site Settings");       // one of the four per-target export cards
  expect(html).toMatch(/browse files/i);         // import dropzone (no "what to import" checklist)
  // mount(...) + dispatch click on a card Download -> exportConfigSpy({ target, include }).
});

// tools-redirects-restyle.test.tsx — prime getCachedRedirects with a 301/302/307/308 mix
test("derives stat row + inline add reuses createRedirect", () => {
  const { container, cleanup } = mount(<RedirectsPage />);
  expect(container.textContent).toMatch(/permanent/i);   // count = 301 + 308 (NOT a "142" mock)
  // set the /old-path + /new-path inputs, pick a status code, submit the inline add ->
  // createRedirectSpy called once with a NUMERIC statusCode (single create path).
  cleanup();
});
```

**Data flow:** each suite seeds the relevant `getCached*` helper (and mocks the
`*Cached` hydrate fetch to resolve to the same seed) so the page renders from cache
synchronously, then asserts structure + that a user action calls the preserved handler/
client spy. No suite asserts a fabricated prototype value (e.g. "6.2 GB", "142", "+12.4%",
an "Indexed pages"/"Visitors" KPI, a "Sources" donut, or a json/csv/zip format select) —
every numeric assertion is computed from the seed, and the dropped/feature-incomplete
surfaces are asserted ABSENT.

**Error handling (test concerns):** add at least one assertion per screen that a seeded
API error still renders the destructive `Alert` (not swallowed by the restyle), and that
the empty/loading state renders the soft `EmptyState` card. Avoid asserting exact class
strings; assert text/attribute/DOM structure (no RTL roles) so the suites are not brittle
to token tweaks.

**Regression-test shape:** the six new suites are the structural lock; the existing
Tools suites (search/seo/analytics/backups/import-export/redirects + client suites) are
the behavioral lock and MUST be re-run green. If a restyle forced a selector change in an
existing suite (e.g. a renamed label), update that suite minimally and call it out in the
closeout rather than weakening the assertion.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-search-restyle.test.tsx tests/vitest/ui-integration/tools-seo-restyle.test.tsx tests/vitest/ui-integration/tools-analytics-restyle.test.tsx tests/vitest/ui-integration/tools-backups-restyle.test.tsx tests/vitest/ui-integration/tools-import-export-restyle.test.tsx tests/vitest/ui-integration/tools-redirects-restyle.test.tsx`
- Full Tools regression (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx tests/vitest/ui/search-navigation.test.tsx tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics.test.tsx tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/ui/import-export.test.tsx tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- Client suites:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/searchClient.test.ts tests/vitest/admin/seoClient.test.ts tests/vitest/admin/analyticsClient.test.ts tests/vitest/admin/backupsClient.test.ts tests/vitest/admin/importExportClient.test.ts tests/vitest/admin/adminExportClient.test.ts tests/vitest/admin/redirectsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L07`.
- If a new shared test helper/fixture for the Tools screens is added, note it in
  `_docs/TESTING_STRATEGY.md` (or the existing test-utils doc) so other screen suites reuse it.
