# TASK-224: Page Editor Preview Action Consolidation
# FileName: TASK-224_Page_Editor_Preview_Action_Consolidation.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Runtime Preview
**Estimated Effort:** Small
**Dependencies:** TASK-211
**Status:** Done (2026-04-27)

---

## Overview

Simplify the Pages editor runtime preview entry point.

The editor no longer needs a separate top toolbar device selector because the
opened runtime preview dialog already owns desktop/tablet/mobile switching. The
toolbar should expose a compact `Preview` action immediately before `Save draft`
and leave device selection inside `RuntimePreviewDialog`.

## Sub-Tasks

- [x] Remove the Pages editor toolbar device selector and its controlled device
  state.
- [x] Rename the Pages editor `Runtime preview` toolbar action to `Preview`.
- [x] Move `Preview` directly to the left of `Save draft`.
- [x] Preserve the existing `RuntimePreviewDialog` device selector and preview
  probe behavior.
- [x] Update UI tests and preview documentation for dialog-owned device
  selection.

## Security Contract

- Visibility: internal admin Pages editor UI only.
- Auth model: unchanged existing admin session/API-key access.
- RBAC: unchanged; preview generation still uses the existing Pages preview
  route permissions.
- CSRF: unchanged; the existing admin preview POST keeps the current client
  CSRF behavior.
- Rate-limit bucket: unchanged; no API endpoint is added or modified.
- Reject-unknown validation: unchanged; no payload schema changes.
- Anti-abuse: unchanged; public preview remains token-gated and probe metadata
  stays sanitized through the existing preview contract.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx`

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/755-2026-04-27-task-224-page-editor-preview-action-consolidation.md`

## Closure Notes

- Pages editor top toolbar now groups `Preview` and `Save draft` together.
- `RuntimePreviewDialog` keeps the device selector and owns its own device
  state when Pages opens it.
- No API route, cache, storage, or preview token behavior changed.
