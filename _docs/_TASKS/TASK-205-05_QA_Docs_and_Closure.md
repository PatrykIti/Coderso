# TASK-205-05: QA, Docs, and Closure
# FileName: TASK-205-05_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-205-01, TASK-205-02, TASK-205-03, TASK-205-04
**Status:** To Do

---

## Overview

Close the TASK-205 follow-up wave with targeted verification, source-of-truth
docs, task board updates, and changelog entry.

This closure task must prove the content type editor/list defects are fixed and
that the implementation stays aligned with the existing Pages/Posts/Menus list
contract and Admin UI Theme token contract.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
  - record Content Types footer, visible-scope selection, and bulk action
    behavior.
- `_docs/DESIGN_TOKENS.md`
  - update only if a new warning/destructive shared variant or token mapping is
    added.
- `_docs/ADMIN_CACHE.md`
  - update only if content type cache semantics change.
- `_docs/ADMIN_CACHE_MAP.md`
  - update only if cache keys or invalidation owners change.
- `_docs/_TASKS/TASK-205*.md`
  - mark completed scopes as `Done (YYYY-MM-DD)`.
- `_docs/_TASKS/README.md`
  - move TASK-205 rows from To Do to Done and update statistics.
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-205-content-type-admin-parity.md`
  - add implementation and validation evidence.
- `_docs/_CHANGELOG/README.md`
  - add the changelog index row.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `tests/vitest/ui/content-type-editor.test.tsx`
  - `tests/vitest/ui/content-type-table.test.tsx`
  - `tests/vitest/ui/content-type-list-parity.test.tsx`
  - `tests/vitest/admin/contentTypesClient.test.ts`
- Bun route tests only if API route behavior changes:
  - `bun test tests/integration/routes/contentTypes.test.ts`
- Manual or Playwright check for:
  - many-field content type JSON preview scroll,
  - content type delete dialog,
  - field removal dialog,
  - list footer and `Previous` / `Next` controls,
  - visible-scope multi-select and bulk actions.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` if token/variant contract changes.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior
  changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-205-content-type-admin-parity.md`

## Acceptance Criteria

1. All TASK-205 task files have final status and validation notes.
2. Task board statistics match the final status changes.
3. Changelog entry records user-facing fixes, owner files, and validation.
4. Docs explain any changed list/cache/token behavior.
5. Any skipped DB/API tests are explicitly recorded with reason.
