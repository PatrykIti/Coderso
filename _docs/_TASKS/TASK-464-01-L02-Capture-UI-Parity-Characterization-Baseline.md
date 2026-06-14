# TASK-464-01-L02: Capture UI Parity Characterization Baseline
# FileName: TASK-464-01-L02-Capture-UI-Parity-Characterization-Baseline.md

**Parent Subtask:** TASK-464-01
**Priority:** High
**Category:** Pages / Admin UI / Test Baseline
**Estimated Effort:** Medium
**Dependencies:** TASK-464-01-L01
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Capture the current Page Editor UI/UX behavior before extraction. Later leaves
must keep this baseline green. This leaf may add focused characterization tests,
but it must not alter product behavior.

Hard constraint: no UX/UI changes. Protect current copy, classes, data
attributes, panel order, keyboard behavior, selection behavior, and host
behavior for Pages, Page Templates, and Menu Design.

---

## Sub-Tasks

- [x] Identify existing tests that cover Page Editor visual/behavior parity.
- [x] Add narrow characterization tests for missing extraction seams.
- [x] Cover Pages, Page Templates, and Menu Design host modes.
- [x] Cover canvas markers, floating toolbar markers, command palette, layers,
      and template picker markers.

---

## Implementation Pseudocode

```ts
function assertPageEditorParityMarkers(root: HTMLElement) {
  expect(root.querySelector("[data-page-editor-canvas-frame]")).toBeTruthy();
  expect(root.querySelector("[data-page-editor-floating-toolbar]")).toBeTruthy();
  expect(root.querySelector("[data-page-editor-toolbar-row='head']")).toBeTruthy();
  expect(root.querySelector("[data-page-editor-toolbar-row='panels']")).toBeTruthy();
}

function mountHostMode(mode: "page" | "page-template" | "menu") {
  return render(<PageEditor initialPage={fixtureFor(mode)} host={hostFor(mode)} />);
}
```

Expected data flow:

- Tests mount current implementation and assert stable semantic DOM markers.
- Avoid broad fragile snapshots.
- Baseline must catch accidental UI movement during later extraction.

Error handling:

- If existing behavior is flaky, isolate it with deterministic fixtures instead
  of weakening the baseline.

Regression-test shape:

- One suite for generic Page Editor markers.
- One suite or cases for Page Templates and Menu Design host seams.

---

## Security Contract

- Tests must not use real credentials, provider keys, external network, or raw
  sensitive data.
- Fixtures must not contain secrets or unsafe HTML unless the test is explicitly
  asserting sanitizer behavior.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-464*.md`
