# TASK-191-05: QA, Docs, Changelog, and Closure
# FileName: TASK-191-05_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-191-01, TASK-191-02, TASK-191-03, TASK-191-04
**Status:** To Do

---

## Overview

Close the `TASK-191` Pages coverage hardening wave with final validation,
coverage reporting, docs synchronization, changelog entries, and task-board
updates.

This task should not hide incomplete coverage. If a branch remains uncovered
because it is infrastructure-only, unreachable, or better covered by a broader
suite, document that explicitly. If a branch represents real behavior, add the
test before closing.

## Sub-Tasks

- Re-run the full targeted Pages matrix:
  - Bun service/routes/runtime suites from `TASK-191-01` and `TASK-191-02`.
  - Vitest admin client and Page Builder suites from `TASK-191-03` and
    `TASK-191-04`.
- Run baseline repo checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Run coverage and record final Pages-related metrics:
  - `core/admin/services/pagesClient.ts`
  - `core/admin/ui/pages/*`
  - `core/admin/ui/pages/builder/*`
  - any new runtime/route coverage notes from Bun-owned suites.
- Update source-of-truth docs only where contracts changed.
- Add changelog entries for completed leaves and final closure.
- Update `_docs/_CHANGELOG/README.md`.
- Move `TASK-191*` rows in `_docs/_TASKS/README.md` to `Done` and update
  statistics.

## Security Contract

- Visibility: docs/process task only; it validates internal admin and public
  read contracts from the leaf tasks.
- Auth model: no new auth behavior.
- RBAC: no new RBAC behavior.
- CSRF: no new CSRF behavior.
- Rate-limit bucket: no new rate-limit behavior.
- Reject-unknown validation: no new schema behavior unless discovered by leaf
  task fixes.
- Anti-abuse: no public write surface.
- Secret handling: validation output and changelog notes must not include
  secrets, cookies, CSRF tokens, provider keys, or real preview tokens.

## Testing Requirements

- Required:
  - `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts`
  - New Bun suites from `TASK-191-01` and `TASK-191-02`.
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-preview.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Coverage:
  - `set -a && source .env && set +a && bun run test:coverage`
- Optional but useful if runtime route/security changed:
  - relevant `tests/security/*`
  - relevant `tests/perf/*`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/*` entries.
- `_docs/TESTING_STRATEGY.md`, `_docs/CMS_API.md`, `_docs/PREVIEW_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` only if leaf tasks changed
  their contracts.
