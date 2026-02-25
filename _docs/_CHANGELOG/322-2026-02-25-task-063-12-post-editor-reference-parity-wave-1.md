# 322 - TASK-063-12 post editor reference parity wave 1

Date: 2026-02-25  
Version: Unreleased  
Tasks: TASK-063-12, TASK-063-12-02, TASK-063-12-03, TASK-063-12-04

## Key Changes

### Header parity and action hierarchy (063-12-02)
- Reworked post editor header into a two-row composition:
  - primary row: left navigation context (`Back`, breadcrumb, status),
  - right primary cluster: `Preview`, `Publish/Update`, `Gear`.
- Moved operational actions (`Outline`, `Details`, `Focus`, `Revisions`) into a dedicated secondary row.
- Added SPA close/back navigation to posts list (`/admin/posts`, replace mode) and synced topbar wiring with autosave state (`lastSavedAt`).

### Left rail parity with outline-first mode (063-12-03)
- Introduced explicit `leftRailMode` state (`outline` | `list-view`) in `usePostEditorLayout`.
- Set `Outline` as default and primary mode; kept `List view` as allowed secondary path.
- Updated left rail tabs and outline/list styling to reduce visual noise and align with reference hierarchy.
- Preserved insert/reorder behavior and existing editor logic.

### Canvas geometry and writing surface parity (063-12-04)
- Adjusted canvas shell to reference geometry (`max-w-[720px]`) with updated writing rhythm.
- Upgraded title field typography to display-style contract (`text-5xl`, `font-display`, bold).
- Unified placeholder surfaces (`image`, `button`, `embed`, `toc`) to lighter dashed/neutral styling.
- Increased rich text reading density (`text-lg`, relaxed line height) without changing content model logic.

### Tests and quality gates
- Updated and extended tests for new header/left-rail/canvas contracts:
  - `tests/integration/ui/post-editor-header-workflow.test.tsx`
  - `tests/integration/ui/post-autosave-flow.test.tsx`
  - `tests/integration/ui/post-editor-layout-shell.test.tsx`
  - `tests/integration/ui/post-editor-listview-outline.test.tsx`
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`
  - `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
  - `tests/unit/posts/post-editor-layout-state.test.ts`
  - `tests/unit/ui/post-block-editor-shell.test.tsx`
  - `tests/unit/ui/post-editor-page.test.tsx`
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - focused `bun test` suites for post editor header/layout/outline/canvas flows.

## Documentation
- Updated task statuses:
  - `_docs/_TASKS/TASK-063-12-02_Header_Parity_and_Action_Hierarchy.md`
  - `_docs/_TASKS/TASK-063-12-03_Left_Outline_Parity_with_Optional_List_Tab.md`
  - `_docs/_TASKS/TASK-063-12-04_Canvas_Geometry_Typography_and_Block_Surface_Parity.md`
  - `_docs/_TASKS/TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md`
