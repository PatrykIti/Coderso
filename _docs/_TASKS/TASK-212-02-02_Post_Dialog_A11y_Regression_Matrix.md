# TASK-212-02-02: Post Dialog A11y Regression Matrix
# FileName: TASK-212-02-02_Post_Dialog_A11y_Regression_Matrix.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + Accessibility + QA
**Estimated Effort:** Small
**Dependencies:** TASK-212-02-01
**Status:** To Do

---

## Overview

Add regression coverage for Posts dialogs/sheets that previously produced
Radix missing-description warnings.

The 2026-04-25 replay confirms Revisions is fixed but Create New Post regressed.
This leaf prevents one-by-one fixes from moving the warning between Posts
surfaces.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/posts-create-drawer-a11y.test.tsx` if a focused suite is
  clearer
- `tests/vitest/ui/page-post-list-wave.test.tsx` if existing Posts list drawer
  coverage already owns Create New Post
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx` only for revision
  regression smoke

## Implementation Direction

Create a focused helper assertion:

```ts
const dialog = container.querySelector("[role='dialog']");
const describedBy = dialog?.getAttribute("aria-describedby");
expect(describedBy).toBeTruthy();
expect(container.querySelector(`#${CSS.escape(describedBy!)}`)?.textContent)
  .toContain("Start a new article and publish when ready.");
```

Also keep a lightweight regression assertion that the Revisions drawer still
has its description from `TASK-204`.

## Security Contract

- No route or auth change.
- Test fixtures must not use real user data, tokens, or production endpoints.

## Testing Requirements

- Vitest happy-dom run must be console-clean.
- The test must fail if:
  - `aria-describedby` is missing;
  - the id does not exist;
  - the description text is rendered only as an unbound paragraph.
- Optional smoke:
  - Revisions drawer description remains wired.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` closure note.

## Acceptance Criteria

1. Create New Post and Revisions a11y description seams are covered.
2. The suite protects against the exact missing-id regression from the replay.
