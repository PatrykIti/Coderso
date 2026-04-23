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
and resilient. Do not add a second preview dialog.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryEditor.tsx:321-344`
- `core/admin/ui/entries/EntryEditor.tsx:641-650`
- `core/admin/ui/entries/EntryEditor.tsx:920-931`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `core/server/routes/contentEntryRoutes.ts:220-242`
- `core/server/utils/previewUrls.ts`
- `core/server/publicSite.tsx`
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
- Bun:
  - content preview route is registered,
  - preview URL resolver follows configured/public fallback rules,
  - public entry preview resolves valid content or produces a linked follow-up.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Entries preview is discoverable from the editor toolbar.
2. Preview failures are visible, actionable, and token-safe.
3. The 404 scenario is fixed or linked to a precise route/runtime follow-up.

