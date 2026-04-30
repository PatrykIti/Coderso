# TASK-248-02-01: List View Designer and Persisted Configuration
# FileName: TASK-248-02-01_List_View_Designer_and_Persisted_Configuration.md

**Priority:** High
**Category:** Coderso Custom Screens + Builder UX
**Estimated Effort:** Medium
**Dependencies:** TASK-248-01-02
**Status:** To Do

---

## Overview

Build the `List View` designer tab inside the Custom Screen builder. The tab
edits persisted `definition.listView` configuration for the selected content
type. It does not render the records table; that is owned by TASK-248-02-02.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- new `core/admin/ui/custom-screens/ListViewDesigner.tsx`
- new `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/services/customScreensClient.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Designer Contract

The designer edits only fields from the Custom Screen record's selected
`contentTypeId` plus approved system entry fields. It must not expose an
arbitrary data-source selector.

Editable configuration:

- visible columns,
- column labels,
- field formatter,
- default sort,
- simple schema-derived filters,
- row click target,
- row action availability,
- bulk action availability,
- create button target.

## Implementation Pseudocode

```tsx
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
      onChange={(listView) =>
        updateDefinition({
          ...definition,
          listView,
        })
      }
    />
  </TabsContent>
</Tabs>
```

```ts
export function updateListColumn(input: {
  definition: CustomScreenListViewDefinition;
  columnId: string;
  patch: Partial<CustomScreenListColumn>;
  contentType: ContentTypeSummary;
}) {
  return {
    ...input.definition,
    columns: input.definition.columns.map((column) =>
      column.id === input.columnId
        ? normalizeListColumn({ ...column, ...input.patch }, input.contentType)
        : column
    ),
  };
}
```

```ts
export function listSelectableListFields(contentType: ContentTypeSummary) {
  return [
    systemField("title"),
    systemField("slug"),
    systemField("status"),
    systemField("updatedAt"),
    ...fieldsFromSchema(contentType.schema).map(schemaFieldToListOption),
  ];
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session used by the existing Custom Screen
  editor.
- RBAC: saving `List View` configuration still uses `content:write` through
  existing Custom Screen update routes.
- CSRF: saves continue through the CSRF-backed `customScreensClient`.
- Rate-limit bucket: existing `admin_write` for saves.
- Reject-unknown validation:
  - UI state must be normalized through the V2 definition schema before
    persistence,
  - selectable field options are limited to selected content type fields and
    approved system fields.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - `List View` tab renders after loading or creating a V2 Custom Screen,
  - default columns appear for the House Projects schema,
  - unrelated content type fields are not offered,
  - adding/removing/reordering columns marks the screen dirty,
  - formatter/default-sort/filter changes update only `definition.listView`,
  - save payload persists `listView` without duplicating `contentTypeId`.

## Documentation Updates Required

- `_docs/CMS_API.md` if user-facing V2 payload examples are added there.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The builder exposes a `List View` tab.
2. The tab edits persisted `definition.listView`.
3. Field options are schema-bound to the Custom Screen content type.
4. Dirty-state and save behavior match existing Custom Screen editor patterns.
