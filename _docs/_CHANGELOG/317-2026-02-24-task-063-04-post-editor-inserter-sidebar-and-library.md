# 317 - TASK-063-04 post editor inserter sidebar and library

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-04, TASK-063-04-01, TASK-063-04-02, TASK-063-04-03

## Key Changes

### Dedicated inserter sidebar shell
- Added `PostInserterSidebar` for posts editor secondary sidebar mode.
- Inserter now has explicit shell-level controls:
  - close button,
  - `Escape` close handling,
  - dialog semantics (`role="dialog"` + aria labels).

### Block library upgrades
- Extended block catalog contract and helpers:
  - grouped categories (`text/media/interactive`),
  - category filter support (`all` + category),
  - deterministic grouping helpers,
  - optional most-used item resolver.
- Updated `BlockInserter` to support:
  - category filter controls,
  - searchable grouped results,
  - optional `Most used` section,
  - keyboard roving selection (arrow keys + enter/space insert).

### Focus return contract
- Added `useFocusReturn` hook for deterministic focus restoration on panel close.
- Wired posts editor shell so closing inserter returns focus to header `Add` button.

### Integration and tests
- Integrated inserter sidebar in `PostBlockEditorShell` via layout `secondary-sidebar` region.
- Added tests for:
  - inserter sidebar rendering and close contract,
  - block catalog search/filter/group helpers,
  - focus-return transition contract.

### QA
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-04 sidebar ownership and focus-return flow.
- Updated `_docs/CMS_API.md` with posts editor inserter orchestration contract.
- Updated `_docs/CODERSO_MODULES.md` with TASK-063-04 progression entry.
- Updated `_docs/_TASKS/README.md` and TASK-063-04 task statuses.
