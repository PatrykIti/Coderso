# TASK-210-07-02: Forms Docs, Changelog, and Board Closure
# FileName: TASK-210-07-02_Forms_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Coderso Forms + Docs + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-210-07-01
**Status:** Done (2026-04-26)

---

## Overview

Close TASK-210 by syncing source-of-truth docs, changelog, task statuses, and
the task board.

## Sub-Tasks

- [x] Update `_docs/CONTENT_LIST_UX.md` with final Forms list behavior.
- [x] Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` with final
  Forms cache hydration and mutation invalidation behavior.
- [x] Update `_docs/ARCHITECTURE.md` so Forms admin UI wording uses canonical
  `/admin/coderso/forms` routes and keeps `/forms/*` as backend API/runtime
  route notation.
- [x] Update `_docs/ADMIN_NAVIGATION.md` if route/canonical wording changed.
- [x] Update `_docs/CMS_API.md` if route schemas, user settings, or error
  response docs changed.
- [x] Update `docs/coderso/forms-list-and-builder.md` so the Forms guide reflects
  the final list search/status/access filters, selected-row bulk actions,
  confirmed delete behavior, and shared toast feedback.
- [x] Add dated closure notes to `_docs/PLAYWRIGHT/SUMMARY-FORMS.md` for
  TASK-210-owned list findings (BUG-2, UX-1, and the Forms-contract subset of
  BUG-5) plus the Create New Form subset of BUG-6. Note that BUG-5 Duplicate,
  Runtime Preview, and Embed Code remain deferred/non-goals until their own
  service/API/UI contracts exist; BUG-6 runtime preview/global dialog warnings
  remain deferred to a separate dialog-wrapper task; and editor/runtime findings
  remain separate.
- [x] Add one `_docs/_CHANGELOG/*` entry for TASK-210.
- [x] Update `_docs/_CHANGELOG/README.md`.
- [x] Mark TASK-210 umbrella, subtasks, and leaves Done with dated statuses and
  validation evidence.
- [x] Move all TASK-210 rows to Done in `_docs/_TASKS/README.md` and update
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
   including BUG-5 sub-items that remain outside the current Forms contract and
   the BUG-6 runtime/global dialog warning subset that remains outside TASK-210.
3. Changelog entry and changelog index reference TASK-210.
4. Task board rows and statistics are synchronized.
5. Every TASK-210 file has final status and validation notes.

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
