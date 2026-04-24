# TASK-205-03-03: Pagination Regression Matrix and Docs
# FileName: TASK-205-03-03_Pagination_Regression_Matrix_and_Docs.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-205-03-01, TASK-205-03-02
**Status:** Done (2026-04-24)

---

## Overview

Add the pagination-specific regression proof and source-of-truth documentation
for the shared Content Types, Pages, Posts, and Menus list contract. This leaf
keeps TASK-205-05 focused on final family closure while this task owns the
shared pagination matrix itself.

This leaf must keep the proof centered on one shared pagination contract. It can
verify that existing Pages, Posts, and Menus selection stays scoped to the
paginated visible row set, but Content Types bulk selection is not completed here;
that proof belongs to `TASK-205-04` after the Content Types selection/bulk
contract exists.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/list-pagination.test.tsx`
  - prove generic hook/footer behavior.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - prove Content Types adoption.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - prove Pages and Posts adoption.
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - prove Menus adoption and existing visible-page selection.
- `tests/vitest/ui/page-list.test.tsx`
  - keep Pages shell assertions aligned.
- `tests/vitest/ui/posts-list.test.tsx`
  - keep Posts shell assertions aligned.
- `tests/vitest/ui/menu-list-page.test.tsx`
  - keep Menus shell assertions aligned.
- `_docs/CONTENT_LIST_UX.md`
  - document the shared pagination owner,
  - document page-size options and default,
  - document filter/sort-before-pagination,
  - document visible-row semantics for selection consumers, with Content Types
    bulk selection explicitly closed by `TASK-205-04`.

## Implementation Direction

Cover the contract once and the adapters with resource-specific smoke tests:

```ts
describe("useListPagination", () => {
  it("defaults to 10 rows and reports a truthful range", () => {});
  it("changes visible rows when Next and Previous are used", () => {});
  it("resets to page one when page size changes", () => {});
  it("clamps page index when filtered rows shrink", () => {});
  it("normalizes unsupported page size values", () => {});
});
```

Resource tests should assert behavior, not internal hook state:

```ts
render(<PageListPage />);
expect(screen.getByText("Showing 1-10 of 25 pages")).toBeInTheDocument();
expect(screen.queryByText("Page 11")).not.toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /next/i }));
expect(screen.getByText("Showing 11-20 of 25 pages")).toBeInTheDocument();
expect(screen.getByText("Page 11")).toBeInTheDocument();
```

Existing Pages, Posts, and Menus visible-page selection proof should use more
than 10 rows:

```ts
await user.click(screen.getByRole("checkbox", { name: /select all pages/i }));
expect(screen.getByText("10 pages selected")).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /next/i }));
expect(screen.queryByText("10 pages selected")).not.toBeInTheDocument();
```

Docs should describe the generic contract first and resource differences second.
Do not document four independent pagination implementations. Do not require
Content Types bulk-selection proof in this leaf before `TASK-205-04` wires the
Content Types selection contract.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list.test.tsx tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Generic hook/footer behavior is tested once in `list-pagination.test.tsx`.
2. All four resource lists have adapter-level regression coverage.
3. Tests prove `Previous` / `Next`, page-size changes, filter shrink/clamp, and
   existing visible-page selection for resources that already support selection.
4. `_docs/CONTENT_LIST_UX.md` describes one shared pagination contract with
   resource-specific copy notes and states that Content Types bulk selection is
   completed in `TASK-205-04`.

## Completion Notes

- Regression matrix covers the shared pagination contract plus Content Types,
  Pages, Posts, and Menus adapters.
- `_docs/CONTENT_LIST_UX.md` now records the single shared pagination owner,
  page-size options, filter/sort-before-pagination behavior, and visible-page
  selection semantics.
