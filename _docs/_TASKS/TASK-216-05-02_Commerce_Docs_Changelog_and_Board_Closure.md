# TASK-216-05-02: Commerce Docs, Changelog, and Board Closure
# FileName: TASK-216-05-02_Commerce_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Coderso Commerce + Docs + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-216-05-01
**Status:** To Do

---

## Overview

Close TASK-216 by syncing Commerce catalog docs, admin cache docs, the Commerce
source QA report, changelog, task statuses, and the task board.

## Sub-Tasks

- [ ] Update `docs/coderso/commerce-catalog.md` with final list behavior:
  compact `New`, filters, selection, pagination, lifecycle row actions,
  confirmed deletes, bulk actions, and shared toast feedback.
- [ ] Update `_docs/CONTENT_LIST_UX.md` with Commerce catalog parity behavior.
- [ ] Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` with final
  Commerce cache hydration and mutation invalidation behavior.
- [ ] Update `_docs/CMS_API.md` if route errors, schemas, or endpoint examples
  changed.
- [ ] Update `_docs/ARCHITECTURE.md` if the Commerce admin contract changed.
- [ ] Add dated closure notes to `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` for
  TASK-216-owned list findings. Explicitly defer editor/product-model findings
  that remain outside this task.
- [ ] Add one `_docs/_CHANGELOG/*` entry for TASK-216 on completion.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Mark TASK-216 umbrella, subtasks, and leaves Done with dated statuses and
  validation evidence.
- [ ] Move all TASK-216 rows to Done in `_docs/_TASKS/README.md` and update
  statistics.

## Files to Change

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if route behavior changed.
- `_docs/ARCHITECTURE.md` if admin contract changed.
- `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/TASK-216*.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: documentation/closure only.
- Auth model: no new behavior.
- RBAC/CSRF/rate-limit: final docs must preserve internal admin write and CSRF
  expectations.
- Reject-unknown validation: final docs must not imply unknown Commerce product
  fields are accepted.
- Anti-abuse: final docs must state destructive row/bulk delete requires
  confirmation and no public Commerce write endpoint was added.

## Testing Requirements

- No new runtime tests are owned by this leaf beyond recording
  TASK-216-05-01 evidence.
- Verify `_docs/_TASKS/README.md` statistics after moving rows.
- Verify every `TASK-216*.md` file has required sections and a
  `## Security Contract`.

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. Docs match shipped Commerce catalog behavior.
2. `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` has a dated covered/deferred split.
3. Changelog entry and index reference TASK-216.
4. Task board rows and statistics are synchronized.
5. Every TASK-216 file has final status and validation notes on completion.
