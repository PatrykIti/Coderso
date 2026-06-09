# TASK-417-05-L02: Command Palette Layers And Floating Toolbar
# FileName: TASK-417-05-L02-Command-Palette-Layers-And-Floating-Toolbar.md

**Parent Subtask:** TASK-417-05
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-417-05-L01
**Status:** ✅ Done

---

## Overview

Implement the visible editor UX from the redesign: full canvas, inline add
affordances, command palette, layers overlay, and floating toolbar subpanels for
layout, content, style, spacing, background, responsive, and visibility.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages route permissions on save/publish.
- **CSRF:** existing admin client write behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** toolbar/palette edits write only v2 fields that the server
  schema accepts.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [x] Replace left library and right settings panels for Pages.
- [x] Add command palette with section and atomic-block insertion.
- [x] Add layers overlay with section/block navigation and visibility toggle.
- [x] Add floating toolbar with one active subpanel at a time.
- [x] Keep keyboard affordances: `Ctrl+K`/`Cmd+K`, `Esc`, duplicate/delete
  where supported.

---

## Implementation Pseudocode

```tsx
function PageEditorCanvasV2() {
  return (
    <EditorShell activeHref="/admin/pages" centerScroll={false}>
      <PageEditorTopbar />
      <CanvasStage>
        <SectionInsertionZones />
        <PageSectionsCanvas />
      </CanvasStage>
      <FloatingToolbar selection={state.selection} activePanel={state.activePanel} />
      <CommandPalette open={state.commandPaletteOpen} catalog={pageAtomicCatalog} />
      <LayersOverlay document={state.document} selection={state.selection} />
    </EditorShell>
  );
}
```

Expected data flow:

- Command palette dispatches reducer insert actions.
- Layers overlay dispatches select/reorder/visibility actions.
- Floating toolbar dispatches patch actions scoped to the active breakpoint.

Error handling:

- Palette insertion is disabled for unsupported target types.
- Toolbar panels show inherited values and reset affordances for non-desktop
  overrides.
- Empty sections show an add-block state.

Regression-test shape:

- Vitest UI tests cover palette open/filter/insert, layers selection, floating
  toolbar panel switching, section actions, and empty-state insertion.

---

## Testing Requirements

- Targeted Vitest admin UI tests.
- React Hooks lint/compiler compliance.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if needed.
