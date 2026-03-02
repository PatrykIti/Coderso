# 328 - TASK-063-15 section writing-canvas hardening and grouped toolbar closure

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-15, TASK-063-15-01, TASK-063-15-02, TASK-063-15-03, TASK-063-15-04, TASK-063-15-05

## Key Changes

### Section caret/input stabilization
- Added a `writing-canvas` draft editing path in canvas to avoid lossy model rewrite on each keystroke.
- Final model commit for section editing now happens on editor blur, which stabilizes caret behavior for first-character typing and continuous input.
- Removed the renderer typing regression where `RuntimeWritingCanvasNode` alignment access was performed before union narrowing.

### Enter semantics and writing-canvas roundtrip persistence
- Updated writing-canvas HTML parsing to preserve intentional empty paragraphs (`<p><br></p>`) required by `Enter` and `Enter+Enter` flows.
- Extended writing-canvas node contract with block alignment persistence (`align`) across paragraph/heading/list/quote nodes.
- Added explicit code-block persistence by representing section code blocks as `quote` nodes with `variant: "code"` and mapping them to `<pre>` in serializer/runtime renderer.

### Command parity and toolbar grouping
- Improved section command persistence for paragraph/headings/lists/alignment/clear-formatting/inline-code/code-block across parse/serialize/runtime mapping.
- Refined clear-formatting behavior in richtext adapter to remove inline wrappers and links without breaking block structure.
- Reorganized toolbar for section profile into grouped controls:
  - `Headings` (`h1..h6`)
  - `List` (bullet/ordered)
  - `Code` (inline/code block)

### Tests and regression coverage
- Added integration suite:
  - `tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`
- Updated/extended related suites:
  - `tests/unit/posts/post-paste-normalizer.test.ts`
  - `tests/unit/posts/post-block-normalizer-writing-canvas.test.ts`
  - `tests/unit/posts/post-block-runtime-renderer.test.tsx`
  - `tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx`
  - `tests/integration/ui/post-richtext-toolbar.test.tsx`

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-paste-normalizer.test.ts tests/unit/posts/post-block-normalizer-writing-canvas.test.ts tests/unit/posts/post-block-runtime-renderer.test.tsx tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx tests/integration/ui/post-richtext-toolbar.test.tsx tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx` -> pass (`38 passed`, `0 failed`).
- `bun test tests/unit tests/integration tests/perf tests/security` -> pass (`1492 passed`, `150 skipped`, `0 failed`).

## Documentation
- Updated:
  - `_docs/_TASKS/TASK-063-15_Post_Editor_Section_Writing_Canvas_Caret_Command_Parity_and_Grouped_Toolbar.md`
  - `_docs/_TASKS/TASK-063-15-01_Section_Input_Pipeline_and_Caret_Stability.md`
  - `_docs/_TASKS/TASK-063-15-02_Section_Enter_Semantics_and_Empty_Paragraph_Preservation.md`
  - `_docs/_TASKS/TASK-063-15-03_Section_Command_Persistence_Paragraph_Headings_List_Align_Clear_Code.md`
  - `_docs/_TASKS/TASK-063-15-04_Section_Toolbar_Grouping_Heading_List_Code_and_A11y.md`
  - `_docs/_TASKS/TASK-063-15-05_QA_Docs_Changelog_and_Closure.md`
  - `_docs/_TASKS/README.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/_CHANGELOG/README.md`
