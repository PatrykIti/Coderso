# TASK-461-01: Hide Advanced Widgets Entry Point
# FileName: TASK-461-01-Hide-Advanced-Widgets-Entry-Point.md

**Parent Task:** TASK-461
**Priority:** Medium
**Category:** Widgets / Admin IA
**Estimated Effort:** Small
**Dependencies:** TASK-420, TASK-458-03, TASK-460
**Status:** ✅ Done
**Started:** 2026-06-13
**Completed:** 2026-06-13

---

## Overview

Execute the UI-only hide of the standalone Advanced Widgets navigation entry.
The implementation must preserve all internal widget infrastructure used by
Pages, Page Templates, Menus, and public runtime rendering.

This subtask exists to keep TASK-461 as a proper umbrella while giving the
implementation leaf a concrete technical contract.

---

## Sub-Tasks

- [x] TASK-461-01-L01: Hide Widgets from Advanced navigation.

---

## Implementation Pseudocode

```ts
function hideAdvancedWidgetsNavigationOnly() {
  const widgetsModule = findAdvancedModule("widgets");
  assert(widgetsModule);
  preserve(widgetsModule.id);
  preserve(widgetsModule.dependencies);
  preserveRoute("/advanced/widgets");

  setAdvancedModuleNav("widgets", null);

  verifyNoDailyEntryPoint("Advanced", "Widgets");
  verifyDirectRouteStillWorks("/admin/advanced/widgets");
  verifyPageEditorPaletteStillWorks();
}
```

Expected data flow:

- The default Advanced nav omits Widgets.
- The module remains available in registry metadata for dependencies and future
  cleanup planning.
- Existing direct route, lazy route component, and widget catalog internals stay
  unchanged.

Error handling:

- Avoid deleting imports or route components that are still needed by direct
  route tests.
- Avoid breaking feature-flag behavior for other Advanced modules.
- Do not weaken permissions or route guards.

---

## Security / Permissions Boundary

- No new endpoints or writes.
- Existing widget route permission and admin-session behavior remain unchanged.
- Existing CSRF/rate-limit/validation behavior is unchanged because no backend
  contract changes.

---

## Testing Requirements

- Tests from TASK-461-01-L01.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Optional live smoke with `coderso-dev-core-host` and `playwright-cli`.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-461*.md`
- `_docs/_TASKS/README.md`
- User-facing docs if they mention Advanced > Widgets.
- Changelog on completion.

---

## Completion Notes

Completed 2026-06-13 through TASK-461-01-L01. This subtask only changed visible
admin navigation and related documentation/tests. Direct route compatibility
and widget infrastructure remain available for support/future removal planning.
