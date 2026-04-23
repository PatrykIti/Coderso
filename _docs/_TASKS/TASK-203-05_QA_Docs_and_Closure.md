# TASK-203-05: QA, Docs, and Closure
# FileName: TASK-203-05_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** CMS/Entries + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-203-01, TASK-203-02, TASK-203-03, TASK-203-04
**Status:** To Do

---

## Overview

Close the `TASK-203` Entries QA wave with final validation, docs parity,
board/changelog sync, and explicit replay of every report scenario from
`_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md`.

## Sub-Tasks

No child task files.

## Scope

- Re-run lint, typecheck, and targeted suites from completed leaves.
- Replay the Entries Playwright checklist.
- Update source docs, task board, changelog, and Playwright summary closure.
- Verify no new public write endpoint was introduced.
- Verify no browser cache/localStorage/debug payload stores secrets or preview
  tokens.
- Create/link follow-up tasks for still-reproducible preview-host/runtime issues
  or approved out-of-scope capability gaps.

Out of scope:

- broad full-repo tests unless shared route/cache/security behavior changed,
- closing unrelated TASK-201/TASK-202 work.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics changed
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/content-type-editor-and-schema-builder.md` if changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-203`

## Security Contract

- No new auth model is introduced during closure.
- Final QA confirms:
  - Entries routes remain internal and permission-gated,
  - mutating routes stay CSRF-protected,
  - duplicate/delete/metadata payloads remain strict where applicable,
  - preview consumption remains token-gated/read-only,
  - feedback/docs do not expose secrets, tokens, headers, or backend settings.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-metadata.test.tsx tests/vitest/ui/content-entry-editor.test.tsx tests/vitest/ui/entry-field-relation.test.tsx tests/vitest/ui/content-entries.test.tsx tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/contentTypesClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/server/previewUrls.test.ts`
- If route/service/runtime owners changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/contentTypes.test.ts tests/unit/content/entryService.test.ts tests/unit/site/publicEntryRenderer.test.tsx`
- Manual/Playwright replay:
  - type switching/search/filter/view toggle,
  - create entry,
  - metadata success/failure,
  - rich text editing,
  - row delete and duplicate,
  - editor danger-zone delete,
  - save/update feedback,
  - SEO URL,
  - taxonomy disabled link,
  - runtime preview success/failure,
  - sidebar grouping/hide-empty.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if applicable
- docs under `docs/coderso/*` touched by leaves
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-203`

## Acceptance Criteria

1. All `TASK-203-*` leaves are complete and validated in their lanes.
2. Every `BUG-*` and `UX-*` is mapped to fixed evidence or linked follow-up.
3. Docs, task board, changelog, and source Playwright summary are synchronized.
4. Remaining preview/runtime/environment issues have exact evidence and owners.

