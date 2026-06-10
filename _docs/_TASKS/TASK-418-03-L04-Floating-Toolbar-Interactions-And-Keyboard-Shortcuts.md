# TASK-418-03-L04: Floating Toolbar Interactions And Keyboard Shortcuts
# FileName: TASK-418-03-L04-Floating-Toolbar-Interactions-And-Keyboard-Shortcuts.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / UX
**Estimated Effort:** Medium
**Dependencies:** TASK-418-03-L01, TASK-418-03-L02, TASK-418-03-L03
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

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

---

## Closeout

- Floating toolbar now exposes selection-aware labels, icon titles/ARIA labels,
  one active subpanel marker, collapsible state, and draggable offset state.
- `Ctrl/Cmd+K`, `Esc`, duplicate, and delete shortcuts are guarded against
  input/select/textarea/contenteditable targets; `Esc` closes overlays before
  clearing selection.
- Delete uses the shared destructive confirmation dialog before mutating the
  draft, for both toolbar and keyboard paths.
- Command Palette supports keyboard result movement with arrow keys and Enter
  insertion while keeping filtered section/block groups.
- Pre-implementation read-only subagent audit
  `019eae99-5020-7a82-9c83-7ee90594618f` reported no High, Medium, or Low
  task drift before source edits.
- Final read-only drift pass `019eaeaa-8513-79f1-8b1a-ce51743c2c10`
  found one real medium issue: `Esc` was not guarded for normal editable fields.
  The shortcut handler now ignores `Esc` from editable targets unless the
  Command Palette is open, and the UI suite covers that regression.
- Follow-up read-only drift pass `019eaeb0-63b0-76a3-816b-b49e671e8181`
  found one low validation gap for Command Palette `Enter` insertion coverage.
  The UI suite now dispatches `Enter` on the active command result and asserts
  the selected section is inserted.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx` (40 tests)
- `bun --cwd core lint:types`
- `bun --cwd core lint`
