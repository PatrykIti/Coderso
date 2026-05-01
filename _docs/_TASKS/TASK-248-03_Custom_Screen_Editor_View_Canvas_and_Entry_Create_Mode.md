# TASK-248-03: Custom Screen Editor View Canvas and Entry Create Mode
# FileName: TASK-248-03_Custom_Screen_Editor_View_Canvas_and_Entry_Create_Mode.md

**Priority:** High
**Category:** Coderso Custom Screens + Entry Editor + Builder UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-248-01, TASK-248-02, TASK-248-04-01
**Status:** To Do

---

## Overview

Build the `Editor View` half of the Custom Screen workspace builder and use it
as the create/edit UI for entries opened from a Custom Screen.

`Editor View` answers: "How should a single entry of this content type be
created and edited?" It should share the Pages editor's builder ergonomics, but
the widgets on this canvas are admin-entry widgets. They bind to the selected
content type schema and write typed entry data, instead of rendering public
front-end content blocks.

This task replaces the old one-off fixes for `EntryCreateDrawer` and primitive
binding formatting. The V2 path should not submit `data: {}` for required
schemas, and it should not inject typed entry values into string-only display
widgets as a workaround. It should use field-aware admin widgets.

## Sub-Tasks

- [ ] TASK-248-03-01: Editor View Designer and Admin Field Widget Controls
- [ ] TASK-248-03-02: Editor View Create Mode Draft, Save, and Validation
- [ ] TASK-248-03-03: Editor View Edit Mode Hydration, Save, and Dirty State

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- new `core/admin/ui/custom-screens/EditorViewDesigner.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/entries/EntryEditorHeader.tsx`
- `core/admin/ui/entries/FieldRenderer.tsx`
- `core/admin/ui/content-types/schemaMapping.ts`
- `core/admin/services/entriesClient.ts`
- `core/services/customScreens/bindingResolver.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Builder Requirements

The `Editor View` tab must let users compose an entry editor with admin widgets
such as:

- field input,
- field group/section,
- read-only field value,
- status/publish controls,
- media picker field,
- relation field summary or selector where supported,
- layout primitives approved for admin use.

The designer must scope field choices to the selected content type. A screen
for House Projects must not offer fields from Posts, Pages, or another custom
content type.

The selected content type comes from the Custom Screen record's `contentTypeId`,
not from the `Editor View` definition. `Editor View` blocks/bindings may only
reference fields from that resolved content type plus approved system entry
fields such as `title`, `slug`, `status`, and timestamps.

## Runtime Requirements

1. `/advanced/custom-screens/:screenId/entries/new` opens the screen's
   `Editor View` in create mode.
2. `/advanced/custom-screens/:screenId/entries/:entryId` opens the same
   `Editor View` in edit mode.
3. Create mode builds an initial draft from schema defaults and required
   fields.
4. Edit mode hydrates draft state from the existing entry.
5. Field widgets write typed values into draft state.
6. Save create calls `POST /admin/api/content/:type/entries` with normalized
   `title`, `slug`, status, and `data`.
7. Save edit calls the existing update contract without destructive removal of
   unrelated entry fields.
8. Validation errors map to inline field/form errors and do not leak server
   stack details.

Edit-mode saves must merge edited fields into the original entry `data` instead
of rebuilding `data` from every schema property. Hidden, unsupported, or future
fields that are already present on the entry must survive a Custom Screen editor
save unless the user explicitly edits a field owned by `Editor View`.

## Implementation Pseudocode

```tsx
// EditorViewDesigner.tsx
<CustomScreenShell
  leftPanel={
    <WidgetPicker
      widgets={listRegisteredWidgetsForSurface({
        surface: "admin-editor-view",
        contentType,
      })}
      onInsert={insertEditorViewBlock}
    />
  }
  rightPanel={
    <FieldBindingPanel
      contentType={contentType}
      bindings={definition.editorView.bindings}
      selectedBlockId={selectedId}
      surface="admin-editor-view"
      onChange={(bindings) =>
        updateDefinition({
          editorView: {
            ...definition.editorView,
            bindings,
          },
        })
      }
    />
  }
>
  <BlockList
    blocks={definition.editorView.blocks}
    selectedId={selectedId}
    onSelect={setSelectedId}
    onChange={(blocks) =>
      updateDefinition({
        ...definition,
        editorView: {
          ...definition.editorView,
          blocks,
        },
      })
    }
  />
