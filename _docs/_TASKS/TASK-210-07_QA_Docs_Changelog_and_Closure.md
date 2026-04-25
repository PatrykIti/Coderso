# TASK-210-07: QA, Docs, Changelog, and Closure
# FileName: TASK-210-07_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Coderso Forms + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-210-01, TASK-210-02, TASK-210-03, TASK-210-04, TASK-210-05, TASK-210-06
**Status:** To Do

---

## Overview

Close the TASK-210 family with targeted validation, source-of-truth docs, a
changelog entry, and task-board synchronization.

This task should not add new Forms behavior. It proves that `/admin/coderso/forms`
now matches the Pages list contract where intended and that Forms-specific
security/runtime contracts still hold.

## Sub-Tasks

- [ ] Run the full targeted Vitest UI/admin matrix for Forms list parity.
- [ ] Run Bun route/service tests for touched route or service contracts.
- [ ] Update content-list/admin-cache/navigation/API docs touched by the final
  implementation.
- [ ] Add a `_docs/_CHANGELOG/*` entry following the changelog numbering rules.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Mark TASK-210 family files complete with dated status and validation
  evidence.
- [ ] Move TASK-210 rows from To Do to Done in `_docs/_TASKS/README.md` and
  update statistics.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ADMIN_NAVIGATION.md` only if route/canonical wording changes.
- `_docs/CMS_API.md` if route schema/error mapping changed.
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/TASK-210*.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: documentation/validation closure only.
- Auth/RBAC/CSRF/rate-limit: no new behavior.
- Reject-unknown validation: closure must record the final state if
  TASK-210-06 changed route schemas.
- Anti-abuse: closure must explicitly note that public submissions kept nonce
  plus optional reCAPTCHA hardening.

## Testing Requirements

- Baseline checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- UI/admin targeted checks:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
- Route/service checks when route schemas or mappings changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts`
- Public submission hardening checks if any submission route/security code was
  touched:
  - `set -a && source .env && set +a && bun test tests/unit/forms/submissionService.test.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` must describe Forms list parity, filters, bulk
  actions, and toast/confirmation behavior.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` must describe final
  Forms list cache hydration and mutation invalidation behavior.
- `_docs/ADMIN_NAVIGATION.md` must stay clear that `/admin/coderso/forms` is
  canonical and `/admin/forms` is an alias.
- `_docs/CMS_API.md` must reflect any final route schema/error mapping changes.
- `_docs/_CHANGELOG/*` and `_docs/_CHANGELOG/README.md` must include TASK-210.

## Acceptance Criteria

1. All TASK-210 implementation tasks are Done with dated statuses.
2. The targeted test matrix is recorded in task completion notes.
3. Docs match the shipped Forms list behavior.
4. Changelog and changelog index are updated.
5. `_docs/_TASKS/README.md` statistics and tables are synchronized.
6. Any skipped tests or environment blockers are recorded explicitly.
