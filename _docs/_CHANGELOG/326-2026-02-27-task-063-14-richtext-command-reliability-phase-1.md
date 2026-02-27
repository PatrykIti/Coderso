# 326 - TASK-063-14 richtext command reliability phase 1 and documentation sync

Date: 2026-02-27  
Version: Unreleased  
Tasks: TASK-063-14, TASK-063-14-01, TASK-063-14-02, TASK-063-14-03, TASK-063-14-04, TASK-063-14-05

## Key Changes

### Rich text command engine (phase 1)
- Added selection preservation before toolbar command execution to improve deterministic behavior.
- Stabilized block formatting commands (`paragraph`, `h1..h6`, `quote`, `code-block`) with fallback `formatBlock` execution.
- Improved alignment command to apply across selected block range, not only current anchor block.
- Added multiline-safe highlight wrapping by processing selected text runs instead of flattening the whole selection.

### Contextual formatting model
- Introduced toolbar profiles per block context (`writing-canvas`, `paragraph`, `heading`, `quote`, `callout`).
- Limited heading toolbar surface to a reduced set of meaningful controls.
- Added list quick controls on canvas (`ordered/unordered`, `compact`) for dedicated `list` block.
- Reduced duplication between toolbar and right `Block` inspector for text blocks (alignment/text scale ownership moved to toolbar).

### Tests and docs
- Added unit tests:
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
  - `tests/unit/ui/post-editor-block-inspector-ownership.test.tsx`
- Updated task board and task statuses for `TASK-063-14` progress.
- Extended parity reference with formatting command capability matrix and ownership split.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx tests/unit/ui/post-editor-block-inspector-ownership.test.tsx tests/unit/ui/post-block-editor-shell.test.tsx tests/unit/ui/post-editor-page.test.tsx tests/unit/posts/post-richtext-serializer.test.ts tests/unit/posts/post-paste-normalizer.test.ts` -> pass.

## Documentation
- Updated:
  - `_docs/_TASKS/README.md`
  - `_docs/_TASKS/TASK-063-14_Post_Editor_RichText_Command_Reliability_and_Contextual_Formatting_Model.md`
  - `_docs/_TASKS/TASK-063-14-01_Command_Capability_Matrix_and_Expected_Behavior_Contract.md`
  - `_docs/_TASKS/TASK-063-14-02_Block_Level_Formatting_Commands_H1_H6_Paragraph_Quote_List.md`
  - `_docs/_TASKS/TASK-063-14-03_Inline_Formatting_and_Multiline_Highlight_Stability.md`
  - `_docs/_TASKS/TASK-063-14-04_Text_Alignment_and_List_Command_Engine_Stabilization.md`
  - `_docs/_TASKS/TASK-063-14-05_Contextual_Toolbar_Profiles_and_Block_Inspector_Dedup.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/_CHANGELOG/README.md`