</CustomScreenShell>;
```

Reuse the current Custom Screens and Pages builder seams (`CustomScreenShell`,
`BlockList`, `WidgetPicker`, `BlockSettings`, and shared block utilities).
Do not introduce a separate `PageLikeBuilderShell` abstraction unless the Pages
and Custom Screens builders are deliberately extracted into a shared component in
the same implementation slice with focused tests.

```ts
function buildInitialEntryDraft(input: {
  contentType: ContentTypeSummary;
  editorView: CustomScreenEditorViewDefinition;
  mode: "create" | "edit";
  entry?: EntrySummary;
}) {
  if (input.mode === "edit" && input.entry) {
    return hydrateDraftFromEntry({
      entry: input.entry,
      schema: input.contentType.schema,
      editableFields: collectEditorViewWritableFields(input.editorView),
    });
  }

  return {
    title: "",
    slug: "",
    status: "draft",
    data: buildSchemaDefaultData(input.contentType.schema),
    editableFields: collectEditorViewWritableFields(input.editorView),
    originalData: {},
    originalStatus: "draft",
    publishAction: null,
    fieldErrors: {},
  };
}
```

```ts
function applyEditorFieldChange(input: {
  draft: EntryDraft;
  field: string;
  value: unknown;
  contentType: ContentTypeSummary;
}) {
  const normalizedValue = normalizeEntryFieldValue({
    field: input.field,
    value: input.value,
    schema: input.contentType.schema,
  });

  return {
    ...input.draft,
    data: {
      ...input.draft.data,
      [input.field]: normalizedValue,
    },
    fieldErrors: omit(input.draft.fieldErrors, input.field),
  };
}
```

```ts
async function saveEditorViewEntry(input: {
  mode: "create" | "edit";
  contentType: ContentTypeSummary;
  entryId?: string;
  draft: EntryDraft;
}) {
  if (input.mode === "create") {
    const payload = normalizeEntryCreatePayloadForSchema({
      schema: input.contentType.schema,
      draft: input.draft,
    });
    const created = await createEntry(input.contentType.slug, payload);
    return applyEditorViewStatusChange({
      typeSlug: input.contentType.slug,
      entryId: created.id,
      draft: input.draft,
      originalStatus: "draft",
    });
  }

  const payload = buildEditorViewUpdatePayload({
    draft: input.draft,
    originalData: input.draft.originalData,
    editableFields: input.draft.editableFields,
    schema: input.contentType.schema,
  });
  const updated = await updateEntry(input.contentType.slug, input.entryId!, payload);
  return applyEditorViewStatusChange({
    typeSlug: input.contentType.slug,
    entryId: input.entryId!,
    draft: input.draft,
    originalStatus: input.draft.originalStatus,
    fallbackEntry: updated,
  });
}
```

`applyEditorViewStatusChange` must use the existing `updateEntryMetadata`,
`publishEntry`, and `unpublishEntry` clients. It must not smuggle status or
publish mutations into the content-data update payload. If status controls are
rendered as display-only for the first implementation slice, that limitation must
be explicit in the leaf and the publish/unpublish controls must not be shown as
write-capable.

`screen-field-value` can still exist as a read-only display widget, but typed
editing should be done by field-aware widgets. Do not solve the V2 editor by
adding broad string coercion to every binding path.

## Security Contract

- Visibility: internal admin UI and existing internal content entry API.
- Auth model: authenticated admin session on the existing session-cookie admin
  API. No API-key auth path is introduced by this task.
- RBAC:
  - loading entry/editor data requires `content:read`,
  - create/update requires `content:write`,
  - publish/unpublish controls use `content:publish` when they call current
    entry publish routes,
  - editing `Editor View` configuration requires the existing `content:write`
    permission used by Custom Screens writes.
- CSRF:
  - create/update/save mutations use existing CSRF-backed admin clients.
- Rate-limit bucket:
  - existing `admin_write`.
- Reject-unknown validation:
  - field widgets must normalize values into the existing entry `data` schema,
  - unknown top-level entry payload keys remain rejected by
    `contentEntryCreateSchema` / update schema,
  - `Editor View` bindings cannot reference fields outside the selected content
    type or approved system fields.
- Anti-abuse:
  - no public endpoint,
  - no nonce/signature/HMAC/reCAPTCHA requirement.

## Testing Requirements

- Run the focused test suites required by TASK-248-03-01, TASK-248-03-02,
  and TASK-248-03-03.
- Vitest UI:
  - `Editor View` tab renders field-aware admin widgets for the selected
    content type,
  - fields from unrelated content types are not available,
  - create mode initializes schema defaults,
  - required fields block submit with inline errors,
  - create mode submits normalized `data` for the House Projects schema,
  - edit mode hydrates existing values and saves typed updates,
  - edit mode preserves hidden, unsupported, and unrelated existing `data` keys,
  - status changes call `updateEntryMetadata`,
  - publish/unpublish controls call the existing publish routes only when the user
    has `content:publish`,
  - save errors keep dirty state and render inline messages,
  - navigation away from dirty create/edit state is protected.
- Vitest service/client:
  - draft normalization preserves number, boolean, select, media, and relation
    field values,
  - binding resolver rejects unsafe paths and unrelated fields.
- Bun route tests:
  - entry create validation failures return 400-level errors,
  - update validation failures return machine-readable errors,
  - responses do not expose stack traces.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` if schema default behavior is formalized.
- `_docs/CMS_API.md` for validation/error mapping notes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `Editor View` is a builder tab in Custom Screen editor.
2. `entries/new` uses `Editor View` create mode and submits full normalized
   entry data.
3. `entries/:entryId` uses `Editor View` edit mode and preserves typed values.
4. Required-field content types can create entries without `data: {}` failures.
5. Numeric, boolean, select, media, and relation fields are handled by
   field-aware admin widgets rather than public display widget coercion.
