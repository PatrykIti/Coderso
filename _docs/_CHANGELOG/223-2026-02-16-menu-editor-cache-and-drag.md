# 223-2026-02-16 - Menu editor cache and drag nesting

Date: 2026-02-16
Version: Unreleased
Tasks: TASK-006-02

## Key Changes
- Admin/UI: Menu editor now hydrates from cached menus and refreshes in the background with cross-tab sync.
- Admin/UI: Refresh keeps the active menu loaded and preserves the selected item panel.
- Admin/UI: Drag-and-drop supports sibling reorder plus right-drag nesting, with drop zones to move items back to the top level and full-row drag affordance.
- Admin/UI: Menu details panel appears only when a menu item is selected; save/discard actions live under the header.
- Docs: Updated admin cache references to include menus.
