# TASK-479-19-L03: Commerce Tests
# FileName: TASK-479-19-L03-Commerce-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Commerce / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-19-L01, TASK-479-19-L02
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-19
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Add Vitest render tests that lock in the Commerce list restyle and the product
editor restyle, and confirm the restyle did not regress any data/cache/schema/
dirty-state behavior. These are presentation guards layered on top of the existing
behavioral Commerce suites, not a replacement for them.

- **Goal:** New Vitest suites that render the real `CommerceListPage` and the real
  `CommerceEditorPage` and assert the prototype look is present (soft stat row,
  `rounded-2xl` table/cards, token-driven stock + status badges, two-column editor
  with Details/Pricing/Inventory cards + Status sidebar) while the core behaviors
  (filtering, selection/bulk cluster, AdminLink prefetch, controlled inputs,
  dirty-state) still work.
- **Owning module/service:** `tests/vitest/ui-integration/commerce-list-restyle.test.tsx`
  and `tests/vitest/ui-integration/commerce-editor-restyle.test.tsx` (new),
  exercising `core/admin/ui/commerce/CommerceListPage.tsx` and
  `core/admin/ui/commerce/CommerceEditorPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the prototype
  screens `_docs/_PROTOTYPE/src/pages/advanced/{CommercePage,CommerceEditorPreview}.tsx`,
  and the existing `tests/vitest/ui/commerce-list-page-wave.test.tsx` +
  `tests/vitest/ui/commerce-page.test.tsx` suites used as fixtures/setup references.
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own the
  components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mirror the setup of the existing Commerce suites AND the repo's render idiom — this
repo has **no** `@testing-library/react`, `jest-dom`, or `user-event` (do not import
them). Use `// @vitest-environment happy-dom` + `createRoot` + `React.act` (see
`tests/vitest/ui/commerce-list-page-wave.test.tsx` for the `mount`/`flush`/
`clickByText` helpers), with `vi.hoisted` mock state for the `useCommerceCatalog`
hook (products/collections/loading/error/refreshProducts), the `commerceClient`
mutations, and `useAdminRouter().navigate`.

- **List suite:** render the REAL `CommerceListPage` with the REAL `CommerceTable`
  and shared `StatCard` (do NOT mock them — we assert their restyled markup); mock
  only the data hook + client + `AdminShell`/`PageHeader` (to skip the auth-bootstrap
  fetch), like the wave suite.
- **Editor suite:** `CommerceEditorPage` resolves `productId` from
  `window.location.pathname` and edit-mode hydrates from `getCachedCommerceProduct`,
  so push an EDIT route and seed the cached product BEFORE mounting
  (`window.history.pushState({}, "", "/admin/advanced/commerce/product-1")`) —
  otherwise the page resolves CREATE mode (`productId === null`) and the dirty/Save
  assertions target the wrong code path. Mock `EditorShell` to render
  `breadcrumbs`/`leftPanel`/`rightPanel`/`children`, plus `subscribeCacheEvents`
  (no-op unsubscribe).

Assert via `container.querySelector` / `container.textContent` (+ `[class*='…']`
token checks) — never `screen`, `userEvent`, or jest-dom matchers.

