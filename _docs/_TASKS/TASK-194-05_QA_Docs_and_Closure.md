# TASK-194-05: QA Docs and Closure
# FileName: TASK-194-05_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + CMS/Pages + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-194-01, TASK-194-02, TASK-194-03, TASK-194-04
**Status:** To Do

---

## Overview

Close the `TASK-194` family with targeted validation, docs parity, changelog,
and board synchronization.

This leaf exists so the UX fixes do not stop at local code changes without a
clear statement of what was validated and what contract text changed.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/page-table-wave.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui/page-settings-drawer.test.tsx`
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/pickers.test.tsx`
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/integration/routes/pages.test.ts` if any server/service seam changed
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` only if cache semantics changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for TASK-194

## Security Contract

- Visibility: no new endpoint surface.
- Auth/RBAC/CSRF/rate-limit: unchanged unless earlier leaves explicitly changed
  a server contract, in which case this closure must document it.
- Reject-unknown validation: unchanged.
- Anti-abuse: validation notes must distinguish UI-only changes from any route or
  preview-contract changes.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx`
- Bun only if server/service code changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts tests/unit/pages`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` only if applicable
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry

## Acceptance Criteria

1. The `TASK-194` family ships with targeted validation across the correct
   Vitest/Bun lanes.
2. Docs describe the final user-facing list/settings/editor/builder behavior.
3. The task board and changelog are synchronized with the final state.
