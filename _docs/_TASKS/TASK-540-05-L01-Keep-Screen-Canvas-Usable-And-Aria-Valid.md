# TASK-540-05-L01: Keep Screen Canvas Usable and ARIA-Valid

# FileName: TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** Custom Screens / Responsive UI / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-540-04-L04
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Targeted Gate Passed:** 2026-07-14 — `core lint:types`, `core lint`, root `tsc`, and the exact three-file Vitest matrix (16/16)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`
- `core/admin/ui/shared/CanvasEditor.tsx` only for the semantic panel role
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx`,
  `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`, and, only for the shared
  role assertion, `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`

TASK-542 separately owns Menu host clearance. Do not add Menu/Page special cases
to the shared shell and do not edit Page-owned TASK-478/481/539 files.

## Historical pre-implementation grounded anchors

These 2026-07-14 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named symbols and regression suites in this contract rather than mutable line numbers.

- Screen canvas fixed reserve: `ScreenAuthoringCanvas.tsx:491-523`.
- Responsive panel width already exists:
  `CanvasEditor.tsx:88-97` (`w-[min(280px,calc(100%-2rem))]`).
- Label without role: `CanvasEditor.tsx:143-153`.

## Implementation Pseudocode

```tsx
// ScreenAuthoringCanvas: replace inline paddingRight:300.
<div
  data-screen-canvas-panel-open={panelOpen ? "true" : undefined}
  className={cn(
    // Preserve the existing p-6 lg:p-8 base gutters.
    "min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8",
    panelOpen && "lg:pr-[332px]" // 32 px base + 300 px wide-only reserve
  )}
/>

// CanvasEditor panel container
<div
  ref={panelRef}
  role="region"
  aria-label={panelAriaLabel}
  className={PANEL_POSITION_CLASS[...]}
/>
```

The `lg` breakpoint is final and the existing base padding is part of the contract:

- at 320/390/480 CSS px, both open and closed scrollers have computed
  `padding-left:24px` and `padding-right:24px`;
- at 1024 CSS px and above, both states retain `padding-left:32px`, the closed
  scroller has `padding-right:32px`, and the open scroller has
  `padding-right:332px`;
- the scroller border-box width and left edge do not change when the panel opens;
  therefore the wide content-box width decreases by exactly 300 CSS px (within
  1 CSS px), while narrow content-box geometry is unchanged;
- at 320/390/480 the scroller border-box equals its host width within 1 CSS px,
  its content box remains wider than 0 px, and the panel bounding box stays
  inside the viewport; at 1024 and 1280 the panel also stays inside the viewport.

Do not replace the base `p-6 lg:p-8`, change the breakpoint after smoke, add a
resize listener, or use effect-driven viewport state. Keep panel width/max-height
and reopen control unchanged.

## Error/compatibility flow

No async/error path. Closed and narrow computed gutters remain equivalent to the
current `p-6 lg:p-8` layout; only the wide open state gains the 300 px reserve.
Existing panel `data-*` hooks and drag/drop behavior stay.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- Structural test rejects inline `paddingRight:300`, preserves `p-6 lg:p-8`, and
  pins the conditional `lg:pr-[332px]` class.
- UI render asserts `role=region` plus accessible name.
- Browser smoke asserts computed padding plus border/content/panel geometry for
  open and closed states at 320/390/480/1024/1280.

Update the named structural/component expectations before this source gate.
TASK-540-06 owns real-browser aggregation but must not re-baseline these assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

The semantic role belongs to the shared shell, so the adjacent component suite is part
of the same mandatory source gate above.
Rerun any named failing test file once in isolation before classifying the failure.
