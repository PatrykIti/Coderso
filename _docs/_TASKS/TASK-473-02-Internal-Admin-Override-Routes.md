# TASK-473-02: Internal Admin Override Routes
# FileName: TASK-473-02-Internal-Admin-Override-Routes.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Custom Screens / Routes / Entry Presentation
**Estimated Effort:** Medium
**Dependencies:** TASK-473-01
**Status:** ⏳ To Do

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

- [ ] Add internal admin routes: read overrides + replace overrides for
  `(screenId, entryId)` (or extend the existing entry-screen route group).
- [ ] Enforce RBAC (`content:read` / `content:write`) and CSRF for writes.
- [ ] Validate payloads with reject-unknown; delegate to the service.
- [ ] Map `custom_screen_override_*` domain errors to `ApiError` via a centralized
  `map*Error` helper.
- [ ] Add route registration + `map*Error` + RBAC integration tests (Bun lane).

## Files To Change

| File | Required change |
|---|---|
| `core/server/routes/customScreenRoutes.ts` | Add/extend override read+write routes, RBAC, CSRF, error mapping. |
| `core/services/customScreens/screenEntryPresentationOverrides.ts` | Consume service + error map (from TASK-473-01). |
| `tests/integration/routes/customScreenRoutes.test.ts` | Route registration, validation, RBAC, CSRF, `map*Error`. |

## Implementation Pseudocode

```ts
// customScreenRoutes.ts (orchestration-only)
router.get("/admin/api/custom-screens/:screenId/entries/:entryId/overrides",
  requirePermission("content:read"),
  async (ctx) => json(await getScreenEntryPresentationOverrides(ctx.params.screenId, ctx.params.entryId)));

router.put("/admin/api/custom-screens/:screenId/entries/:entryId/overrides",
  requirePermission("content:write"), requireCsrf(),
  async (ctx) => {
    try {
      const body = parseJson(ctx); // reject-unknown happens in the normalizer
      const saved = await saveScreenEntryPresentationOverrides({
        screenId: ctx.params.screenId, entryId: ctx.params.entryId,
        overrides: body.overrides, actorId: ctx.session.userId,
      });
      return json(saved);
    } catch (err) { throw mapCustomScreenOverrideError(err); }
  });
```

Data flow:

- Route validates auth/permission/CSRF, does minimal coercion, delegates to the
  service, and maps known domain errors to `ApiError`.
- No business logic in the route; the service owns normalization and persistence.

Error handling:

- `custom_screen_override_invalid` → 400; `_not_found` → 404; `_conflict` → 409.
- Unknown payload keys are rejected by the normalizer and surfaced as 400.

Regression-test shape:

```ts
test("PUT overrides rejects unknown keys and requires content:write + CSRF", async () => {
  const res = await call("PUT", overridesUrl, { overrides: [{ blockId: "b", propPath: "image", value: "m", bogus: 1 }] }, writerSession);
  expect(res.status).toBe(400);
  const denied = await call("PUT", overridesUrl, validBody, readerSession);
  expect(denied.status).toBe(403);
});
```

## Security Contract

- **Endpoint visibility:** **internal** admin only (`/admin/api/*`). No public
  write path in this task.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for reads; `content:write` for writes; preserve any
  stronger screen/entry permissions from TASK-468 follow-ups.
- **CSRF expectations:** required for all override write routes.
- **Rate-limit bucket:** existing admin write bucket for mutations; admin read
  bucket for reads.
- **Reject unknown validation:** required at the route+service boundary for
  payloads, targets, prop paths, and values.
- **Anti-abuse controls:** no public write path; if public writes are later
  added, require nonce + HMAC/signature and optional reCAPTCHA.
- **Secret handling:** routes must not echo credentials/CSRF tokens/protected
  values; only normalized override records are returned.

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/integration/routes/customScreenRoutes.test.ts`
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
