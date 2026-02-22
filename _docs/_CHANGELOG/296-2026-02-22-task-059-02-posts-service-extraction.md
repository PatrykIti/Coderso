# 296 - TASK-059-02 Posts Domain Service Extraction

- **Date:** 2026-02-22
- **Version:** 0.1.296
- **Tasks:** TASK-059, TASK-059-02

## Key Changes

### Posts Service Decoupling
- Refactored `core/services/content/postsService.ts` to run directly on dedicated posts tables:
  - `posts`
  - `post_revisions`
  - `post_term_assignments`
  - `post_preview_tokens`
- Removed CRUD/revisions/autosave dependence on `entryService` and `content_types`.

### Metadata and Revisions
- Implemented post-native metadata updates:
  - status/schedule/publish fields stored on `posts`,
  - SEO payload persisted on `posts.seo`,
  - taxonomy assignment resolved via `post_term_assignments` + term-kind validation.
- Autosave and restore revision flows now use `post_revisions` with revision dedupe based on snapshot serialization.

### API Error Mapping
- Updated `core/server/routes/postsRoutes.ts` error mapping:
  - `post_slug_conflict` -> `409`.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/content/postsService.test.ts tests/integration/posts/posts-revisions-flow.test.ts tests/integration/routes/postsRoutes.test.ts tests/unit/admin/postsClient.test.ts`

## Result
- TASK-059-02 is closed: posts domain logic is now table-native and no longer coupled to entries/content-types for core lifecycle operations.
