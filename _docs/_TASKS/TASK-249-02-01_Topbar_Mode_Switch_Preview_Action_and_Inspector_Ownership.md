# TASK-249-02-01: Topbar Mode Switch, Preview Action, and Inspector Ownership
# FileName: TASK-249-02-01_Topbar_Mode_Switch_Preview_Action_and_Inspector_Ownership.md

**Priority:** High
**Category:** Coderso Custom Screens + Builder UX
**Estimated Effort:** Medium
**Dependencies:** TASK-249-01-02
**Status:** To Do

---

## Overview

Realign the builder shell and sticky topbar to the workspace model described by
the user instead of the currently mixed control system.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenShell.tsx`
- `core/admin/ui/custom-screens/assistantSurface.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`

## Builder UX Contract

- remove `Open records`,
- remove `Builder / Preview`,
- remove builder-only `Back to list` from the sticky action row,
- use `List View / Editor View` as the primary workspace switch,
- expose `Preview` as the left secondary action,
- expose `Save` as the primary right action,
- remove center-canvas `Settings`,
- keep screen settings only in the right inspector.

Return navigation should rely on the shell breadcrumbs/header, not on a second
builder-specific back button that competes with `Preview`.

## Implementation Pseudocode

```tsx
<div className="sticky top-0 z-10 border-b bg-background/80">
  <WorkspaceHeaderRow>
    <Button variant="secondary" onClick={handlePreview}>
      Preview
    </Button>
    <SegmentedControl
      value={activeWorkspaceMode}
      options={[
        { value: "list-view", label: "List View" },
        { value: "editor-view", label: "Editor View" },
      ]}
      onChange={setActiveWorkspaceMode}
    />
    <Button onClick={handleSave}>Save</Button>
  </WorkspaceHeaderRow>
</div>
```

```tsx
const inspectorTabs =
  activeWorkspaceMode === "list-view"
    ? [
        { id: "screen", label: "Screen" },
        { id: "selection", label: "Selected Column" },
        { id: "data", label: "Data" },
      ]
    : [
        { id: "screen", label: "Screen" },
        { id: "selection", label: "Selected Widget" },
        { id: "data", label: "Data" },
      ];
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: saving the screen continues to require `content:write`.
- CSRF: unchanged current CSRF-backed screen save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: no new payload branch is introduced; the shell
  only changes ownership of existing V3 state.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - new topbar renders `Preview`, `List View`, `Editor View`, and `Save`,
  - removed controls do not render,
  - right inspector remains available and mode-aware,
  - mobile library/details sheets still map to the correct active mode.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The builder header matches the intended product model.
2. Screen settings are no longer duplicated as a center-canvas mode.
3. `Preview` occupies the old secondary action slot and `Save` is renamed.
