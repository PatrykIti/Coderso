# TASK-195-03: Post Inspector Taxonomy, Media, and SEO Affordances
# FileName: TASK-195-03_Post_Inspector_Taxonomy_Media_and_SEO_Affordances.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195
**Status:** To Do

---

## Overview

Replace raw technical inspector controls with product-facing affordances. The
report shows the current `Post` inspector still asks users for internal IDs and
hides critical SEO state too aggressively.

This wave keeps the existing posts metadata contract stable, but makes the
inspector operate on names, pickers, and explicit status summaries instead of
raw IDs and collapsed technical drawers.

## Sub-Tasks

- `TASK-195-03-01_Category_and_Featured_Image_Picker_Surfaces.md`
- `TASK-195-03-02_SEO_Visibility_and_Slug_URL_Context.md`

## Scope

- Replace `Category ID` with picker-backed category selection.
- Replace `Media ID` featured-image input with media picker reuse.
- Expose SEO completion state when `Advanced` is collapsed.
- Show slug editing with explicit runtime URL context in the existing editor and
  create-drawer flows while preserving the stored slug contract.
- Keep all of the above on existing owner seams: `DocumentInspector` for the UI,
  `taxonomyClient` and `MediaPicker` for lookup/picker reuse, `PostsListPage`
  plus `PostsCreateDrawer` for the create-flow slug surface/orchestration, and
  `siteSettingsClient` plus the current posts runtime route contract for URL
  context.

Out of scope:

- redesigning posts taxonomy storage,
- changing public slug persistence to a slash-prefixed value,
- replacing the current SEO schema or robots options.

## Files to Change

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/posts/PostsCreateDrawer.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/services/taxonomyClient.ts`
- `core/admin/services/siteSettingsClient.ts` only if a thin read helper is
  needed for slug URL context reuse
- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/admin/taxonomyClient.test.ts`
- `tests/vitest/admin/siteSettingsClient.test.ts` only if site settings helper
  usage changes

## Security Contract

- Visibility: internal admin metadata editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing admin taxonomy/media/posts
  routes.
- Reject-unknown validation: unchanged; this task must map picker choices back
  into the existing strict metadata payload.
- Anti-abuse:
  - no new public surface,
  - taxonomy/media lookup errors must fail closed with user-facing messaging,
  - browser state must keep using IDs internally without exposing secret-only
    metadata.

## Testing Requirements

- Vitest:
  - picker-backed category and featured-image rendering,
  - metadata draft normalization back to current payload shape,
  - SEO summary and slug-context rendering in both existing slug entrypoints,
  - taxonomy/media loading and empty/error states.
- Direct owner test:
  - `tests/vitest/ui/post-document-inspector-wave.test.tsx` for the concrete
    `DocumentInspector` contract that currently renders the raw ID fields.
  - `tests/vitest/ui/page-post-list-wave.test.tsx` for the current
    `PostsListPage` + `PostsCreateDrawer` create-flow contract when the slug URL
    context wiring changes.
- Bun only if posts metadata route payloads widen.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users can assign a category and featured image without looking up raw IDs.
2. SEO completion is visible even when the advanced section is collapsed.
3. Slug entrypoints in both the existing create and edit flows show the public
   URL context without changing the stored slug semantics behind the scenes.
