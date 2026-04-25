# TASK-211-03: Inserted Block Viewport Alignment
# FileName: TASK-211-03_Inserted_Block_Viewport_Alignment.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + Builder UX
**Estimated Effort:** Medium
**Dependencies:** TASK-211, TASK-194-03-02
**Status:** Done (2026-04-25)

---

## Overview

Finish the inserted-block scroll fix so the behavior satisfies the manual
Playwright report, not only the current unit-level proof.

The current code calls `scrollIntoView({ behavior: "smooth", block: "center" })`
and tests only assert that `scrollIntoView` was called. The report observed a
newly inserted block partially outside the visible canvas. This round should
bring the block's header/top edge into a predictable viewport position and prove
that behavior with a stronger DOM geometry test.

## Sub-Tasks

- [x] TASK-211-03-01: Inserted Block Scroll Target and Test Proof

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx` only if additional stable
  markers/focus targets are required.
- `tests/vitest/ui/page-editor-insert-scroll.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx` if block row markers change.

## Implementation Direction

- Keep selection and highlight behavior from the previous fix.
- Prefer `scrollIntoView({ behavior: "smooth", block: "start" })` or a
  viewport-offset helper that accounts for fixed editor/canvas chrome.
- If `block: "start"` causes the block to hide behind sticky chrome, use an
  explicit canvas container scroll calculation with a named offset.
- Keep one owner:
  - `PageEditor` schedules and executes scroll/focus;
  - `BlockList` exposes stable row markers and highlight/focus targets.
- Do not introduce a global scroll coordinator just for Pages.

## Pseudocode

```ts
target.scrollIntoView({ behavior: "smooth", block: "start" });
target
  .querySelector<HTMLElement>("[data-block-select='true']")
  ?.focus({ preventScroll: true });
```

or:

```ts
const top = target.offsetTop - CANVAS_SCROLL_OFFSET_PX;
canvasScroller.scrollTo({ top, behavior: "smooth" });
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: none beyond keeping the behavior presentational and tied to the
  selected inserted block id.

## Testing Requirements

- `tests/vitest/ui/page-editor-insert-scroll.test.tsx`
  - assert the new inserted block remains selected;
  - assert highlight is applied and clears;
  - assert the scroll call uses the desired alignment, or mock geometry and
    assert the computed scroll target keeps the block top inside viewport;
  - avoid a test that only checks `scrollIntoView` was called.
- Manual replay on closure:
  - long page with 10+ blocks;
  - insert a new widget below the fold;
  - verify heading/top area is visible without manual correction.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` on closure.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Newly inserted block top/header lands inside the visible canvas viewport.
2. The inserted block is selected and highlighted.
3. The regression proof validates alignment, not only method invocation.
