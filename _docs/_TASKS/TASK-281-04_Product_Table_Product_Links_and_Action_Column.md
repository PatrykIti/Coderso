# TASK-281-04: Product Table Product Links and Action Column

# FileName: TASK-281-04_Product_Table_Product_Links_and_Action_Column.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Safe Navigation
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-03, TASK-256-04, TASK-256-06
**Status:** Done (2026-05-21)

---

## Overview

Add Product Table-owned safe product navigation. This leaf covers `UX-03` and
`BF-11` from `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: the slug column renders `/{slug}` as plain text, table rows are
read-only, and there is no optional action column for product navigation.

## Scope Boundary

In scope:

- optional title/slug link rendering using safe product URLs;
- optional action column with bounded labels such as `View`;
- editor controls for link target behavior only if they consume the existing
  safe-href contract;
- focus-visible and hover styles for interactive rows/cells.

Out of scope:

- inventing a generic safe URL helper;
- admin edit links or privileged product-management actions on public pages;
- raw href templates, external provider URLs, or arbitrary row actions;
- public query/search/pagination endpoints.

## Sub-Tasks

- [x] Define Product Table link modes and safe defaults.
- [x] Resolve product hrefs from normalized slug/detail-route data without raw
  user-authored URL templates.
- [x] Add optional title/slug link rendering and an optional action column.
- [x] Add focus-visible and hover treatment for interactive cells/actions.
- [x] Add renderer/editor tests for safe links, target/rel, and fallback output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add schema/defaults/normalizer fields for link/action behavior and render safe links. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Resolve published product detail hrefs through the content-route contract instead of raw slug string concatenation. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Attach safe `productHref` values to resolved Product Table rows during runtime hydration. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add Product Table link/action controls with safe defaults. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert safe link output, rel/target behavior, focus classes, and action column visibility. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls normalize link/action payloads. |
| `tests/unit/commerce/commerceRuntimeResolver.test.ts` | Assert content-route-based product href resolution. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Assert hydrated Product Table runtime rows include safe `productHref` values. |

## Implementation Pseudocode

Schema shape:

```ts
type ProductTableLinkColumn = "none" | "title" | "slug";

type ProductTableData = {
  links?: {
    linkedColumn?: ProductTableLinkColumn;
    showAction?: boolean;
    actionLabel?: string;
    openInNewTab?: boolean;
  };
};
```

Runtime-safe URL flow:

```ts
function buildCommerceProductHrefMap(
  products: CommerceWidgetRuntimeProduct[],
  deps = defaultProductHrefMapDeps,
) {
  const contentRoutes = deps.loadContentRoutes();
  return new Map(
    products.map((product) => [
      product.id,
      resolveCommerceProductHref(contentRoutes, product),
    ]),
  );
}
```

Renderer flow:

```tsx
const links = normalizeProductTableLinks(normalized.links);
const linkAttrs = resolveWidgetLinkAttrs(item.productHref, {
  allowRelative: true,
  openInNewTab: links.openInNewTab,
});
const canLink = linkAttrs !== null && links.linkedColumn !== "none";

return canLink ? (
  <a {...linkAttrs} className={focusClassName}>
    {label}
  </a>
) : (
  label
);
```

Error handling:

- Missing/unsafe hrefs render plain text instead of broken links.
- `target="_blank"` always adds `rel="noopener noreferrer"`.
- Draft/archived product rows must not expose privileged admin edit URLs.
- The optional Action column renders only when a safe public href exists for the
  row.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: link/action fields must be schema-owned and reject
  unknown keys.
- Anti-abuse: links are derived from normalized product slug/detail-route data,
  not user-authored raw HTML or JavaScript URLs.
- Secret handling: no admin edit URLs, tokens, or private product-management
  routes in public Product Table output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with link/action behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-03/BF-11 evidence
  after implementation.
- Keep `_docs/_TASKS/TASK-281_Product_Table_Widget_Playwright_Product_Followups.md`
  and `_docs/_TASKS/README.md` synchronized with the leaf status transition.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table can render safe public links for product rows without exposing
  admin-only actions.
- Product Table derives product detail hrefs from the shared content-route
  contract and keeps only safe relative URLs in runtime row data.
- Keyboard users get visible focus states for all interactive cells/actions.
- Unsafe or missing slugs degrade to plain text.
- Link behavior is schema-owned, normalized, and covered by renderer/editor
  tests.
- Authors can optionally add a bounded Action column with shared new-tab rel
  policy and no arbitrary per-row actions.


## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Closure Notes

- Product Table now stores a normalized `links` owner block with a bounded `linkedColumn` mode (`none`, `title`, `slug`), an optional Action column, a bounded `actionLabel`, and shared new-tab handling.
- Runtime hydration now resolves product detail routes through the shared content-route map and attaches only safe relative `productHref` values to Product Table rows before render.
- Public rendering can link either the Product or Slug column, optionally add a fixed Action column, preserve focus-visible styles, and degrade unsafe or missing hrefs back to plain text with no broken links.
