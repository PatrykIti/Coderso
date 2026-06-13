# TASK-461: Hide Advanced Widgets Entry Point
# FileName: TASK-461_Hide_Advanced_Widgets_Entry_Point.md

**Priority:** Medium
**Category:** Widgets / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420, TASK-458-03, TASK-460
**Status:** ⏳ To Do

---

## Overview

Hide the visible **Advanced > Widgets** entry point from the admin UI for now,
without removing the underlying widget registry, editor code, routes, services,
tests, or runtime contracts.

The product direction after TASK-420, TASK-458, and TASK-460 is that daily
authoring should happen through Pages, Page Templates, and Menus:

- Pages use the Page Editor and its in-context block/widget palette.
- Page Templates are entered from Pages and reuse the Page Editor surface.
- Menus now own their own design editor with a restricted palette.

The standalone Widgets surface is no longer a primary navigation destination for
those workflows. This task only hides the UI entry point. A future cleanup task
can audit and remove the remaining standalone widget library route/code when
the team is ready.

Current desired UX:

- The main sidebar no longer shows `Widgets` under `Advanced`.
- Existing internal widget registry and Page Editor widget palette keep working.
- Existing `/advanced/widgets` route can remain reachable for compatibility,
  tests, and later removal planning.
- No backend, database, API, cache, public runtime, or widget-rendering behavior
  changes in this phase.

Out of scope:

- No deletion of widget registry, widget editors, widget catalog service, or
  widget tests.
- No removal of `/advanced/widgets` route.
- No Page Editor palette changes.
- No public runtime widget behavior changes.
- No migration or data-model work.

---

## Sub-Tasks

- [ ] TASK-461-01: Advanced Widgets entry point hide.

---

## Implementation Pseudocode

```ts
function planHideAdvancedWidgetsEntryPoint() {
  keepRoutes([
    "/advanced/widgets"
  ]);
  keepInternalWidgetSurfaces([
    "PageEditor palette",
    "PageTemplates editor host",
    "MenuDesign restricted palette",
    "widget registry",
    "widget runtime renderers"
  ]);

  updateAdvancedModuleRegistry("widgets", {
    nav: null
  });

  updateTests({
    advancedNav: "does not include Widgets by default",
    directRoute: "existing /advanced/widgets route still renders",
    pageEditor: "widget palette still available in editor context"
  });
}
```

Expected data flow:

- Advanced sidebar construction keeps using `buildAdvancedNavItems`.
- The `widgets` module may remain in `ADVANCED_MODULE_REGISTRY` for dependency,
  capability, operation-policy, and future removal-audit metadata.
- `buildWidgetCatalog`, Page Editor registry helpers, and widget runtime code
  remain unchanged.
- Existing direct route handling for `/advanced/widgets` remains unchanged until
  a dedicated removal task decides otherwise.

Error handling:

- Do not break solution-kit or operation-policy metadata that references the
  `widgets` module.
- Do not remove widget permissions or route guards in this task.
- If feature flags explicitly enable `widgets`, document whether the hidden nav
  should remain hidden or whether future diagnostics/admin-only affordances need
  a separate decision. Default product nav should hide it.

---

## Security / Permissions Boundary

- **Endpoint visibility:** unchanged; no new endpoint.
- **Auth model:** unchanged admin session behavior.
- **RBAC:** unchanged existing route permission behavior.
- **CSRF:** unchanged; no writes are introduced.
- **Rate-limit bucket:** unchanged.
- **Validation:** unchanged widget registry and Page Editor validation.
- **Anti-abuse controls:** no public endpoint, no new stored browser payload,
  no exposure of internal widget/debug metadata in the sidebar.

---

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/adminApp.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If the implementation touches Page Editor palette logic, also run the
  relevant Page Editor UI tests that own widget insertion and palette behavior.
- Optional live smoke: start `coderso-dev-core-host`, use `playwright-cli`,
  verify Advanced no longer lists Widgets, then open a Page Editor and confirm
  widget/block insertion still works through the editor palette.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-461*.md`
- User-facing admin orientation/navigation docs if they mention Advanced >
  Widgets as a primary destination.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` when completed.

---

## Future Removal Follow-Up

Create a separate follow-up when ready to remove the standalone Widgets surface
instead of only hiding it. That follow-up should audit:

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/navigation/advancedModules.ts`
- widget catalog service/routes/tests,
- assistant/operation-policy references to `widgets`,
- docs and guide entries that still describe the old standalone surface.
