# 295 - TASK-059-01 Posts DB Schema and Migration Foundation

- **Date:** 2026-02-22
- **Version:** 0.1.295
- **Tasks:** TASK-059, TASK-059-01

## Key Changes

### Database Schema
- Added dedicated posts tables in `core/db/schema.ts`:
  - `posts`
  - `post_revisions`
  - `post_preview_tokens`
  - `post_term_assignments`
- Added indexes/constraints for:
  - unique post slug,
  - post status/publish/schedule/update filtering,
  - post revision uniqueness per `(post_id, version)`,
  - preview token hash uniqueness.

### Migration Artifacts
- Generated migration:
  - `core/db/migrations/0045_posts_decoupled.sql`
- Updated Drizzle metadata:
  - `core/db/migrations/meta/0045_snapshot.json`
  - `core/db/migrations/meta/_journal.json`

### Tests
- Added DB contract test suite:
  - `tests/unit/posts/schema.test.ts`
- Coverage includes:
  - relation cascade for post-owned tables,
  - unique `posts.slug`,
  - unique revision version per post.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/schema.test.ts`

## Result
- TASK-059-01 is closed. Posts now have dedicated schema foundation required for full domain decoupling from entries.
