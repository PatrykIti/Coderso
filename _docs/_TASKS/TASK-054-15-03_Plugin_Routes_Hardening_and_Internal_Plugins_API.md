# TASK-054-15-03: Plugin Routes Hardening and Internal Plugins API
# FileName: TASK-054-15-03_Plugin_Routes_Hardening_and_Internal_Plugins_API.md

**Priority:** High  
**Category:** Core/API + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-15-02  
**Status:** Done (2026-02-20)

---

## Overview
Uszczelnić rejestrację tras pluginów i dodać internal endpoints do walidacji/inspekcji manifestu.

## Scope
1. Dodać `core/server/routes/pluginsRoutes.ts`:
   - `GET /plugins` (installed + contributions summary),
   - `POST /plugins/manifest/validate` (dry-run validation payloadu).
2. Podpiąć route do `core/server/routes/index.ts`.
3. Wzmocnić `sdkRuntime.routes.register`:
   - path restrictions (plugin scope only),
   - write methods wymagają jawnego `permission`.

## Security Contract
- **Visibility:** internal (`/admin/api/plugins*`).
- **Auth path:** session + RBAC (`plugins:read` / `plugins:manage`).
- **Rate-limit bucket:** `admin_read` for `GET`, `admin_write` for `POST`.
- **Anti-abuse:** brak publicznych endpointów; strict payload validation w `POST /plugins/manifest/validate`; route path normalization blokuje scope escape.

## Files
- `core/server/routes/pluginsRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/plugins/sdkRuntime.ts`
- `tests/integration/routes/pluginsRoutes.test.ts` (new)

## Pseudocode
```ts
router.get("/plugins", requirePermission("plugins:read"), async () => listPluginsSummary());

router.post(
  "/plugins/manifest/validate",
  requirePermission("plugins:manage"),
  async (ctx) => validatePluginManifest(ctx.body)
);

routes.register(input) {
  assertPluginRoutePath(input.path);
  if (isWriteMethod(input.method) && !input.permission) {
    throw new Error("plugin_route_permission_required");
  }
  // existing declared-permission check remains
}
```

## Testing Requirements
- Integration: routes are registered with expected RBAC guards.
- Unit: route registration rejects write method without permission.
- Unit: invalid plugin path escapes are rejected.

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md`

## Completion Notes (2026-02-20)
- Added internal plugins routes:
  - `GET /plugins`
  - `POST /plugins/manifest/validate`
- Hardened SDK route registration:
  - safe path normalization and scoped runtime paths,
  - write methods require explicit permission,
  - declared route enforcement for manifest-declared routes.
- Wired route registration into route index and covered with integration tests.
