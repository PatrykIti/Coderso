# 836 - TASK-190 implementation drift hardening

Date: 2026-05-11
Version: Unreleased
Tasks: TASK-190, TASK-190-02-02, TASK-190-05-03, TASK-190-05-03-07-01-01, TASK-190-06-03, TASK-190-07-02, TASK-190-08

## Key Changes

### Assistant/Core
- Aligned the internal detail-page route validation envelope with the
  content-domain `DetailPageDocument.related` owner field.
- Kept legacy/mistyped `relatedSources` rejected as an unknown document field at
  the route boundary before detail-page service normalization.
- Hardened detail-page `titlePattern` and `seo.titlePattern` normalization so
  secret-like entry paths reject before persistence and public runtime falls
  back defensively if legacy data bypasses normalization.
- Normalized `site.contentRoutes` on settings reads, not only writes, so legacy
  stored rows cannot bypass canonical path/default handling.
- Invalidated `contentTypes:collectionWorkspace:<contentTypeId>` from
  detail-page manual and assistant mutation paths so collection workspace
  summaries do not retain stale canonical detail-template state.
- Blocked ambiguous `listing-query.upsert` name matches with a dependency
  conflict instead of updating the first same-name query.
- Scoped the in-memory action-executor idempotency fallback by actor, plan id,
  and plan hash to match the persistent execution store.
- Removed free-form provider draft `notes` from the strict blueprint composition
  draft schema.

### Documentation
- Attached `TASK-190-08-04` to the TASK-190 parent/evaluation hierarchy after
  the explicit-approval live provider rerun.
- Updated the LLM Guide live coverage matrix and admin cache docs to reflect the
  final 2026-05-11 live rerun and exact detail-template sample picker cache key.
- Added `_docs/AGENTS.md` as a pointer to the root `AGENTS.md` so the repo docs
  index no longer references a missing agent-guideline file.
- Clarified the current collection workspace implementation scope as the
  deterministic route/detail/list/listing/admin-screen owner seams; Forms/CTA,
  media, and SEO remain future owner-seam extensions rather than inferred
  workspace fields.
- Clarified that the five mixed and three single-preset TASK-190 acceptance
  counts are owned by the deterministic Vitest fixture matrix, while the live
  provider matrix remains opt-in smoke/regression coverage.

### Tests
- Added regression coverage for detail-page route `related` validation,
  secret-like detail-page title tokens, settings read normalization,
  collection-workspace cache invalidation, ambiguous listing-query upserts,
  in-memory idempotency conflicts, and provider draft notes rejection.
- Stabilized long DB/runtime smoke tests by increasing their test-local
  timeouts without changing production behavior.

### Validation
- Passed targeted Bun route coverage outside the sandbox with `.env` loaded:
  `bun test --parallel=1 tests/integration/routes/detailPages.test.ts`
  (`10` tests, `67` assertions).
- Passed targeted Bun coverage outside the sandbox:
  `bun test --parallel=1 tests/integration/runtime/detail-page-runtime-lite.test.ts tests/integration/routes/detailPages.test.ts tests/unit/settings/settingsService.test.ts tests/unit/assistant/actionExecutorService.test.ts`
  (`89` tests, `448` assertions).
- Passed targeted Vitest coverage outside the sandbox:
  `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/content/detailPageSchema.test.ts tests/vitest/admin/detailPagesClient.test.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/blueprint-provider-context.test.ts`
  (`4` files, `32` tests).
- Passed full Bun coverage outside the sandbox:
  `bun run test:bun` (`768` tests, `2972` assertions).
- Passed full Vitest coverage outside the sandbox:
  `bun run test:vitest` (`582` files, `2612` tests).
- `bun run lint` passed outside the sandbox before the final test-timeout-only
  edits. A final lint rerun and `bun run scan:security:strict` were blocked by
  the approval layer after Codex reported the usage limit was reached, so no
  commit was created in this pass.
