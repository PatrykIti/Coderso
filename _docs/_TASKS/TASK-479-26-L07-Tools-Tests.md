# TASK-479-26-L07: Tools Tests
# FileName: TASK-479-26-L07-Tools-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

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

Create six focused suites. Seed the cache/service modules the same way the existing
Tools suites do (mock the `@/services/*Client` reads + `getCached*` helpers; stub
`useAdminRouter` navigate/prefetch for Search). Render via the existing admin test
harness/`renderWithProviders` used by the current Tools suites — do NOT hand-roll a new
provider tree.

```tsx
// tests/vitest/ui-integration/tools-search-restyle.test.tsx
// seed getCachedRecentSearches + stub useSearchResults + useAdminRouter
it("renders centered grouped search and preserves navigation", () => {
  render(<SearchPage />);
  expect(screen.getByRole("heading", { name: /search/i })).toBeInTheDocument();
  // hero input drives query
  fireEvent.change(screen.getByPlaceholderText(/search pages/i), { target: { value: "pricing" } });
  // recent chip sets query
  fireEvent.click(screen.getByText("Pricing page"));
  // grouped result -> navigate via resolveSearchDestination
  fireEvent.click(screen.getByText(seededResultTitle));
  expect(navigateSpy).toHaveBeenCalledWith(expectedDestination); // NOT a hand-built href
});

// tests/vitest/ui-integration/tools-seo-restyle.test.tsx
// seed getCachedSeo with 3 rows of known scores/issues
it("derives the stat row from seeded SEO data + opens audit", () => {
  render(<SeoManagerPage />);
  expect(screen.getByText("Avg. score")).toBeInTheDocument();         // value computed from seed
  expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0); // per-row score bars
  fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();             // SeoAuditDialog
});

// tests/vitest/ui-integration/tools-analytics-restyle.test.tsx
// seed getCachedOverview + getCachedTopContent
it("renders KPI cards + charts + top-pages from seeded analytics", () => {
  render(<AnalyticsPage />);
  expect(screen.getByText("Visitors")).toBeInTheDocument();           // from buildAnalyticsKpiCards
  expect(screen.getByText(/traffic/i)).toBeInTheDocument();           // area SectionCard
  expect(screen.getByText(/sources/i)).toBeInTheDocument();           // donut SectionCard
  fireEvent.click(screen.getByText(seededTopPage));                   // opens TopContentDrawer
});

// tests/vitest/ui-integration/tools-backups-restyle.test.tsx
// seed getCachedBackups + getCachedBackupSchedule
it("renders schedule + storage + backups table with preserved actions", () => {
  render(<BackupsPage />);
  expect(screen.getByRole("switch")).toBeInTheDocument();             // enable auto backups
  expect(screen.getByText(/storage usage/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /delete backup/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();             // ConfirmActionDialog
});

// tests/vitest/ui-integration/tools-import-export-restyle.test.tsx
it("renders import dropzone + export checklist + format + recent jobs", () => {
  render(<ImportExportPage />);
  expect(screen.getByText(/drag a file or browse/i)).toBeInTheDocument();
  expect(screen.getByText(/what to export/i)).toBeInTheDocument();
  // toggling a checklist row updates target state; Export calls exportConfig
  fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
  expect(exportConfigSpy).toHaveBeenCalled();
});

// tests/vitest/ui-integration/tools-redirects-restyle.test.tsx
// seed getCachedRedirects with known 301/302 mix
it("derives stat row + inline add reuses createRedirect", () => {
  render(<RedirectsPage />);
  expect(screen.getByText("301 permanent")).toBeInTheDocument();      // count from seed
  fireEvent.change(screen.getByPlaceholderText("/old-path"), { target: { value: "/a" } });
  fireEvent.change(screen.getByPlaceholderText("/new-path"), { target: { value: "/b" } });
  fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
  expect(createRedirectSpy).toHaveBeenCalled();                       // single create path
});
```

**Data flow:** each suite seeds the relevant `getCached*` helper (and mocks the
`*Cached` hydrate fetch to resolve to the same seed) so the page renders from cache
synchronously, then asserts structure + that a user action calls the preserved handler/
client spy. No suite asserts a fabricated prototype value (e.g. "6.2 GB", "142", "+12.4%")
— every numeric assertion is computed from the seed.

**Error handling (test concerns):** add at least one assertion per screen that a seeded
API error still renders the destructive `Alert` (not swallowed by the restyle), and that
the empty/loading state renders the soft `EmptyState` card. Avoid asserting exact class
strings; assert role/text/structure so the suites are not brittle to token tweaks.

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
