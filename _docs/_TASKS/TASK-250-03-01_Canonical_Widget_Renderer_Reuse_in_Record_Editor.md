# TASK-250-03-01: Canonical Widget Renderer Reuse in the Dedicated Record Editor
# FileName: TASK-250-03-01_Canonical_Widget_Renderer_Reuse_in_Record_Editor.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Runtime Parity
**Estimated Effort:** Large
**Dependencies:** TASK-250-03
**Status:** To Do

---

## Overview

Reduce or eliminate the current duplication between `CustomScreenPreview` and
`CustomScreenEntryCanvas` so screen widget behavior cannot silently drift
between preview and the dedicated record editor.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/widgets/renderers/widgetRenderer.tsx`
- `tests/vitest/widgets/screenWidgets.test.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`

## Implementation Pseudocode

```tsx
function renderScreenWidgetSurface(input: {
  mode: "preview" | "record-editor";
  block: WidgetBlock;
  bindings: CustomScreenBinding[];
  fieldValues: Record<string, unknown>;
  interaction?: ScreenInteractionContext;
}) {
  // one canonical path with editor-specific interaction hooks,
  // not two hand-maintained widget trees
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: unchanged; this area does not change permissions.
- CSRF: unchanged current entry/screen write path.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: all rendering remains backed by shared widget
  schema validation.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - preview and record-editor paths assert the same screen widget output for the
    same bindings/data,
  - interaction hooks can differ, but not bound content rendering semantics.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if semantics change
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Screen widget rendering parity is enforced between preview and record editor.
2. The main record editor stops carrying unnecessary renderer-specific drift.
