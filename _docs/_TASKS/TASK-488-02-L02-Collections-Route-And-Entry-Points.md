# TASK-488-02-L02: Collections route & navigation entry points
# FileName: TASK-488-02-L02-Collections-Route-And-Entry-Points.md

**Parent Subtask:** TASK-488-02
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-488-02-L01
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

> **Line-gate note (audit M5):** `core/admin/app/AdminApp.tsx` is 1,237 lines
> (over the 1,000-line gate). This leaf splits it by cohesive responsibility
> BEFORE adding the collections route (extract the commerce route block into a
> sibling module or a commerce routes file), keeping imports/public contracts
> stable; AdminApp.tsx must end below 1,000 lines.

- **Goal:** Make the collections manager reachable: register a lazy
  `/advanced/commerce/collections` admin route and add navigation entry points
  (a "Manage collections" action on the Commerce list header and a
  "New collection" link in the product editor's right panel that currently dead-
  ends on a non-existent flow).
- **Owning module(s) to create-or-extend:**
  `core/admin/app/adminRouteComponents.tsx` (add `CommerceCollectionsRoute`
  lazy import), `core/admin/app/AdminApp.tsx` (register the route — **before**
  the `/advanced/commerce/:id` pattern), `core/admin/ui/commerce/CommerceListPage.tsx`
  (header action), and `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx`
  (replace the dead "Create collections from the Commerce API/UI flow" hint with
  a working "New collection" navigation link).
- **Source-of-truth docs:** `_docs/CMS_API.md` (Commerce v1 — Collections),
  `_docs/CMS_SPEC.md` (Commerce v1 scope).
- **Out-of-scope:** The manager component itself (TASK-488-02-L01); variant
  editor (TASK-488-01); any backend change; adding a new advanced-module nav
  card in `advancedModules.ts` (the Commerce module already exists — reuse it).

### Verified current state

- `adminRouteComponents.tsx` defines `CommerceListRoute` and
  `CommerceEditorRoute` via `lazyNamedRoute(() => import("@/ui/commerce/..."),
  "ComponentName")` — mirror that for `CommerceCollectionsPage`.
- `AdminApp.tsx` registers, in order:
  `{ pattern: "/advanced/commerce", ...CommerceListRoute, permission:
  "commerce:read" }` then `{ pattern: "/advanced/commerce/:id",
  ...CommerceEditorRoute, permission: "commerce:read" }`.
- **Route-ordering hazard (must handle):** a literal `/advanced/commerce/collections`
  route registered *after* `/advanced/commerce/:id` would be shadowed — the
  editor would treat `collections` as a product id. Register the literal route
  **before** the `:id` route.
- `CommerceListPage` header already renders a `<Button>` ("New") via
  `useAdminRouter().navigate("/advanced/commerce/new")` — add a sibling
  outline button.
- `CommerceCollectionsPanel.tsx` currently shows the static text
  "No collections yet. Create collections from the Commerce API/UI flow." and
  has no router access — it will need an `onCreateCollection` callback prop
  passed down from `CommerceEditorPage` (which has `navigate`).

## Security Contract

- **Endpoint visibility:** internal admin SPA route only — no backend endpoint
  added. The page consumes existing `/admin/api/commerce/collections*` endpoints.
- **Auth model:** session-based admin; the SPA route is registered with
  `permission: "commerce:read"` (same as the existing commerce routes), and the
  underlying writes hit `commerce:write`-gated endpoints.
- **RBAC:** route guard `commerce:read` for viewing; mutations enforce
  `commerce:write` server-side (unchanged). Nav entry points render regardless,
  but the route guard + server RBAC are the real gates.
- **CSRF:** required on internal writes — already applied by `commerceClient`.
  Route registration adds none of its own writes.
- **Rate-limit bucket:** n/a — no new endpoint.
- **Validation:** n/a here (no payloads); validation owned server-side by the
  existing collection schemas. Pattern matching for the new route is a literal
  path, not user input.
- **Anti-abuse:** n/a — authenticated internal navigation only.
- **Secret/PII handling:** none — routing/navigation wiring carries no data.

## Implementation Pseudocode

```tsx
// adminRouteComponents.tsx
export const CommerceCollectionsRoute = lazyNamedRoute(
  () => import("@/ui/commerce/CommerceCollectionsPage"),
  "CommerceCollectionsPage"
);

// AdminApp.tsx — register the literal BEFORE the :id param route
{ pattern: "/advanced/commerce", render: () => <CommerceListRoute.Component />, permission: "commerce:read" },
{ pattern: "/advanced/commerce/collections", render: () => <CommerceCollectionsRoute.Component />, permission: "commerce:read" },
{ pattern: "/advanced/commerce/:id", render: () => <CommerceEditorRoute.Component />, permission: "commerce:read" },

// CommerceListPage.tsx — header action sibling of the existing "New" button
<Button variant="outline" className="gap-2"
  onClick={() => navigate("/advanced/commerce/collections")}>
  Manage collections
</Button>

// CommerceEditorPage.tsx — pass a create handler into the right panel
<CommerceCollectionsPanel ...existing
  onCreateCollection={() => navigate("/advanced/commerce/collections")} />

// CommerceCollectionsPanel.tsx — replace dead hint with a working link/button
{collections.length === 0 ? (
  <Button variant="link" size="sm" onClick={onCreateCollection}>
    Create your first collection
  </Button>
) : null}
```

**Data flow:** user clicks "Manage collections" (list) or "New collection"
(editor panel) → `navigate("/advanced/commerce/collections")` → router resolves
the literal route (matched before `:id`) → `CommerceCollectionsRoute.Component`
lazy-loads `CommerceCollectionsPage` (TASK-488-02-L01).

**Error handling:** none specific — navigation only. If the route guard denies
(`commerce:read` missing) the existing admin route-guard fallback handles it,
identical to every other gated route.

**Regression-test shape:**

- Route resolution (Vitest): rendering the admin router at
  `/admin/advanced/commerce/collections` mounts the collections page (asserts
  "Collections" heading) and does **not** mount the product editor — proving the
  literal route wins over `:id`.
- Entry points (Vitest): `CommerceListPage` renders "Manage collections" and
  clicking it navigates; the editor panel empty-state renders a working create
  affordance instead of the old static API hint.

## Testing Requirements

- **Lane:** Vitest. Add assertions to `tests/vitest/ui/commerce-page.test.tsx`
  (or a new `tests/vitest/ui-integration/commerce-collections-route.test.tsx`):
  the literal route mounts the manager; the list header exposes "Manage
  collections"; the editor panel exposes a working create link.
- No DB changes → no migration artifacts.
- Green under `bun run lint`, `bun --cwd core lint:types`, Vitest suite.
