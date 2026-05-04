# 774 - TASK-241 Pages Published Preview Draft Sync

- Date: 2026-04-29
- Version: Unreleased
- Tasks: TASK-241

## Key Changes

### CMS Pages/Admin UI

- Hid `Save draft` for published pages in the Pages editor.
- Kept `Publish` as the active live-update action for published pages.
- Updated `Preview` so unsaved editor changes are silently synced to
  `currentData` before preview token generation.
- Kept public runtime behavior unchanged: public visitors continue to see
  `publishedData` until `Publish` updates the page.

### Documentation

- Documented the Pages editor silent preview sync in `_docs/PREVIEW_SPEC.md`
  and `_docs/CMS_API.md`.
- Added TASK-241 and synchronized the task board.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-editor-shell-wave.test.tsx` - PASS, 14 tests.
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` - PASS outside sandbox, 6 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check` - PASS.
