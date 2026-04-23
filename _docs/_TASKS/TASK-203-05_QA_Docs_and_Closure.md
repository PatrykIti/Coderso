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
- Verify metadata-driven publish transitions still require `content:publish` and
  cannot be completed through `content:write` alone.
- Verify each closed finding was repaired through its existing owner seam, not a
  duplicate route/component/helper introduced only for this wave.
- Verify any new helper/component introduced by a leaf has an explicit owner and
  removes real complexity instead of duplicating an existing Entries, preview,
  route, validation, cache, or navigation contract.
- Verify mocked shell tests were not used as the only proof for real owner
  behavior. Shell mocks can prove `EntryEditor` orchestration, but direct owner
  tests must prove changed behavior in `FieldRenderer`, `EntryMetadataPanel`,
  `RuntimePreviewDialog`, `EntryTypeSidebar`, `entriesClient`,
  `contentEntryRoutes`, and `entryService`.
- Verify each leaf documents unresolved ownership boundaries before code merges;
  closure must not accept "implicit" ownership for route, service, UI feedback,
  cache, navigation, rich text, preview, SEO, taxonomy, or delete/duplicate
  contracts.
- Verify implementation did not add stale compatibility paths for assumptions
  that no longer match the current code, such as treating toolbar `Update` as a
  metadata call if the checked-in call graph no longer does that.
- Verify status/schedule/SEO/taxonomy dirty metadata uses the existing admin
  dirty-state warning/guard and cannot be abandoned by route/back/refresh flows
  without warning.
- Verify delete/danger-zone success and failure feedback uses the existing shared
  admin feedback surface.
- Verify `Duplicate` is implemented through the existing Entries
  `EntryTable` -> `EntryList` -> `entriesClient` -> `contentEntryRoutes` ->
  `entryService` path. If product rejects duplicate behavior, closure must point
  to a separate product-decision task created before implementation, not silently
  treat removal as a `TASK-203` fix.
- Verify generic Entries SEO preview uses the active content type and
  `site.contentRoutes`, not Posts-only helpers or hardcoded blog/post paths.
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
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/coderso/content-type-editor-and-schema-builder.md` if changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-203`

## Security Contract

- No new auth model is introduced during closure.
- Final QA confirms:
  - Entries routes remain internal and permission-gated,
  - mutating routes stay CSRF-protected,
  - metadata publish transitions require `content:publish`,
  - duplicate/delete/metadata payloads remain strict where applicable,
  - preview consumption remains token-gated/read-only,
  - feedback/docs do not expose secrets, tokens, headers, or backend settings.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-metadata.test.tsx tests/vitest/ui/content-entry-editor.test.tsx tests/vitest/ui/entry-field-relation.test.tsx tests/vitest/ui/content-entries.test.tsx tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/contentTypesClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/server/previewUrls.test.ts`
- Run Vitest through the shipped repo script above. Do not use
  `bun run vitest run` as the closure command unless the repo script is broken
  and the deviation is recorded with the exact failure.
- If `TASK-203-02-01` creates `tests/vitest/ui/entry-richtext-field.test.tsx`,
  append that file to the Vitest command above; otherwise rich text assertions
  must be present in `tests/vitest/ui/entry-field-relation.test.tsx`.
- The final Vitest set must include direct owner assertions for any owner touched
  by the leaves. If the existing listed suite mocks the owner under review, add
  or update a direct owner suite and append it to the command before closing the
  family.
- If route/service/runtime owners changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/contentTypes.test.ts tests/unit/content/entryService.test.ts tests/unit/site/publicEntryRenderer.test.tsx`
  - the route suite must include the metadata publish permission case if
    `TASK-203-01-01` changes metadata route behavior.
- If preview runtime behavior changed or the report's content-preview 404 is
  still in scope:
  - `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
  - or a new equivalent Bun runtime suite that creates an entry preview token,
    requests `/preview?type=content&token=...`, and proves 200 preview HTML or
    records an exact follow-up owner.
- Manual/Playwright replay:
  - type switching/search/filter/view toggle,
  - create entry,
  - metadata success/failure,
  - rich text editing,
  - row delete and duplicate,
  - editor danger-zone delete,
  - save/update feedback,
  - dirty metadata leave-page guard,
  - row/bulk/editor delete feedback,
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
3. Closure evidence names the owner seam for each fix and confirms no duplicate
   editor, preview, route, validation, cache, or navigation path was introduced.
4. Docs, task board, changelog, and source Playwright summary are synchronized.
5. Remaining preview/runtime/environment issues have exact evidence and owners.
6. Permission evidence confirms metadata status changes cannot bypass the
   existing publish route/security contract.
7. `BUG-4` is closed by a working duplicate flow in the existing Entries
   contract, or by a separate pre-approved product-scope change linked from the
   Playwright source report.
