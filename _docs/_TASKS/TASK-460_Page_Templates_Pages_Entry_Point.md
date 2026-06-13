# TASK-460: Page Templates Pages Entry Point
# FileName: TASK-460_Page_Templates_Pages_Entry_Point.md

**Priority:** Medium
**Category:** Pages / Templates / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420
**Status:** ⏳ To Do

---

## Overview

Move the visible Page Templates entry point from **Advanced > Page Templates** to
the Pages surface without changing the backend, API contracts, data model,
cache keys, or canonical route family yet.

Page Templates are Page v2 section-stack templates and are applied to Pages, so
the day-to-day entry point should live with Pages. The current
`/advanced/page-templates` route may remain as the technical route for
compatibility in this task. A later IA cleanup can introduce a canonical
`/pages/templates` route/alias if the product wants that URL migration.

Current desired UX:

- The main sidebar no longer shows `Page Templates` under `Advanced`.
- The `Pages` list header gets a secondary `Templates` button immediately to
  the left of the existing `New` button.
- The `Templates` button opens the existing Page Templates surface.
- The Page Templates surface should visually belong to `Pages` in shell state:
  Pages is the active sidebar item and breadcrumbs read like
  `Content / Pages / Templates`.
- Existing create/edit/delete/preview behavior for Page Templates must stay
  unchanged.

Out of scope:

- No backend route rewrites.
- No database or migration work.
- No Page Templates service/client/cache key changes.
- No `/pages/templates` canonical URL migration.
- No public runtime behavior changes.

---

## Sub-Tasks

- [ ] TASK-460-01: Page Templates Pages entry point UI relocation.

---

## Implementation Pseudocode

```tsx
function movePageTemplatesEntryPoint() {
  // Keep TASK-420 route/client/service contracts stable.
  keepAdminRoutes([
    "/advanced/page-templates",
    "/advanced/page-templates/:id"
  ]);

  updateAdvancedModuleRegistry("page-templates", {
    // Preserve the module definition for dependency/catalog metadata, but hide
    // it from the Advanced sidebar.
    nav: null
  });

  updatePagesHeaderActions(({ selectedCount }) => (
    <>
      {selectedCount > 0 ? <PageBulkActionsBar /> : null}
      <Button asChild variant="outline" className="gap-2">
        <AdminLink href="/advanced/page-templates" prefetch>
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </AdminLink>
      </Button>
      <Button onClick={openCreateDrawer} className="gap-2">
        <Plus className="h-4 w-4" />
        New
      </Button>
    </>
  ));

  updatePageTemplatesShell({
    activeHref: "/admin/pages",
    breadcrumbs: [
      { label: "Content" },
      { label: "Pages", href: "/pages" },
      { label: "Templates" }
    ]
  });
}
```

Expected data flow:

- Pages list renders from the existing `PageListPage` cache flow.
- The new `Templates` button navigates to the existing Page Templates route and
  uses existing prefetch/cache behavior.
- Page Templates list/editor still use `pageTemplatesClient`,
  `cacheKeys.pageTemplatesList`, and `cacheKeys.pageTemplateDetail`.
- Existing URLs keep working for bookmarks and internal links.

Error handling:

- Do not add a second Page Templates route unless this task is explicitly
  expanded.
- Do not treat `/pages/templates` as a page ID.
- If the route is unavailable because permissions are missing, preserve the
  existing route guard behavior.
- Do not duplicate page-template fetch logic inside `PageListPage`; the button
  is navigation only.

Regression-test shape:

- `PageListPage` SSR/render test asserts `Templates` appears before `New` in
  the header actions and links to the existing Page Templates surface.
- `advanced-modules` test asserts Page Templates no longer appears in default
  Advanced navigation while the module definition still exists if needed by
  catalog/dependency metadata.
- `page-templates-surface` test asserts the Page Templates shell uses Pages as
  the active sidebar context and shows Pages-oriented breadcrumbs.
- Prefetch tests remain green for the existing `/advanced/page-templates`
  route.

---

## Security / Permissions Boundary

- **Endpoint visibility:** unchanged; existing internal admin Page Templates
  endpoints remain the only write/read API surface for this feature.
- **Auth model:** unchanged existing admin session.
- **RBAC:** unchanged `content:read` route visibility and existing write
  permission behavior in the Page Templates surface.
- **CSRF:** unchanged; no new writes are introduced by the Pages header button.
- **Rate limits:** unchanged.
- **Validation:** unchanged Page v2 Page Templates schema/service validation.
- **Anti-abuse controls:** no new public endpoint, no new browser-stored
  secrets, and no public runtime behavior changes.

---

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If the implementation touches route matching or introduces a new URL alias,
  also run `tests/vitest/admin/adminApp.test.tsx` and add explicit route-order
  coverage to prove `/pages/templates` is not consumed by `/pages/:id`.
- Optional live smoke for implementation closure: start `coderso-dev-core-host`
  and use `playwright-cli` to open Pages, click `Templates`, verify Page
  Templates loads, then return to Pages and open `New`.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `docs/guide/screens/page-editor-preview-settings-and-history.md` if the Pages
  screen guide references template entry points.
- Any Page Templates user-facing guide that says the feature lives under
  Advanced navigation.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` when the
  implementation is completed.
