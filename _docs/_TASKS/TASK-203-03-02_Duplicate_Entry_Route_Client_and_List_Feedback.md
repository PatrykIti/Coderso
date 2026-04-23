# TASK-203-03-02: Duplicate Entry Route, Client, and List Feedback
# FileName: TASK-203-03-02_Duplicate_Entry_Route_Client_and_List_Feedback.md

**Priority:** High
**Category:** CMS/Entries + Admin/API + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-03
**Status:** To Do

---

## Overview

Make the visible `Duplicate` row action real. The current table renders
`Duplicate` with no handler, while Pages and Posts already have duplicate
patterns to reference.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryTable.tsx:47-103`
- `core/admin/ui/entries/EntryList.tsx:57-353`
- `core/admin/services/entriesClient.ts:245-380`
- `core/server/routes/contentEntryRoutes.ts:87-271`
- `core/services/content/entryService.ts:533-608`
- `core/server/validation/contentSchemas.ts`
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/integration/routes/contentTypes.test.ts`
- `tests/unit/content/entryService.test.ts`

## Implementation Sketch

```ts
const clone = await duplicateEntry(activeSlug, id);
await refreshEntries();
navigate(`/entries/${encodeURIComponent(activeSlug)}/${encodeURIComponent(clone.id)}`);
```

Direction:

- cloned entry is a draft,
- title/slug are deterministic and unique,
- duplicate stays within the same content type,
- success/error feedback is visible.

## Security Contract

- Visibility: internal admin route/UI only.
- Auth model: authenticated admin session/API-key path.
- RBAC: `content:write`.
- CSRF: `withCsrf: true`.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: strict duplicate payload if payload options exist.
- Anti-abuse: source type must match path type, slug uniqueness must be
  preserved, clone must not publish.

## Testing Requirements

- Vitest:
  - row `Duplicate` forwards id,
  - list handler calls client wrapper,
  - success refreshes/navigates/shows feedback,
  - failure shows feedback and does not navigate,
  - client wrapper uses CSRF and cache updates.
- Bun:
  - route registration,
  - service creates draft clone with unique title/slug,
  - type mismatch is rejected.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Duplicate` is no longer a no-op.
2. A successful duplicate creates a visible draft clone.
3. Duplicate is permission-gated, CSRF-protected, and tested in Bun/Vitest.

