# 323 - TASK-063-12 post editor reference parity wave 2 and closure

Date: 2026-02-25  
Version: Unreleased  
Tasks: TASK-063-12, TASK-063-12-01, TASK-063-12-02, TASK-063-12-03, TASK-063-12-04, TASK-063-12-05, TASK-063-12-06, TASK-063-12-07, TASK-063-12-08

## Key Changes

### Right inspector parity and progressive disclosure (`063-12-05`)
- Reordered `Post` inspector flow to reference contract:
  - `Publishing`
  - `Categories and tags`
  - `Featured image`
  - `Danger zone`
  - `Advanced` (collapsed by default)
- Added `Move to trash` action in `Danger zone` with confirmation and redirect to `/admin/posts` (`replace: true`) after delete success.
- Moved SEO and technical metadata under `Advanced` collapse.
- Converted `Block` inspector `Advanced` section to collapsed disclosure.

### Gear modal and preferences contract (`063-12-06`)
- Rebuilt `PostEditorSettingsDialog` into grouped UX sections (`Startup`, `Panels and density`, `Guidance`).
- Extended preferences model to v2:
  - `editorDensity`
  - `showKeyboardHints`
  - `defaultInspectorTab`
  - `restoreLastSidebarsState`
- Added compatibility/migration helpers in `postEditorPreferences.ts` (`v1 -> v2`).
- Implemented dual persistence:
  - local-first storage (`nextless.posts.editor.preferences.v2` + compatibility write to `v1`),
  - background sync to user setting key `posts.editor.preferences`.
- Extended user settings contracts:
  - admin client `UserSettings` map,
  - server-side validation/defaults (`userSettingsService`).

### Responsive parity and focus restore (`063-12-07`)
- Added deterministic focus-mode snapshot restore in `usePostEditorLayout`:
  - enter focus mode -> hide side panels + snapshot state,
  - exit focus mode -> restore previous sidebar state.
- Added sidebar layout snapshot persistence (`nextless.posts.editor.layout.v1`) with preference-gated restore behavior.
- Kept desktop/mobile parity contract (`desktop rails`, `mobile sheets`) and wired editor density marker on layout shell.

### QA, docs, and closure (`063-12-08`)
- Updated integration/unit coverage for inspector, settings, layout, and user settings contracts.
- Full quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`
- Updated architecture/API/modules docs, final parity matrix, task statuses, and task board sync.

## Documentation
- Updated:
  - `_docs/ARCHITECTURE.md`
  - `_docs/CMS_API.md`
  - `_docs/CODERSO_MODULES.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/_TASKS/README.md`
  - `_docs/_TASKS/TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md`
  - `_docs/_TASKS/TASK-063-12-05_Right_Inspector_Parity_Post_Block_with_Progressive_Disclosure.md`
  - `_docs/_TASKS/TASK-063-12-06_Gear_Settings_Modal_Upgrade_and_Preferences_Contract.md`
  - `_docs/_TASKS/TASK-063-12-07_Responsive_Parity_FocusMode_and_Sheets.md`
  - `_docs/_TASKS/TASK-063-12-08_QA_Docs_Changelog_and_Closure.md`
