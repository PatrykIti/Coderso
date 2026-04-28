# 300 - TASK-059-06 Posts Data Backfill and Cutover

- **Date:** 2026-02-22
- **Version:** 0.1.300
- **Tasks:** TASK-059, TASK-059-06

## Key Changes

### Posts Backfill Service
- Added idempotent migration service: `core/services/posts/migration/postsBackfillService.ts`.
- Legacy source scope: `content_entries` (type slug `post/posts`) with sync for:
  - `content_revisions` -> `post_revisions`,
  - `preview_tokens(targetType=content)` -> `post_preview_tokens`,
  - `content_term_assignments` -> `post_term_assignments`,
  - `seo_documents(targetType=entry)` -> `posts.seo`.
- Added structured report helpers in `core/services/posts/migration/postsBackfillReport.ts` (totals, sync stats, mismatches, failures).
- Added conflict handling and parity diagnostics:
  - slug conflict detection,
  - skip when destination post is newer than legacy row,
  - optional `shadowRead` parity checks.

### Internal Trigger Endpoint
- Added internal admin endpoint:
  - `POST /admin/api/posts/migration/backfill`
  - permission: `settings:write`
  - payload: `{ dryRun?, shadowRead?, entryIds? }`.
- Default safety behavior in route: `dryRun=true`, `shadowRead=true`.
- Added payload validation schema in `core/server/validation/postSchemas.ts`.

### Tests
- Added unit test:
  - `tests/unit/posts/postsBackfillReport.test.ts`.
- Added integration (DB-gated) test suite:
  - `tests/integration/posts/posts-backfill.test.ts`
  - covers dry-run behavior, apply idempotency, and slug conflict skip flow.
- Updated route contract test:
  - `tests/integration/routes/postsRoutes.test.ts`.

## Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/postsBackfillReport.test.ts tests/integration/posts/posts-backfill.test.ts tests/integration/routes/postsRoutes.test.ts`

## Result
- TASK-059-06 is closed: posts migration has an idempotent backfill path, report diagnostics, internal trigger contract, and documented cutover safety flow.
