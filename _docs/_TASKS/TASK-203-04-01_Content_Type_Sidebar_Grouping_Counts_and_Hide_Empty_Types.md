# TASK-203-04-01: Content Type Sidebar Grouping, Counts, and Hide Empty Types
# FileName: TASK-203-04-01_Content_Type_Sidebar_Grouping_Counts_and_Hide_Empty_Types.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-04
**Status:** To Do

---

## Overview

Make the Entries content-type sidebar usable with dozens of types. This leaf
owns `UX-1` and stays non-destructive. It also closes the report's duplicate
name readability issue by showing current slug or equivalent context when two
or more content types share the same display name.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryTypeSidebar.tsx:33-127`
- `core/admin/ui/entries/EntryList.tsx:177-187`
- `core/admin/ui/entries/EntryList.tsx:392-411`
- `core/admin/services/contentTypesClient.ts`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/content-entries.test.tsx`
- `tests/vitest/admin/contentTypesClient.test.ts` only if summary shape changes

## Implementation Sketch

```ts
const groups = [
  { id: "active", label: "With entries", items: types.filter((type) => type.count > 0) },
  { id: "empty", label: "Empty", items: types.filter((type) => type.count === 0) },
];
```

Direction:

- preserve search across groups,
- preserve counts,
- preserve readable names but add slug/context for duplicate labels,
- keep active type visible,
- do not add storage cleanup semantics.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: existing read behavior only.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: grouping/hide-empty must not delete, archive, or mutate content
  types.

## Testing Requirements

- sidebar filters by name/slug,
- counts remain visible,
- duplicate names show slug or equivalent context and remain searchable by slug,
- active type stays selected after grouping/filtering,
- hide-empty toggle does not hide active type unexpectedly,
- create collection action remains accessible.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. A 35+ item sidebar is grouped or filterable beyond plain search.
2. Entry counts remain visible and trusted.
3. Duplicate display names are disambiguated without renaming or mutating
   content types.
4. Empty/generated-type hiding is reversible and presentation-only.
