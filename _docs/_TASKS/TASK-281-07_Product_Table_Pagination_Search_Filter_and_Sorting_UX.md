# TASK-281-07: Product Table Pagination Search Filter and Sorting UX

# FileName: TASK-281-07_Product_Table_Pagination_Search_Filter_and_Sorting_UX.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Public Query UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-281-04, TASK-281-05, TASK-281-06, TASK-256-04
**Status:** Done (2026-05-22)

---

## Overview

Add Product Table-owned front-end query controls for larger catalogs. This leaf
covers `UX-02`, `UX-04`, `UX-06`, and `UX-08` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`. `BF-15` is the same
frontend search gap already described by `UX-06`; treat it as report alias
evidence, not as a second independent closure item.

Current state: source `search`, status, collection filters, sort field, sort
direction, and limit are configured only by the admin. The public table is
static after SSR hydration and cannot paginate, search, filter, or sort. The
repo already has an SSR runtime-token/query-param pattern for public widgets
like `content-list` and `posts-feed`; Product Table should reuse that pattern
instead of introducing a second public JSON-refresh transport unless a shared
TASK-256 owner is opened first.

## Scope Boundary

In scope:

- schema-owned controls for enabling public search, filters, sort headers, and
  pagination/load-more;
- bounded public query payload/state using existing commerce query semantics;
- SSR-only page query params for public runtime controls, including namespaced
  block keys and stable previous/next/load-more/sort links;
- normalized runtime metadata for active public state, accessible control copy,
  pagination navigation, and rejected-token feedback;
- admin preview/read-only query diagnostics for the authored public-controls
  contract.

Out of scope:

- exposing arbitrary query builders to public visitors;
- provider-specific search engines or client-side provider secrets;
- bulk selection/admin operations;
- changing commerce product CRUD;
- introducing a Product Table-specific public JSON refresh route unless a
  shared runtime/client owner is opened first.

## Sub-Tasks

- [x] Define the Product Table-owned `controls` schema/defaults/normalizer and
  the SSR runtime metadata contract.
- [x] Add a Product Table-specific public-query builder that extends the
  authored baseline query without leaking visitor state into preview caching.
- [x] Add SSR public control markup, active-state feedback, and query-preserving
  sort/pagination links using namespaced block params.
- [x] Keep public runtime published-safe even when authored source status
  filters or visitor params request draft/archived rows.
- [x] Add renderer/editor/runtime/public-page tests for the chosen SSR query
  path; only add route tests if a new route is truly introduced.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add `controls` plus `resolved.runtime` schema/defaults/normalizer, SSR public control markup, accessible sort affordances inside current `<th>` cells, and namespaced public-query helpers. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Add Product Table-owned public-query state parsing, published-safe runtime query building, pagination/filter metadata, preserved-query href generation, and collection-option hydration. |
| `core/server/publicSite.tsx` | Thread request `runtimeSearchParams` and `blockId` into Product Table hydration like existing SSR runtime widgets. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add a dedicated public-controls panel and keep preview/query diagnostics read-only. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert controls render with accessible labels, safe defaults, query-preserving links, and normalized runtime metadata. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls normalize Product Table `controls` fields and keep existing preview diagnostics intact. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Assert public-query parsing, published-safe status handling, page metadata, and preserved href generation. |
| `tests/integration/runtime/*Product Table runtime suite*` | Add SSR public-page coverage for Product Table query params through `handlePublicRequest()`. |
| `tests/unit/widgets/validator.test.ts` | Assert validator coverage for new `controls` and `resolved.runtime` fields. |

## Implementation Pseudocode

Data shape:

```ts
type ProductTableControls = {
  showSearchInput?: boolean;
  showCollectionFilter?: boolean;
  showStatusFilter?: boolean;
  sorting?: "none" | "indicator" | "interactive";
  pagination?: "none" | "load-more" | "paged";
  pageSize?: number;
};

type ProductTableRuntimeState = {
  searchQuery: string;
  collectionIds: string[];
  status: Array<"draft" | "published" | "archived">;
  sortField: CommerceWidgetSortField;
  sortDir: CommerceWidgetSortDirection;
  page: number;
  rejectedTokens: string[];
};
```

SSR runtime flow:

```ts
function resolveProductTableRuntimeState(
  data: ProductTableData,
  runtimeSearchParams: URLSearchParams | undefined,
  options: { preview: boolean; blockId?: string }
) {
  const normalized = normalizeProductTableData(data);
  const keys = buildProductTableRuntimeParamKeys(options.blockId);
  const controls = normalizeProductTableControls(normalized.controls);
  const authoredQuery = buildProductTableQueryInput(normalized);

  return {
    authoredQuery,
    controls,
    state: parseProductTablePublicState(runtimeSearchParams, keys, controls, {
      preview: options.preview,
      baselineStatus: normalized.source?.status ?? [],
      baselineCollections: normalized.source?.collectionIds ?? [],
      baselineSortField: normalized.source?.sortField ?? "updatedAt",
      baselineSortDir: normalized.source?.sortDir ?? "desc",
    }),
  };
}

function buildProductTablePublicQueryInput(
  data: ProductTableData,
  runtime: ProductTableRuntimeState,
  options: { preview: boolean }
) {
  const normalized = normalizeProductTableData(data);
  return {
    ...buildProductTableQueryInput(normalized),
    ...(runtime.searchQuery ? { search: runtime.searchQuery } : {}),
    collectionIds: intersectAllowedCollections(
      normalized.source?.collectionIds,
      runtime.collectionIds
    ),
    status: resolvePublicSafeStatuses(normalized.source?.status, runtime.status, {
      preview: options.preview,
    }),
    sort: [{ field: runtime.sortField, dir: runtime.sortDir }],
    pagination: resolveProductTablePagination(normalized.controls, runtime.page),
  };
}
```

Error handling:

- Invalid/unknown Product Table public params are ignored and recorded as
  rejected runtime tokens; they do not mutate persisted widget JSON.
- Empty public search resets to the authored baseline query. Public search is
  intended for authored sources without a fixed source `search` term.
- Sort fields are limited to the current schema enum and interactive headers
  stay inside the current `<th scope="col">` structure.
- Public runtime must not return draft/archived products unless current preview
  mode intentionally allows them. Visitor `status` params may only narrow the
  authored baseline, never widen it.
- `load-more` must stay within Product Table-specific page-size/query clamps;
  do not silently widen to the generic commerce route max.

## Security Contract

Planned implementation path: SSR-only public GET params on the page URL. Do not
introduce a Product Table-specific public JSON refresh endpoint unless a shared
TASK-256 owner is opened first.

- Endpoint visibility: public runtime stays inside the existing page GET flow;
  admin preview stays on the authenticated internal Product Table preview route.
- Auth model: public runtime remains unauthenticated but published-safe; admin
  preview remains authenticated.
- RBAC: admin preview requires `commerce:read`; public runtime never grants
  draft/private commerce access.
- CSRF: not required for public read-only GET params; existing admin preview
  route keeps its current non-mutating contract.
- Rate-limit bucket: existing page/runtime GET bucket only; no new public POST
  bucket is introduced by the planned SSR implementation.
- Reject-unknown validation: every new persisted `controls`/`resolved.runtime`
  field must be added to `productTableSchema` with `additionalProperties: false`
  and normalized through `normalizeProductTableData()`. Public runtime reads
  only Product Table-owned namespaced query keys and ignores everything else.
- Anti-abuse: clamp search length, page size, page number, status count, and
  collection count; preserve namespaced block params; avoid generic client-side
  polling or arbitrary query operators.
- Secret handling: no provider keys, private media URLs, privileged
  diagnostics, or draft-only product data in public runtime metadata.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- Product Table SSR runtime integration coverage through `handlePublicRequest()`
  for the new page query params.
- Route registration, validation, and error mapping tests only if a new route is
  introduced.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with public controls and route
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-02/UX-04/UX-06/
  UX-08 evidence after implementation, and keep `BF-15` explicitly marked as
  the `UX-06` alias.
- Update `_docs/CMS_API.md` only if a new API route is introduced.
- Update `_docs/SECURITY_SPEC.md` only if the public-read hardening policy
  changes.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Validation Notes

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)

## Acceptance Criteria

- Product Table can offer bounded public search, filter, sort, and pagination
  controls without exposing arbitrary commerce queries.
- Product Table public controls follow the existing SSR page-query pattern and
  preserve other page query params when visitors paginate, filter, search, or
  sort.
- Public runtime query behavior preserves published-only safety by default.
- Active query state, empty state, rejected-token feedback, and sortable header
  affordances are accessible and tested.
- Admin editors can preview and configure the public controls without
  publishing blind changes.
