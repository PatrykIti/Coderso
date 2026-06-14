# TASK-468-05-L03: Records List Presentation Modes
# FileName: TASK-468-05-L03-Records-List-Presentation-Modes.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Records List
**Estimated Effort:** Large
**Dependencies:** TASK-468-05-L01
**Status:** ⏳ To Do

---

## Overview

Move Custom Screen record lists onto V4 list presentation configuration. The
list must support professional admin views for custom content records while
staying correlated to content type fields and existing entry routes.

## Sub-Tasks

- [ ] Define `CustomScreenListViewDefinitionV4` in the V4 contract owner.
- [ ] Implement table/card/compact list presentation modes if they are part of
  the accepted contract.
- [ ] Map visible columns/cards to content type field summaries.
- [ ] Handle missing fields, sorting, filtering, pagination, and empty states.
- [ ] Add tests for list config normalization and rendered record lists.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenDocument.ts` | Own V4 list-view definition types/defaults. |
| `core/admin/ui/custom-screens/ListViewDesigner.tsx` | Edit V4 list presentation config. |
| `core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx` | Render records from V4 list config. |
| `core/admin/ui/custom-screens/customScreenListModel.ts` | Normalize/sort/filter list view model. |
| `tests/vitest/customScreens/customScreenListModel.test.ts` | Pure list model coverage. |
| `tests/vitest/ui-integration/custom-screens/*List*.test.tsx` | UI list coverage. |

## Implementation Pseudocode

```ts
export type CustomScreenListViewDefinitionV4 = {
  schemaVersion: 1;
  presentation: "table" | "cards" | "compact";
  fields: Array<{ fieldName: string; label?: string; sortable?: boolean; width?: string }>;
  defaultSort?: { fieldName: string; direction: "asc" | "desc" };
};

export function createScreenRecordListModel(input: ScreenRecordListInput) {
  const fields = input.listView.fields.map((field) =>
    resolveListField(field, input.contentType)
  );
  return applySortAndPagination({ fields, records: input.records, query: input.query });
}
```

Data flow:

- Service/client loads V4 list view definition with content type metadata.
- List model resolves configured fields against content type fields.
- UI renders table/card/compact layouts and links records to the record
  workspace route.

Error handling:

- Missing list fields render repair hints in editor mode and omit unsafe columns
  in runtime list mode.
- Invalid sort fields fall back to deterministic default sort.
- Pagination/filter state stays bounded and URL-safe.

Regression-test shape:

```tsx
test("list view omits deleted field and keeps record actions", () => {
  render(<CustomScreenEntriesTable fixture={listWithDeletedFieldFixture} />);
  expect(screen.queryByRole("columnheader", { name: "Deleted field" })).toBeNull();
  expect(screen.getAllByRole("link", { name: /Edit/ })).toHaveLength(2);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen list and custom
  content record routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for list and record reads.
- **CSRF expectations:** not required for read-only list requests; required for
  any inline mutations.
- **Rate-limit bucket:** existing admin read bucket.
- **Reject unknown validation:** list view definition rejects unknown
  presentation, field, sort, filter, and pagination payload keys.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** list columns must not expose protected fields without the
  existing admin authorization model allowing them.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/customScreenListModel.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- Bun route tests if list query validation changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`

## Acceptance Criteria

1. V4 list configuration is schema-owned and normalized.
2. Record lists render from content type field mappings, not widget blocks.
3. Missing fields and invalid sort/filter state fail safely.
