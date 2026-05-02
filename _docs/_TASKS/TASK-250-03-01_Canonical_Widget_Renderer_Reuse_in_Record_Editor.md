# TASK-250-03-01: Canonical Widget Renderer Reuse in the Dedicated Record Editor
# FileName: TASK-250-03-01_Canonical_Widget_Renderer_Reuse_in_Record_Editor.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Runtime Parity
**Estimated Effort:** Large
**Dependencies:** TASK-250-03
**Status:** To Do

---

## Overview

Reduce the current duplication between `CustomScreenPreview` and the read-only
branches inside `CustomScreenEntryCanvas` so shared screen-widget binding and
render behavior cannot silently drift.

This leaf does not force full output parity for writable `screen-field-value`
blocks. The dedicated record editor intentionally replaces those branches with
live `FieldRenderer` / title / slug inputs and validation UI, and that
interactive behavior remains part of the contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/services/customScreens/bindingResolver.ts`
- `tests/vitest/widgets/screenWidgets.test.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`

## New Files to Create

- `core/admin/ui/custom-screens/screenWidgetRenderBridge.tsx` if extracting a
  shared helper keeps reuse local to Custom Screens instead of widening the
  generic `WidgetRenderer` contract

## Implementation Pseudocode

```tsx
function renderScreenWidgetSurface(input: {
  mode: "preview" | "record-editor";
  block: WidgetBlock;
  bindings: CustomScreenBinding[];
  fieldValues: Record<string, unknown>;
  interaction?: ScreenInteractionContext;
}) {
  const resolvedBlock = applyBindingsToBlocks(
    [input.block],
    input.bindings,
    input.fieldValues
  )[0];

  if (
    input.mode === "record-editor" &&
    shouldUseWritableInlineEditor(resolvedBlock, input.bindings)
  ) {
    return renderWritableInlineFieldEditor(resolvedBlock, input);
  }

  return <WidgetRenderer block={resolvedBlock} />;
}
```

```tsx
function ScreenWidgetReadOnlyBridge(input: {
  block: WidgetBlock;
  bindings: CustomScreenBinding[];
  fieldValues: Record<string, unknown>;
}) {
  const resolvedBlock = applyBindingsToBlocks(
    [input.block],
    input.bindings,
    input.fieldValues
  )[0];

  return <WidgetRenderer block={resolvedBlock} />;
}
```

```ts
const parityFixtures = [
  {
    widget: "screen-record-header",
    bindings: [
      { propPath: "title", field: "title" },
      { propPath: "subtitle", field: "projectTitle" },
    ],
    expectedText: ["Project title", "Villa Aurora"],
  },
  {
    widget: "screen-field-value",
    bindings: [{ propPath: "value", field: "projectStatus", mode: "read" }],
    expectedText: ["Project status", "Published"],
  },
  {
    widget: "screen-two-column",
    bindings: [],
    expectedLayout: "same slot output in preview and record editor",
  },
];
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC:
  - no new permissioned mutation is introduced by this leaf,
  - surrounding screen-definition writes remain under `content:write` if any
    screen save seam is touched,
  - surrounding entry-save flows remain under `content:write` for the dedicated
    editor.
- CSRF: unchanged current entry/screen write path.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: all rendering remains backed by shared widget
  schema validation.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - preview and record-editor paths assert the same bound output for read-only
    screen-widget branches rendered through the shared bridge,
  - writable `screen-field-value` branches explicitly keep live input /
    `FieldRenderer` behavior instead of being forced through preview-only
    rendering,
  - parity fixtures exist for record-header, read-only field-value,
    field-group, and two-column,
  - if the implementation must widen the shared `WidgetRenderer` contract, also
    rerun and extend `tests/vitest/widgets/renderer.test.tsx`.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if semantics change
- `_docs/CONTENT_EDITOR_UX.md` if dedicated editor behavior wording changes
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Shared read-only screen-widget rendering parity is enforced between preview
   and the dedicated editor where both surfaces intentionally use the same
   runtime presentation.
2. The main record editor keeps its dedicated writable widget UX while shedding
   unnecessary read-only renderer drift.
3. The implementer has an explicit parity fixture set, including the boundary
   where writable inline editing intentionally differs from preview rendering.
