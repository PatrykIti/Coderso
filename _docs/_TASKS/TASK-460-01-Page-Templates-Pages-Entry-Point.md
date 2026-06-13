# TASK-460-01: Page Templates Pages Entry Point
# FileName: TASK-460-01-Page-Templates-Pages-Entry-Point.md

**Parent Task:** TASK-460
**Priority:** Medium
**Category:** Pages / Templates / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420, TASK-460
**Status:** ✅ Done
**Started:** 2026-06-13
**Completed:** 2026-06-13

---

## Overview

Execute the UI-only relocation of the Page Templates entry point so Page
Templates is discovered from the Pages surface instead of Advanced navigation.

This subtask owns the implementation contract and closure evidence for the
first pragmatic phase only. It must keep the existing Page Templates route,
service, cache, API, and data model untouched.

---

## Sub-Tasks

- [x] TASK-460-01-L01: Relocate Page Templates into the Pages header.

---

## Implementation Pseudocode

```ts
function executePageTemplatesEntryPointRelocation() {
  const currentRoutes = [
    "/advanced/page-templates",
    "/advanced/page-templates/:id"
  ];
  assertRoutesRemainRegistered(currentRoutes);

  hideAdvancedNavItem("page-templates");
  addPagesHeaderTemplatesButton({
    href: "/advanced/page-templates",
    label: "Templates",
    placement: "before-new"
  });
  alignPageTemplatesShellWithPages({
    activeHref: "/admin/pages",
    breadcrumbs: ["Content", "Pages", "Templates"]
  });
  updateTestsAndDocs();
}
```

Expected data flow:

- Pages list still loads only Pages data through `pagesClient`.
- The new `Templates` header action is a navigation affordance and must not
  fetch Page Templates from `PageListPage`.
- Page Templates keeps using the TASK-420 `pageTemplatesClient` and cache keys.
- Existing bookmarks to `/advanced/page-templates` continue to work.

Error handling:

- Preserve existing guarded-route behavior for users without Page Templates
  visibility.
- Do not introduce `/pages/templates` in this phase.
- Do not let the Pages create flow or selected-row bulk action state hide the
  Page Templates entry point unexpectedly.

---

## Security / Permissions Boundary

- No new endpoints.
- No public route or public write path.
- Existing admin session, RBAC, CSRF, validation, and rate-limit behavior stay
  unchanged.
- The Pages header button must not expose secrets, payloads, or privileged
  settings in the browser.

---

## Testing Requirements

- Vitest UI/admin coverage from TASK-460-01-L01.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Optional live smoke with `coderso-dev-core-host` and `playwright-cli` when
  closing the task.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-460*.md`
- `_docs/_TASKS/README.md`
- User-facing Page Templates/Pages docs if they mention Advanced navigation.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` at completion.

---

## Completion Notes

Completed 2026-06-13 via TASK-460-01-L01. The subtask kept the implementation
inside admin UI/navigation and documentation. No backend route, API, cache key,
database, or public runtime behavior changed.
