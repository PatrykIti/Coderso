# TASK-417-02-L03: Admin API Validation And Page Error Mapping
# FileName: TASK-417-02-L03-Admin-Api-Validation-And-Page-Error-Mapping.md

**Parent Subtask:** TASK-417-02
**Priority:** High
**Category:** Pages / API / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-02-L02
**Status:** ⏳ To Do

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

- [ ] Update `core/server/validation/pageSchemas.ts` to reference Pages v2
  document schemas.
- [ ] Reject v1 `blocks[]` Page payloads at the route schema boundary.
- [ ] Add `mapPageError` or equivalent centralized mapping for known page
  domain errors.
- [ ] Add registration, auth/RBAC, validation, and error-mapping coverage.

---

## Implementation Pseudocode

```ts
export const pageDataSchema = pageDocumentV2JsonSchema;

export function mapPageError(error: unknown): never {
  if (isPageDomainError(error, "page_not_found")) {
    throw new ApiError(404, "page_not_found", "Page not found.");
  }
  if (isPageDomainError(error, "page_document_invalid")) {
    throw new ApiError(400, "page_document_invalid", "Page document is invalid.");
  }
  if (isPageDomainError(error, "page_document_unknown_field")) {
    throw new ApiError(400, "page_document_unknown_field", "Page document contains an unknown field.");
  }
  throw error;
}

router.patch("/pages/:id", requirePermission("content:write"), async (ctx) => {
  validate(pageUpdateSchema, ctx.body);
  try {
    return await updatePage(ctx.params.id, body);
  } catch (error) {
    mapPageError(error);
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
