# 325 - TASK-063-13 post editor authoring stability and parity hardening

Date: 2026-02-27  
Version: Unreleased  
Tasks: TASK-063-13, TASK-063-13-01, TASK-063-13-02, TASK-063-13-03, TASK-063-13-04, TASK-063-13-05, TASK-063-13-06, TASK-063-13-07, TASK-063-13-08

## Key Changes

### Rich text stability and command output
- Split writing-canvas typing path from paste path by introducing `createWritingCanvasContentFromEditorHtml(...)` and using it in canvas editing.
- Added focused-sync guard in `PostRichTextAdapter` to prevent `innerHTML` writeback loops that caused caret jumps.
- Stabilized `Enter` handling for non-list contexts with explicit `insertParagraph` behavior.
- Normalized browser alias tags (`b`, `i`, `div`) in serializer to avoid raw tag text rendering and improve visual command parity.
- Improved collapsed-selection link insertion flow in rich text adapter.

### List, image, and interactive block UX parity
- Refactored list block editing to a multiline draft model (focus -> local draft, blur -> commit parsed lines).
- Added image click-to-select media flow on canvas with picker dialog (`Dialog` + `MediaGrid`) and media lookup by `mediaId`.
- Added selected-block quick controls for `image`, `button`, and `embed` directly above block surface.
- Upgraded canvas previews for `button` and `embed` to runtime-like rendering with provider/aspect handling.
- Extended block attrs normalization for real inspector/runtime parity (`compact`, `variant`, `size`, `newTab`, `provider`, `aspect`, `lazy`, `style`, `thickness`, `showIcon`, common layout attrs).

### Global typography inheritance and state wiring
- Added document typography contract (`meta.typography`) with defaults in empty document creation and normalizer.
- Exposed typography controls in rich text toolbar (`fontFamily`, `baseTextScale`) and propagated updates via editor state (`updateDocumentTypography`).
- Wired `PostBlockEditorShell` -> `PostEditorCanvas` typography and block attrs update callbacks.
- Preserved legacy paragraph-to-writing-canvas normalization by treating default paragraph attrs as non-meaningful for leading empty block removal.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-serializer.test.ts tests/unit/posts/post-paste-normalizer.test.ts tests/unit/posts/post-block-normalizer-writing-canvas.test.ts tests/unit/posts/postEditorStore.test.ts tests/unit/ui/post-block-editor-shell.test.tsx tests/unit/ui/post-editor-page.test.tsx tests/unit/ui/post-editor-state-normalization.test.ts` -> pass.

## Documentation
- Updated:
  - `_docs/_TASKS/TASK-063-13_Post_Editor_Block_Authoring_Stability_and_Parity_Hardening.md`
  - `_docs/_TASKS/TASK-063-13-01_Block_by_Block_Defect_Analysis_and_Fix_Contract.md`
  - `_docs/_TASKS/TASK-063-13-02_RichText_Input_Caret_Stability_and_Enter_Semantics.md`
  - `_docs/_TASKS/TASK-063-13-03_List_Block_Multiline_Editing_and_State_Model.md`
  - `_docs/_TASKS/TASK-063-13-04_Image_Block_Click_to_Select_Media_Flow.md`
  - `_docs/_TASKS/TASK-063-13-05_Text_Toolbar_Font_Controls_and_Global_Typography_Inheritance.md`
  - `_docs/_TASKS/TASK-063-13-06_NonText_Block_Quick_Toolbars_and_Block_Inspector_DeMock.md`
  - `_docs/_TASKS/TASK-063-13-07_Canvas_Preview_Parity_for_Button_Embed_and_Image.md`
  - `_docs/_TASKS/TASK-063-13-08_RichText_Command_Output_and_Link_Rendering_Fixes_QA_Docs_Closure.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/_TASKS/README.md`
  - `_docs/_CHANGELOG/README.md`
