# 778. TASK-245 menus drag handle hit target

Date: 2026-04-30
Version: 1.0.0
Tasks: TASK-245

## Key Changes

### CMS Menus/Admin UI
- Widened the Menus editor item drag handle to a clear 48px lane.
- Prevented the nested grip SVG from becoming a pointer target so the painted
  handle area maps back to the draggable handle button.
- Preserved the handle-only drag contract: row content, edit, delete, and
  keyboard reorder controls remain separate from native drag start behavior.

### Documentation
- Added TASK-245 with implementation pseudocode, security contract, acceptance
  criteria, and validation plan.
- Updated the task board and changelog index.

## Validation

- PASS `bun run test:vitest -- tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-editor-validation.test.ts`
- PASS `bun --cwd core lint`
- PASS `bun --cwd core lint:types`
- PASS `git diff --check`
