# TASK-211-05-01: Pages Editor Followup Test Matrix
# FileName: TASK-211-05-01_Pages_Editor_Followup_Test_Matrix.md

**Priority:** Medium
**Category:** QA + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-211-01, TASK-211-02, TASK-211-03, TASK-211-04
**Status:** To Do

---

## Overview

Own the targeted test matrix for the TASK-211 Pages editor follow-ups.

The test plan must follow runner ownership from `_docs/TESTING_STRATEGY.md`:
Vitest for admin/UI and pure client helpers, Bun for route/runtime preview
contracts when server behavior changes.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/page-editor-insert-scroll.test.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/admin/pagesClient.test.ts` if preview response metadata changes.
- `tests/integration/routes/pages.test.ts` if preview/probe route behavior
  changes.
- `tests/unit/pages/previewService.test.ts` if probe helper/service behavior is
  added.

## Security Contract

- Visibility: test-only.
- Auth/RBAC/CSRF/rate-limit: tests must prove any changed admin route preserves
  existing auth/RBAC/CSRF and rate-limit expectations.
- Reject-unknown validation: route tests must prove unknown preview/probe fields
  are rejected if schema changes.
- Anti-abuse: tests must prove token redaction in preview failure diagnostics.

## Testing Requirements

- Vitest:
  - runtime preview probe failure and timeout fallback;
  - Page editor save/publish success and error toasts;
  - inserted-block scroll alignment/offset proof;
  - Page History draft-version copy;
  - existing list toast adapter stability.
- Bun:
  - route registration for the final preview/probe method/path if route behavior
    changes;
  - preview/probe response shape;
  - token redaction;
  - centralized `map*Error` / `ApiError` coverage for known preview/probe
    domain failures;
  - route permission and CSRF behavior;
  - unknown field rejection.
- Baseline commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest command from TASK-211-05.

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` after final validation.

## Acceptance Criteria

1. Test ownership matches the current lane architecture.
2. Runtime route changes have Bun coverage.
3. UI changes have focused Vitest coverage.
4. Manual replay gaps are stated explicitly if not run.
