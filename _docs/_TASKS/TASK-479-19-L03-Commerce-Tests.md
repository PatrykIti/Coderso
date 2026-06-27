# TASK-479-19-L03: Commerce Tests
# FileName: TASK-479-19-L03-Commerce-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Commerce / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-19-L01, TASK-479-19-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-19
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

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

Mirror the setup of the existing Commerce suites: `vi.hoisted` mock state for the
`useCommerceCatalog` hook (products/collections/loading/error/refreshProducts) and
the `commerceClient` mutations + `useAdminRouter().navigate`, exactly as
`tests/vitest/ui/commerce-list-page-wave.test.tsx` already does; for the editor,
seed a cached product via the `getCachedCommerceProduct`/`getCommerceProductCached`
mocks. Use `// @vitest-environment happy-dom`. Assert on stable, semantic signals —
accessible roles/text and load-bearing class tokens — not brittle full-class
snapshots.

```tsx
// tests/vitest/ui-integration/commerce-list-restyle.test.tsx
describe("Commerce list restyle", () => {
  it("renders header, catalog stat row, and a rounded-2xl table", async () => {
    seedCatalog([product("published","in_stock"), product("draft","out_of_stock")]);
    renderCommerceListPage();
    expect(screen.getByRole("heading", { name: /commerce|products/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    // stat row derived from catalog (NOT mock revenue) — total/published/out-of-stock
    expect(screen.getByText(/products/i)).toBeInTheDocument();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(table.closest("[class*='rounded-2xl']")).toBeTruthy();
  });

  it("renders token-driven stock + status badges with expected labels", () => {
    seedCatalog([product("published","backorder")]);
    renderCommerceListPage();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Backorder")).toBeInTheDocument();
  });

  it("product cell still links to the editor via AdminLink (prefetch preserved)", () => {
    seedCatalog([product("published","in_stock")]);
    renderCommerceListPage();
    const link = screen.getByRole("link", { name: /edit product/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("/advanced/commerce/"));
  });

  it("selecting a row still surfaces the bulk-actions cluster", async () => {
    seedCatalog([product("published","in_stock")]);
    renderCommerceListPage();
    await userEvent.click(screen.getByRole("checkbox", { name: /select .*/i }));
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/commerce-editor-restyle.test.tsx
describe("Commerce editor restyle", () => {
  it("renders two-column cards + Status sidebar", () => {
    seedCachedProduct(product("draft","in_stock"));
    renderCommerceEditorPage("product-1");
    // section cards adopt prototype tokens
    expect(screen.getByText(/details/i)).toBeInTheDocument();
    expect(screen.getByText(/pricing/i)).toBeInTheDocument();
    expect(screen.getByText(/inventory/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("editing the title flips dirty-state (Discard/Save enabled)", async () => {
    seedCachedProduct(product("draft","in_stock"));
    renderCommerceEditorPage("product-1");
    const discard = screen.getByRole("button", { name: /discard/i });
    expect(discard).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/title/i), " Pro");
    expect(discard).toBeEnabled();
  });

  it("Inventory switch toggles stockState over the existing schema field", async () => {
    seedCachedProduct(product("draft","in_stock"));
    renderCommerceEditorPage("product-1");
    await userEvent.click(screen.getByRole("switch", { name: /track inventory/i }));
    // derived sugar: in_stock -> out_of_stock on the SAME draft field
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it("Save sends the unchanged schema payload through updateCommerceProduct", async () => {
    seedCachedProduct(product("draft","in_stock"));
    renderCommerceEditorPage("product-1");
    await userEvent.type(screen.getByLabelText(/title/i), " X");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(updateCommerceProductMock).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ pricing: expect.any(Object), stock: expect.any(Object) }),
    );
  });
});
```

**Data flow:** tests seed the catalog/cached-product mocks → render the real
component → assert DOM/role/text + load-bearing tokens (`rounded-2xl`, badge labels)
→ drive one behavioral path per area (select→bulk, link→href, type→dirty,
switch→stockState, save→payload) to prove the restyle preserved wiring and the
schema/dirty-state contract.

**Error handling:** keep assertions resilient — query by accessible role/name and
`toMatch`/`class*=` token checks instead of exact className strings, so future token
tweaks from TASK-479-05/06 do not falsely fail these suites.

**Regression-test shape:** the two new suites above PLUS a green run of the existing
Commerce behavioral family (`commerce-page`, `commerce-list-page-wave`,
`commerceClient`, `commerceSchemas`) — no edits to those files unless a selector
genuinely moved due to the restyle, in which case update the minimal query rather
than the assertion intent.

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
