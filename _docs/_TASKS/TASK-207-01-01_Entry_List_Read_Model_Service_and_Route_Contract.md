# TASK-207-01-01: Entry List Read Model Service and Route Contract
# FileName: TASK-207-01-01_Entry_List_Read_Model_Service_and_Route_Contract.md

**Priority:** High
**Category:** CMS/Entries + Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-207-01
**Status:** Done (2026-04-24)

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
  - add the internal all-entries GET route at `/content-entries`,
  - validate `ctx.query` with the schema owner before delegating,
  - keep type-scoped routes unchanged.
- `core/server/validation/contentSchemas.ts`
  - add `contentEntryAllEntriesQuerySchema` or a similarly named empty query
    schema with `properties: {}` and `additionalProperties: false`,
  - keep query validation centralized here instead of adding route-local
    `Object.keys(ctx.query)` checks.
- `tests/unit/content/entryService.test.ts`
  - cover the joined read model when `DATABASE_URL` is available.
- `tests/integration/routes/contentTypes.test.ts`
  - cover route registration, `content:read` permission, and queryless
    fail-closed behavior for unsupported query params.

## Implementation Direction

Do not aggregate with client-side N+1 fetches. The DB/service layer already owns
the entry list shape and should return the content-type metadata atomically.

Route sketch:

```ts
router.get(
  "/content-entries",
  requirePermission("content:read"),
  async (ctx) => {
    validate(contentEntryAllEntriesQuerySchema, ctx.query);
    return listEntriesWithContentTypes();
  }
);
```

The path is intentionally not `/content/entries`. The current server router
matches registered route definitions in order, and the repo already owns
`GET /content/:type/entries` for type-scoped reads. A `/content/entries` route
would either be captured as `type = "entries"` when registered after the dynamic
route, or would reserve `entries` as a special content-type slug when registered
before it. Keep the additive all-entries contract on `/content-entries` and
leave `/content/:type/entries` unchanged.

## Security Contract

- Visibility: internal admin read route.
- Auth model: authenticated admin session / admin API key where supported.
- RBAC: `content:read`.
- CSRF: not required for GET.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: no request body; the initial all-entries route is
  queryless and must reject unsupported query params through an empty query
  schema in `core/server/validation/contentSchemas.ts` instead of ignoring them
  or manually inspecting `ctx.query` in the route. If a later task moves filters
  server-side, extend that schema in the task before accepting query input.
- Anti-abuse: read-only; no public write or token exposure.

## Testing Requirements

- `bun test tests/unit/content/entryService.test.ts`
  - add DB-backed coverage that creates at least two content types with entries
    and proves `listEntriesWithContentTypes()` returns one `updatedAt desc`
    all-entries result set with row-owned `contentType` metadata.
- `bun test tests/integration/routes/contentTypes.test.ts`
  - assert `GET /content-entries` is registered explicitly.
  - assert the route requests `content:read` before returning data.
  - assert a queryless route rejects unsupported query params, for example
    `/content-entries?status=draft`, through the `contentSchemas.ts` schema
    owner instead of ignoring them or silently enabling server-side filtering.
  - assert the existing type-scoped entry list route remains registered and
    continues to resolve through `/content/:type/entries`.
  - assert the new all-entries route does not depend on route registration order
    against `/content/:type/entries`.

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
5. Route tests prove unsupported query params are rejected until a later task
   introduces a strict server-side filter schema.
6. The route strictness implementation uses the shared validation schema owner
   and does not add route-local manual query inspection.
