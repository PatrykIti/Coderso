# TASK-248-01-02: Workspace Routes, Client Cache, and Entry Error Mapping
# FileName: TASK-248-01-02_Workspace_Routes_Client_Cache_and_Entry_Error_Mapping.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin Routing + API Errors
**Estimated Effort:** Medium
**Dependencies:** TASK-248-01-01
**Status:** To Do

---

## Overview

Wire the V2 definition into the existing Custom Screen API/client boundary and
fix the content-entry error mapping that currently makes schema failures appear
as `500 internal_error` in the Custom Screen create flow.

This leaf owns routing/client/cache seams only. It must not build the list
designer or editor canvas UI.

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/routes/customScreenRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/cachePolicy.ts` if new workspace cache keys are required.
- `core/admin/ui/custom-screens/routeParams.ts`
- `core/admin/ui/custom-screens/assistantSurface.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `tests/integration/routes/customScreensRoutes.test.ts`
- new `tests/integration/routes/contentEntryRoutes.test.ts`
- `tests/vitest/admin/customScreensClient.test.ts`

## Route and Client Contract

Admin UI links must go through the shared admin helpers. Do not introduce a
second hand-built Custom Screens route convention.

```ts
import { resolveAdminHref } from "@/utils/adminPaths";

export function buildCustomScreenWorkspaceHref(input: {
  basePath: string;
  screenId: string;
  entryId?: string | "new";
}) {
  const path = `/advanced/custom-screens/${encodeURIComponent(input.screenId)}/entries`;
  const href = input.entryId
    ? `${path}/${encodeURIComponent(input.entryId)}`
    : path;
  return resolveAdminHref(input.basePath, href);
}
```

If the implementation adds a named convenience helper to `adminPaths.ts`, that
helper must wrap `resolveAdminHref` and receive the admin base path explicitly.
Do not introduce an `adminPaths.*` object that bypasses the current helper API.

The existing Custom Screen CRUD routes continue to own definition persistence:

- `GET /admin/api/custom-screens`
- `GET /admin/api/custom-screens/:id`
- `POST /admin/api/custom-screens`
- `PATCH /admin/api/custom-screens/:id`
- `DELETE /admin/api/custom-screens/:id`

No public API route is added by this leaf.

## Implementation Pseudocode

```ts
import { ContentValidationError } from "../../services/content/validation";

export const mapContentEntryError = (error: unknown) => {
  if (error instanceof ContentValidationError) {
    return new ApiError(
      "entry_validation_failed",
      "Entry validation failed.",
      400,
      { validation: error.details ?? [] }
    );
  }

  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "content_type_not_found":
      return new ApiError("content_type_not_found", "Content type not found.", 404);
    case "entry_not_found":
      return new ApiError("entry_not_found", "Entry not found.", 404);
    case "entry_validation_failed":
      return new ApiError("entry_validation_failed", "Entry validation failed.", 400);
    case "entry_slug_conflict":
      return new ApiError("entry_slug_conflict", "Entry slug already exists.", 409);
    case "media_value_invalid":
      return new ApiError("media_value_invalid", "Media field value is invalid.", 400);
    case "media_asset_missing":
      return new ApiError("media_asset_missing", "Selected media asset was not found.", 404);
    case "media_type_not_allowed":
      return new ApiError("media_type_not_allowed", "Selected media type is not allowed.", 400);
    case "relation_target_not_found":
      return new ApiError("relation_target_not_found", "Relation target content type was not found.", 404);
    case "relation_value_invalid":
      return new ApiError("relation_value_invalid", "Relation field value is invalid.", 400);
    case "relation_entry_missing":
      return new ApiError("relation_entry_missing", "Related entry was not found.", 404);
    case "entry_duplicate_failed":
      return new ApiError("entry_duplicate_failed", "Entry could not be duplicated.", 400);
    case "auth_required":
      return new ApiError("auth_required", "Authentication is required.", 401);
    default:
      return null;
  }
};
```

```ts
const withContentEntryErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapContentEntryError(error);
    if (mapped) throw mapped;
    throw error;
  }
};
```

Wrap each content-entry route body in `withContentEntryErrors` without moving
business logic into the route. The route remains orchestration-only: validate,
load content type/entry, delegate to service, map known domain errors.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: authenticated admin session or existing admin API key model.
- RBAC:
  - Custom Screen definition create/update keeps `content:write`,
  - Custom Screen read keeps `content:read`,
  - entry create/update/delete keeps `content:write`,
  - entry publish/unpublish keeps `content:publish`.
- CSRF: all admin writes continue through existing CSRF-backed admin clients.
- Rate-limit bucket: existing `admin_write` for write mutations; existing admin
  read bucket for read routes if enforced.
- Reject-unknown validation:
  - Custom Screen create/update schemas accept V2 only through strict
    definition schemas,
  - content-entry create/update schemas continue to reject unknown top-level
    payload keys,
  - `ContentValidationError` details may be exposed only as AJV validation
    details, not as raw stack traces or arbitrary thrown error objects,
  - route modules delegate normalization to service/domain owners.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun route tests:
  - Custom Screen create/update accepts valid V2 definitions,
  - invalid V2 definitions map to 400-level machine-readable errors,
  - `ContentValidationError("entry_validation_failed")` maps to 400 instead of
    `internal_error`, with bounded validation details and no stack leakage,
  - `entry_slug_conflict` maps to 409,
  - media errors map deterministically:
    `media_value_invalid` -> 400, `media_asset_missing` -> 404,
    `media_type_not_allowed` -> 400,
  - relation errors map deterministically:
    `relation_target_not_found` -> 404, `relation_value_invalid` -> 400,
    `relation_entry_missing` -> 404,
  - `content_type_not_found` and `entry_not_found` map to 404,
  - responses do not leak stack traces.
- Vitest admin/client tests:
  - V2 payloads round-trip through `customScreensClient`,
  - workspace href helpers encode screen and entry ids,
  - prefetch warms `customScreens:list`, the screen detail key, and the relevant
    content type/entries keys without mount-force refetch loops.

## Documentation Updates Required

- `_docs/CMS_API.md` for V2 Custom Screen payload and entry error mapping.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if new cache keys are
  introduced.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. V2 Custom Screen payloads pass through route validation and service
   normalization.
2. Content-entry validation, slug, media, and relation failures return bounded
   machine-readable admin errors instead of `internal_error`.
3. Workspace links use shared canonical admin helpers.
4. Cache/preload behavior remains aligned with the existing admin cache contract.
