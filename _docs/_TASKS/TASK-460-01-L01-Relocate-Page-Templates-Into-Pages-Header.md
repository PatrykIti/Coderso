# TASK-460-01-L01: Relocate Page Templates Into Pages Header
# FileName: TASK-460-01-L01-Relocate-Page-Templates-Into-Pages-Header.md

**Parent Subtask:** TASK-460-01
**Priority:** Medium
**Category:** Pages / Templates / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420, TASK-460-01
**Status:** ✅ Done
**Started:** 2026-06-13
**Completed:** 2026-06-13

---

## Overview

Implement the UI-only Page Templates IA change:

- hide Page Templates from the Advanced sidebar,
- add a `Templates` button in the Pages list header immediately before `New`,
- keep the existing `/advanced/page-templates` route as the link target,
- make the Page Templates surface feel owned by Pages through active shell state
  and breadcrumbs,
- keep backend/API/cache behavior unchanged.

---

## Implementation Pseudocode

```tsx
function updateAdvancedModules() {
  return ADVANCED_MODULE_REGISTRY.map((module) =>
    module.id === "page-templates"
      ? { ...module, nav: null }
      : module
  );
}

function PagesHeaderActions({ selectedCount }) {
  return (
    <>
      {selectedCount > 0 ? <PageBulkActionsBar /> : null}
      <Button asChild variant="outline" className="gap-2">
        <AdminLink href="/advanced/page-templates" prefetch>
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </AdminLink>
      </Button>
      <Button className="gap-2" onClick={openCreateDrawer}>
        <Plus className="h-4 w-4" />
        New
      </Button>
    </>
  );
}

function PageTemplatesShell() {
  return (
    <AdminShell
      activeHref="/admin/pages"
      breadcrumbs={[
        { label: "Content" },
        { label: "Pages", href: "/pages" },
        { label: "Templates" }
      ]}
    >
      <PageTemplatesList />
    </AdminShell>
  );
}
```

Expected data flow:

- `PageListPage` renders the `Templates` action from header state only.
- `AdminLink`/shared admin path helpers handle navigation and admin base path.
- Existing Page Templates list/editor routes continue to use the current
  `PageTemplatesRoute` and `PageTemplateEditorRoute`.
- Existing Page Templates prefetch for `/advanced/page-templates` remains
  intact.

Error handling:

- If the current user lacks route permission, the existing guarded route
  behavior handles the Page Templates route.
- If prefetch fails, navigation should still work the same way as other admin
  links.
- Selected Pages bulk state must not remove the `Templates` navigation action.

Regression-test shape:

- Update `tests/vitest/ui/page-list.test.tsx` or
  `tests/vitest/ui/page-post-list-wave.test.tsx` to assert the Pages header
  contains `Templates` before `New` and links to `/admin/advanced/page-templates`
  or canonical resolved equivalent.
- Update `tests/vitest/admin/advanced-modules.test.ts` so default Advanced nav
  no longer includes `Page Templates`, while the module can remain in registry
  metadata if other tests need dependency/catalog awareness.
- Update `tests/vitest/ui/page-templates-surface.test.tsx` to assert the shell
  uses Pages-oriented active state/breadcrumbs and still renders existing list
  affordances.
- Keep `tests/vitest/admin/adminPrefetch.test.ts` green for
  `/advanced/page-templates`.

---

## Security / Permissions Boundary

- **Endpoint visibility:** unchanged internal admin endpoints only.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged route permission behavior.
- **CSRF:** unchanged; this leaf adds no write action.
- **Rate-limit bucket:** unchanged.
- **Validation:** unchanged Page Templates schema/service validation.
- **Anti-abuse controls:** no new public endpoint, no new persisted browser
  payload, no raw settings/secrets in UI, no route alias that could be confused
  with a Page ID.

---

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If route matching is touched despite the current scope, also run
  `tests/vitest/admin/adminApp.test.tsx` and add explicit route-order coverage.
- Optional live smoke: start `coderso-dev-core-host`, use `playwright-cli`,
  open Pages, click `Templates`, verify Page Templates loads, then return to
  Pages and open `New`.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-460*.md`
- `_docs/_TASKS/README.md`
- `docs/guide/screens/page-editor-preview-settings-and-history.md` if it
  mentions template entry points.
- Page Templates guide docs if they mention Advanced navigation.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` at completion.

---

## Completion Notes

Completed 2026-06-13.

Implemented:

- hid Page Templates from the default Advanced sidebar by keeping the registry
  module but removing its visible nav config,
- added a `Templates` action to the Pages header before `New`,
- kept `Templates` as a navigation-only affordance through `AdminLink`,
- changed the Page Templates shell active state/breadcrumbs to flow through
  Pages,
- preserved `/advanced/page-templates` and `/advanced/page-templates/:id` as
  the existing route family.

Validation passed:

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
