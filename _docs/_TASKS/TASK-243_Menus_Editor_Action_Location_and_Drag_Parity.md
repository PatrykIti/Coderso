# TASK-243: Menus Editor Action, Location, and Drag Parity
# FileName: TASK-243_Menus_Editor_Action_Location_and_Drag_Parity.md

**Priority:** High
**Category:** CMS/Menus + Admin UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-196, TASK-200, TASK-208
**Status:** Done (2026-04-29)

---

## Overview

Bring the Menus editor in line with the rest of the admin editor surfaces after
the list-first Menus work landed.

The current `/admin/menus/:id` editor has three user-facing gaps:

- the top action area still uses `Back to menus` and `Refresh`, while the real
  editor actions (`Discard` and `Save changes`) sit in a secondary status bar;
- draft menus can be published from the list, but the editor does not expose a
  direct `Publish` action even though new menus default to draft;
- `Location` technically works as a theme/runtime slot identifier, but the UI
  still reads like a raw technical field and does not explain the published-menu
  dependency clearly enough;
- drag-and-drop does not match the visible affordance: the six-dot/grip handle
  is not the actual drag source, drop intent is inferred from row offset, and
  nesting via a natural handle drag to the right is unreliable.

This task is a focused editor polish and correctness wave. It must preserve the
existing list-first IA:

- `/admin/menus` remains the list and create entrypoint.
- `/admin/menus/:id` remains the route-selected editor.
- The editor must not reintroduce an active-menu switcher.

## Current Analysis

Source seams reviewed on 2026-04-29:

- `core/admin/ui/menus/MenuEditorPage.tsx`
  - owns metadata, dirty state, item tree state, save/discard, and cache
    hydration;
  - currently renders `Back to menus` and `Refresh` in `PageHeader.actions`;
  - currently renders `Discard` and `Save changes` in a separate status strip;
  - stores `originalMenu` without `status` / `publishedAt`, so the editor cannot
    render lifecycle state or publish from the selected menu detail.
- `core/admin/services/menusClient.ts`
  - already exposes `publishMenu(menuId)` and `moveMenuToDraft(menuId)` through
    `PATCH /menus/:id` with CSRF.
- `core/services/menus/menuService.ts`
  - creates new menus as `draft`;
  - stores `location` as a nullable string;
  - runtime lookup by location is available through
    `getMenuWithItemsByLocation(location)`.
- `core/services/navigation/navigationRuntimeResolver.ts`
  - only uses menu data when the resolved menu is `published`;
  - falls back to manual/default navigation when a menu is draft or empty.
- `core/admin/ui/menus/MenuTree.tsx`
  - infers child vs sibling drop by horizontal row offset only;
  - supports root drop zones at top and bottom.
- `core/admin/ui/menus/MenuItemRow.tsx`
  - marks the whole content button as `draggable`;
  - renders the visible grip with `pointer-events-none`, so the visual handle is
    not the actual drag handle.

## Sub-Tasks

- [x] TASK-243-01: Menus Editor Header Actions and Lifecycle Publish
- [x] TASK-243-02: Menus Location Contract and Editor Guidance
- [x] TASK-243-03: Menu Item Drag Handle and Nesting Drop Contract
- [x] TASK-243-04: Menus Editor Validation, Docs, and Closure

## Scope

1. Header/action parity:
   - remove `Back to menus` and `Refresh` from the editor header actions;
   - place `Discard`, `Save changes`, and menu lifecycle action in the primary
     editor action area;
   - keep contextual refresh only where it is part of an error/remote-update
     recovery state.
2. Lifecycle action parity:
   - expose `Publish` for draft menus from the editor;
   - expose published/draft status in the editor chrome;
   - decide and implement a clear behavior for publishing with unsaved changes:
     persist current editor state first, then publish, with one in-flight guard.
3. Location clarity:
   - keep the current free-text nullable `location` contract;
   - explain that `Location` is the theme/runtime slot key, for example
     `primary` or `footer`;
   - explain that a menu must be published before runtime navigation uses it;
   - document and test the current location lookup path instead of inventing a
     new registry.
4. Drag-and-drop:
   - make the visible grip the only drag start handle;
   - make the full row a reliable drop target;
   - replace the ambiguous sibling/child inference with explicit before, after,
     and child/nest drop intents;
   - support natural nesting by dropping onto a row or dragging right into the
     nest intent preview;
   - add a keyboard-accessible reorder path rather than making DnD pointer-only;
   - preserve cycle prevention and root drop behavior.

