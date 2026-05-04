# TASK-249-04: QA, Docs, and Closure
# FileName: TASK-249-04_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-249-01, TASK-249-02, TASK-249-03
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Close the follow-up only after replaying the real Custom Screens workflow
against the final V3 workspace and syncing all source-of-truth docs, changelog,
and board state.

## Sub-Tasks

- [x] TASK-249-04-01: Replay, Validation Matrix, Docs, Board, and Changelog Closure

## Files to Change

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- task-family docs under `_docs/_TASKS/TASK-249*.md`

## Closure Requirements

- replay the canonical House Projects screen workflow,
- verify there is no visible `Classic editor`, `Legacy drawer`, `Open records`,
  or `Builder` mode residue in the active workspace flow,
- verify that the list route and record route both use the screen-owned
  configuration,
- verify docs describe V3 and no longer describe the removed legacy paths.

## Security Contract

- Visibility: internal admin QA flow and source docs only.
- Auth model: authenticated admin session for replay steps.
- RBAC: replay touches existing `content:read`, `content:write`, and
  `content:publish` paths only when validation exercises them.
- CSRF: any replayed writes continue through the CSRF-backed admin clients.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: docs and replay evidence must match the final V3
  contract; do not leave stale V2 fallback prose behind.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- Run the focused suites required by TASK-249-04-01.
- Rerun all targeted lint/type/Vitest/Bun suites collected by TASK-249-01
  through TASK-249-03 before closing the family.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

## Acceptance Criteria

1. Replay evidence confirms the final UX and runtime contract.
2. All source-of-truth docs describe the hard-cut V3 workspace model.
3. Task board and changelog are synchronized only after validation is complete.
