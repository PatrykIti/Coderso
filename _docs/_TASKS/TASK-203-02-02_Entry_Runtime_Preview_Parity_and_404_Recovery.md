# TASK-203-02-02: Entry Runtime Preview Parity and 404 Recovery
# FileName: TASK-203-02-02_Entry_Runtime_Preview_Parity_and_404_Recovery.md

**Priority:** Medium
**Category:** CMS/Entries + Runtime Preview + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-02
**Status:** To Do

---

## Overview

Make the existing Entries `Runtime preview` surface discoverable, consistent,
and resilient. Do not add a second preview dialog or alternate preview route.
The Playwright report said the button was missing, but the current checked-in
`EntryEditor` already renders it; treat that as stale report context and fix the
current parity/runtime gap.

Ownership:

- `EntryEditor` owns the toolbar action and dialog state.
- `entriesClient.previewEntry()` owns the admin API call and CSRF behavior.
- `contentEntryRoutes.ts` owns preview token creation and URL response shape.
- `previewUrls.ts` owns token-safe preview URL construction.
- `publicSite.tsx` owns `/preview?type=content...` token consumption and
  runtime HTML rendering. UI-only tests cannot close the captured 404.
- `publicSite.tsx:717-781` owns the detail rendering branch that first checks
  `isPostContentTypeSlug(typeSlug)`. Because the report URL included
  `contentType=post`, this branch must be verified before blaming the dialog or
  token URL construction.
- `postBlockRuntimeMapper.ts:895-899` owns the current `post`/`posts` slug
  classification. Change it only if the product contract intentionally changes
  how legacy/generic Entries with a `post` slug coexist with dedicated Posts.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryEditor.tsx:321-344`
- `core/admin/ui/entries/EntryEditor.tsx:641-650`
- `core/admin/ui/entries/EntryEditor.tsx:920-931`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `core/server/publicSite.tsx:717-781`
- `core/server/routes/contentEntryRoutes.ts:220-242`
- `core/server/utils/previewUrls.ts`
- `core/server/publicSite.tsx:841-883`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts:895-899` only if the
  current post-slug classification is the confirmed cause
- `tests/integration/runtime/pages-runtime.test.ts` or a new equivalent
  content-preview runtime suite
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/server/previewUrls.test.ts`
- `tests/unit/site/publicEntryRenderer.test.tsx`

## Security Contract

- Visibility: internal token creation plus public read-only token preview.
- Auth model: admin session/API key for token creation; valid preview token for
  consumption.
- RBAC: `content:read` for token creation.
- CSRF: token creation remains CSRF-protected.
- Rate-limit buckets: `admin_read`, `public_read`.
- Reject-unknown validation: preview payload remains strict (`ttlMinutes` only).
- Anti-abuse: no preview tokens, internal hosts, headers, or stack traces in UI
  error copy.

## Testing Requirements

- Vitest:
  - preview action opens shared dialog,
  - preview API failure renders token-safe recovery copy,
  - iframe/loopback failure copy remains stable.
  - `EntryEditor` tests that mock `RuntimePreviewDialog` prove only that the
    dialog is opened; token-safe copy and iframe failure behavior must be proven
    against the real `RuntimePreviewDialog` owner suite.
- Bun:
  - content preview route is registered,
  - preview URL resolver follows configured/public fallback rules,
  - public entry preview resolves valid content through `handlePublicRequest`,
  - report-shaped preview with a generic `content_entries` record and
    `contentType=post` / content type slug `post` does not disappear into the
    dedicated Posts storage branch unless that behavior is an explicit product
    decision recorded in the leaf,
  - proof creates an entry preview token and requests
    `/preview?type=content&token=...`; if it still returns 404, closure must
    link a follow-up with the exact owner (`publicSite`, content route matching,
    preview token validation, or entry lookup).

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Entries preview is discoverable from the editor toolbar.
2. Preview failures are visible, actionable, and token-safe.
3. The 404 scenario is fixed with runtime evidence or linked to a precise
   route/runtime follow-up.
4. Closure evidence names whether `publicSite` post-slug branch selection was
   the root cause for the report's `contentType=post` preview failure.
