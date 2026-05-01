# TASK-249-03-02: Entry Create/Edit Runtime, Error UX, and No-Legacy Fallback
# FileName: TASK-249-03-02_Entry_Create_Edit_Runtime_Error_UX_and_No_Legacy_Fallback.md

**Priority:** High
**Category:** Coderso Custom Screens + Entry Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-249-03-01, TASK-249-01-02
**Status:** To Do

---

## Overview

Make the screen-owned record editor the only active V3 create/edit surface and
map the shared content-entry contract cleanly into inline widget/form errors.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesFilters.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesBulkActionsBar.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/customScreenEntryDraft.ts`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/services/customScreens/bindingResolver.ts`
- `core/admin/services/entriesClient.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Runtime Contract

- remove `EntryCreateDrawer` from the screen-owned records route,
- remove `Classic editor` row actions and record-header CTAs for active V3
  screens,
- remove `collection-only` and `dashboard` alerts for active V3 screens,
- `New record` always routes to the screen-owned record editor,
- row click always routes to the screen-owned record editor,
- inline save uses the existing content-entry create/update routes,
- field, title, media, gallery, and relation errors map back into the current
  draft and selected widgets without stack leakage.

## Implementation Pseudocode

```tsx
function handleCreate() {
  navigate(buildCustomScreenWorkspacePath({ screenId, entryId: "new" }));
}
```

```tsx
<CustomScreenEntriesTable
  items={pagination.visibleRows}
  listView={listView}
  buildRowHref={(entry) =>
    buildCustomScreenWorkspacePath({ screenId, entryId: entry.id })
  }
  onCreate={handleCreate}
/>
```

```ts
function applyEntryRouteErrorsToDraft(error: ApiClientError, draft: EntryDraft) {
  if (error.code === "entry_validation_failed" && error.details?.fieldErrors) {
    return {
      ...draft,
      fieldErrors: error.details.fieldErrors,
      formError: error.message,
    };
  }
  if (error.code === "entry_slug_conflict") {
    return {
      ...draft,
      fieldErrors: {
        ...draft.fieldErrors,
        slug: error.message,
      },
    };
  }
  return {
    ...draft,
    formError: error.message,
  };
}
```

## Security Contract

- Visibility: internal admin UI and existing internal content-entry API only.
- Auth model: authenticated admin session.
- RBAC:
  - records read: `content:read`,
  - records write: `content:write`,
  - publish/unpublish: `content:publish`.
- CSRF:
  - unchanged current CSRF-backed entry mutation path.
- Rate-limit bucket:
  - existing `admin_write`.
- Reject-unknown validation:
  - no custom-screen-only entry payload is introduced,
  - shared entry routes stay the owner of validation and machine-readable
    errors,
  - editor UI never smuggles status changes into the data payload.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest/Bun:
  - records list no longer renders or imports `EntryCreateDrawer`,
  - no `Classic editor` action renders for active V3 screens,
  - row/create navigation always uses the screen-owned editor route,
  - inline errors map correctly from shared entry route responses,
  - dirty-state and cache-refresh protection still hold after the cutover.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The screen-owned entry editor is the only active V3 create/edit route.
2. No classic-editor or drawer fallback remains in the records runtime.
3. Shared entry errors are rendered inline for the new editor experience.
