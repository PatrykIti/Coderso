# TASK-175: Solution Kit Module Focus and Screens Convergence
# FileName: TASK-175_Solution_Kit_Module_Focus_and_Screens_Convergence.md

**Priority:** High
**Category:** Coderso/Solution Kits + Admin IA
**Estimated Effort:** Medium
**Dependencies:** TASK-054-13, TASK-054-22, TASK-172, TASK-173
**Status:** Done (2026-04-12)

---

## Overview

Fix the split between solution-kit module focus and the existing `Coderso > Screens` surface.

Before this task, Solution Kits could narrow the Coderso sidebar from kit `recommendedModules`, but the kit module lists did not include `custom-screens`. The result was that `Screens` existed in the module registry and routes, and LLM Guide catalog blueprints could create custom screens, but selecting an active Solution Kit could hide the `Screens` module from the sidebar.

## Sub-Tasks

No child task files.

## Architecture

The active-kit sidebar focus must use one path:
- kit recommended modules and manifest modules define the selected module set,
- the module registry expands dependencies,
- content kits that include `engine + entries + widgets` keep `custom-screens` visible,
- `Solution Kits` remains visible for switching active kit focus.

This task does not add new Solution Kit custom-screen installer resources. It aligns visibility and module focus so existing custom screens are not hidden by active kit focus.

## Pseudocode

```ts
const enabled = collectKitModules(kit);

for (const moduleId of enabled) {
  addModuleAndDependencies(moduleId);
}

if (enabled.has("engine") && enabled.has("entries") && enabled.has("widgets")) {
  addModuleAndDependencies("custom-screens");
}
```

## Files to Change

- `core/services/kits/solutionKitsCatalog.ts`
- `core/admin/services/solutionKitSelection.ts`
- `tests/unit/kits/solutionKitsCatalog.test.ts`
- `tests/vitest/admin/solutionKitSelection.test.ts`
- `tests/vitest/admin/coderso-modules.test.ts`
- `_docs/SOLUTION_KITS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: admin UI module visibility only; no new API route.
- Auth model: unchanged existing admin session.
- RBAC: nav items still carry their existing route permissions; this task does not grant permissions.
- CSRF: not applicable; no write endpoint change.
- Rate-limit bucket: not applicable; no route change.
- Reject-unknown validation: not applicable; no payload schema change.
- Anti-abuse: no public write path.
- Idempotency: not applicable.
- Secret handling: no secret-bearing data added to browser storage.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - `tests/vitest/admin/solutionKitSelection.test.ts`
  - `tests/vitest/admin/coderso-modules.test.ts`
- Bun:
  - `tests/unit/kits/solutionKitsCatalog.test.ts`

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for `TASK-175`.

## Acceptance Criteria

1. Active Solution Kit focus keeps `Coderso > Screens` visible for kits that include `engine`, `entries`, and `widgets`.
2. Active Solution Kit focus expands registry dependencies such as `booking -> listings` and `commerce -> listings + filters`.
3. Kit cards/manifests no longer omit `custom-screens` from content-oriented recommended modules.
4. No new legacy configuration path is introduced.

## Completion Notes (2026-04-12)

- Added `custom-screens` to all current Solution Kit recommended module scopes.
- Added missing dependency modules such as `listings` and `filters` where registry dependencies require them.
- Updated active kit focus to expand module dependencies from `CODERSO_MODULE_REGISTRY`.
- Kept `custom-screens` visible whenever an active kit has the `engine + entries + widgets` content authoring stack.
