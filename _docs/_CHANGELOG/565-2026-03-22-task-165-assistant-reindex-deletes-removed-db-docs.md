# 565. TASK-165 assistant reindex deletes removed DB docs

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-165

## Key Changes

### Assistant Ingest
- Updated assistant DB ingest so reindex prunes official docs that no longer
  exist under the current source root instead of leaving stale `assistant_docs`
  rows behind.
- Kept the existing behavior for source files that still exist but fail parsing
  or validation in the current run.

### Regression Coverage
- Added regression coverage for stale-doc detection and delete execution in the
  assistant ingest service tests.

### Docs
- Updated assistant reindex documentation to state that rebuilding the DB-backed
  corpus also removes deleted official docs from runtime availability.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts`
