# TASK-212-02-02: Post Dialog A11y Regression Matrix
# FileName: TASK-212-02-02_Post_Dialog_A11y_Regression_Matrix.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + Accessibility + QA
**Estimated Effort:** Small
**Dependencies:** TASK-212-02-01
**Status:** Done (2026-04-26)

---

## Overview

Add regression coverage for Posts dialogs/sheets that previously produced
Radix missing-description warnings.

The 2026-04-25 replay confirms Revisions is fixed but Create New Post regressed,
and the 2026-04-26 deep retest still reports the Create New Post warning. This
leaf prevents one-by-one fixes from moving the warning between Posts surfaces.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/posts-create-drawer-a11y.test.tsx` as the preferred focused
  suite for real Create New Post sheet wiring
- `tests/vitest/ui/page-post-list-wave.test.tsx` only if its existing sheet
  mock is upgraded to model `role="dialog"`, `aria-labelledby`, and
  `aria-describedby` the same way the shared Radix sheet primitives do
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx` only for revision
  regression smoke, and only with the same faithful sheet harness if asserting
  ARIA id wiring

## Implementation Direction

Use a fidelity harness for this regression. Prefer importing the real
`@/components/ui/sheet` primitives in a focused happy-dom suite. If a mock is
required to keep the test isolated, the mock must fail for the original bug:

- `SheetContent` must render a `role="dialog"` node with `aria-labelledby` and
  `aria-describedby`;
- `SheetTitle` and `SheetDescription` must create real elements with the ids
  referenced by the dialog;
- rendering the description as a plain sibling paragraph must leave
  `aria-describedby` missing or pointing at no element.

Do not rely on the existing shallow sheet mocks from `page-post-list-wave` or
`post-hooks-and-drawers-wave` unless they are upgraded first; those mocks render
`SheetContent` as a plain `<div>` and cannot catch the missing-id regression
from the Playwright replay.

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
- Capture `console.warn`/`console.error` for this focused render and assert that
  no Radix missing-description warning is emitted.
- Optional smoke:
  - Revisions drawer description remains wired.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` closure note.

## Acceptance Criteria

1. Create New Post and Revisions a11y description seams are covered.
2. The suite protects against the exact missing-id regression from the replay.
