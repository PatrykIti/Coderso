# TASK-241: Pages Published Preview Draft Sync
# FileName: TASK-241_Pages_Published_Preview_Draft_Sync.md

**Priority:** High
**Category:** CMS Pages + Admin UI + Runtime Preview
**Estimated Effort:** Small
**Dependencies:** TASK-211, TASK-224, TASK-225
**Status:** Done (2026-04-29)

---

## Overview

Fix the Pages editor action contract for already published pages:

- `Save draft` must not be exposed for pages whose current status is
  `published`.
- `Publish` remains the active action for updating the live published page.
- `Preview` must show the current admin editor changes even when the page has
  unsaved changes.

The implementation must preserve the public runtime split:

- public page routes render `publishedData`;
- preview token routes render `currentData`.

That means preview may silently sync the current editor payload into
`currentData` before generating the preview token, but it must not update
`publishedData` or make the changes visible to public visitors before `Publish`.

## Sub-Tasks

- [x] Hide `Save draft` for published pages.
- [x] Keep `Publish` enabled as the published-page update action.
- [x] Make `Preview` silently sync unsaved editor data before token generation.
- [x] Add focused Pages editor regression coverage.
- [x] Update preview/docs/changelog/task board.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/774-2026-04-29-task-241-pages-published-preview-draft-sync.md`

## Security Contract

- Visibility:
  - admin editor actions are internal admin UI only;
  - public preview remains token-only through `/preview`.
- Auth model:
  - silent preview sync uses the existing admin `PATCH /pages/:id` client path;
  - preview token generation uses the existing `POST /pages/:id/preview` path.
- RBAC:
  - silent preview sync requires the existing `content:write` route permission;
  - preview token generation keeps `content:read`;
  - live update keeps `content:publish`.
- CSRF:
  - silent preview sync keeps `withCsrf: true` through `updatePage`;
  - preview generation keeps `withCsrf: true`.
- Rate-limit bucket:
  - unchanged admin write/read buckets.
- Reject-unknown validation:
  - no new payload shape is introduced;
  - `PATCH /pages/:id` and `POST /pages/:id/preview` keep their existing strict
    schemas.
- Anti-abuse:
  - preview still uses server-generated URLs only;
  - preview tokens are not exposed in diagnostics or admin copy;
  - silent sync must not write `publishedData` or bypass `content:publish`.

## Implementation Notes

```ts
async function handlePreview() {
  if (!pageId) return openCannotPreviewState()
  if (pageActionInFlightRef.current) return

  pageActionInFlightRef.current = true
  setPreviewLoading(true)

  try {
    if (hasUnsavedChangesRef.current) {
      const updated = await updatePage(pageId, { data: pageData })
      setPage(updated)
      setUnsavedChanges(false)
      setRemoteUpdatePending(false)
    }

    const result = await previewPage(pageId, { probe: true })
    setPreviewUrl(result.previewUrl)
    setPreviewProbe(result.probe ?? null)
  } finally {
    pageActionInFlightRef.current = false
    setPreviewLoading(false)
  }
}
```

## Testing Requirements

- [x] `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-editor-shell-wave.test.tsx` - PASS, 14 tests.
- [x] `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` - PASS outside sandbox, 6 tests.
- [x] `bun --cwd core lint` - PASS.
- [x] `bun --cwd core lint:types` - PASS.
- [x] `git diff --check` - PASS.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Published Pages editor does not render `Save draft`.
2. Published Pages editor keeps `Publish` enabled for the live update action.
3. Preview with unsaved changes syncs the current editor data before calling the
   preview endpoint.
4. Public visitors do not see preview-synced changes until `Publish` updates
   `publishedData`.
5. Focused UI and runtime/public-preview validation are recorded.

## Progress Notes

- 2026-04-29: Implemented published-page action cleanup and silent preview draft
  sync in `PageEditor`.
- 2026-04-29: Added focused Vitest coverage proving `Save draft` is hidden for
  published pages, `Publish` stays enabled, and preview sync calls
  `updatePage` before `previewPage` without changing `publishedData`.
- 2026-04-29: Revalidated the DB-backed runtime split outside the sandbox:
  public routes render `publishedData`, preview token routes render
  `currentData`.
