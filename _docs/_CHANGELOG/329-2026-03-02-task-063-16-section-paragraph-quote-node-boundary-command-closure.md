# 329 - TASK-063-16 section paragraph quote node-boundary command closure

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16, TASK-063-16-01, TASK-063-16-02, TASK-063-16-03, TASK-063-16-04

## Key Changes

### Section paragraph/quote command reliability
- Added deterministic command fallback for block/list commands when the editor root temporarily has no block wrappers.
- New engine helper: `applyCommandToRootHtmlWithoutBlocks(command, html)`.
- `PostRichTextAdapter` now uses this fallback when `targetBlocks` are empty, so `paragraph` and `quote` in `Section` no longer rely on unstable native fallback behavior.

### Writing-canvas node boundary persistence
- Confirmed that section command results are persisted as `writing-canvas` node boundaries (`paragraph` / `quote`) instead of transient DOM-only state.
- Added regression coverage for `html -> nodes -> html -> nodes` roundtrip preserving `paragraph/quote` node types.

### Tests
- Added integration test suite:
  - `tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`
- Extended unit coverage:
  - `tests/unit/posts/post-richtext-command-engine.test.ts`
    - root-without-block-wrappers command normalization for `paragraph` and `quote`.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-command-engine.test.ts tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx tests/unit/posts/post-paste-normalizer.test.ts` -> pass (`26 passed`, `0 failed`).
- `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx tests/integration/ui/post-editor-richtext-selection-contract.test.tsx tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx` -> pass (`11 passed`, `0 failed`).
- `bun test tests/unit tests/integration tests/perf tests/security` -> pass (`1496 passed`, `150 skipped`, `0 failed`).

## Documentation
- Updated:
  - `_docs/_TASKS/TASK-063-16_Post_Editor_Section_Paragraph_Quote_Node_Boundary_Commands.md`
  - `_docs/_TASKS/TASK-063-16-01_Section_Paragraph_Quote_Node_Command_Contract_and_Target_Behavior.md`
  - `_docs/_TASKS/TASK-063-16-02_Section_Paragraph_Quote_Command_Engine_and_Adapter_Wiring.md`
  - `_docs/_TASKS/TASK-063-16-03_Section_Paragraph_Quote_Roundtrip_Normalizer_and_Runtime_Parity.md`
  - `_docs/_TASKS/TASK-063-16-04_QA_Docs_Changelog_and_Closure.md`
  - `_docs/_TASKS/README.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/_CHANGELOG/README.md`
