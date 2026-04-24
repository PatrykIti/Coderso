# TASK-207-05: QA, Docs, and Closure
# FileName: TASK-207-05_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-207-01-01, TASK-207-01-02, TASK-207-02-01, TASK-207-02-02, TASK-207-02-03, TASK-207-03-01, TASK-207-03-02, TASK-207-03-03, TASK-207-04-01, TASK-207-04-02, TASK-207-04-03
**Status:** To Do

---

## Overview

Close TASK-207 with targeted validation, docs, task board updates, and a
changelog entry.

Closure must prove Entries list parity, cross-type read behavior, content-type
links, advanced filters, shared pagination, visible-scope selection, and
token-backed popups all work together without breaking the existing type-scoped
editor/widget/relation contracts.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
  - record Entries list parity, content-type column/link behavior, basic and
    advanced filter split, shared pagination, and visible-scope bulk actions.
- `_docs/ADMIN_CACHE.md`
  - record all-entries cache key and invalidation behavior.
- `_docs/ADMIN_CACHE_MAP.md`
  - update Entries list cached APIs, mutations, cache bus keys, and prefetch map.
- `_docs/CMS_API.md`
  - update only if the all-entries admin read route is documented.
- `_docs/DESIGN_TOKENS.md`
  - update only if shared token variants changed.
- `_docs/_TASKS/TASK-207*.md`
  - mark completed files with final status and completion notes.
- `_docs/_TASKS/README.md`
  - move TASK-207 rows from To Do to Done and update statistics.
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-207-entries-list-parity.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: internal admin Entries list and editor routes.
- Auth model: authenticated admin session/API key where supported.
- RBAC: `content:read`, `content:write`, and `content:publish` per route/action.
- CSRF: all mutating helpers use existing CSRF behavior.
- Rate-limit buckets: `admin_read` and `admin_write`.
- Reject-unknown validation: route and payload schemas remain strict.
- Anti-abuse: no public write path; destructive bulk delete is confirmed and
  visible-selection scoped.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/content/entryService.test.ts`
- `bun test tests/integration/routes/contentTypes.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/content-entries.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-list-filters.test.ts tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-table-title.test.tsx`
- Broader smoke if implementation touches shared list or popup primitives:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if applicable.
- `_docs/DESIGN_TOKENS.md` if applicable.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-207-entries-list-parity.md`

## Acceptance Criteria

1. TASK-207 source docs and task files reflect the final implementation.
2. Changelog records user-facing changes, owner files, and validation evidence.
3. Entries list parity is verified against Pages/Posts/Menus/Content Types.
4. Type-scoped entry editor and widget/relation contracts are regression-tested
   or explicitly covered by unchanged owner suites.
5. Any skipped DB-backed tests are recorded with reason.
6. Closure notes confirm no parallel Entries flow, duplicate pagination, or
   resource-specific popup system was introduced.

