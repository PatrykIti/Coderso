# TASK-203-01-01: Metadata Route, Service Error Mapping, and API Client State
# FileName: TASK-203-01-01_Metadata_Route_Service_Error_Mapping_and_API_Client_State.md

**Priority:** High
**Category:** CMS/Entries + Admin/API + Services
**Estimated Effort:** Medium
**Dependencies:** TASK-203-01
**Status:** Done
**Completed:** 2026-04-23

---

## Overview

Make the metadata route/client robust enough for UI feedback. The report saw a
500 from the metadata endpoint; this leaf bounds known failures without hiding
unknown server errors.

Ownership:

- `contentEntryRoutes.ts` owns translating service errors into bounded
  `ApiError` responses at the route boundary and enforcing conditional publish
  permission when a metadata status change would publish an entry.
- `entryService.ts` owns metadata invariants such as schedule validity,
  taxonomy enablement, term membership, and publish auth requirements.
- `entriesClient.ts` owns cache writes and broadcasts only after successful
  metadata responses.

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/routes/contentEntryRoutes.ts:47-85`
- `core/server/routes/contentEntryRoutes.ts:151-205`
- `core/services/content/entryService.ts:694-770`
- `core/server/validation/contentSchemas.ts:51-88`
- `core/admin/services/entriesClient.ts:291-314`
- `tests/integration/routes/contentTypes.test.ts`
- `tests/unit/content/entryService.test.ts`
- `tests/vitest/admin/entriesClient.test.ts`

## Implementation Sketch

```ts
const mapped = mapEntryMetadataError(error);
if (mapped) throw mapped;
throw error;
```

Direction:

- map only current service errors,
- include the current `auth_required` publish transition from
  `entryService.updateEntryMetadata()` so metadata status changes cannot surface
  as raw 500s when no actor is present,
- do not treat `auth_required` as the full publish guard; the route must also
  prove `content:publish` before allowing metadata to publish,
- keep unknown failures visible as failures,
- do not turn raw 500s into fake validation successes,
- keep cache writes only after successful responses.

## Security Contract

- Visibility: internal admin route only.
- Auth/RBAC: metadata writes stay under `content:write`; metadata-driven publish
  transitions also require `content:publish` and must reuse the existing
  permission/checking path instead of adding a parallel publish route.
- CSRF: unchanged through `withCsrf`.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged strict metadata schema.
- Anti-abuse: bounded error codes/messages only; no server internals in API
  responses.

## Testing Requirements

- Bun:
  - metadata route registration,
  - schedule/taxonomy/SEO success,
  - invalid schedule, disabled taxonomy, missing taxonomy, and auth-required
    publish transitions,
  - metadata publish attempted with `content:write` but without
    `content:publish` is rejected with a bounded permission error,
  - a route-boundary assertion in `tests/integration/routes/contentTypes.test.ts`
    or an equivalent route suite that proves metadata publish without `ctx.user`
    returns bounded `auth_required` instead of leaking as `internal_error`.
- Vitest:
  - `updateEntryMetadata()` uses CSRF,
  - successful response updates/broadcasts cache,
  - failed response does not optimistically mutate cache.

## Documentation Updates Required

- `_docs/CMS_API.md` if error codes change.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Known metadata failures map to bounded API errors.
2. Unknown failures do not leak internals.
3. `auth_required` from metadata-driven publish maps to a bounded auth error.
4. Successful metadata saves keep list/detail cache coherent.
5. Metadata-driven publish cannot bypass the existing `content:publish`
   contract.
