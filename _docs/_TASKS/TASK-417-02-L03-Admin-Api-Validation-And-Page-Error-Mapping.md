# TASK-417-02-L03: Admin API Validation And Page Error Mapping
# FileName: TASK-417-02-L03-Admin-Api-Validation-And-Page-Error-Mapping.md

**Parent Subtask:** TASK-417-02
**Priority:** High
**Category:** Pages / API / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-02-L02
**Status:** ✅ Done

---

## Overview

Replace the Pages route schema from v1 `blocks[]` to v2 `sections[]` and add
centralized Pages error mapping coverage for changed route behavior.

---

## Security Contract

- **Endpoint visibility:** internal `/admin/api/pages*`.
- **Auth model:** existing admin session.
- **RBAC:** `content:read`, `content:write`, `content:publish` according to the
  route being called.
- **CSRF:** all write routes remain behind the shared admin CSRF middleware.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** route schemas reject unknown fields and require v2 Page data
  for create/update/autosave/publish payloads.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [x] Update `core/server/validation/pageSchemas.ts` to reference Pages v2
  document schemas.
- [x] Reject v1 `blocks[]` Page payloads at the route schema boundary.
- [x] Add `mapPageError` or equivalent centralized mapping for known page
  domain errors.
- [x] Add registration, auth/RBAC, validation, and error-mapping coverage.

---

## Implementation Pseudocode

```ts
export const pageDataSchema = pageDocumentV2JsonSchema;

export function mapPageError(error: unknown): ApiError | null {
  if (isPageDomainError(error, "page_not_found")) {
    return new ApiError("page_not_found", "Page not found.", 404);
  }
  if (isPageDomainError(error, "page_document_invalid")) {
    return new ApiError("page_document_invalid", "Page document is invalid.", 400);
  }
  if (isPageDomainError(error, "page_document_unknown_field")) {
    return new ApiError("page_document_unknown_field", "Page document contains an unknown field.", 400);
  }
  if (isPageDomainError(error, "revision_not_found")) {
    return new ApiError("revision_not_found", "Page revision was not found.", 404);
  }
  if (isPageDomainError(error, "revision_delete_forbidden")) {
    return new ApiError("revision_delete_forbidden", "Page revision cannot be deleted.", 409);
  }
  if (isPageDomainError(error, "page_revision_autosave_failed")) {
    return new ApiError("page_revision_autosave_failed", "Page autosave revision could not be saved.", 500);
  }
  return null;
}

router.patch("/pages/:id", requirePermission("content:write"), async (ctx) => {
  validate(pageUpdateSchema, ctx.body);
  try {
    return await updatePage(ctx.params.id, body);
  } catch (error) {
    const mapped = mapPageError(error);
    if (mapped) throw mapped;
    throw error;
  }
});
```

Expected data flow:

- Route validation runs before service work.
- Route handlers delegate normalization to services/domain modules.
- Known domain errors are mapped at the route boundary.

Error handling:

- v1 `blocks[]` payloads fail validation.
- unknown root, section, block, or props fields fail validation.
- `page_document_unknown_field` maps to HTTP 400 at the route boundary.
- `page_not_found` maps to HTTP 404 instead of leaking as a generic 500.
- `revision_not_found` maps to HTTP 404 and `revision_delete_forbidden` maps
  to HTTP 409 for existing revision routes.
- `page_revision_autosave_failed` maps to a stable HTTP 500 API code instead
  of falling through to generic `internal_error`.
- known service errors map to stable API error codes.

Regression-test shape:

- Bun route tests cover route registration, required permissions, validation
  before service work, v1 rejection, v2 acceptance, and mapped errors.

---

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed route tests when
  `DATABASE_URL` is available.
- Targeted Bun Pages route tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
