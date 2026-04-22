# 723. TASK-194 pages admin UX reliability and polish

Date: 2026-04-22
Version: unreleased
Tasks: TASK-194, TASK-194-01, TASK-194-02, TASK-194-03, TASK-194-04, TASK-194-05

## Key Changes

### CMS Pages / Admin UI

- Repaired the Pages list bulk-selection contract so header and row checkboxes
  stay controlled, selection is scoped to visible filtered rows, and bulk
  `publish` / `unpublish` / `delete` actions refresh cleanly.
- Fixed Pages author/cache behavior so detail or mutation payloads without a
  resolved author no longer overwrite list cache with stale `Unknown`
  placeholders.
- Added create/settings/history/preview descriptions and clearer disabled-state
  guidance in the Pages drawer surfaces.
- Replaced misleading Page Settings copy around template loading, retry, draft
  autosave wording, and `Max width` availability.

### Pages Editor / Preview / Builder

- Added visible save/publish success feedback in the Pages editor while keeping
  failure feedback on the existing editor surface.
- Made `RuntimePreviewDialog` recoverable when the preview host is unreachable
  or the iframe times out, without leaking preview tokens.
- After widget insert/add, the Pages canvas now scrolls to the new block and
  applies a short-lived highlight.
- Added accessible labels/tooltips to block toolbar actions, explicit wizard
  handoff copy, actionable empty-slot CTA, and grouped page-builder widget
  categories on the existing widget library surface.

### Docs / QA

- Updated Pages source-of-truth docs, admin cache guidance, task board, and the
  Playwright Pages QA summary to reflect the shipped `TASK-194` behavior.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list-cache-behavior.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder/blockToolbar.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx`
