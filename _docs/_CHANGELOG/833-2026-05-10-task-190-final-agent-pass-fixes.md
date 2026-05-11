# 833 - TASK-190 final agent pass fixes

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190, TASK-190-02, TASK-190-05, TASK-190-07, TASK-190-08

## Key Changes

### Assistant/Core
- Moved catalog-backed provider planning behind the LLM availability gate before
  local composed setup fallback can return a ready plan.
- Applied detail-page document title and SEO field mappings to published runtime
  and dedicated detail-page preview rendering.
- Scoped custom-screen action merge keys and merge checks by
  `collectionRole` / `compositionKey` when stable metadata is present.

### Documentation
- Clarified the legacy custom-screen exact-name fallback in source-of-truth
  composer, site-builder, CMS API, and TASK-190 owner docs.
- Documented that detail-page runtime and preview consume document-owned title
  and SEO field mappings before falling back to entry SEO metadata.

### Validation
- Added regressions for catalog-backed LLM gating, detail-page runtime SEO
  mappings, metadata-aware custom-screen action identity, execute conflict
  `errorCode`, and ambiguous legacy custom-screen fallback conflicts.
- Passed targeted Vitest planner/assembler/renderer coverage (`3` files,
  `125` tests), targeted Bun action executor coverage (`65` tests, `313`
  assertions), targeted DB-backed detail-page runtime coverage outside the
  sandbox (`8` tests, `24` assertions), `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`
  (`582` files, `2611` tests), and `bun run precommit`.
- Full DB/runtime `bun run test:bun` outside the sandbox and outside-sandbox
  `bun run scan:security:strict` remain pending because the approval layer
  rejected both escalations with the usage-limit message. A sandbox-only strict
  scan attempt also failed on Semgrep CA trust anchors and `bun audit`
  connection refusal, while Trivy and Gitleaks scanner lanes were clean.
