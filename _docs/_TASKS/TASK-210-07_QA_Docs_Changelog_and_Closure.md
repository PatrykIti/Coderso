# TASK-210-07: QA, Docs, Changelog, and Closure
# FileName: TASK-210-07_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Coderso Forms + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-210-01, TASK-210-02, TASK-210-03, TASK-210-04, TASK-210-05, TASK-210-06
**Status:** Done (2026-04-26)

---

## Overview

Close the TASK-210 family with targeted validation, source-of-truth docs, a
changelog entry, and task-board synchronization.

This task should not add new Forms behavior. It proves that `/admin/coderso/forms`
now matches the Pages list contract where intended and that Forms-specific
security/runtime contracts still hold.

## Sub-Tasks

- [x] TASK-210-07-01: Forms Parity Test Matrix
- [x] TASK-210-07-02: Forms Docs, Changelog, and Board Closure
- [x] Run the full targeted Vitest UI/admin matrix for Forms list parity.
- [x] Run Bun route/service tests for touched route or service contracts.
- [x] Update content-list/admin-cache/navigation/API docs touched by the final
  implementation.
- [x] Update `_docs/ARCHITECTURE.md` so Forms admin UI wording distinguishes
  canonical admin routes (`/admin/coderso/forms`, `/admin/coderso/forms/:id`,
  `/admin/coderso/forms/:id/action-runs`) from backend API routes
  (`/forms/*`).
- [x] Update `docs/coderso/forms-list-and-builder.md` so the admin-facing Forms
  guide reflects the final list filters, selection, bulk actions, confirmation,
  and toast behavior.
- [x] Update `_docs/PLAYWRIGHT/SUMMARY-FORMS.md` with dated closure notes for
  list-scope findings covered by TASK-210: BUG-2 and UX-1, plus the
  Forms-contract subset of BUG-5 and the Create New Form subset of BUG-6.
  Explicitly defer BUG-5 requests for Duplicate, Runtime Preview, and Embed Code
  until those flows have their own contracts; explicitly defer BUG-6 runtime
  preview/global dialog warnings to a separate dialog-wrapper task; and leave
  editor/runtime findings to separate task families.
- [x] Confirm every TASK-210 leaf is either Done or explicitly superseded by
  the final implementation notes before moving the umbrella to Done.
- [x] Add a `_docs/_CHANGELOG/*` entry following the changelog numbering rules.
- [x] Update `_docs/_CHANGELOG/README.md`.
- [x] Mark TASK-210 family files complete with dated status and validation
  evidence.
- [x] Move TASK-210 rows from To Do to Done in `_docs/_TASKS/README.md` and
  update statistics.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md` only if route/canonical wording changes.
- `_docs/CMS_API.md` if route schema/error mapping changed.
- `docs/coderso/forms-list-and-builder.md`
- `_docs/PLAYWRIGHT/SUMMARY-FORMS.md`
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
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts`
- Route/service checks when route schemas or mappings changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts`
- Public submission hardening checks if any submission route/security code was
  touched:
  - `set -a && source .env && set +a && bun test tests/unit/forms/submissionService.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` must describe Forms list parity, filters, bulk
  actions, and toast/confirmation behavior.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` must describe final
  Forms list cache hydration and mutation invalidation behavior.
- `_docs/ARCHITECTURE.md` must not describe the admin Forms UI as living at the
  legacy `/forms` alias without the canonical `/admin/coderso/forms` context.
- `_docs/ADMIN_NAVIGATION.md` must stay clear that `/admin/coderso/forms` is
  canonical and `/admin/forms` is an alias.
- `_docs/CMS_API.md` must reflect any final route schema/error mapping changes.
- `docs/coderso/forms-list-and-builder.md` must describe the final admin Forms
  list workflow and not preserve outdated `New form` / status-only table copy.
- `_docs/PLAYWRIGHT/SUMMARY-FORMS.md` must record which list findings TASK-210
  closed, which Create New Form dialog warning subset TASK-210 closed, and which
  editor/runtime findings remain outside scope.
- `_docs/_CHANGELOG/*` and `_docs/_CHANGELOG/README.md` must include TASK-210.

## Acceptance Criteria

1. All TASK-210 implementation tasks are Done with dated statuses.
2. All TASK-210 leaf files are Done or have a dated superseded note that points
   to the implemented owner.
3. The targeted test matrix is recorded in task completion notes.
4. Docs match the shipped Forms list behavior.
5. Source QA report status is synchronized for the list-scope findings.
6. Changelog and changelog index are updated.
7. `_docs/_TASKS/README.md` statistics and tables are synchronized.
8. Any skipped tests or environment blockers are recorded explicitly.

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
