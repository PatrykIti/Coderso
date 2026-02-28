# 327 - TASK-063-14 richtext command reliability closure and qa gate completion

Date: 2026-02-28  
Version: Unreleased  
Tasks: TASK-063-14, TASK-063-14-01, TASK-063-14-02, TASK-063-14-03, TASK-063-14-04, TASK-063-14-05, TASK-063-14-06

## Key Changes

### Deterministic command engine and adapter wiring
- Added `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` as a deterministic execution layer for command classification and block/list/alignment transforms.
- Wired `PostRichTextAdapter` command dispatch to engine helpers for block/list/alignment flows and exposed pure command resolvers for tests.
- Centralized toolbar profile routing in canvas via `resolveToolbarProfileForBlockType(...)` to keep command visibility consistent with profile matrix.

### Command semantics and ownership model finalization
- Locked and implemented deterministic semantics for `paragraph`, `heading-1..6`, `quote`, `bullet-list`, `ordered-list`, and `align-left/center/right`.
- Finalized split between richtext list command and dedicated `list` block behavior.
- Confirmed toolbar vs inspector ownership split for text blocks (no duplicate alignment/text-scale controls).

### Test coverage and regression hardening
- Added command/selection/ownership test suites:
  - `tests/unit/posts/post-richtext-command-engine.test.ts`
  - `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx`
  - `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
  - `tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx`
- Updated normalization unit expectation in `tests/unit/posts/postBlockDocument.test.ts` to match current normalized attrs contract.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit tests/integration tests/perf tests/security` -> pass (`1488 passed`, `150 skipped`, `0 failed`).

## Documentation
- Updated:
  - `_docs/_TASKS/TASK-063-14_Post_Editor_RichText_Command_Reliability_and_Contextual_Formatting_Model.md`
  - `_docs/_TASKS/TASK-063-14-02_Block_Level_Formatting_Commands_H1_H6_Paragraph_Quote_List.md`
  - `_docs/_TASKS/TASK-063-14-03_Inline_Formatting_and_Multiline_Highlight_Stability.md`
  - `_docs/_TASKS/TASK-063-14-04_Text_Alignment_and_List_Command_Engine_Stabilization.md`
  - `_docs/_TASKS/TASK-063-14-05_Contextual_Toolbar_Profiles_and_Block_Inspector_Dedup.md`
  - `_docs/_TASKS/TASK-063-14-06_QA_Docs_Changelog_and_Closure.md`
  - `_docs/_TASKS/README.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/_CHANGELOG/README.md`
