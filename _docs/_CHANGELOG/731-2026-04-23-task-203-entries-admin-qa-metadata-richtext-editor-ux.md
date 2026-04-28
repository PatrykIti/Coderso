# 731. TASK-203 entries admin QA metadata rich text editor UX

Date: 2026-04-23
Version: unreleased
Tasks: TASK-203

## Key Changes

### CMS Entries / Admin UI

- Closed the Entries Playwright QA findings for metadata feedback, save/update
  confidence, metadata dirty-state guards, and duplicate save-action clarity.
- Replaced textarea-only Engine `richtext` editing with the shared rich text
  adapter/serializer while preserving existing entry storage.
- Added app-dialog destructive confirmation for row, bulk, and editor delete,
  plus an editor danger zone.
- Implemented row duplicate through the existing Entries route/client/service
  path with draft clone creation and cache-safe list/detail refresh.

### Runtime / Preview / Metadata

- Kept generic content previews on the generic `content_entries` runtime path
  even when the content type slug is `post` or `posts`.
- Updated SEO snippet previews to resolve from site settings/content routes
  instead of a hardcoded demo domain.
- Added taxonomy disabled-state navigation back to the owning Engine content
  type editor.

### Docs / QA

- Updated the Playwright source report, CMS API/spec, preview spec, content
  field/list/editor UX docs, admin cache docs, Coderso Entries user docs, task
  board, and changelog index.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/content/entryService.test.ts tests/integration/routes/contentTypes.test.ts tests/integration/runtime/pages-runtime.test.ts`
