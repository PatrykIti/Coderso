# TASK-208-06: Docs, Changelog, and Closure
# FileName: TASK-208-06_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Docs + QA + Task Governance
**Estimated Effort:** Medium
**Dependencies:** TASK-208-01, TASK-208-02, TASK-208-03, TASK-208-04, TASK-208-05
**Status:** Done (2026-04-24)

---

## Overview

Close the TASK-208 family with source-of-truth docs, validation evidence,
changelog entry, and task board synchronization.

This round should happen only after all implementation leaves have passed their
targeted Vitest coverage and required lint/type checks.

## Sub-Tasks

- [x] `TASK-208-06-01_Content_List_and_Design_Token_Docs.md`
- [x] `TASK-208-06-02_Validation_Changelog_and_Task_Board_Closure.md`

## Security Contract

- Visibility: documentation and internal task governance.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md`
- `_docs/_TASKS/TASK-208*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{next}-2026-04-24-task-208-admin-list-action-toasts.md`
- `_docs/_CHANGELOG/README.md`

## Testing Requirements

```bash
bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/content-type-create-drawer.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx
bun --cwd core lint
bun --cwd core lint:types
```

If `ContentTypeCreateDrawer` coverage is implemented by extending an existing
drawer-focused suite instead of creating
`tests/vitest/ui/content-type-create-drawer.test.tsx`, replace that filename in
the command with the exact suite that owns the real drawer create-error tests
and record the substitution in the validation notes.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Validation Notes (2026-04-24)

- Passed targeted Vitest for AdminApp/Sonner, shared list-action helper,
  Pages/Posts, Menus, Content Types, ContentTypeCreateDrawer, Entries, and
  EntryCreateDrawer create-error coverage.
- Passed `bun --cwd core lint`.
- Passed `bun --cwd core lint:types`.
- Added changelog entry
  `_docs/_CHANGELOG/738-2026-04-24-task-208-admin-list-action-toasts.md`.

## Acceptance Criteria

1. Source docs describe the final top-right list toast contract.
2. Design token docs describe the shared Sonner/Admin UI Theme token mapping.
3. Docs describe the generic list-action toast helper plus resource
   adapters/parameters.
4. Entries docs preserve `GET /content-entries` as the all-entries read model
   while keeping editor navigation on the existing admin route aliases.
5. Changelog records the implementation and validation evidence.
6. All TASK-208 task files and board rows are moved to Done only after
   validation.
