# TASK-281-04: Product Table Product Links and Action Column

# FileName: TASK-281-04_Product_Table_Product_Links_and_Action_Column.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Safe Navigation
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-03, TASK-256-04, TASK-256-06
**Status:** To Do

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

- [ ] Define Product Table link modes and safe defaults.
- [ ] Resolve product hrefs from normalized slug/detail-route data without raw
  user-authored URL templates.
- [ ] Add optional title/slug link rendering and an optional action column.
- [ ] Add focus-visible and hover treatment for interactive cells/actions.
- [ ] Add renderer/editor tests for safe links, target/rel, and fallback output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add schema/defaults/normalizer fields for link/action behavior and render safe links. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Extend runtime card URL data only if existing `slug` is insufficient; preserve published-only public behavior. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add Product Table link/action controls with safe defaults. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert safe link output, rel/target behavior, focus classes, and action column visibility. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls normalize link/action payloads. |

## Implementation Pseudocode

Schema shape:

```ts
type ProductTableLinkMode = "none" | "title" | "slug" | "row-action";

type ProductTableData = {
  links?: {
    mode?: ProductTableLinkMode;
    actionLabel?: string;
    openInNewTab?: boolean;
  };
};
```

Safe URL resolver:

```ts
function resolveProductHref(item: CommerceWidgetRuntimeCard) {
  const slug = item.slug.trim().replace(/^\/+/, "");
  if (!slug) return null;
  return `/${encodeURIComponent(slug)}`;
}
```

Renderer flow:

```tsx
const href = resolveProductHref(item);
const canLink = href !== null && normalized.links?.mode !== "none";

return canLink ? (
  <a href={href} target={target} rel={rel} className={focusClassName}>
    {label}
  </a>
) : (
  label
);
```

Error handling:

- Empty/unsafe slugs render plain text instead of broken links.
- `target="_blank"` always adds `rel="noopener noreferrer"`.
- Draft/archived product rows must not expose privileged admin edit URLs.

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
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with link/action behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-03/BF-11 evidence
  after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table can render safe public links for product rows without exposing
  admin-only actions.
- Keyboard users get visible focus states for all interactive cells/actions.
- Unsafe or missing slugs degrade to plain text.
- Link behavior is schema-owned, normalized, and covered by renderer/editor
  tests.
