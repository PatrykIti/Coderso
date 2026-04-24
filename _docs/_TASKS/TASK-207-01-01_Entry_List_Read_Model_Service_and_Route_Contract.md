# TASK-207-01-01: Entry List Read Model Service and Route Contract
# FileName: TASK-207-01-01_Entry_List_Read_Model_Service_and_Route_Contract.md

**Priority:** High
**Category:** CMS/Entries + Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-207-01
**Status:** To Do

---

## Overview

Add the server-side read model for the all-entries list.

The implementation should live in `core/services/content/entryService.ts` and
join `content_entries`, `content_types`, and `users` in one ordered read. The
route in `core/server/routes/contentEntryRoutes.ts` should validate access,
delegate to the service, and return the read model without doing business logic.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/content/entryService.ts`
  - add `listEntriesWithContentTypes()` or similarly named read helper,
  - order by `contentEntries.updatedAt desc`,
  - include existing entry summary fields plus `contentType`.
- `core/server/routes/contentEntryRoutes.ts`
  - add an internal all-entries GET route,
  - keep type-scoped routes unchanged.
- `tests/unit/content/entryService.test.ts`
  - cover the joined read model when `DATABASE_URL` is available.
- `tests/integration/routes/contentTypes.test.ts`
  - cover route registration and `content:read` permission.

## Implementation Direction

Do not aggregate with client-side N+1 fetches. The DB/service layer already owns
the entry list shape and should return the content-type metadata atomically.

Route sketch:

```ts
router.get(
  "/content/entries",
  requirePermission("content:read"),
  async () => listEntriesWithContentTypes()
);
```

If the route matcher has an exact-path concern, choose a non-conflicting path
such as `/content-entries` and document the final path in this task before
implementation.

## Security Contract

- Visibility: internal admin read route.
- Auth model: authenticated admin session / admin API key where supported.
- RBAC: `content:read`.
- CSRF: not required for GET.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: no request body; the initial all-entries route is
  queryless and must reject unsupported query params instead of ignoring them.
  If a later task moves filters server-side, add a strict query schema in that
  task before accepting query input.
- Anti-abuse: read-only; no public write or token exposure.

## Testing Requirements

- `bun test tests/unit/content/entryService.test.ts`
- `bun test tests/integration/routes/contentTypes.test.ts`

## Documentation Updates Required

- `_docs/CMS_API.md` if the new route is documented.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The service returns entries from multiple content types in one read.
2. Each item includes `contentType.id`, `contentType.slug`,
   `contentType.name`, and `contentType.status`.
3. Existing type-scoped list/detail routes continue to pass.
4. Route tests prove `content:read` is required and route registration is
   explicit.
