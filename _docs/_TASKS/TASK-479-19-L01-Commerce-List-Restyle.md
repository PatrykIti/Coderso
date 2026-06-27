# TASK-479-19-L01: Products List Restyle
# FileName: TASK-479-19-L01-Commerce-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Commerce
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-19
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Commerce products **list** screen to match the prototype: a
redesigned `PageHeader`, a soft stat row, the prototype `FilterBar` look, a
`rounded-2xl` `DataTable` with a leading product thumbnail tile, right-aligned
price, token-driven stock + status badges, and the soft pagination footer. All
data loading, filtering, selection, bulk actions, and the cache contract stay
byte-for-byte the same.

- **Goal:** `core/admin/ui/commerce/CommerceListPage.tsx` (+ `CommerceTable.tsx`,
  `CommerceFilters.tsx`, `CommerceBulkActionsBar.tsx`, `CommerceRowActions.tsx`)
  read like `_docs/_PROTOTYPE/src/pages/advanced/CommercePage.tsx` while preserving
  the existing catalog logic and cache contract.
- **Owning module/service:** `core/admin/ui/commerce/CommerceListPage.tsx`,
  `core/admin/ui/commerce/CommerceTable.tsx`,
  `core/admin/ui/commerce/CommerceFilters.tsx`,
  `core/admin/ui/commerce/CommerceBulkActionsBar.tsx`,
  `core/admin/ui/commerce/CommerceRowActions.tsx`,
  `core/admin/ui/commerce/hooks/useCommerceCatalog.ts` (read-only consumer; do not
  change its cache logic).
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/CommercePage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,FilterBar,DataTable,StatusBadge,Pagination}.tsx`;
  prototype primitives `_docs/_PROTOTYPE/src/components/ui/{badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `commerceClient`, `cachePolicy`/`cacheKeys`,
  `cacheBus`, `useCommerceCatalog`'s hydrate/revalidate logic, `useListPagination`,
  `commerceActionToasts`, RBAC, or the create/publish/draft/archive/delete flows.
  The two `ConfirmActionDialog`s and bulk-action semantics are unchanged. NO
  fabricated revenue/orders telemetry — the stat row is derived only from the
  already-loaded catalog (see pseudocode). The editor restyle is L02.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `CommerceListPage.tsx` (the
`useCommerceCatalog()` hook wiring, `enrichCommerceProducts`,
`filterCommerceProducts`, `useListPagination`, selection/bulk handlers,
`runDelete`/`runBulkAction`, the two confirm dialogs). Keep the render-tree
behavior identical; swap classNames and add the stat row.

```tsx
// CommerceListPage.tsx — RENDER ONLY changes inside the existing return().
// 1) PageHeader: keep title/description/actions props. The inline
//    CommerceBulkActionsBar cluster + the "New" button keep their handlers
//    (navigate("/advanced/commerce/new")). PageHeader is restyled centrally by
//    TASK-479-06, so this file just keeps passing the same props.

// 2) NEW soft stat row (port prototype StatCard row look), but DERIVED from the
//    real catalog — NO mock revenue/orders, NO new fetch, NO new effect.
//    Render-time derivation over the already-loaded `products`:
const catalogStats = useMemo(() => {
  const total = products.length;
  const published = products.filter((p) => p.status === "published").length;
  const outOfStock = products.filter((p) => p.stock.state === "out_of_stock").length;
  return [
    { label: "Products", value: String(total), icon: <ShoppingBag /> },
    { label: "Published", value: String(published), icon: <CheckCircle2 /> },
    { label: "Out of stock", value: String(outOfStock), icon: <PackageX /> },
  ];
}, [products]);
// Render the StatCard row (grid sm:grid-cols-3, gap-4) using the prototype
// StatCard visual (rounded-2xl border bg-card shadow-card, icon tile, muted
// label, large value). DROP the prototype's delta/trend/spark props — there is
// no real time-series data; pass only label/value/icon so nothing is fabricated.

// 3) CommerceFilters.tsx: restyle its container to the prototype FilterBar
//    (rounded-2xl card, soft border, search Input with leading icon, right-aligned
//    Select controls). Keep ALL props/handlers (search/status/collection/stock +
//    onChange callbacks, collectionOptions). Class swap only.

// 4) CommerceTable.tsx: keep columns, the select-all + per-row Checkbox, the
//    AdminLink title cell (prefetch), CommerceRowActions menu, and the responsive
//    column hiding. Restyle the wrapper + cells to the prototype DataTable:
//      - container: "overflow-hidden rounded-2xl border bg-card shadow-card"
//        (was rounded-xl ... shadow-sm).
//      - header row: soft muted bg, xs uppercase tracked labels (already close).
//      - row hover: "hover:bg-accent/40" soft violet-tinted hover.
//      - PRODUCT cell: add a leading rounded-xl thumbnail tile like the prototype
//        (size-10 rounded-xl bg-muted) showing the first mediaId image when
//        present, else a <ShoppingBag/> placeholder icon. The tile is decorative;
//        the AdminLink href={`/advanced/commerce/${encodeURIComponent(item.id)}`}
//        prefetch + aria-label are UNCHANGED. Keep title + "/slug" + excerpt text.
//      - PRICE cell: right-aligned, tabular-nums; keep formatMoney(amount,currency)
//        (amount is minor units / 100 — DO NOT change the math).
//      - STOCK cell: replace the inline stockLabels string with a token-driven
//        stock Badge (in_stock→success "In stock", out_of_stock→destructive
//        "Out of stock", backorder→warning "Backorder"); keep the quantity suffix.

// 5) Status badges: replace the local statusStyles hex map in CommerceTable.tsx
//    with the shared token-driven StatusBadge helper ported from the prototype
//    (_docs/_PROTOTYPE/.../StatusBadge.tsx). Map: published→success, draft→muted,
//    archived→warning. Same label text (statusLabels). Apply to BOTH the desktop
//    Status cell and the md:hidden inline summary so they stay consistent.

// 6) CommerceBulkActionsBar.tsx / CommerceRowActions.tsx: restyle to the soft
//    button/menu set (ghost + outline + primary violet). Keep the action values,
//    onApply/onClear/onActionChange, and the row dropdown items + handlers exactly.
```

**Data flow:** `useCommerceCatalog()` (cache-hydrate + background revalidation) →
`enrichCommerceProducts(products, collections)` → `filterCommerceProducts(...)` →
`useListPagination` → `CommerceTable` rows → `ListPaginationFooter`. The restyle
changes none of these edges; the new stat row is pure render-time derivation over
`products` and writes no state.

**Navigation/href constraint (preserve):** The product title link and the New/edit
navigations must keep routing through the canonical helpers — keep
`AdminLink href={...} prefetch` for the title cell and the existing
`navigate("/advanced/commerce/...")` / `onEdit` calls. Do NOT hand-build `<a href>`
or string-concat admin URLs; if a value is currently produced via
`adminPaths`/`AdminLink`/`prefetchAdminRoute`, leave that wiring intact.

**Error handling:** The two destructive `Alert` blocks (`Unable to load commerce
catalog`, `Commerce action failed`), the loading placeholder, the empty-state
message, and the two `ConfirmActionDialog`s keep their existing copy and conditions;
only their surrounding card styling inherits the new tokens. No new error surfaces.

**React-hooks/cache rules:** Stat-row figures are derived at render via `useMemo`
over `products` — no effect, no synchronous `setState` in an effect. Do not add any
mount effect that force-refetches; `useCommerceCatalog`'s existing hydrate +
`cacheBus` revalidation are the only data effects and must be left untouched (no
dirty-state overwrite, no refetch loop).

**Regression-test shape:** see L03 — render `CommerceListPage` with a seeded
`useCommerceCatalog` mock, assert: header + New button present, the stat row shows
catalog-derived counts (total/published/out-of-stock), the table wrapper carries the
`rounded-2xl`/card classes, stock + status badges render expected label text, the
product cell still links via AdminLink to the editor, and selecting rows still shows
the bulk-actions cluster.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/commerce-list-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing list suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-19-L01`.
- If a shared `StatusBadge`/stock-badge helper or a catalog stat-row pattern is
  introduced/changed, note it alongside the TASK-479-06 shell notes so other list
  screens reuse the same restyled primitives.
