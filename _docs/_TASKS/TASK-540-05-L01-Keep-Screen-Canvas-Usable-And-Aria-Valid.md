# TASK-540-05-L01: Keep Screen Canvas Usable and ARIA-Valid

# FileName: TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** Custom Screens / Responsive UI / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-540-04-L04
**Status:** ⏳ To Do
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

## Grounded anchors

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
    existingScrollerClasses,
    panelOpen && "lg:pr-[300px]" // no reserve below the proven wide breakpoint
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

The `lg` breakpoint is final: below 1024 CSS px, open/closed scroller
`padding-right` is exactly `0px`; at 1024 CSS px and above, panel-open padding is exactly
`300px` and panel-closed padding is `0px`. At 320/390/480, the scroller border-box width
equals its host width within 1 CSS px and the panel bounding box stays inside the
viewport. At 1280, opening the panel reduces the content-box width by exactly 300 CSS px
(within 1 CSS px) without moving the panel out of viewport. Do not change the breakpoint
after smoke, add a resize listener, or use effect-driven viewport state. Keep panel
width/max-height and reopen control unchanged.

## Error/compatibility flow

No async/error path. Panel closed and wide layouts remain byte-equivalent except
for the semantic role. Existing panel `data-*` hooks and drag/drop behavior stay.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- Structural test rejects inline `paddingRight:300` and pins conditional class.
- UI render asserts `role=region` plus accessible name.
- Browser smoke asserts the exact breakpoint/geometry contract above.

Update the named structural/component expectations before this source gate.
TASK-540-06 owns real-browser aggregation but must not re-baseline these assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
```

The semantic role belongs to the shared shell, so the adjacent component suite is part
of the same mandatory source gate above.
Rerun any named failing test file once in isolation before classifying the failure.