## Non-Goals

- No new public menu endpoints.
- No menu database schema change unless a verified defect proves the current
  nullable unique location column is wrong.
- No typed location registry in this task.
- No mega-menu, breakpoint-specific menu tree, or runtime navigation layout
  redesign.
- No broad replacement of the admin drag-and-drop system with a new dependency
  unless native drag events cannot satisfy the acceptance tests.
- No hidden auto-save behavior. `Save changes` and `Publish` remain explicit
  editor actions.

## Architecture

Primary files:

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuTree.tsx`
- `core/admin/ui/menus/MenuItemRow.tsx`
- `core/admin/ui/menus/MenuItemDrawer.tsx`
- `core/admin/services/menusClient.ts`
- `core/services/menus/menuService.ts`
- `core/services/navigation/navigationRuntimeResolver.ts`

Test owners:

- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/menu-editor-validation.test.ts`
- `tests/vitest/ui/menu-tree.test.tsx`
- `tests/vitest/ui/menu-item-row.test.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/validation/menuSchemas.test.ts`
- `tests/integration/routes/menus.test.ts`
- `tests/unit/menus/menuService.test.ts`
- `tests/unit/navigation/navigationRuntimeResolver.test.ts`

Reference surfaces:

- `core/admin/ui/pages/PageEditor.tsx`
  - current editor action placement and publish/save locking model.
- `core/admin/ui/menus/MenuListPage.tsx`
  - existing Menus publish/draft lifecycle actions.

## Security Contract

- Visibility: internal admin Menus UI only.
- Internal endpoints remain `/admin/api/menus*`.
- Auth model: authenticated admin session / admin API key where supported by
  the shared admin stack.
- RBAC:
  - `menus:read` for detail and list reads;
  - `menus:write` for metadata, lifecycle, and item-tree writes.
- CSRF:
  - unchanged; `PATCH /menus/:id` and `PUT /menus/:id/items` remain CSRF
    protected through the admin client.
  - nonce, HMAC/signature, and reCAPTCHA are not applicable because this task
    adds no public write endpoint.
- Rate-limit bucket:
  - unchanged admin read/write buckets.
- Reject-unknown validation:
  - unchanged strict Menus schemas;
  - editor must not emit fields outside the existing route contract.
- Anti-abuse:
  - no public write path;
  - publish/save must keep exact server-side validation and known
    machine-readable errors;
  - Location guidance must not expose internal URLs, secrets, CSRF tokens, or
    raw stack traces.

## Implementation Order

1. Update the editor metadata model so `status` and `publishedAt` are available
   in `MenuEditorPage`.
2. Move editor actions into the header and add publish/draft lifecycle handling
   with a synchronous in-flight guard.
3. Clarify `Location` UI copy and verify the service/runtime lookup contract.
4. Replace the drag source/drop-intent model with handle-only drag and explicit
   before/after/child intents.
5. Update focused tests, docs, changelog, and board status.

## Testing Requirements

- Focused Vitest:
  - `bun run test:vitest -- tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts`
- Bun route/service/runtime tests if location or lifecycle route/service code is
  touched:
  - `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts tests/unit/navigation/navigationRuntimeResolver.test.ts`
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
- Final Coderso gate during closure:
  - `bun run gates:coderso`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` only if route payload behavior changes
- `_docs/DATA_MODEL.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a matching changelog entry on completion

## Acceptance Criteria

1. `/admin/menus/:id` no longer shows primary `Back to menus` or `Refresh`
   header buttons.
2. The editor header exposes the real editor actions: `Discard`, `Save changes`,
   and lifecycle publish/draft action based on menu status.
3. Publishing from the editor persists current valid editor state first and
   cannot race with save.
4. `Location` is understandable as a theme/runtime slot and remains compatible
   with the current nullable free-text contract.
5. Drag starts only from the visible grip handle.
6. The full row is a reliable drop target, with visible before/after/child
   feedback and deterministic nesting.
7. Keyboard users can reorder menu items through the chosen accessible reorder
   contract.
8. Cycle prevention, root moves, dirty-state tracking, cache invalidation, and
   existing item validation keep working.
