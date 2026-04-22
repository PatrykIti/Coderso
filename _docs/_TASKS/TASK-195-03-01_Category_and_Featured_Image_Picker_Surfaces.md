# TASK-195-03-01: Category and Featured Image Picker Surfaces
# FileName: TASK-195-03-01_Category_and_Featured_Image_Picker_Surfaces.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-03
**Status:** To Do

---

## Overview

Replace raw-ID inspector fields with picker-backed affordances.

Current code still exposes:

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:131-155`
  `Category ID (optional)` as a plain text input.
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:157-165`
  `Media ID (optional)` for the featured image.

The repo already has the building blocks to avoid that:

- `core/admin/services/taxonomyClient.ts:29-67` exposes term/category overview
  reads.
- `core/admin/ui/media/MediaPicker.tsx:48-260` provides a reusable media-picker
  surface.

This leaf should reuse those seams instead of keeping raw-ID fields in the
editor.

Owner boundary:

- `DocumentInspector` owns the metadata editing surface.
- `PostDetailsSidebar` only passes tabs/document props; it must not become a
  second picker shell.
- `taxonomyClient.getTaxonomyOverview()` remains the read owner for category
  options.
- `MediaPicker` remains the shared media selection surface.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:131-165`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:281-307`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
  - keep mapping from picker output back to the existing posts metadata payload
- `core/admin/services/taxonomyClient.ts:29-67`
  - reuse as-is or add tiny read helpers only if needed
- `core/admin/ui/media/MediaPicker.tsx:48-260`
  - reuse directly; avoid a Posts-only media dialog fork
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/admin/taxonomyClient.test.ts`

## Security Contract

- Visibility: internal admin metadata editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged taxonomy/media/posts admin contracts.
- Reject-unknown validation: unchanged; picker values must still round-trip into
  the current strict metadata payload.
- Anti-abuse:
  - category and media lookups fail closed with user-facing errors,
  - no new public route is added,
  - only safe media identifiers needed by the current featured-image contract are
    kept in browser state.

## Testing Requirements

- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
  - category selector and featured-image picker render correctly.
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
  - the raw `Category ID` / `Media ID` inputs disappear from the direct
    `DocumentInspector` surface,
  - the chosen category/media affordance remains user-readable.
- `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
  - picker changes propagate through the details sidebar contract.
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - selected category/media IDs normalize back into the current payload shape.
- `tests/vitest/admin/taxonomyClient.test.ts`
  - taxonomy overview reads stay stable for the picker.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Category assignment is done through named options, not manual ID entry.
2. Featured image selection reuses the media picker and shows the chosen asset.
3. The underlying posts metadata payload remains backward compatible.
