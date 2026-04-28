# 742 - TASK-211 pages editor UX followups

Date: 2026-04-25
Version: Unreleased
Tasks: TASK-211, TASK-211-01, TASK-211-01-01, TASK-211-01-02, TASK-211-02, TASK-211-02-01, TASK-211-02-02, TASK-211-03, TASK-211-03-01, TASK-211-04, TASK-211-04-01, TASK-211-05, TASK-211-05-01, TASK-211-05-02

## Key Changes

### Runtime Preview

- Extended Pages `POST /pages/:id/preview` with optional `probe: true` metadata
  for generated preview URLs only.
- Added server-side preview probing with approved-origin enforcement, bounded
  redirects, timeout handling, status/error mapping, and token-redacted target
  labels.
- Updated `RuntimePreviewDialog` to render the existing unavailable placeholder
  when probe metadata reports HTTP errors, redirects, unreachable targets, or
  timeouts before the iframe is shown.
- Kept probe metadata optional so Posts, Entries, and Widget Template preview
  callers retain the legacy timeout fallback until they adopt their own probe
  contracts.

### Page Editor Feedback

- Added shared `actionToasts` for non-list admin mutation feedback and kept list
  action toast error normalization delegated to the shared helper.
- Routed Page editor save draft and publish success/failure feedback through the
  central AdminApp Sonner host after awaited mutations resolve, while preserving
  inline contextual status and errors.

### Editor UX Copy and Scroll

- Changed inserted-block scroll alignment from center to start so the newly
  inserted block heading/top lands in a predictable viewport position.
- Updated Page History user-facing copy from autosave wording to draft-version
  wording in drawer description, row label/badge, restore confirmation, and
  discard confirmation while preserving the API/domain `autosave` kind.

### Docs

- Documented preview probe request/response behavior in `_docs/PREVIEW_SPEC.md`
  and `_docs/CMS_API.md`.
- Added dated TASK-211 closure notes to `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` and
  explicitly kept `BUG-6` outside this closure.
- Moved the TASK-211 family to Done in `_docs/_TASKS`.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/action-toasts.test.ts tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/admin/pagesClient.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx`
- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/integration/routes/pages.test.ts tests/unit/pages/previewService.test.ts tests/unit/pages/validation.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Manual Playwright replay was not run in this code pass. `BUG-6` remains outside
TASK-211 and needs separate verification.
