# TASK-165: Assistant Reindex Deletes Removed DB Docs
# FileName: TASK-165_Assistant_Reindex_Deletes_Removed_DB_Docs.md

**Priority:** High  
**Category:** Core/Assistant + Core/DB  
**Estimated Effort:** Small  
**Dependencies:** TASK-109-02, TASK-114-02, TASK-164  
**Status:** Done (2026-03-22)

---

## Overview

Fix the assistant DB ingest flow so `Run reindex` does not leave removed
official docs behind in `assistant_docs`.

The immediate regression is that deleted combined widgets docs can remain in
the DB-backed corpus after the canonical split docs are reindexed, which lets
stale labels and stale guidance keep surfacing in assistant answers.

## Security Contract

- Visibility: `internal`
- Affected endpoints:
  - `POST /admin/api/assistant/reindex`
- Auth model:
  - admin session
  - `settings:write`
- CSRF:
  - required for `POST /assistant/reindex`
- Rate-limit bucket:
  - existing assistant admin write limits remain unchanged
- Validation:
  - no payload contract change
- Anti-abuse:
  - no new public surface; cleanup stays inside the existing DB ingest path

## Sub-Tasks

1. Add stale-record pruning to assistant ingest for docs that no longer exist in
   the current source root.
2. Keep the existing behavior for files that still exist but fail parsing or
   validation during the same run.
3. Add regression coverage for stale-doc identification and delete callback
   execution.
4. Sync assistant reindex docs, task board, and changelog.

## Files

- `core/services/assistant/docsIngestService.ts`
- `tests/vitest/assistant/docsIngestService.test.ts`
- `docs/screens/assistant-settings.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts`

## Documentation Updates Required

- `docs/screens/assistant-settings.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-03-22)

- Added assistant ingest cleanup for removed official docs under the current
  source root so stale `assistant_docs` rows are pruned on reindex.
- Kept existing docs in DB when the source file still exists but the current run
  hits parse/validation issues.
- Added regression coverage for stale-doc detection and delete execution.
- Synced assistant reindex docs, task board, and changelog.
