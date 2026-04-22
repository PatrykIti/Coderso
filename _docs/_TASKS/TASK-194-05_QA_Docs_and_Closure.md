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
- `tests/vitest/ui/page-list-cache-behavior.test.tsx`
- `tests/vitest/ui/page-settings-drawer.test.tsx`
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`
- `tests/vitest/ui/drawers.test.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/ui/page-editor-insert-scroll.test.tsx` if added by
  `TASK-194-03-02`
- `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` if added by
  `TASK-194-04-02`
- `tests/vitest/pageBuilder/blockToolbar.test.tsx` if the toolbar leaf ships a
  focused real-component suite
- `tests/vitest/pageBuilder/blockList.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/pickers.test.tsx`
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/integration/routes/pages.test.ts` if any server/service seam changed
- `tests/unit/pages/previewService.test.ts` only if preview URL derivation or
  preview-service messaging changed on the server
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
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list-cache-behavior.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx`
  - if `tests/vitest/pageBuilder/blockToolbar.test.tsx` is added by `TASK-194-04-01`, append it to the same Vitest run
  - if `tests/vitest/ui/page-editor-insert-scroll.test.tsx` is added by
    `TASK-194-03-02`, append it to the same Vitest run
  - if `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` is added by
    `TASK-194-04-02`, append it to the same Vitest run
  - keep at least one non-mocked `Sheet` path and one non-mocked `Dialog` path
    in the Pages suites so Radix warning regressions fail in local Vitest, not
    only in Playwright/manual QA
  - preferred real-wrapper paths:
    - `tests/vitest/ui/drawers.test.tsx` and/or
      `tests/vitest/ui/page-revision-drawer.test.tsx` for `Sheet`
    - `tests/vitest/ui/runtime-preview-dialog.test.tsx` for `Dialog`
  - author/cache closure notes must cite `tests/vitest/admin/pagesClient.test.ts`
    as the cache-owner proof; symptom-level UI tests are secondary evidence
  - builder toolbar accessibility must be proven on the real toolbar component
    (`tests/vitest/pageBuilder/blockToolbar.test.tsx` or an explicitly
    unmocked equivalent), not only through the mocked `blockList` suite
  - author-fallback closure notes must confirm both mobile and desktop PageTable
    presentations, not only the desktop column
  - post-insert scroll/highlight closure must reference an unmocked
    `PageEditor -> BlockList` path, not only `page-editor-shell-wave` while it
    still mocks `BlockList`
  - empty-slot CTA closure must reference a real existing insert-surface path,
    not only copy snapshots in `blockList.test.tsx`
- Bun only if server/service code changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts tests/unit/pages`
  - if the preview UI change requires new server-derived host metadata, add the
    targeted `tests/unit/pages/previewService.test.ts` assertion instead of
    broadening the Bun lane blindly

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
2. Closure explicitly states which report items were fixed by Vitest-owned UI
   coverage, which ones were verified on real `Sheet`/`Dialog` wrappers, and
   which ones required Bun-side regression guards.
3. Docs describe the final user-facing list/settings/editor/builder behavior.
4. The task board and changelog are synchronized with the final state.
