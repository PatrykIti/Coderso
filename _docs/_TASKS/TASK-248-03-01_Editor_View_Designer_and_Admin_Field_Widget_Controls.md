# TASK-248-03-01: Editor View Designer and Admin Field Widget Controls
# FileName: TASK-248-03-01_Editor_View_Designer_and_Admin_Field_Widget_Controls.md

**Priority:** High
**Category:** Coderso Custom Screens + Builder UX + Admin Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-248-02-02
**Status:** To Do

---

## Overview

Build the `Editor View` designer tab and the field-aware admin controls needed
to compose a create/edit entry canvas for the selected content type.

This leaf owns designer/editor configuration only. Runtime create and edit save
flows are split into TASK-248-03-02 and TASK-248-03-03.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- new `core/admin/ui/custom-screens/EditorViewDesigner.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/entries/FieldRenderer.tsx`
- `core/admin/ui/content-types/schemaMapping.ts`
- `core/services/customScreens/bindingResolver.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`

## Designer Contract

The `Editor View` tab composes admin-entry widgets, not public page widgets.
Allowed field choices come from the Custom Screen record's selected
`contentTypeId` plus approved system entry fields.

Expected widget/control families:

- field input,
- field group/section,
- read-only field value,
- status/publish controls,
- media picker field,
- relation summary or selector where supported,
- layout primitives approved for admin surfaces.

## Implementation Pseudocode

```tsx
<EditorViewDesigner
  contentType={selectedContentType}
  value={definition.editorView}
  registry={listRegisteredWidgetsForSurface({
    surface: "admin-editor-view",
    contentType: selectedContentType,
  })}
  onChange={(editorView) =>
    updateDefinition({
      ...definition,
      editorView,
    })
  }
/>
```

```tsx
<FieldBindingPanel
  contentType={contentType}
  bindings={definition.editorView.bindings}
  selectedBlockId={selectedId}
  surface="admin-editor-view"
  onChange={(bindings) =>
    updateDefinition({
      ...definition,
      editorView: {
        ...definition.editorView,
        bindings,
      },
    })
  }
/>
```

```ts
export function listEditorViewFieldOptions(contentType: ContentTypeSummary) {
  return fieldsFromSchema(contentType.schema)
    .filter((field) => supportsAdminFieldWidget(field))
    .map((field) => ({
      value: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
    }));
}
```

Do not solve typed editing by adding broad string coercion to existing display
widgets. Read-only widgets may format values for display, but write-capable
controls must normalize values by field type.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session used by the existing Custom Screen
  editor.
- RBAC: saving `Editor View` configuration still uses `content:write`.
- CSRF: saves continue through the CSRF-backed `customScreensClient`.
- Rate-limit bucket: existing `admin_write` for saves.
- Reject-unknown validation:
  - editor widgets and bindings are normalized through the V2 definition schema,
  - field options are limited to selected content type fields and approved system
    fields,
  - unsafe binding paths remain rejected.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - `Editor View` tab renders after loading or creating a V2 Custom Screen,
  - admin field widgets are visible for supported field types,
  - public-only widgets are not offered,
  - fields from unrelated content types are not available,
  - binding changes update only `definition.editorView.bindings`,
  - designer changes mark the screen dirty.
- Vitest service:
  - binding resolver accepts selected content type fields,
  - binding resolver rejects unrelated fields and unsafe paths.

## Documentation Updates Required

- `_docs/WIDGETS.md` and relevant `_docs/_WIDGETS/*` docs when admin field
  widget semantics become source-of-truth.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The builder exposes an `Editor View` tab.
2. The tab edits persisted `definition.editorView`.
3. Admin field controls are schema-bound to the selected content type.
4. Public display widgets are not used as write-capable admin field controls.
