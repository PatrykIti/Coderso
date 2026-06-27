# TASK-479-10-L01: Menu List Restyle
# FileName: TASK-479-10-L01-Menu-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Menus
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06 (shell + soft/badge variants + tokens in `core/admin`)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-10

---

## Overview

Restyle the Menus list to the prototype look: a responsive **card grid** of
menus where each card shows a rounded-2xl icon tile, the menu name + updated
date, a soft location badge, and `Edit` / `Design` actions. All existing list
machinery (search/status/location filters, bulk actions, pagination, create
dialog, site-shell dialog, delete confirms, cache hydration + background
revalidation) is preserved — only the presentation of the rows changes from a
table to cards.

- **Goal:** Make `MenuListPage` visually match
  `_docs/_PROTOTYPE/src/pages/content/MenuListPage.tsx` while keeping 100% of the
  real data, filtering, selection, bulk, and cache behavior.
- **Owning module/service:** `core/admin/ui/menus/MenuListPage.tsx`.
- **Source-of-truth docs:**
  - PROTOTYPE source to port: `_docs/_PROTOTYPE/src/pages/content/MenuListPage.tsx`
    (card grid, `bg-primary-soft` icon tile, `Badge variant="soft"`,
    `Button variant="soft"` / `variant="outline"`, `Card … rounded-2xl … hover:shadow-card`).
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`.
  - Real data type: `core/admin/services/menusClient.ts` (`MenuSummary`).
- **Out of scope:** No change to `menusClient`, cache keys, filters logic,
  pagination helper, bulk-action runner, or the create/site-shell/delete
  dialogs. **No new data fetch and no per-menu "item count"** — `MenuSummary`
  does not carry an item count and the list endpoint must not be extended here;
  use only `name`, `location`, `status`, `createdAt`, `publishedAt`.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Replace the **presentation** layer only. Keep `MenuListPage`'s state, effects,
handlers, `filterMenus`, `useListPagination`, `subscribeCacheEvents`,
`resolveMenuListMountRefreshOptions`, and the `AdminShell` wrapper untouched.

Swap the inner `MenuListTable` for a `MenuCardGrid` that renders
`pagination.visibleRows` as prototype cards. Selection (checkbox) and the
per-row actions menu must remain reachable for the existing bulk + row flows.

```tsx
// core/admin/ui/menus/MenuListPage.tsx — presentation swap only.
// Ports the card shape from _docs/_PROTOTYPE/src/pages/content/MenuListPage.tsx.

import { List, Workflow } from "lucide-react";
import { AdminLink } from "@/ui/shared/AdminLink"; // canonical hrefs — never hand-build

const statusBadgeClass: Record<MenuSummary["status"], string> = {
  published: "…",          // keep existing emerald/slate token classes
  draft: "…",
};

function MenuCard({
  item, isSelected, onToggleMenu, onEdit, onPublish, onUnpublish, onDelete,
}: { item: MenuSummary } & Pick<MenuListTableProps, /* same row callbacks */>) {
  const href = `/menus/${encodeURIComponent(item.id)}`;        // unchanged route shape
  const designHref = `/menus/${encodeURIComponent(item.id)}/design`;
  return (
    <Card className="flex flex-col rounded-2xl p-5 transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* keep the selection checkbox the bulk bar depends on */}
          <Checkbox
            aria-label={`Select ${item.name}`}
            checked={isSelected}
            onCheckedChange={() => onToggleMenu(item.id)}
          />
          <span className="flex size-11 items-center justify-center rounded-2xl
                           bg-primary-soft text-primary-soft-foreground">
            <List className="size-5" />
          </span>
          <div className="min-w-0">
            <AdminLink href={href} prefetch className="truncate font-display text-[15px] font-semibold …">
              {item.name}
            </AdminLink>
            <div className="text-xs text-muted-foreground">
              {item.publishedAt ? `Updated ${formatDate(item.publishedAt)}` : `Created ${formatDate(item.createdAt)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="soft">{item.location ?? "Not assigned"}</Badge>
          <Badge variant="outline" className={statusBadgeClass[item.status]}>
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <AdminLink href={href} prefetch className="flex-1">
          <Button variant="soft" size="sm" className="w-full gap-1.5"><PenLine className="size-4" /> Edit</Button>
        </AdminLink>
        <AdminLink href={designHref} prefetch className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5"><Workflow className="size-4" /> Design</Button>
        </AdminLink>
        {/* keep the existing MenuRowActions dropdown for publish/unpublish/delete */}
        <MenuRowActions status={item.status} onEdit={() => onEdit(item.id)}
          onPublish={() => onPublish(item.id)} onUnpublish={() => onUnpublish(item.id)}
          onDelete={() => onDelete(item.id)} />
      </div>
    </Card>
  );
}

function MenuCardGrid({ items, emptyMessage, selectedIds, ...callbacks }: MenuListTableProps) {
  if (items.length === 0) {
    return <div className="rounded-2xl border bg-card/60 p-10 text-center text-sm text-muted-foreground">
      {emptyMessage ?? "No menus yet. Create your first menu to get started."}
    </div>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <MenuCard key={item.id} item={item} isSelected={selectedIds.includes(item.id)} {...callbacks} />
      ))}
    </div>
  );
}
```

**Data flow:** unchanged. `initialCached = getCachedMenus()` → render-time
derivation of `filteredItems` via `filterMenus` → `useListPagination` →
`pagination.visibleRows` feed `MenuCardGrid`. Mount + cacheBus subscription keep
their existing refresh policy (`resolveMenuListMountRefreshOptions`, background
revalidation, NO mount-force refetch loop, NO dirty overwrite). The "select all"
header checkbox in the old table is preserved by relocating it into the toolbar
row of the list section (or the filters bar), still wired to `handleToggleAll` /
`isAllSelected` / `isIndeterminate` so the bulk bar keeps working.

**Error handling:** unchanged — the `error` Alert and the `Loading menus...`
state stay; only swap the loaded branch from `MenuListTable` to `MenuCardGrid`.

**Hooks rules:** no new effects; no sync setState in effects. Card grid is pure
render-time derivation. Keep AdminLink + `prefetch` for nav (never hand-build
hrefs; the `/menus/:id` and `/menus/:id/design` shapes are unchanged).

**Regression-test shape:** see TASK-479-10-L03 — assert the grid renders one
card per visible menu, each card exposes the `Edit`/`Design` AdminLinks with the
correct hrefs, the selection checkbox still toggles the bulk bar, and filters +
pagination still narrow the rendered card set.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`

Both existing list suites must stay green (selection, bulk apply, filters,
pagination, create, delete confirm). State in the summary if anything was
skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-10-L01`.
- No `menusClient` API/cache doc edits (restyle only; no contract change).
