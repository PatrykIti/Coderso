# TASK-204-02-01: Taxonomy Overview Route Error Mapping and Client Sanitization
# FileName: TASK-204-02-01_Taxonomy_Overview_Route_Error_Mapping_and_Client_Sanitization.md

**Priority:** High
**Category:** CMS/Taxonomy + Admin/API + Client
**Estimated Effort:** Medium
**Dependencies:** TASK-204-02
**Status:** To Do

---

## Overview

Bound failures from `GET /admin/api/content-types/:id/terms` before they reach
the Posts UI. The current `withTaxonomyErrors()` helper can throw
`ApiError("taxonomy_unexpected_error", error.message, 500)` in non-production,
which is how raw SQL/query text can leak to the browser during local or preview
QA.

Ownership:

- `taxonomyRoutes.ts` owns route-boundary mapping.
- `taxonomyService.ts` owns taxonomy read invariants.
- `taxonomyClient.ts` owns typed admin client calls.
- `apiClient.ts` owns generic API error parsing and should not expose raw
  internals if the route has already bounded them.

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/routes/taxonomyRoutes.ts:34-123`
- `core/server/routes/taxonomyRoutes.ts:152-158`
- `core/services/content/taxonomyService.ts` only if a service error needs a
  machine-readable owner code
- `core/admin/services/taxonomyClient.ts:62-66`
- `tests/integration/routes/taxonomy.test.ts`
- `tests/vitest/admin/taxonomyClient.test.ts`

## Implementation Sketch

```ts
const mapped = mapTaxonomyError(error);
if (mapped) throw mapped;
throw new ApiError(
  "taxonomy_unexpected_error",
  "Could not load taxonomy terms.",
  500
);
```

Direction:

- map existing known taxonomy errors explicitly;
- for unexpected failures, use stable code and safe message;
- preserve failure status so UI can show retry;
- do not return empty terms for failed reads;
- do not leak raw `error.message` from DB/query libraries.

## Security Contract

- Visibility: internal admin route `/admin/api/content-types/:id/terms`.
- Auth/RBAC: `content:read` through the existing admin route middleware.
- CSRF: not required for GET.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: no new request payload.
- Anti-abuse: no SQL, stack traces, constraint details, secrets, tokens, or
  headers in API error payloads.

## Testing Requirements

- Bun route tests:
  - route registration remains unchanged,
  - known taxonomy domain errors map to stable API codes,
  - unexpected `Error("Failed query: select ...")` maps to safe
    `taxonomy_unexpected_error` copy.
- Vitest client tests:
  - success payload remains typed,
  - failed response rejects with `ApiClientError` carrying safe code/message.

## Documentation Updates Required

- `_docs/CMS_API.md` if the taxonomy error response contract changes.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The API never sends raw query text for taxonomy overview failures.
2. Known taxonomy domain errors stay machine-readable.
3. The client can distinguish failure from an empty successful category list.
