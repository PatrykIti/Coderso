# TASK-243-04: Menus Editor Validation, Docs, and Closure
# FileName: TASK-243-04_Menus_Editor_Validation_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-243-01, TASK-243-02, TASK-243-03
**Status:** To Do

---

## Overview

Close TASK-243 with focused test evidence, updated Menus documentation, task
board synchronization, and changelog coverage.

This leaf does not add new product scope. It verifies that the header action
changes, Location guidance, lifecycle publish behavior, and drag-and-drop
contract work together without regressing the list-first Menus flow.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` only if route payload behavior changed
- `_docs/DATA_MODEL.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/TASK-243*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/{N}-YYYY-MM-DD-menus-editor-action-location-drag-parity.md`

## Security Contract

- Visibility:
  - no new endpoints in this closure leaf;
  - inherited internal admin routes remain `/admin/api/menus*`;
  - inherited public runtime navigation reads remain read-only.
- Auth model:
  - authenticated admin session / admin API key where supported by the shared
    admin stack for admin Menus writes;
  - public runtime reads stay on existing site/widget rendering paths.
- RBAC:
  - unchanged `menus:read` / `menus:write`.
- CSRF:
  - unchanged for admin `PATCH /menus/:id` and `PUT /menus/:id/items`;
  - nonce, HMAC/signature, and reCAPTCHA are not applicable because this family
    adds no public write endpoint.
- Rate-limit bucket:
  - unchanged admin read/write buckets.
- Reject-unknown validation:
  - confirm strict Menus payload validation remains covered if route/service
    code changed in the family.
- Anti-abuse:
  - confirm no public write path was introduced;
  - confirm drag/drop remains local draft state until explicit save/publish;
  - confirm docs do not instruct users to enter secrets or arbitrary class/script
    values into Location.

## Implementation Pseudocode

```ts
async function closeTask243() {
  const vitestResult = await run(
    "bun run test:vitest -- tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts"
  );
  if (!vitestResult.ok) throw new Error("Stop closure and fix TASK-243 regressions.");

  if (routeServiceRuntimeBehaviorChanged) {
    const bunResult = await run(
      "set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts tests/unit/navigation/navigationRuntimeResolver.test.ts"
    );
    if (!bunResult.ok) throw new Error("Stop closure and fix Menus route/service/runtime regressions.");
  }

  await run("bun --cwd core lint");
  await run("bun --cwd core lint:types");
  await run("git diff --check");
  await run("bun run gates:coderso");

  updateDocs([
    "docs/screens/menus.md",
    "_docs/DATA_MODEL.md",
    "_docs/CONTENT_LIST_UX.md",
    "_docs/ADMIN_CACHE.md",
  ]);
  addChangelogEntry("menus-editor-action-location-drag-parity");
  markTaskFamilyDone(["TASK-243", "TASK-243-01", "TASK-243-02", "TASK-243-03", "TASK-243-04"]);
  recomputeTaskBoardStats();
}
```

If any required suite is blocked by missing DB/env, record the exact command,
error, and rerun requirement in the task completion notes instead of marking the
coverage as green.

## Testing Requirements

Run targeted suites first:

```sh
bun run test:vitest -- \
  tests/vitest/ui/menu-editor-shell-wave.test.tsx \
  tests/vitest/ui/menu-editor-validation.test.ts \
  tests/vitest/ui/menu-tree.test.tsx \
  tests/vitest/ui/menu-item-row.test.tsx \
  tests/vitest/ui/menu-leaf-components.test.tsx \
  tests/vitest/admin/menusClient.test.ts
```

Run Bun suites if any route, service, runtime resolver, or location payload
behavior changed:

```sh
set -a && source .env && set +a && bun test \
  tests/integration/routes/menus.test.ts \
  tests/unit/menus/menuService.test.ts \
  tests/unit/navigation/navigationRuntimeResolver.test.ts
```

Run baseline checks:

```sh
bun --cwd core lint
bun --cwd core lint:types
git diff --check
```

Run final Coderso gate before closure:

```sh
bun run gates:coderso
```

## Manual QA Checklist

1. Create a new menu from `/admin/menus`.
2. Open `/admin/menus/:id`.
3. Confirm the editor header does not show `Back to menus` or primary
   `Refresh`.
4. Confirm `Discard`, `Save changes`, and `Publish` are visible for a draft
   menu.
5. Enter a Location such as `primary` and confirm the helper copy explains the
   theme/runtime slot meaning.
6. Add at least three menu items.
7. Drag from the grip handle only.
8. Drop before another row and confirm same-level order.
9. Drop after another row and confirm same-level order.
10. Drop onto/right of a row and confirm child nesting.
11. Try to drag a parent into its own child and confirm the move is blocked.
12. Save changes.
13. Publish the menu from the editor.
14. Reload the editor and confirm structure, Location, and status persisted.

## Documentation Updates Required

- `docs/screens/menus.md`
  - fix stale list-screen copy that still mentions list `Refresh` / `New Menu`;
    the current list contract uses compact `New` and no primary list `Refresh`;
  - remove instructions that point users to header `Back to menus` / `Refresh`;
  - document header `Discard`, `Save changes`, and `Publish`;
  - update drag instructions to say the grip is the drag handle;
  - explain before/after/child drop behavior;
  - explain Location as a theme/runtime slot and the published-menu dependency.
- `_docs/DATA_MODEL.md`
  - ensure `menus.location` is documented as nullable string slot key, unique
    when set, not a hard-coded enum unless code enforces one.
- `_docs/CONTENT_LIST_UX.md`
  - mention editor lifecycle action parity if list lifecycle remains the source
    reference.
- `_docs/ADMIN_CACHE.md`
  - update only if action/cache refresh semantics changed.
- `_docs/_TASKS/README.md`
  - move TASK-243 family rows to Done and update statistics when implementation
    closes.
- `_docs/_CHANGELOG/README.md`
  - add the closing changelog row.

## Acceptance Criteria

1. All TASK-243 leaves are Done with dated completion notes.
2. Targeted tests and baseline checks are recorded.
3. DB-backed Bun suites are run when route/service/runtime behavior changed, or
   the skip reason is explicitly documented.
4. Menus docs describe the final editor actions, Location behavior, and DnD
   behavior.
5. Task board statistics and changelog index are synchronized.
