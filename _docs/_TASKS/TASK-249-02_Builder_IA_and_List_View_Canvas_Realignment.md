# TASK-249-02: Builder IA and List View Canvas Realignment
# FileName: TASK-249-02_Builder_IA_and_List_View_Canvas_Realignment.md

**Priority:** High
**Category:** Coderso Custom Screens + Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-249-01
**Status:** To Do

---

## Overview

Rebuild the builder shell so it matches the actual workspace model instead of
showing an old `Builder / Preview` tool over a separate `List View` /
`Editor View` tab strip.

This task owns the builder IA, topbar, inspector ownership, and the new
table-canvas workflow for `List View`.

## Sub-Tasks

- [ ] TASK-249-02-01: Topbar Mode Switch, Preview Action, and Inspector Ownership
- [ ] TASK-249-02-02: List View Table Canvas and Column Inspector

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenShell.tsx`
- `core/admin/ui/custom-screens/ListViewDesigner.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- new `core/admin/ui/custom-screens/ListViewCanvas.tsx`
- new `core/admin/ui/custom-screens/ListViewColumnInspector.tsx`
- new `core/admin/ui/custom-screens/ListViewElementLibrary.tsx`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/ui/custom-screens/assistantSurface.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/registry.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screen-list-view.test.ts`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`

## Builder Requirements

- The builder header exposes `Preview`, `List View`, `Editor View`, and `Save`.
- `Open records`, `Builder`, `Back to list`, and a center-canvas `Settings`
  mode are removed from the sticky builder controls.
- Screen-level settings move entirely into the right inspector.
- `List View` is built from a live table canvas:
  - left rail: list-safe element catalog,
  - center: preview table shell,
  - right rail: selected-column inspector plus screen settings.
- `Editor View` continues to use the composed widget canvas, but with the new
  shell ownership defined by TASK-249-02-01.

## Implementation Pseudocode

```tsx
<WorkspaceTopbar
  leadingAction={<PreviewWorkspaceButton mode={activeWorkspaceMode} />}
  modeSwitch={
    <SegmentedControl
      value={activeWorkspaceMode}
      options={[
        { value: "list-view", label: "List View" },
        { value: "editor-view", label: "Editor View" },
      ]}
      onChange={setActiveWorkspaceMode}
    />
  }
  trailingAction={<Button onClick={handleSave}>Save</Button>}
/>
```

```tsx
const rightInspector =
  activeWorkspaceMode === "list-view" ? (
    <Tabs defaultValue="screen">
      <TabsTrigger value="screen">Screen</TabsTrigger>
      <TabsTrigger value="selection">Selected Column</TabsTrigger>
      <TabsTrigger value="data">Data</TabsTrigger>
    </Tabs>
  ) : (
    <Tabs defaultValue="screen">
      <TabsTrigger value="screen">Screen</TabsTrigger>
      <TabsTrigger value="selection">Selected Widget</TabsTrigger>
      <TabsTrigger value="data">Data</TabsTrigger>
    </Tabs>
  );
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session using the current Custom Screens UI.
- RBAC: saving builder state continues to require `content:write`.
- CSRF: saves continue through the existing CSRF-backed `customScreensClient`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - list canvas state persists only through the V3 definition schema,
  - screen settings remain record-level state, not transient UI-only state.
- Anti-abuse: no public endpoint or public-write flow is introduced.

## Testing Requirements

- Run the focused suites required by TASK-249-02-01 and TASK-249-02-02.
- Verify:
  - builder chrome renders only the new primary controls,
  - screen settings are not duplicated as a center-canvas mode,
  - `List View` switches the builder into the table-canvas workflow,
  - the right inspector updates with the selected list element or widget,
  - mobile library/details panels still open the correct mode-specific content.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The builder shell matches the workspace model instead of mixing old and new
   mode systems.
2. `List View` is configured through a canvas plus inspector, not a detached
   form.
3. Screen settings are owned by the right inspector only.
