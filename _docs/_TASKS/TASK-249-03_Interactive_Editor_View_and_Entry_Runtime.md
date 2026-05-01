# TASK-249-03: Interactive Editor View and Entry Runtime
# FileName: TASK-249-03_Interactive_Editor_View_and_Entry_Runtime.md

**Priority:** High
**Category:** Coderso Custom Screens + Entry Editor + Runtime UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-249-01, TASK-249-02
**Status:** To Do

---

## Overview

Replace the preview-plus-classic-editor record flow with one interactive
`Editor View` runtime that owns both record create and record edit.

The goal is not just to save through the screen; it is to make the screen the
actual editing surface for the record.

## Sub-Tasks

- [ ] TASK-249-03-01: Admin Editor Widgets and Inline Editable Screen Components
- [ ] TASK-249-03-02: Entry Create/Edit Runtime, Error UX, and No-Legacy Fallback

## Files to Change

- `core/admin/ui/custom-screens/EditorViewDesigner.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/customScreenEntryDraft.ts`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/services/customScreens/bindingResolver.ts`
- `core/admin/services/entriesClient.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/registry.ts`
- `core/widgets/types.ts`
- `core/widgets/core/index.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- new admin-editor widgets where inline editing requires dedicated components
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`
- `tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Runtime Requirements

- `/advanced/custom-screens/:screenId/entries/new` always opens the screen-owned
  record editor,
- `/advanced/custom-screens/:screenId/entries/:entryId` always opens the same
  screen-owned record editor,
- the runtime no longer shows `Classic editor` as an escape hatch for active
  workspace screens,
- the record editor is one coherent screen surface:
  - title can be edited inline,
  - supported scalar fields can be edited inline,
  - media/gallery widgets can open the appropriate picker/editor affordance,
  - relation widgets can open a scoped selector or supported editing affordance,
  - inline validation errors are shown near the relevant control/widget.

## Implementation Pseudocode

```tsx
<ScreenRecordCanvas
  blocks={definition.editorView.blocks}
  bindings={definition.editorView.bindings}
  draft={draft}
  onSelectNode={setSelectedNodeId}
  onInlineEdit={(binding, nextValue) =>
    setDraft((current) =>
      applyEditorFieldChange({
        draft: current,
        field: binding.field,
        value: nextValue,
        contentType,
      })
    )
  }
/>
```

```ts
async function saveEditorViewEntry(input: {
  mode: "create" | "edit";
  contentType: ContentTypeSummary;
  entryId?: string;
  draft: EntryDraft;
}) {
  const payload =
    input.mode === "create"
      ? normalizeEntryCreatePayloadForSchema({ schema: input.contentType.schema, draft: input.draft })
      : buildEditorViewUpdatePayload({
          draft: input.draft,
          originalData: input.draft.originalData,
          editableFields: input.draft.editableFields,
          schema: input.contentType.schema,
        });

  return input.mode === "create"
    ? createEntry(input.contentType.slug, payload)
    : updateEntry(input.contentType.slug, input.entryId!, payload);
}
```

## Security Contract

- Visibility: internal admin UI and the existing internal content-entry API.
- Auth model: authenticated admin session.
- RBAC:
  - record read: `content:read`,
  - record update/create/delete: `content:write`,
  - publish/unpublish: `content:publish`.
- CSRF:
  - all record mutations continue through the existing CSRF-backed entry
    clients.
- Rate-limit bucket:
  - existing `admin_write`.
- Reject-unknown validation:
  - the editor emits only route-approved `title`, `slug`, and `data` payloads,
  - dynamic fields stay under `data`,
  - validation details remain machine-readable and field-scoped.
- Anti-abuse:
  - no public endpoint or public-write flow is introduced.

## Testing Requirements

- Run the focused suites required by TASK-249-03-01 and TASK-249-03-02.
- Verify:
  - the runtime no longer renders or routes to the classic editor for active
    workspace screens,
  - inline edit controls preserve typed values,
  - unsupported or hidden fields are not destroyed on save,
  - media/relation/title flows update the same draft and error model,
  - route errors map cleanly into inline widget/form errors without stack
    leakage.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The screen-owned record editor is the only active V3 record editing surface.
2. Bound widgets render a coherent interactive record screen instead of a
   preview card plus classic-editor fallback.
3. Create/edit still use the shared entry API contracts and machine-readable
   errors.
