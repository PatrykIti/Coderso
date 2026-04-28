# 733. Posts tag and category metadata save

Date: 2026-04-24
Version: unreleased
Tasks: TASK-195-03-01

## Key Changes

### CMS Posts / Metadata

- Fixed Posts metadata persistence so category-only taxonomy updates no longer
  wipe free-text post tags.
- Kept taxonomy tag assignment behavior explicit: `taxonomy.tagIds` mirrors
  selected taxonomy tag names into `posts.tags` only when `tagIds` is present.
- Added regression coverage for metadata-only autosave payloads and DB-backed
  metadata persistence.

## Validation

- `set -a && source .env && set +a && bun test tests/unit/content/postsService.test.ts`
- `bun run test:vitest -- tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/admin/postsClient.test.ts`
