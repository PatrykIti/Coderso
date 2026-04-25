# TASK-211-03-01: Inserted Block Scroll Target and Test Proof
# FileName: TASK-211-03-01_Inserted_Block_Scroll_Target_and_Test_Proof.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + Builder UX
**Estimated Effort:** Small
**Dependencies:** TASK-211-03
**Status:** Done (2026-04-25)

---

## Overview

Tighten the concrete Page editor scroll target and regression proof for inserted
blocks.

This leaf should make the implementation decision small and testable: either
use `block: "start"` with a stable row target, or implement a small
canvas-offset scroll helper when sticky chrome makes `block: "start"` visually
wrong.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx` only if target markers change.
- `tests/vitest/ui/page-editor-insert-scroll.test.tsx`

## Implementation Direction

- Audit the actual scroll container in `PageEditor` before choosing the final
  approach.
- If the browser viewport is the scroll container, use `scrollIntoView` with a
  deterministic alignment.
- If the editor canvas has its own scroll container, query that container and
  call `scrollTo` with a computed top offset.
- Keep the existing `data-block-id` target stable.
- Keep focus on `[data-block-select='true']` with `preventScroll: true`.

## Pseudocode

```ts
const target = document.querySelector(`[data-block-id="${escapedId}"]`);
if (!target) return;

target.scrollIntoView({ behavior: "smooth", block: "start" });
target.querySelector("[data-block-select='true']")?.focus({ preventScroll: true });
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: none; no data or route changes.

## Testing Requirements

- Use deterministic DOM geometry or scroll spy assertions that prove:
  - the selected row id is the inserted id;
  - `block: "start"` or computed offset is used;
  - highlight class/attribute is applied only to the inserted block;
  - highlight clears after the existing timer.
- Do not accept a regression test that only asserts `scrollIntoView` was called
  with no alignment expectations.

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The implementation uses a viewport-safe alignment strategy.
2. Tests fail if the code regresses to an unqualified or center-only scroll call.
