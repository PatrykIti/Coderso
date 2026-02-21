# 286 - TASK-057-08 Post Editor QA, Docs, Changelog, and Rollout

- **Date:** 2026-02-21
- **Version:** 0.1.286
- **Tasks:** TASK-057, TASK-057-08

## Key Changes

### Rollout Fallback Mode
- Added post editor rollout setting:
  - `settings["posts.editor.mode"]` with values: `"blocks"` or `"classic"`.
- Added query override for emergency rollback path:
  - `/admin/coderso/posts/:id?editor=classic`.
- Updated post editor page routing behavior:
  - `core/admin/ui/posts/PostEditorPage.tsx`
- Added settings key support in runtime settings contract:
  - `core/services/settings/settingsService.ts`
  - `core/admin/services/settingsClient.ts`

### QA Coverage for Rollout Safety
- Added post editor smoke regression tests:
  - `tests/integration/ui/post-editor-smoke-regression.test.tsx`
- Added post runtime render performance gate:
  - `tests/perf/post-editor-load.test.tsx`
- Extended settings tests for `posts.editor.mode`:
  - `tests/unit/settings/settingsService.test.ts`
  - `tests/unit/ui/post-editor-page.test.tsx`

### Documentation Sync
- Updated architecture, API, navigation, modules, and content modeling docs:
  - `_docs/ARCHITECTURE.md`
  - `_docs/CMS_API.md`
  - `_docs/ADMIN_NAVIGATION.md`
  - `_docs/CODERSO_MODULES.md`
  - `_docs/CONTENT_MODELING_COOKBOOK.md`

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

## Result
- Gutenberg-like posts editor rollout is closed with:
  - feature-flag fallback,
  - smoke/perf gates,
  - updated contracts and docs.
