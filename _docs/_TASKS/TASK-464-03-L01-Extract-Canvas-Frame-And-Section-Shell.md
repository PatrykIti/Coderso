# TASK-464-03-L01: Extract Canvas Frame And Section Shell
# FileName: TASK-464-03-L01-Extract-Canvas-Frame-And-Section-Shell.md

**Parent Subtask:** TASK-464-03
**Priority:** High
**Category:** Pages / Admin UI / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-464-02-L03
**Status:** ⏳ To Do

---

## Overview

Extract the canvas scroller, canvas frame, device frame sizing, site typography
token bridge, empty-document section CTA, host canvas chrome slot, and section
shell wrapper into a reusable Page authoring canvas module.

Hard constraint: no UX/UI changes. Preserve every class, data attribute, copy,
button order, and click behavior.

---

## Sub-Tasks

- [ ] Create the Page authoring canvas module.
- [ ] Move canvas scroller/frame and device width map.
- [ ] Move host `canvasChrome` rendering point.
- [ ] Move empty-document canvas state.
- [ ] Add parity tests for canvas frame markers.

---

## Implementation Pseudocode

```tsx
export function PageAuthoringCanvasFrame({
  device,
  toolbarClearance,
  siteTokenStyle,
  canvasChrome,
  children
}: PageAuthoringCanvasFrameProps) {
  return (
    <div data-page-editor-canvas-scroller="true" style={resolveScrollerStyle(toolbarClearance)}>
      <div
        className={canvasDeviceFrameClassMap[device]}
        style={siteTokenStyle}
        data-page-editor-canvas-frame="true"
        data-page-editor-canvas-device={device}
      >
        {canvasChrome}
        {children}
      </div>
    </div>
  );
}
```

Expected data flow:

- Parent shell passes device, clearance, style variables, and optional chrome.
- Extracted frame does not know host APIs.

Error handling:

- Missing chrome renders nothing.
- Loading/empty states stay identical to current behavior.

Regression-test shape:

- Assert canvas frame/scroller/device markers and empty CTA are unchanged.

---

## Security Contract

- Canvas frame renders only React nodes passed by trusted host components.
- It must not introduce raw HTML rendering.
- Style props must remain limited to site token variables and toolbar clearance.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
