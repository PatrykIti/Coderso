# TASK-479-16-L04: Listings Tests
# FileName: TASK-479-16-L04-Listings-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-16-L01, TASK-479-16-L02, TASK-479-16-L03
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-16
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock in the Listings list restyle, the Listing query
editor restyle, and the Filters/Search preview restyle, and confirm the restyle did
not regress any data/cache/query-model behavior. These are presentation guards
layered on top of the existing behavioral `listingsClient` suite, not a replacement
for it.

- **Goal:** New Vitest suites that render the real `ListingListPage`,
  `ListingEditorPage`, `ListingFiltersPage`, and `ListingSearchPage` and assert the
  prototype look is present (rounded-2xl cards, query summary + source/layout
  badges, editor frame with left rail + canvas result grid + inspector, soft info/
  control cards) while the core behaviors (filtering/selection/delete, query-model
  mutation + preview, runtime-token + public-search preview) still work.
- **Owning module/service:** new
  `tests/vitest/ui-integration/listing-list-restyle.test.tsx`,
  `listing-editor-restyle.test.tsx`, `listing-filters-restyle.test.tsx`, and
  `listing-search-restyle.test.tsx`, exercising the real pages under
  `core/admin/ui/listings/`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the prototype
  screens under `_docs/_PROTOTYPE/src/pages/advanced/`, and the existing
  `tests/vitest/admin/listingsClient.test.ts` used as a fixture/mocking reference.
- **Out of scope:** No runtime (browser) tests; no new product code (L01–L03 own the
  components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mock `listingsClient` (`previewListingQuery`, `previewListingFilters`,
`previewPublicSearch`, `createListingQuery`/`updateListingQuery`/
`getListingQueryCached`, `deleteListingQuery`), the `useListingQueries`/
`useListingTemplates` hooks (or seed their cache), `cachePolicy`/`cacheBus`, and the
`contentTypesClient`. Wrap in the `AdminRouter`/shell test providers used by the
existing admin suites. Assert on stable, semantic signals — accessible roles/text
and load-bearing class tokens — not brittle full-class snapshots.

```tsx
// tests/vitest/ui-integration/listing-list-restyle.test.tsx
describe("Listings list restyle", () => {
  it("renders header, tabs, and query records as rounded-2xl cards", () => {
    seedListingQueries([lq("Latest articles", "entries"), lq("Events", "posts")]);
    renderListingListPage();
    expect(screen.getByRole("heading", { name: "Listings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    const card = screen.getByText("Latest articles").closest("[class*='rounded-2xl']");
    expect(card).toBeTruthy();
    // derived summary + source/layout badges present
    expect(within(card!).getByText(/entries|articles/i)).toBeInTheDocument();
  });

  it("summarizeListingQuery derives a readable line from the query model", () => {
    expect(summarizeListingQuery(lq("X", "entries", { filters:[{field:"status",op:"eq",value:"published"}] })))
      .toMatch(/status.*eq.*published/i);
  });

  it("selecting a query card still surfaces the bulk cluster", async () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    renderListingListPage();
    await userEvent.click(screen.getByRole("checkbox", { name: /select/i }));
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });

  it("delete control opens the confirm dialog (behavior preserved)", async () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    renderListingListPage();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText(/delete listing query/i)).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/listing-editor-restyle.test.tsx
describe("Listing editor restyle", () => {
  it("renders the editor frame: left rail, canvas, inspector", async () => {
    renderListingEditorPage({ mode: "create" });
    expect(screen.getByText(/source/i)).toBeInTheDocument();        // left rail
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run preview/i })).toBeInTheDocument();
    const frame = screen.getByText(/run preview/i).closest("[class*='rounded-2xl']");
    expect(frame).toBeTruthy();
  });

  it("changing source still mutates the query model + marks dirty", async () => {
    renderListingEditorPage({ mode: "create" });
    await userEvent.selectOptions(screen.getByLabelText(/source/i), "posts");
    // Save becomes enabled (dirty) — wiring preserved
    expect(screen.getByRole("button", { name: /save query/i })).toBeEnabled();
  });

  it("Run preview calls previewListingQuery and renders the result grid", async () => {
    previewListingQuery.mockResolvedValue({ rows: [{ id: "1", title: "A" }], total: 1 });
    renderListingEditorPage({ mode: "create" });
    await userEvent.click(screen.getByRole("button", { name: /run preview/i }));
    expect(previewListingQuery).toHaveBeenCalled();
    expect(await screen.findByText(/bound query/i)).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/listing-filters-restyle.test.tsx
describe("Filters preview restyle", () => {
  it("renders the restyled controls + toggles examples", async () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    renderListingFiltersPage();
    expect(screen.getByRole("heading", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run preview/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show examples/i }));
    const useBtn = screen.getAllByRole("button", { name: /use example/i })[0];
    await userEvent.click(useBtn);
    expect((screen.getByPlaceholderText(/lq\./i) as HTMLInputElement).value).toMatch(/^lq\./);
  });
});

// tests/vitest/ui-integration/listing-search-restyle.test.tsx
describe("Search preview restyle", () => {
  it("renders query/limit inputs + source switches and runs preview", async () => {
    previewPublicSearch.mockResolvedValue({ query: "a", sources: ["pages"], items: [] });
    renderListingSearchPage();
    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /posts/i })); // toggles source set
    await userEvent.click(screen.getByRole("button", { name: /run preview/i }));
    expect(previewPublicSearch).toHaveBeenCalled();
  });
});
```

**Data flow:** tests seed cache/mocks → render the real component → assert DOM/role/
text + load-bearing tokens (`rounded-2xl`, badges, frame regions) → drive one
behavioral path per area (select→bulk, delete→confirm, source→dirty,
run-preview→client call, use-example→input, switch→source set) to prove the restyle
preserved wiring.

**Error handling:** keep assertions resilient — query by accessible role/name and
`toMatch`/`class*=` token checks instead of exact className strings, so future token
tweaks from TASK-479-05/06 do not falsely fail these suites.

**Regression-test shape:** the four new suites above PLUS a green run of the
existing `tests/vitest/admin/listingsClient.test.ts` (no edits to that file unless a
selector genuinely moved; the service/cache contract is untouched by the restyle).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/listing-list-restyle.test.tsx tests/vitest/ui-integration/listing-editor-restyle.test.tsx tests/vitest/ui-integration/listing-filters-restyle.test.tsx tests/vitest/ui-integration/listing-search-restyle.test.tsx`
- Behavioral guard (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-16-L04`.
- Note the four new `ui-integration` suites in any test-inventory doc that lists the
  Listings/Advanced coverage, so the restyle guards are discoverable.
