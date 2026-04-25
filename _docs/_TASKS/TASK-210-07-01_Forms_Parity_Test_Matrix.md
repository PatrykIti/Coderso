# TASK-210-07-01: Forms Parity Test Matrix
# FileName: TASK-210-07-01_Forms_Parity_Test_Matrix.md

**Priority:** Medium
**Category:** Coderso Forms + QA
**Estimated Effort:** Small
**Dependencies:** TASK-210-01-02, TASK-210-02-03, TASK-210-03-02, TASK-210-04-02, TASK-210-05-02, TASK-210-06-02
**Status:** To Do

---

## Overview

Run and record the targeted validation matrix for the completed Forms list
parity family.

## Sub-Tasks

- [ ] Run lint and typecheck.
- [ ] Run the Forms UI/admin Vitest matrix.
- [ ] Run user-settings tests if `forms.openAfterCreate` was added.
- [ ] Run Bun route/service tests if route schemas or mappings changed.
- [ ] Run public submission hardening tests if submission route/security code
  was touched.
- [ ] Record exact commands and results in TASK-210 completion notes.

## Files to Change

- `_docs/_TASKS/TASK-210*.md`
- No production files should change in this QA-only leaf.

## Security Contract

- Visibility: validation only.
- Auth/RBAC/CSRF/rate-limit: no new behavior.
- Reject-unknown validation: record final route schema validation evidence if
  TASK-210-06-02 changed schemas.
- Anti-abuse: record whether public submission nonce/captcha/access tests were
  run or why they were not required.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- UI/admin:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts`
- Route/service if touched:
  - `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/settings/userSettingsService.test.ts`
- Public submission if touched:
  - `set -a && source .env && set +a && bun test tests/unit/forms/submissionService.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts`

## Documentation Updates Required

- `_docs/_TASKS/TASK-210*.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Relevant lanes are selected by dependency shape, not folder name alone.
2. Every skipped command has an explicit environment or scope reason.
3. Validation evidence is copied into the final task completion notes.
