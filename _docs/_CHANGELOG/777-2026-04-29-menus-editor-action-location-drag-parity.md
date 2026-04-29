# 777. TASK-243 menus editor action, location, and drag parity

Date: 2026-04-29
Version: 1.0.0
Tasks: TASK-243, TASK-243-01, TASK-243-02, TASK-243-03, TASK-243-04

## Key Changes

### CMS Menus/Admin UI
- Moved Menus editor actions into the editor header: `Discard`,
  `Save changes`, `Publish`, and `Move to Draft`.
- Added lifecycle-safe publishing from the editor so valid metadata and item
  changes persist before a draft menu becomes published.
- Clarified `Theme location` as a nullable theme/runtime slot key and surfaced
  whether draft menus are hidden from runtime navigation.
- Reworked menu item drag-and-drop so the visible grip is the drag source,
  rows resolve deterministic before/after/child intents, and keyboard reorder
  actions are available.

### Documentation
- Updated Menus screen guidance, CMS/API/model notes, list lifecycle UX, and
  admin cache policy for the final editor contract.
- Closed TASK-243 board rows and synchronized the task index.

## Validation

- PASS `bun run test:vitest -- tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts`
- PASS `bun --cwd core lint`
- PASS `bun --cwd core lint:types`
- PASS `git diff --check`
- PASS `bun run gates:coderso`
  - DB-backed gate checks were skipped because `DATABASE_URL` was not
    configured in this worktree environment.
