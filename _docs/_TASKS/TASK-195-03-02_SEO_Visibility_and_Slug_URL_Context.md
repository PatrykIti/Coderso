# TASK-195-03-02: SEO Visibility and Slug URL Context
# FileName: TASK-195-03-02_SEO_Visibility_and_Slug_URL_Context.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-195-03
**Status:** To Do

---

## Overview

Expose SEO state and slug context without changing the stored slug contract.

Current inspector behavior:

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:168-255`
  collapses the whole advanced/SEO surface by default.
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:205-209`
  computes SEO completion count, but only inside the collapsed section.
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:191-194`
  renders slug as a raw field with no public URL context.

This leaf should keep slug persistence backward compatible and make SEO status
visible even when the advanced controls are collapsed.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:168-255`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
  only if a derived URL prefix helper is needed from current settings/post data
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`

## Security Contract

- Visibility: internal admin metadata editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - do not rewrite stored slugs behind the user’s back,
  - any displayed URL prefix must come from trusted existing settings/runtime
    context only,
  - collapsed-summary badges must not imply SEO completeness when required
    fields are still empty.

## Testing Requirements

- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
  - collapsed SEO summary/badge stays visible,
  - slug field shows URL context without changing the raw value contract.
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - slug normalization and save payload remain backward compatible.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. SEO completion is visible before the advanced section is expanded.
2. Slug editing shows the runtime URL context.
3. Persisted slug values remain backward compatible with current posts data.
