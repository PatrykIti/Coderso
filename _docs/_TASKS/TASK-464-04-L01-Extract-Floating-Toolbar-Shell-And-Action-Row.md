# TASK-464-04-L01: Extract Floating Toolbar Shell And Action Row
# FileName: TASK-464-04-L01-Extract-Floating-Toolbar-Shell-And-Action-Row.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Toolbar
**Estimated Effort:** Medium
**Dependencies:** TASK-464-02-L03, TASK-464-03-L03
**Status:** ⏳ To Do

---

## Overview

Extract the bottom floating toolbar shell, head row, drag handle, collapse
button, selection action buttons, movement buttons, add-beside button, and
toolbar clearance measurement.

Hard constraint: no UX/UI changes. Preserve position, width, classes, icons,
tooltips, action order, row layout, drag state flags, and collapse behavior.

---

## Sub-Tasks

- [ ] Create a reusable floating toolbar shell module.
- [ ] Move toolbar icon button/action row rendering.
- [ ] Move drag/collapse props and data attributes.
- [ ] Keep toolbar clearance measurement wired to the canvas scroller.
- [ ] Add parity tests for toolbar shell and action row.

---

## Implementation Pseudocode

```tsx
export function FloatingEditorToolbarShell(props: FloatingEditorToolbarShellProps) {
  return (
    <div
      ref={props.toolbarRef}
      data-page-editor-floating-toolbar="true"
      data-page-editor-toolbar-collapsed={props.collapsed ? "true" : "false"}
      data-page-editor-toolbar-dragging={props.dragging ? "true" : "false"}
      style={resolveToolbarTransform(props.offset)}
    >
      <FloatingToolbarHeadRow {...props.head} />
      {!props.collapsed ? props.children : null}
    </div>
  );
}
```

Expected data flow:

- Parent shell owns action callbacks.
- Toolbar shell renders action descriptors and panel slot children.
- Measurement callback reports height/clearance to parent state.

Error handling:

- Missing action handlers disable the related button; they do not change layout.
- Measurement failure leaves clearance at zero.

Regression-test shape:

- Assert toolbar data attributes, action labels, icon button order, collapse
  state, and drag state flags.

---

## Security Contract

- Toolbar labels/tooltips are static or sanitized strings.
- No HTML rendering or route/client imports.
- Action descriptors must not carry raw document patches.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/floating-editor-toolbar.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
