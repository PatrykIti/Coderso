# 721. TASK-196 menus list-first editor and UX closure

Date: 2026-04-22
Version: unreleased
Tasks: TASK-196, TASK-196-01, TASK-196-02, TASK-196-03, TASK-196-04

## Key Changes

### Admin/UI Menus

- Split Menus into a list-first admin flow:
  - `/admin/menus` now shows a dedicated list page,
  - `/admin/menus/:id` now edits exactly one chosen menu.
- Removed the editor-local `Active menu` dropdown and `New Menu` action so the
  editor no longer switches between unrelated menus.
- Added a branded delete confirmation dialog for menu items, including
  descendant impact messaging before removal.
- Improved the tree editing surface with stronger nested-item hints, clearer
  drag target feedback, and explicit row action labels.
- Added visible success feedback after saving menu changes.
- Clarified `Location` and `Icon Name` guidance without changing the stored menu
  contract.

### Docs

- Updated Menus source-of-truth docs for the new list + editor split:
  - `_docs/CMS_SPEC.md`
  - `_docs/ADMIN_CACHE.md`
  - `_docs/ADMIN_CACHE_MAP.md`
  - `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
  - `docs/screens/menus.md`
- Closed the `TASK-196` family in `_docs/_TASKS/README.md`.

## Validation

- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun run test:vitest -- tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-item-form.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/admin/adminApp.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
