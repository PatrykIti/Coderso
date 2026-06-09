# TASK-418-03-L04: Floating Toolbar Interactions And Keyboard Shortcuts
# FileName: TASK-418-03-L04-Floating-Toolbar-Interactions-And-Keyboard-Shortcuts.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / UX
**Estimated Effort:** Medium
**Dependencies:** TASK-418-03-L01, TASK-418-03-L02, TASK-418-03-L03
**Status:** ⏳ To Do

---

## Overview

Bring the floating toolbar interaction model back in line with the reference:
one active subpanel, full icon tooltip coverage, draggable/collapsible behavior,
selection-aware labels, `Ctrl/Cmd+K`, `Esc`, duplicate/delete shortcuts where
safe, and keyboard-safe command palette navigation.

---

## Implementation Pseudocode

```tsx
function FloatingToolbar({ selection, controls }) {
  const descriptor = describeSelection(selection);
  return (
    <FloatingPanel draggable collapsible aria-label={`${descriptor.label} tools`}>
      <ToolbarHandle />
      <SelectionLabel descriptor={descriptor} />
      <PanelIconGroup panels={controls.panels} activePanel={activePanel} />
      <TargetActions selection={selection} />
      <ToolbarSubpanel panel={activePanel} controls={controls.forPanel(activePanel)} />
    </FloatingPanel>
  );
}

function usePageEditorShortcuts(dispatch) {
  useShortcut(["Meta+K", "Control+K"], () => dispatch(openCommandPalette()));
  useShortcut("Escape", () => dispatch(closeOverlayOrClearSelection()));
  useShortcut("Meta+D", () => dispatch(duplicateSelection()), { when: canDuplicate });
  useShortcut("Delete", () => dispatch(requestDeleteSelection()), { when: canDelete });
}
```

Expected data flow:

- Toolbar reads selection descriptor and registry panels.
- Keyboard shortcuts dispatch the same actions as buttons.
- Draggable/collapsed position is UI state, not persisted to the Page document.

Error handling:

- Shortcuts must not fire while typing in inputs/textareas/contenteditable.
- Delete requires existing app-dialog/destructive confirmation where applicable.
- Toolbar must recover if selected target becomes unavailable.

Regression-test shape:

- `Ctrl+K` opens palette, `Esc` closes overlays or clears selection.
- Toolbar label changes for section vs block.
- Only one subpanel is open.
- Shortcut handlers do not trigger while typing in fields.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session for subsequent writes.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** toolbar actions dispatch schema-owned mutations only.
- **Anti-abuse controls:** no public write endpoint; no secret persistence in
  toolbar preferences.

---

## Testing Requirements

- Vitest UI tests for shortcut behavior and toolbar panel switching.
- Accessibility checks for labels/tooltips where existing test harness supports
  them.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if shortcut
  behavior changes.
