# TASK-248-02-02: Records Table Renderer, Actions, and Cache Behavior
# FileName: TASK-248-02-02_Records_Table_Renderer_Actions_and_Cache_Behavior.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin Lists + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-248-02-01
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Render Custom Screen records from the persisted `definition.listView`
configuration. This replaces the current fixed title/status/updated table while
preserving the existing entries service and admin cache contracts.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- new `core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx`
- `core/admin/ui/custom-screens/CustomScreenFilters.tsx`
- `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/services/entriesClient.ts`
- `core/admin/services/cachePolicy.ts` if new keys are required.
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/admin/entriesClient.test.ts`

## Table Contract

The records table reads entries only for the Custom Screen record's selected
content type. It must not add a generic datasource.

The rendered list should follow Pages-list behavior where applicable:

- cache hydrate before background revalidation,
- stable table layout,
- search/filter state,
- selection and visible-row trimming,
- row actions,
- bulk actions,
- empty/loading/error states,
- create button routing based on `listView.createMode`.

## Implementation Pseudocode

```tsx
const definition = screen.definition;

return (
  <CustomScreenEntriesTable
    contentType={contentType}
    entries={entries}
    listView={definition.listView}
    buildRowHref={(entry) =>
      definition.listView.rowClick === "classic-editor"
        ? buildClassicEditorHref(contentType.slug, entry.id)
        : buildCustomScreenWorkspacePath({
            screenId: screen.id,
            entryId: entry.id,
          })
    }
    onCreate={() => {
      if (definition.listView.createMode === "editor-view") {
        navigate(buildCustomScreenWorkspacePath({ screenId: screen.id, entryId: "new" }));
        return;
      }
      openLegacyDrawer();
    }}
  />
);
```

`screen.definition` is the normalized V2 field from the Custom Screens service
contract. The table must not read `listView` from legacy `blocks` or `bindings`.

```ts
export function resolveEntryColumnValue(input: {
  entry: EntrySummary;
  column: CustomScreenListColumn;
  contentType: ContentTypeSummary;
}) {
  if (input.column.source === "system") {
    return readSystemEntryField(input.entry, input.column.field);
  }

  return formatEntryFieldForList(input.entry.data?.[input.column.field], {
    field: input.column.field,
    schema: input.contentType.schema,
    formatter: input.column.formatter,
  });
}
```

Cache subscriptions must refresh on:

- `customScreens:list`,
- `customScreens:detail:<screenId>`,
- `entries:list:<contentTypeSlug>`,
- any new V2 workspace key added by TASK-248-01-02.

## Security Contract

- Visibility: internal admin UI and existing internal entry API.
- Auth model: authenticated admin session on the existing session-cookie admin
  API. No API-key auth path is introduced by this leaf.
- RBAC:
  - list rendering requires `content:read`,
  - row delete requires `content:write`,
  - row publish/unpublish requires `content:publish`,
  - saved list config was already gated by `content:write`.
- CSRF: row and bulk mutations use existing CSRF-backed entry clients.
- Rate-limit bucket: existing `admin_write` for mutations; existing admin read
  bucket for list loads if enforced.
- Reject-unknown validation:
  - rendered columns are normalized V2 config,
  - field reads are limited to selected content type data and approved system
    fields,
  - row/bulk action payloads keep current entry route schemas.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - records table renders configured labels and formatted values,
  - hidden columns stay hidden,
  - invalid/stale configured fields are skipped or surfaced without crashing,
  - `New record` routes to `/entries/new` when `createMode` is `editor-view`,
  - row click uses `Editor View` or classic editor based on `rowClick`,
  - row and bulk actions remain permission-aware,
  - cache events refresh the table without mount-force refetch loops.
- Vitest client:
  - entries cache invalidation updates the table after create/update/delete,
  - active selection is trimmed when visible rows change.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys or
  invalidation behavior change.
- `_docs/CONTENT_LIST_UX.md` if Custom Screen list behavior becomes part of the
  shared list contract.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screen records render from `definition.listView`.
2. The table uses only entries for the assigned content type.
3. Row/create/bulk actions use existing entry service contracts.
4. Cache hydration and background revalidation match Pages-list expectations
   without dirty-state overwrites.
