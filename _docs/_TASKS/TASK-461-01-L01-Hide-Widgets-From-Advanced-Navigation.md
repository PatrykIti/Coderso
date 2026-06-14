# TASK-461-01-L01: Hide Widgets From Advanced Navigation
# FileName: TASK-461-01-L01-Hide-Widgets-From-Advanced-Navigation.md

**Parent Subtask:** TASK-461-01
**Priority:** Medium
**Category:** Widgets / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420, TASK-458-03, TASK-460-01-L01
**Status:** ✅ Done
**Started:** 2026-06-13
**Completed:** 2026-06-13

---

## Overview

Hide `Widgets` from the default Advanced sidebar while keeping the standalone
Widgets route and all internal widget systems intact.

This is deliberately a UI-entry-point hide, not a removal. Pages, Page
Templates, and Menus must continue to use widget/block infrastructure through
their own contextual editor surfaces.

---

## Implementation Pseudocode

```ts
function updateAdvancedWidgetsModule() {
  return ADVANCED_MODULE_REGISTRY.map((module) =>
    module.id === "widgets"
      ? { ...module, nav: null }
      : module
  );
}

function regressionTests() {
  expect(buildAdvancedNavItems().map((item) => item.label)).not.toContain("Widgets");
  expect(ADVANCED_MODULE_REGISTRY.find((item) => item.id === "widgets")).toBeDefined();
  expect(route("/admin/advanced/widgets")).toStillRenderWidgetLibrary();
  expect(pageEditorPalette()).toStillExposeSupportedPageBlocks();
}
```

Expected data flow:

- `buildAdvancedNavItems()` skips `widgets` because `nav` is null.
- `ADVANCED_MODULE_REGISTRY` still contains the `widgets` module.
- `/advanced/widgets` route registration remains unchanged in `AdminApp`.
- Widget catalog and Page Editor palette code paths remain unchanged.

Error handling:

- Do not remove the `widgets` module ID from type unions or registry arrays.
- Do not delete route imports/lazy route components.
- Do not remove widget catalog cache/prefetch behavior unless a separate
  removal task owns that change.
- If tests or docs assume `Widgets` appears in default Advanced navigation,
  update them to assert the hidden UI-entry-point contract instead.

Regression-test shape:

- Update `tests/vitest/admin/advanced-modules.test.ts` so default Advanced nav
  no longer includes `Widgets`, while the `widgets` module still exists.
- Keep or add route coverage proving `/admin/advanced/widgets` still renders
  while the route remains in compatibility mode.
- Keep Page Editor palette tests green; run targeted Page Editor tests only if
  palette code is touched.
- Keep widget library tests green for the direct route.

---

## Security / Permissions Boundary

- **Endpoint visibility:** unchanged.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged existing route permission for direct route access.
- **CSRF:** unchanged; no writes are added.
- **Rate-limit bucket:** unchanged.
- **Validation:** unchanged widget catalog and Page Editor validation.
- **Anti-abuse controls:** no new public route, no new browser cache payload,
  and no privileged widget/debug metadata exposed through navigation.

---

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/adminApp.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If Page Editor palette code changes, also run the relevant Page Editor
  insertion/palette suites before closure.
- Optional live smoke: start `coderso-dev-core-host`, use `playwright-cli`,
  verify Advanced no longer lists Widgets and a Page Editor still exposes its
  contextual palette.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-461*.md`
- `_docs/_TASKS/README.md`
- Navigation/admin guide docs that still describe Advanced > Widgets.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` at completion.

---

## Completion Notes

Completed 2026-06-13.

Implemented:

- set `widgets.nav` to `null` in the Advanced module registry,
- kept the `widgets` module ID and metadata in the registry,
- kept `/advanced/widgets` route registration untouched,
- updated Advanced navigation tests to assert hidden default nav plus retained
  direct-route compatibility,
- updated docs that still described Widgets as a visible Advanced navigation
  destination.

Validation passed:

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
