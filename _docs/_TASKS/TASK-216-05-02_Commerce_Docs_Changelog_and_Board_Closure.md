# TASK-216-05-02: Commerce Docs, Changelog, and Board Closure
# FileName: TASK-216-05-02_Commerce_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Coderso Commerce + Docs + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-216-05-01
**Status:** Done (2026-04-26)

---

## Overview

Close TASK-216 by syncing Commerce catalog docs, admin cache docs, the Commerce
source QA report, changelog, task statuses, and the task board.

## Sub-Tasks

- [x] Update `docs/coderso/commerce-catalog.md` with final list behavior:
  compact `New`, filters, selection, pagination, lifecycle row actions,
  confirmed deletes, bulk actions, and shared toast feedback.
- [x] Update `_docs/CONTENT_LIST_UX.md` with Commerce catalog parity behavior.
- [x] Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` with final
  Commerce cache hydration and mutation invalidation behavior.
- [x] Update `_docs/CMS_API.md` if route errors, schemas, or endpoint examples
  changed.
- [x] Update `_docs/ARCHITECTURE.md` if the Commerce admin contract changed.
- [x] Add dated closure notes to `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` for
  TASK-216-owned list findings. Explicitly defer editor/product-model findings
  that remain outside this task.
- [x] Add one `_docs/_CHANGELOG/*` entry for TASK-216 on completion.
- [x] Update `_docs/_CHANGELOG/README.md`.
- [x] Mark TASK-216 umbrella, subtasks, and leaves Done with dated statuses and
  validation evidence.
- [x] Move all TASK-216 rows to Done in `_docs/_TASKS/README.md` and update
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

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
