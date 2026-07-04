# TASK-473-02: Internal Admin Override Routes
# FileName: TASK-473-02-Internal-Admin-Override-Routes.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Custom Screens / Routes / Entry Presentation
**Estimated Effort:** Medium
**Dependencies:** TASK-473-01
**Status:** ✅ Done
**Completed:** 2026-06-24

---

## Overview

Expose the per-record presentation override store through internal admin routes
(or an extension of the existing entry-screen routes), with strict reject-unknown
validation, RBAC, CSRF, and machine-readable errors mapped at the route boundary.
Routes stay orchestration-only and delegate business rules to the TASK-473-01
service.

## Current State (summary)

- Custom Screen routes live in `core/server/routes/customScreenRoutes.ts`
  (already maps domain errors at the boundary).
- Content-entry writes go through `core/server/routes/contentEntryRoutes.ts`.
- The override service + errors are owned by TASK-473-01
  (`screenEntryPresentationOverrides.ts`).

## Sub-Tasks

- [x] Add internal admin routes: read overrides + replace overrides for
  `(screenId, entryId)` (or extend the existing entry-screen route group).
- [x] Enforce RBAC (`content:read` / `content:write`); writes stay protected by
  the existing global admin CSRF and rate-limit middleware.
- [x] Validate payloads with reject-unknown; delegate to the service.
- [x] Map `custom_screen_override_*` domain errors to `ApiError` via a centralized
  `map*Error` helper.
- [x] Add route registration + `map*Error` + RBAC integration tests (Bun lane).

## Completion Notes

- Added `GET` and `PATCH`
  `/admin/api/custom-screens/:screenId/entries/:entryId/overrides` through the
  internal Custom Screen route group.
- PATCH uses the strict `{ overrides: [...] }` envelope, maps
  `custom_screen_override_*` errors, and relies on the existing global admin
  CSRF/rate-limit middleware.
- Extended `tests/integration/routes/customScreensRoutes.test.ts` for route
  registration, permissions, error mapping, and reject-unknown envelope
  validation.

## Files To Change

| File | Required change |
|---|---|
| `core/server/routes/customScreenRoutes.ts` | Add/extend override read+write routes (use the already-typed `router.patch` for replace; the `Router` type at `:24-29` exposes get/post/patch/delete, no `put`), RBAC, error mapping. |
| `core/services/customScreens/screenEntryPresentationOverrides.ts` | Consume service + error map (from TASK-473-01); own the strict replace-envelope schema/normalizer exported for route validation. |
| `tests/integration/routes/customScreensRoutes.test.ts` | Route registration, validation, RBAC, global CSRF/write-path coverage, `map*Error`. |

## Implementation Pseudocode

```ts
// customScreenRoutes.ts (API-relative; externally mounted under /admin/api)
router.get("/custom-screens/:screenId/entries/:entryId/overrides",
  requirePermission("content:read"),
  async (ctx) => withCustomScreenOverrideErrors(async () => ({
    overrides: await getScreenEntryPresentationOverrides(ctx.params.screenId, ctx.params.entryId),
  })));

router.patch("/custom-screens/:screenId/entries/:entryId/overrides",
  requirePermission("content:write"),
  async (ctx) => {
    return withCustomScreenOverrideErrors(async () => {
      // The service module owns this strict envelope schema:
      // { overrides: [...] } with additionalProperties: false.
      validate(screenEntryOverrideReplaceSchema, ctx.body ?? {});
      const body = normalizeScreenEntryOverrideReplacePayload(ctx.body);
      const actorId = ctx.user?.id;
      if (!actorId) throw new Error("custom_screen_override_invalid");
      const saved = await saveScreenEntryPresentationOverrides({
        screenId: ctx.params.screenId, entryId: ctx.params.entryId,
        overrides: body.overrides,
        actorId,
      });
      return { overrides: saved };
    });
  });
```

Data flow:

- Route validates auth/permission, does minimal coercion, delegates to the
  service, and maps known domain errors to `ApiError`.
- Route validation rejects unknown top-level envelope keys before delegation; the
  service normalizer rejects unknown nested override keys and unsafe paths/values.
- Admin CSRF and read/write rate buckets remain enforced by the shared
  `httpServer.ts` middleware; do not add a one-off `requireCsrf()` route helper.
- No business logic in the route; the service owns normalization and persistence.

Error handling:

- `custom_screen_override_invalid` → 400; `_not_found` → 404; `_conflict` → 409.
- Unknown top-level payload keys are rejected by route validation; unknown nested
  override keys are rejected by the service normalizer. Both surface as 400.

Regression-test shape:

```ts
test("PATCH overrides rejects unknown keys and requires content:write + CSRF", async () => {
  const topLevel = await call("PATCH", overridesUrl, { overrides: [], bogus: true }, writerSession);
  expect(topLevel.status).toBe(400);
  const res = await call("PATCH", overridesUrl, { overrides: [{ blockId: "b", propPath: "image", value: "m", bogus: 1 }] }, writerSession);
  expect(res.status).toBe(400);
  const denied = await call("PATCH", overridesUrl, validBody, readerSession);
  expect(denied.status).toBe(403);
});
```

## Security Contract

- **Endpoint visibility:** **internal** admin only (`/admin/api/*`). No public
  write path in this task.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for reads; `content:write` for writes; preserve any
  stronger screen/entry permissions from TASK-468 follow-ups.
- **CSRF expectations:** required for all override write routes via the existing
  global admin CSRF middleware (`X-CSRF-Token`).
- **Rate-limit bucket:** existing admin write bucket for mutations; admin read
  bucket for reads.
- **Reject unknown validation:** required at the route+service boundary for
  payloads, targets, prop paths, and values.
- **Anti-abuse controls:** no public write path; if public writes are later
  added, require nonce + HMAC/signature and optional reCAPTCHA.
- **Secret handling:** routes must not echo credentials/CSRF tokens/protected
  values; only normalized override records are returned.

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Security: run Semgrep/Trivy/Gitleaks per `_docs/SECURITY_SPEC.md` when feasible
  (route + write-path change) or note CI-only.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md` (override route contract).
- `_docs/SECURITY_SPEC.md` cross-check if a new write bucket is introduced.

## Acceptance Criteria

1. Internal admin routes read and replace per-record overrides, delegating to the
   TASK-473-01 service.
2. Writes enforce `content:write` + CSRF; reads enforce `content:read`; unknown
   keys are rejected with machine-readable errors.
3. Route registration, validation, RBAC, and `map*Error` tests pass.
4. lint and types are green.
