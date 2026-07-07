# 1224 - TASK-515 Screens Admin Left-Menu Visibility Fix

Date: 2026-07-06
Version: Unreleased
Tasks: TASK-515, TASK-515-01, TASK-515-02

## Key Changes

- Fixed the owner-reported bug: custom screens explicitly marked "show in the admin left main menu" (`showInSidebar`) did **not** appear in the sidebar unless they also happened to be **editor-mode** screens (blocks + a writable binding). A read-only **dashboard** screen or a **collection-only** screen was silently dropped with no error and no feedback.
- **Root cause:** an undocumented editor-capability gate over-filtered the user's `showInSidebar` intent in two mirrored code paths, contradicting the already-documented contract in `_docs/ADMIN_NAVIGATION.md:10-14` (`status === "active"` AND `showInSidebar === true`, target `/entries`, label `sidebarLabel ?? name`, **no** editor-capability requirement):
  - `core/admin/ui/navigation/sidebarConfig.ts` — `buildCustomScreenShortcutNavItems` filtered on `supportsDedicatedCustomScreenEditor(screen)` in addition to `status === "active" && showInSidebar === true`, so pinned non-editor Active screens never became nav items.
  - `core/admin/ui/custom-screens/customScreenListModel.ts` — `resolveCustomScreenSidebarShortcutState` returned `"requires_editor_setup"` for `status === "active" && supportsDedicatedEditor !== true`, so those list cards rendered without the "In sidebar" badge and with the "Entries" (not "Open") button — the same lie on the list surface.
- **Minimal fix (515-01):**
  - Dropped the `supportsDedicatedCustomScreenEditor` gate (and deleted the now-dead helper) from `buildCustomScreenShortcutNavItems` — a pinned Active screen ALWAYS gets a sidebar shortcut targeting its entries LIST view, which is valid for every screen mode. The `status === "active"` gate is retained (draft = unpublished).
  - Collapsed `resolveCustomScreenSidebarShortcutState` so Active + pinned → `"visible"` for every mode; pruned the now-dead `"requires_editor_setup"` member from `CustomScreenSidebarShortcutStateV3` (kept as an alias of the base union for source compatibility).
- **Docs/closure (515-02):** affirmed + extended `_docs/ADMIN_NAVIGATION.md` (draft+pinned = valid "will publish on activation" state, appears on activation with no manual reload via the `cacheKeys.customScreensList` cache-event invalidation; recorded that the `"requires_editor_setup"` gate was removed as an intentional simplification), added this changelog, and closed the board.
- **Tests:** added a `buildCustomScreenShortcutNavItems` regression suite in `tests/vitest/admin/advanced-modules.test.ts` (dashboard/collection-only Active+pinned → emitted; draft+pinned → dropped; unpinned → dropped) plus `tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts` asserting Active+pinned dashboard → `"visible"` and that `"requires_editor_setup"` is no longer produced.

## Scope

- **NO schema / route / RBAC / migration / `schemaVersion` change.** This is a pure client-side read-filter correction on the already-validated `GET /custom-screens` read path (already `content:read`-gated). `show_in_sidebar` + `sidebar_label` already exist in the schema; no DDL. The nav item and its `/entries` target were both already `content:read`-gated, so no privilege widening.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run gates:coderso`
- Live ≥5-scenario playwright smoke deferred to the orchestrator post-merge (the running dev host serves the main tree, not this worktree).
