# TASK-204-01-02: Revision Drawer A11y and Empty Preview Fallback
# FileName: TASK-204-01-02_Revision_Drawer_A11y_and_Empty_Preview_Fallback.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-204-01
**Status:** Done (2026-04-23)

---

## Overview

Repair the remaining revisions drawer gaps:

- the sheet has visible subtitle copy but no wired description for Radix;
- preview can expand into `No preview available for this revision.` even when
  the revision has metadata and at least one block.

The goal is confidence before restore, not a second editor or raw JSON viewer.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:6`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:59-63`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:89-99`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:141-144`
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx:391`

## Implementation Notes

- Use the existing shadcn/Radix sheet description pattern, for example
  `SheetDescription`, instead of relying on a plain paragraph that is not wired
  to `DialogContent`.
- Keep the subtitle visible or screen-reader available according to local sheet
  patterns.
- When no text is extractable:
  - show bounded metadata such as version, author, timestamp, block count, and
    document shape;
  - avoid dumping raw revision JSON;
  - keep the preview read-only.
- Preserve existing restore confirmation and loading states.

## Security Contract

- Visibility: internal admin revision drawer only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing revision routes.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - preview must not mutate post/revision state,
  - preview output must stay bounded,
  - raw internal blobs, stack traces, and hidden payload fields must not be
    rendered to users.

## Testing Requirements

- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
  - sheet content has an accessible description,
  - opening preview for a text revision shows bounded text,
  - opening preview for a non-text/empty-text revision shows useful metadata
    instead of only `No preview available for this revision.`,
  - restore still requires confirmation.
- Manual Playwright:
  - opening revisions produces no `aria-describedby` warning in console.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The revisions sheet is accessible and warning-free.
2. Users can make a restore decision even for short/non-text revisions.
3. Preview stays read-only, bounded, and non-destructive.
