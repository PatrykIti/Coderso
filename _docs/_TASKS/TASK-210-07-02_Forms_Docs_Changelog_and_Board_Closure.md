# TASK-210-07-02: Forms Docs, Changelog, and Board Closure
# FileName: TASK-210-07-02_Forms_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Coderso Forms + Docs + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-210-07-01
**Status:** To Do

---

## Overview

Close TASK-210 by syncing source-of-truth docs, changelog, task statuses, and
the task board.

## Sub-Tasks

- [ ] Update `_docs/CONTENT_LIST_UX.md` with final Forms list behavior.
- [ ] Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` with final
  Forms cache hydration and mutation invalidation behavior.
- [ ] Update `_docs/ARCHITECTURE.md` so Forms admin UI wording uses canonical
  `/admin/coderso/forms` routes and keeps `/forms/*` as backend API/runtime
  route notation.
- [ ] Update `_docs/ADMIN_NAVIGATION.md` if route/canonical wording changed.
- [ ] Update `_docs/CMS_API.md` if route schemas, user settings, or error
  response docs changed.
- [ ] Update `docs/coderso/forms-list-and-builder.md` so the Forms guide reflects
  the final list search/status/access filters, selected-row bulk actions,
  confirmed delete behavior, and shared toast feedback.
- [ ] Add dated closure notes to `_docs/PLAYWRIGHT/SUMMARY-FORMS.md` for
  TASK-210-owned list findings (BUG-2, UX-1, and the Forms-contract subset of
  BUG-5). Note that BUG-5 Duplicate, Runtime Preview, and Embed Code remain
  deferred/non-goals until their own service/API/UI contracts exist, and that
  editor/runtime findings remain separate.
- [ ] Add one `_docs/_CHANGELOG/*` entry for TASK-210.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Mark TASK-210 umbrella, subtasks, and leaves Done with dated statuses and
  validation evidence.
- [ ] Move all TASK-210 rows to Done in `_docs/_TASKS/README.md` and update
  statistics.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md` if route docs changed.
- `_docs/CMS_API.md` if API/settings docs changed.
- `docs/coderso/forms-list-and-builder.md`
- `_docs/PLAYWRIGHT/SUMMARY-FORMS.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/TASK-210*.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: documentation/closure only.
- Auth/RBAC/CSRF/rate-limit: no new behavior.
- Reject-unknown validation: final docs must describe strict Forms status and
  submission-access validation if TASK-210-06-02 changed it.
- Anti-abuse: final docs must state that public submissions kept nonce plus
  optional reCAPTCHA behavior.

## Testing Requirements

- No new runtime tests are owned by this leaf beyond confirming TASK-210-07-01
  evidence is recorded.
- Verify `_docs/_TASKS/README.md` statistics after moving rows.

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. Docs match shipped Forms behavior.
2. Source QA report list findings are closed or explicitly deferred with dates,
   including BUG-5 sub-items that remain outside the current Forms contract.
3. Changelog entry and changelog index reference TASK-210.
4. Task board rows and statistics are synchronized.
5. Every TASK-210 file has final status and validation notes.
