# TASK-479-16-L04: Listings Tests
# FileName: TASK-479-16-L04-Listings-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-16-L01, TASK-479-16-L02, TASK-479-16-L03
**Status:** ✅ Done
**Parent Subtask:** TASK-479-16
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Overview

Add Vitest render tests that lock in the Listings list restyle, the Listing query
editor restyle, and the Filters/Search preview restyle, and confirm the restyle did
not regress any data/cache/query-model behavior. These are presentation guards
layered on top of the existing behavioral `listingsClient` suite, not a replacement
for it.

- **Goal:** New Vitest suites that render the real `ListingListPage`,
  `ListingEditorPage`, `ListingFiltersPage`, and `ListingSearchPage` and assert the
  prototype look is present (rounded-2xl cards, query summary + a source badge + a
  real query-detail badge (result limit), editor frame with left rail + canvas
  result grid + inspector, soft info/
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

Use the repo's REAL UI-test idiom — this repo has **no** `@testing-library/react`,
`jest-dom`, or `user-event`. Each suite starts with `// @vitest-environment
happy-dom`, renders the real page with `createRoot` inside `React.act`, wraps it in
`AdminRouterProvider` (`core/admin/ui/contexts/AdminRouterContext`, set
`initialPath` for edit/route mode), and seeds data by stubbing `globalThis.fetch`
(and/or priming the `listingsClient` cache + mocking the `useListingQueries`/
`useListingTemplates` hooks). Drive interactions with
`element.dispatchEvent(new MouseEvent("click", { bubbles: true }))` inside
`React.act`; query with `container.querySelector(...)` / `container.textContent` and
`aria-label`/`role` attributes. Do **NOT** use the SSR `renderAdminUi` helper
(`tests/utils/adminRouterRender.tsx`, `renderToString`) for interactions or
tab-switch assertions — it emits a single static snapshot. Pattern reference:
`tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`. Avoid
driving Radix **Select** dropdowns in happy-dom (they need pointer-capture); exercise
wiring through plain `<button>`s ("Add filter", "Use example", "Run preview"),
`role="checkbox"`/`role="switch"` buttons, and `<input>`s instead. Assert on stable
signals (visible text, `aria-label`/role, load-bearing tokens like `rounded-2xl`),
not brittle full-class snapshots.

```tsx
// Shared helpers (per the repo idiom — see custom-screen-record-interactions.test.tsx):
// const mount = (node, path = "/admin/advanced/listings") => {
//   const container = document.createElement("div");
//   document.body.appendChild(container);
//   const root = createRoot(container);
//   React.act(() => root.render(
//     <AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>));
//   return { container, root };
// };
// const click = (el) => React.act(() => {
//   el?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
// const findButton = (root, re) => Array.from(root.querySelectorAll("button")).find(
//   (b) => re.test(b.textContent || "") || re.test(b.getAttribute("aria-label") || ""));
// seedListingQueries(...) primes the listingsClient cache / mocks useListingQueries.

// tests/vitest/ui-integration/listing-list-restyle.test.tsx — @vitest-environment happy-dom
describe("Listings list restyle", () => {
  it("renders header, tabs, and query records as rounded-2xl cards", () => {
    seedListingQueries([lq("Latest articles", "entries"), lq("Events", "posts")]);
    const { container } = mount(<ListingListPage />);
    expect(container.querySelector("h1")?.textContent).toContain("Listings");
    expect(findButton(container, /new/i)).toBeTruthy();
    expect(container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
    // derived summary (source label "Content entries") + the REAL result-limit badge
    expect(container.textContent).toMatch(/content entries|entries/i);
    expect(container.textContent).toMatch(/per page/i); // no invented layout badge
  });

  it("summarizeListingQuery derives a readable line from the query model", () => {
    // pure helper exported by ListingListPage (L01); op "eq" is a real ListingFilterOperator
    expect(summarizeListingQuery(lq("X", "entries", { filters:[{field:"status",op:"eq",value:"published"}] })))
      .toMatch(/status.*eq.*published/i);
  });

  it("selecting a query card still surfaces the bulk cluster", () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    const { container } = mount(<ListingListPage />);
    // Radix Checkbox renders role=checkbox with aria-label "Select <name>"
    click(container.querySelector('[aria-label^="Select "]'));
    expect(container.textContent).toMatch(/selected/i); // ListingBulkActionsBar "Selected 1"
  });

  it("delete control opens the confirm dialog (behavior preserved)", () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    const { container } = mount(<ListingListPage />);
    click(findButton(container, /delete/i));
    // ConfirmActionDialog renders into a portal; real copy is "Delete listing query?"
    expect(document.body.textContent).toMatch(/delete listing query/i);
  });
});

// tests/vitest/ui-integration/listing-editor-restyle.test.tsx — @vitest-environment happy-dom
describe("Listing editor restyle", () => {
  it("renders the editor frame: left rail, canvas, inspector", () => {
    const { container } = mount(<ListingEditorPage />, "/admin/advanced/listings/new"); // create mode
    expect(container.textContent).toMatch(/source/i);   // left rail "Source"
    expect(container.textContent).toMatch(/filters/i);
    const runPreview = findButton(container, /run preview/i);
    expect(runPreview).toBeTruthy();
    expect(runPreview?.closest("[class*='rounded-2xl']")).toBeTruthy(); // editor frame
  });

  it("a model edit marks dirty — proven via the DISCARD button (Save is always enabled)", () => {
    const { container } = mount(<ListingEditorPage />, "/admin/advanced/listings/new");
    const discard = findButton(container, /discard/i);
    expect(discard?.hasAttribute("disabled")).toBe(true); // not dirty yet (disabled={!hasUnsavedChanges})
    // Use the plain "Add filter" button (setQuery + markDirty) — Radix Source <Select>
    // can't be driven in happy-dom; "Add filter" proves the same mutate+dirty wiring.
    click(findButton(container, /add filter/i));
    expect(discard?.hasAttribute("disabled")).toBe(false); // dirty now
    // Save query stays enabled regardless (disabled={isSaving}); it CANNOT prove dirty.
    expect(findButton(container, /save query/i)?.hasAttribute("disabled")).toBe(false);
  });

  it("Run preview calls previewListingQuery and renders the bound-query canvas", async () => {
    // stub globalThis.fetch so POST /listings/queries/preview returns a ListingPreviewResult
    stubPreview({ source: "entries", total: 1, limit: 12, offset: 0, rows: [{ id: "1", title: "A" }] });
    const { container } = mount(<ListingEditorPage />, "/admin/advanced/listings/new");
    await React.act(async () => {
      findButton(container, /run preview/i)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // restyled canvas badge ("Bound query · N results", L02 step 4) / preview count
    expect(container.textContent).toMatch(/bound query|matching row/i);
  });
});

// tests/vitest/ui-integration/listing-filters-restyle.test.tsx — @vitest-environment happy-dom
describe("Filters preview restyle", () => {
  it("renders the restyled controls + toggles examples + Use example writes the token input", () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    const { container } = mount(<ListingFiltersPage />, "/admin/advanced/filters");
    expect(container.querySelector("h1")?.textContent).toContain("Filters");
    expect(findButton(container, /run preview/i)).toBeTruthy();
    click(findButton(container, /show examples/i));
    click(findButton(container, /use example/i)); // first match — plain button -> setQueryString
    const tokenInput = container.querySelector('input[placeholder^="lq."]') as HTMLInputElement | null;
    expect(tokenInput?.value).toMatch(/^lq\./);
  });
});

// tests/vitest/ui-integration/listing-search-restyle.test.tsx — @vitest-environment happy-dom
describe("Search preview restyle", () => {
  it("renders query/limit inputs + source switches and runs preview", async () => {
    // stub globalThis.fetch so GET /search/public-preview returns a PublicSearchPreviewResult
    const calls = stubSearch({ query: "a", sources: ["pages"], items: [] });
    const { container } = mount(<ListingSearchPage />, "/admin/advanced/search");
    expect(container.querySelector("h1")?.textContent).toContain("Search");
    // Radix Switch renders role=switch buttons in Pages/Entries/Posts order; toggle Posts
    const switches = container.querySelectorAll('[role="switch"]');
    click(switches[2]); // Posts (positional — Radix Switch has no name binding)
    await React.act(async () => {
      findButton(container, /run preview/i)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(calls.length).toBeGreaterThan(0);        // previewPublicSearch hit
    expect(calls[0]).toMatch(/\/search\/public-preview/);
  });
});
```

**Data flow:** tests seed cache / `globalThis.fetch` stubs → render the real
component via `createRoot`/`React.act` → assert `container` text + `aria-label`/role
attributes + load-bearing tokens (`rounded-2xl`, badges, frame regions) → drive one
behavioral path per area (select→bulk, delete→confirm, add-filter→dirty (observed on
the **Discard** button enabling, since Save query is always enabled),
run-preview→client call, use-example→input, switch→preview request) to prove the
restyle preserved wiring.

**Error handling:** keep assertions resilient — query by `aria-label`/role attribute
+ visible text and `toMatch`/`class*=` token checks instead of exact className
strings, so future token tweaks from TASK-479-05/06 do not falsely fail these suites.

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
