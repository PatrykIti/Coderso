# TASK-163: Historical Assistant Task Reference Cleanup
# FileName: TASK-163_Historical_Assistant_Task_Reference_Cleanup.md

**Priority:** Low  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `_docs/_TASKS/*`, `docs/screens/*`  
**Status:** Done (2026-03-22)

---

## Overview

Clean up historical task references that still point to deleted combined
assistant screen docs after the route-by-route documentation split.

## Scope

1. Identify historical task files that still reference removed combined docs.
2. Replace dead references with the current canonical doc set.
3. Synchronize task board and changelog.

## Sub-Tasks

1. Verify the stale reference is no longer a valid file path.
2. Update the historical task note to point at current canonical docs.
3. Record the cleanup in the board and changelog.

## Acceptance Criteria

1. No active task file points to a deleted `docs/screens/*.md` path unless the
   deletion is being documented explicitly.
2. The board and changelog reflect the cleanup.

## Testing Requirements

- Search `_docs/_TASKS/*` for deleted `docs/screens/*.md` paths
- Confirm updated references point at existing files

## Documentation Updates Required

- `_docs/_TASKS/TASK-119-03_Assistant_Corpus_Enrichment_for_Multi_Level_Answers.md`
- `_docs/_TASKS/TASK-163_Historical_Assistant_Task_Reference_Cleanup.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Verified the remaining stale historical task reference pointed to deleted
  `docs/screens/email-storage-integrations-api-keys-and-webhooks.md`.
- Replaced it with the current canonical split docs:
  - `docs/screens/email-settings.md`
  - `docs/screens/storage-settings.md`
  - `docs/screens/integrations.md`
  - `docs/screens/api-keys.md`
  - `docs/screens/webhooks.md`
- No automated lint or test commands were run because this was a docs-only
  cleanup.
