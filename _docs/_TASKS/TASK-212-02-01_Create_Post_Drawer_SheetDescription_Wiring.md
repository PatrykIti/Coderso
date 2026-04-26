# TASK-212-02-01: Create Post Drawer SheetDescription Wiring
# FileName: TASK-212-02-01_Create_Post_Drawer_SheetDescription_Wiring.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-212-02
**Status:** Done (2026-04-26)

---

## Overview

Wire Create New Post drawer copy through `SheetDescription`.

This is the minimal implementation leaf for `BUG-8`. It should be a small UI
fix, but it must use the shared sheet primitive instead of manually managing
Radix ids.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/PostsCreateDrawer.tsx`

## Implementation Direction

1. Import `SheetDescription` from `@/components/ui/sheet`.
2. Replace the subtitle paragraph below `SheetTitle` with
   `SheetDescription`.
3. Preserve visual styling (`text-xs text-muted-foreground`) and copy.
4. Do not change drawer sizing, form payload, slug behavior, or
   `openAfterCreate`.

## Security Contract

- No route, auth, RBAC, CSRF, rate-limit, or validation change.
- Accessible description content is static trusted UI copy.

## Testing Requirements

- Covered by `TASK-212-02-02`.
- No standalone test is required if the regression matrix directly exercises
  this component.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` on closure.

## Acceptance Criteria

1. The Create New Post drawer title/description uses the same sheet primitives
   as the fixed Posts revision drawer.
2. No unrelated create-flow behavior changes.
