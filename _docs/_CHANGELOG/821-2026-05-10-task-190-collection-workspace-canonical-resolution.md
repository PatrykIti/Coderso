# 821 - TASK-190 collection workspace canonical resolution

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-03, TASK-190-06-03-01, TASK-190-06-03-01-02

## Key Changes

### Collection workspace resolution

- Resolved canonical collection workspace resources from current owner seams:
  `site.contentRoutes`, route-linked `detailPageId`, explicit
  `PageData.settings.collectionLink`, listing query/template services, and
  custom-screen `collectionRole` metadata.
- Kept missing or ambiguous canonical resources in `unresolved` with bounded
  candidates instead of slug/title guessing or workspace-local persistence.

### Read permissions

- Passed route actor permissions into the workspace read model.
- Redacted route-derived canonical data when `settings:read` is missing while
  keeping content-owned candidates bounded under `content:read`.

### Docs and board

- Marked `TASK-190-06-03-01-02` done and updated parent TASK-190 workspace
  notes.
- Updated CMS API, architecture, Assistant Site Builder docs, and the task board.

## Validation

- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/contentTypes.test.ts`
  - sandbox lane: 4 passed / 7 skipped because the sandbox could not reach the
    configured DB
  - outside sandbox: 11 passed
