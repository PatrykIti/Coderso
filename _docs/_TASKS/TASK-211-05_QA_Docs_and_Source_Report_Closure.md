# TASK-211-05: QA, Docs, and Source Report Closure
# FileName: TASK-211-05_QA_Docs_and_Source_Report_Closure.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-211-01, TASK-211-02, TASK-211-03, TASK-211-04
**Status:** To Do

---

## Overview

Close the TASK-211 follow-up family with targeted validation, docs updates,
changelog, task board sync, and a refreshed source report entry in
`_docs/PLAYWRIGHT/SUMMARY-PAGES.md`.

Do not mark `BUG-6` closed from this task family. Its verification is owned
outside TASK-211.

## Sub-Tasks

- [ ] TASK-211-05-01: Pages Editor Followup Test Matrix
- [ ] TASK-211-05-02: Docs, Changelog, and Playwright Report Closure

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md` if preview/probe response metadata changes.
- `_docs/CONTENT_LIST_UX.md` if notification adapter docs are generalized.
- `_docs/DESIGN_TOKENS.md` only if toast host/token contract changes.
- `_docs/_TASKS/TASK-211*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: docs/QA closure only.
- Auth/RBAC/CSRF/rate-limit: verify final implementation kept the contracts from
  TASK-211 leaves.
- Reject-unknown validation: verify any preview/probe payloads reject unknown
  fields if implemented.
- Anti-abuse:
  - closure notes must explicitly state `BUG-6` is outside TASK-211;
  - preview diagnostics must be token-redacted.

## Testing Requirements

- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx`
- If preview/probe route behavior changed:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/pages.test.ts tests/unit/pages/previewService.test.ts`
  - verify route registration and centralized `map*Error` / `ApiError` coverage
    for any new or changed preview/probe route.
- Manual replay when a local admin server is available:
  - Save draft success/failure toast;
  - Publish success/failure toast;
  - preview success;
  - preview 404/503 or unreachable placeholder;
  - long-canvas insert scroll;
  - Page History wording.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md`
  - add a dated TASK-211 closure section for UX-1, UX-2, UX-5, and UX-8;
  - explicitly leave `BUG-6` to its separate verification path.
- `_docs/PREVIEW_SPEC.md`
  - document the preview failure/probe behavior if changed.
- `_docs/CMS_API.md`
  - document preview response/probe metadata if changed.
- `_docs/_TASKS/README.md`
  - move TASK-211 family to Done and update statistics.
- `_docs/_CHANGELOG/*`
  - add the completed task entry.
- `_docs/_CHANGELOG/README.md`
  - index the changelog entry.

## Acceptance Criteria

1. All TASK-211 leaves are status `Done` with dates after implementation.
2. Targeted tests pass or unrelated failures are recorded with exact failure
   strings.
3. Source report reflects final status for UX-1, UX-2, UX-5, and UX-8.
4. `BUG-6` is not silently marked closed by TASK-211.
