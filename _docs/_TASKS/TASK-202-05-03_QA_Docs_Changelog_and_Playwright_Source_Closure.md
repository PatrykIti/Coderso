# TASK-202-05-03: QA Docs, Changelog, and Playwright Source Closure
# FileName: TASK-202-05-03_QA_Docs_Changelog_and_Playwright_Source_Closure.md

**Priority:** Medium
**Category:** QA + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01, TASK-202-02, TASK-202-03, TASK-202-04, TASK-202-05-02
**Status:** To Do

---

## Overview

Close TASK-202 against the original Playwright report, not only against task
board state. This leaf owns final evidence for every Engine `BUG-*` and `UX-*`
finding.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`
  - add fixed/open evidence mapping for each report item and name the owning
    code area for any remaining open dependency.
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_RELATIONS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache contract
  changed.
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` if Engine assistant behavior
  changed.
- `_docs/_TASKS/TASK-202*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry.

## Security Contract

- Visibility: docs and QA only.
- Auth/RBAC/CSRF/rate-limit: no runtime change in this leaf.
- Reject-unknown validation: no runtime change.
- Anti-abuse: closure notes must not include secrets, provider keys, personal
  data beyond already-public report metadata, or raw DB dumps.

## Testing Requirements

- Required baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Run the union of targeted suites from TASK-202 leaves.
- DB-backed tests are required if status/delete service behavior changed and
  `DATABASE_URL` is reachable.
- Replay `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` scenarios manually or with the
  available Playwright harness and record evidence/open follow-ups.
- Closure must prove fixes used existing owners (`typeService`, route
  validation/mapping, cached admin client, schema mapping, entry renderer, and
  current DB/settings owner seams) instead of introducing parallel contracts.

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. Each Engine report item maps to fixed evidence or a named open follow-up with
   an explicit owner/responsibility note.
2. Source docs, task board, and changelog are synchronized.
3. Final validation commands are recorded with pass/fail status.