```tsx
// Shared helpers (copy from tests/vitest/ui/commerce-list-page-wave.test.tsx):
//   mount(node) -> { container, cleanup } via createRoot + React.act
//   flush()     -> await React.act(async () => { await Promise.resolve(); })
//   clickByText(container, text) -> click first <button> whose textContent includes text
//   setInputValue(input, value)  -> native value setter + dispatch input event in React.act
//   findButton(container, re)    -> first <button> whose textContent matches re (or undefined)
//   clickableLabels(container)   -> Array of every <button> textContent (for presence checks)
//   product(id, status, stock)   -> a full CommerceProductRecord fixture
// (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;  // required for React.act

// tests/vitest/ui-integration/commerce-list-restyle.test.tsx
// Render the REAL CommerceTable + StatCard; mock only the hook/client/AdminShell/
// PageHeader. seedCatalog(...) seeds the vi.hoisted useCommerceCatalog mock state.

test("list: header, catalog-derived stat row, and a rounded-2xl table", () => {
  seedCatalog([product("product-1", "published", "in_stock"),
               product("product-2", "draft", "out_of_stock")]);
  const view = mount(<CommerceListPage />);
  try {
    expect(view.container.textContent).toContain("Commerce");          // PageHeader title
    expect(clickableLabels(view.container)).toContain("New");          // New button present
    // stat row DERIVED from the catalog (NOT mock revenue): total/published/out-of-stock
    expect(view.container.textContent).toContain("Products");
    expect(view.container.textContent).toContain("Published");
    expect(view.container.textContent).toContain("Out of stock");
    // restyled table wrapper carries the rounded-2xl / card classes
    expect(view.container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
    expect(view.container.querySelector("table")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("list: token-driven status + stock badges render expected labels", () => {
  seedCatalog([product("product-1", "published", "backorder")]);
  const view = mount(<CommerceListPage />);
  try {
    expect(view.container.textContent).toContain("Published");  // status badge
    expect(view.container.textContent).toContain("Backorder");  // stock badge
    // (archived rows map to the `secondary` badge variant — see L01 step 5; the real
    //  CommerceProductStatus enum is draft|published|archived, no trash/review.)
  } finally {
    view.cleanup();
  }
});

test("list: product cell still links to the editor via AdminLink (prefetch preserved)", () => {
  seedCatalog([product("product-1", "published", "in_stock")]);
  const view = mount(<CommerceListPage />);
  try {
    const link = view.container.querySelector("a[href*='/advanced/commerce/product-1']");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("aria-label")).toContain("Edit product");
  } finally {
    view.cleanup();
  }
});

test("list: per-row + select-all checkboxes render", () => {
  // (selection→bulk wiring stays locked by commerce-list-page-wave; no Radix click here)
  seedCatalog([product("product-1", "published", "in_stock")]);
  const view = mount(<CommerceListPage />);
  try {
    expect(view.container.querySelector("[aria-label='Select all products']")).toBeTruthy();
    expect(view.container.querySelector("[aria-label='Select Oak Desk']")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

// tests/vitest/ui-integration/commerce-editor-restyle.test.tsx
// seedEditor(record): pushState an EDIT route + seed getCachedCommerceProduct/
// getCommerceProductCached BEFORE mount, else the page is in CREATE mode.

test("editor: relabelled section cards + Status sidebar (edit mode)", async () => {
  seedEditor(product("product-1", "draft", "in_stock"));
  const view = mount(<CommerceEditorPage />);
  await flush(); // let the initial load effects settle (applyProduct resets dirty)
  try {
    expect(view.container.textContent).toContain("Details");    // was "Identity"
    expect(view.container.textContent).toContain("Pricing");
    expect(view.container.textContent).toContain("Inventory");  // was "Stock"
    expect(view.container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
    expect(clickableLabels(view.container)).toContain("Save changes");
  } finally {
    view.cleanup();
  }
});

test("editor: editing the title flips dirty-state and Save calls updateCommerceProduct", async () => {
  seedEditor(product("product-1", "draft", "in_stock"));
  const view = mount(<CommerceEditorPage />);
  await flush();
  try {
    const discard = findButton(view.container, /discard/i);
    expect(discard?.disabled).toBe(true);                       // hasUnsavedChanges === false
    setInputValue(view.container.querySelector("#commerce-title"), "Oak Desk Pro");
    await flush();
    expect(discard?.disabled).toBe(false);                      // dirty flag flipped
    clickByText(view.container, "Save changes");
    await flush();
    expect(updateCommerceProductMock).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ pricing: expect.any(Object), stock: expect.any(Object) }),
    );
  } finally {
    view.cleanup();
  }
});

test("editor: Inventory switch toggles stockState over the existing schema field", async () => {
  seedEditor(product("product-1", "draft", "in_stock"));
  const view = mount(<CommerceEditorPage />);
  await flush();
  try {
    const sw = view.container.querySelector("[role='switch']"); // aria-label "Track inventory"
    React.act(() => (sw as HTMLElement | null)?.click());
    await flush();
    // derived sugar: in_stock -> out_of_stock on the SAME draft.stockState field;
    // the Inventory state Select now reflects "Out of stock"
    expect(view.container.textContent).toContain("Out of stock");
  } finally {
    view.cleanup();
  }
});
```

**Data flow:** tests seed the catalog/cached-product mocks → render the real
component → assert DOM/role/text + load-bearing tokens (`rounded-2xl`, badge labels)
→ drive one behavioral path per area (link→href + checkbox presence on the list;
type→dirty, switch→stockState, save→payload on the editor) to prove the restyle
preserved wiring and the schema/dirty-state contract. The selection→bulk-actions
behavior stays locked by the existing `commerce-list-page-wave` suite (not re-driven
here, to avoid brittle Radix Checkbox interaction under happy-dom).

**Error handling:** keep assertions resilient — use `container.querySelector` (role
selectors like `[role='switch']`, `[aria-label=…]`) and `[class*='…']` token checks
via `textContent.toContain` instead of exact className strings, so future token
tweaks from TASK-479-05/06 do not falsely fail these suites.

**Regression-test shape:** the two new suites above PLUS a green run of the existing
Commerce behavioral family (`commerce-page`, `commerce-list-page-wave`,
`commerceClient`, `commerceSchemas`) — no edits to those files unless a selector
genuinely moved due to the restyle, in which case update the minimal query rather
than the assertion intent. Concretely: the L02 relabel (Identity→Details,
Stock→Inventory) DOES move two string assertions in
`tests/vitest/ui/commerce-page.test.tsx` (it asserts `"Identity"` and `"Stock"`) —
update those two queries to `"Details"`/`"Inventory"` (a minimal copy update, intent
preserved); `"Pricing"`, `"New product"`, `"Publish"`, `"Save changes"` are unchanged.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/commerce-list-restyle.test.tsx tests/vitest/ui-integration/commerce-editor-restyle.test.tsx`
- Full Commerce regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx tests/vitest/admin/commerceClient.test.ts tests/vitest/validation/commerceSchemas.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-19-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists the
  Commerce coverage, so the restyle guards are discoverable.
