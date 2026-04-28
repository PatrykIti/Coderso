# TASK-195-02-03: Revision Preview Before Restore
# FileName: TASK-195-02-03_Revision_Preview_Before_Restore.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-02
**Status:** Done (2026-04-22)

---

## Overview

Add bounded read-only preview to the revision drawer so restore is no longer a
blind action.

Current code in `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:30-118`
shows only the version number, timestamp, author, and block count. That is not
enough for users to know what they are restoring, even though
`core/admin/services/postsClient.ts:75-81` already exposes revision `data`.

This leaf should provide a lightweight preview of the stored revision content
without turning the drawer into a second editable canvas.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:30-118`
- `core/admin/services/postsClient.ts:75-81` only if the revision preview needs
  a tighter client-side helper type
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- `tests/integration/posts/posts-revisions-flow.test.ts` only if revision
  payload shape changes

## Implementation Notes

- Keep the preview read-only and bounded.
- Reuse existing revision `data` rather than adding a second revision-fetch
  endpoint.
- A collapsed summary or modal preview is acceptable if it makes the restore
  decision explicit.

## Security Contract

- Visibility: internal admin revision drawer only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing revisions routes.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - preview must never mutate revision or post state,
  - restore confirmation remains required even when preview is available,
  - preview output must stay bounded and avoid dumping raw internal blobs.

## Testing Requirements

- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
  - revision rows expose preview controls,
  - preview renders bounded content before restore,
  - restore still requires confirmation and shows loading state.
- Bun only if revision payload shape changes.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users can inspect a revision snapshot before restoring it.
2. Revision preview is read-only and bounded.
3. Restore confirmation and loading/error behavior remain intact.
