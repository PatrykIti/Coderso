# TASK-248-02: Custom Screen List View Builder and Records Table
# FileName: TASK-248-02_Custom_Screen_List_View_Builder_and_Records_Table.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin Lists + Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-248-01
**Status:** To Do

---

## Overview

Build the `List View` half of the Custom Screen workspace builder and render it
as the records table shown from the admin UI.

`List View` answers: "How should entries of this content type be listed and
managed?" It should feel familiar to users who know `/admin/pages`: table,
filters, row actions, bulk actions, empty state, cache hydration, and background
revalidation. It must still be schema-bound to the Custom Screen content type,
not a generic table builder over arbitrary data.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- new `core/admin/ui/custom-screens/ListViewDesigner.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- new `core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx`
- `core/admin/ui/custom-screens/CustomScreenFilters.tsx`
- `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/ui/pages/PageListPage.tsx` and `core/admin/ui/pages/PageTable.tsx`
  as reference patterns only; reuse shared primitives where it keeps ownership
  clean.
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/entriesClient.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/admin/entriesClient.test.ts`

## Builder Requirements

The Custom Screen editor must expose a `List View` tab that lets the user
configure:

- visible columns,
- column labels,
- column width/priority where supported by the table pattern,
- field formatter for number, boolean, select, date, media, and relation
  summary values,
- default sort,
- simple filters derived from schema fields,
- row click target,
- row action availability,
- bulk delete/publish/unpublish availability,
- create button target.

The tab should reuse Pages-editor ergonomics for canvas/settings state, but it
should not pretend that the list table is a free-form public page canvas.
Columns and filters are configuration objects, not arbitrary frontend widgets.

Content-type scope is record-level: the rendered list always uses the Custom
Screen record's `contentTypeId`, resolves that to the current content type, and
then reads only entries for that type. `List View` must not introduce an
arbitrary data-source selector.

## Implementation Pseudocode

```tsx
// CustomScreenEditorPage.tsx
<Tabs value={activeBuilderTab} onValueChange={setActiveBuilderTab}>
  <TabsList>
    <TabsTrigger value="list-view">List View</TabsTrigger>
    <TabsTrigger value="editor-view">Editor View</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="list-view">
    <ListViewDesigner
      contentType={selectedContentType}
      value={definition.listView}
      onChange={(next) => updateDefinition({ listView: next })}
    />
  </TabsContent>

  <TabsContent value="editor-view">
    <EditorViewDesigner ... />
  </TabsContent>
</Tabs>
```

```ts
function updateListColumn(input: {
  definition: CustomScreenListViewDefinition;
  columnId: string;
  patch: Partial<CustomScreenListColumn>;
}) {
  return {
    ...input.definition,
    columns: input.definition.columns.map((column) =>
      column.id === input.columnId
        ? normalizeListColumn({ ...column, ...input.patch })
        : column
    ),
  };
}
```

```tsx
// CustomScreenEntriesPage.tsx
const definition = normalizeCustomScreenDefinition(screen.definition, {
  contentType,
});

return (
  <CustomScreenEntriesTable
    contentType={contentType}
    entries={entries}
    listView={definition.listView}
    buildRowHref={(entry) =>
      definition.listView.rowClick === "classic-editor"
        ? buildClassicEditorHref(contentType.slug, entry.id)
        : buildCustomScreenWorkspaceHref({
            screenId: screen.id,
            entryId: entry.id,
          })
    }
    onCreate={() => {
      if (definition.listView.createMode === "editor-view") {
        navigate(buildCustomScreenWorkspaceHref({ screenId: screen.id, entryId: "new" }));
        return;
      }
      openLegacyDrawer();
    }}
  />
);
```

```ts
function resolveEntryColumnValue(input: {
  entry: EntrySummary;
  column: CustomScreenListColumn;
  contentType: ContentTypeSummary;
}) {
  if (input.column.source === "system") {
    return readSystemEntryField(input.entry, input.column.field);
  }
  const rawValue = input.entry.data?.[input.column.field];
  return formatEntryFieldForList(rawValue, {
    field: input.column.field,
    schema: input.contentType.schema,
    formatter: input.column.formatter,
  });
}
```

## Security Contract

- Visibility: internal admin UI and existing internal entry routes.
- Auth model: authenticated admin session or existing admin API key model.
- RBAC:
  - list rendering requires `content:read`,
  - row delete requires `content:write`,
  - row publish/unpublish requires the current entry publish permission
    (`content:publish`) when calling publish routes,
  - saving `List View` configuration requires the existing `content:write`
    permission used by Custom Screens writes.
- CSRF:
  - table mutations use existing CSRF-backed entry/admin clients,
  - saving the Custom Screen definition uses existing CSRF-backed client.
- Rate-limit bucket:
  - existing `admin_write` for mutations,
  - existing admin read bucket for list loads if one is enforced.
- Reject-unknown validation:
  - list columns and filters must be normalized through the V2 definition
    schema before persistence,
  - arbitrary field paths are not allowed outside the selected content type
    schema and approved system fields.
- Anti-abuse:
  - no public endpoint,
  - no nonce/signature/HMAC/reCAPTCHA requirement.

## Testing Requirements

- Vitest UI:
  - `List View` tab renders after loading a V2 Custom Screen,
  - default columns are generated for the House Projects schema,
  - adding/removing/reordering columns marks the screen dirty,
  - invalid field choices are not offered for unrelated content types,
  - save payload persists the updated `listView`,
  - rendered records table uses configured labels and formatted values,
  - `New record` navigates to `/entries/new` when `createMode` is
    `editor-view`,
  - row links use `Editor View` or classic editor based on `rowClick`.
- Cache/client:
  - list updates hydrate from cache and revalidate without overwriting active
    dirty builder state.
- Route/service:
  - no new public routes are introduced,
  - delete/publish/unpublish still use existing entry route contracts.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if list cache behavior
  changes.
- `_docs/CMS_API.md` if Custom Screen V2 payload docs are added there.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The builder has a working `List View` tab for a selected content type.
2. The Custom Screen records route renders a configured table instead of the
   fixed title/status/updated table.
3. The create button can route to `Editor View` create mode.
4. Row actions and bulk actions remain permission-aware and use existing entry
   service contracts.
5. The table follows Pages-list UX patterns without duplicating unrelated Pages
   code.
