# TASK-249-01-02: Routes, Clients, Cache, Nav, and Assistant Canonicalization
# FileName: TASK-249-01-02_Routes_Clients_Cache_Nav_and_Assistant_Canonicalization.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin Routing + Client Cache
**Estimated Effort:** Large
**Dependencies:** TASK-249-01-01
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Synchronize every route and client seam around the hard-cut workspace flow so
the admin always treats Custom Screens as `records list -> record editor`.

This leaf owns canonicalization on the admin/client/navigation side. The shared
`contentEntryRoutes.ts` seam remains generic content-entry CRUD and error
mapping; include it only where preserving centralized `mapContentEntryError`
coverage or route registration coverage requires it.

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/routes/customScreenRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts` only if shared error mapping or
  route-registration coverage must change
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/entriesClient.ts`
- `core/admin/ui/custom-screens/routeParams.ts`
- `core/admin/app/AdminApp.tsx`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `tests/vitest/admin/customScreensClient.test.ts`
- `tests/vitest/ui/custom-screen-route-params.test.ts`
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Route and Client Requirements

- `/admin/advanced/custom-screens/:screenId/entries` is the canonical list route.
- `/admin/advanced/custom-screens/:screenId/entries/new` is the canonical create
  route.
- `/admin/advanced/custom-screens/:screenId/entries/:entryId` is the canonical
  record editor route.
- Sidebar shortcuts always point to the list route.
- Prefetch and assistant context follow those same canonical routes.
- `customScreensClient` stops parsing legacy capability modes for active V3
  screens.
- Entry error mapping stays centralized in the shared content-entry route seam.

## Implementation Pseudocode

```ts
// routeParams.ts remains the owner of the workspace path builder.
export const buildCustomScreenWorkspacePath = (input) => { ... };
```

```ts
function normalizeCustomScreenRecord(item: CustomScreenRecord) {
  const definition = normalizeCustomScreenDefinitionForRead(item);
  return {
    ...item,
    definition,
    schemaVersion: definition.schemaVersion,
    blocks: definition.editorView.blocks,
    bindings: definition.editorView.bindings,
  };
}
```

```ts
function buildCustomScreenShortcutNavItem(basePath: string, screen: CustomScreenRecord) {
  return {
    id: screen.id,
    label: screen.sidebarLabel ?? screen.name,
    href: buildCustomScreenWorkspaceHref(basePath, { screenId: screen.id }),
  };
}
```

```ts
function prefetchCustomScreenWorkspace(basePath: string, screenId: string, entryId?: string) {
  return prefetchAdminRoute(
    buildCustomScreenWorkspaceHref(basePath, {
      screenId,
      entryId,
    })
  );
}
```

## Security Contract

- Visibility: internal admin UI and internal admin API only.
- Auth model: authenticated admin session.
- RBAC:
  - route access and writes remain gated by existing `content:*` permissions.
- CSRF:
  - unchanged current CSRF-backed clients.
- Rate-limit bucket:
  - existing admin read/write buckets.
- Reject-unknown validation:
  - custom screen routes validate only V3-compatible payloads on write,
  - entry routes retain machine-readable error mapping and reject unknown
    payload keys.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest/integration:
  - route helpers emit only canonical list/new/entry routes,
  - nav shortcuts and prefetch target the canonical workspace list route,
  - assistant active-surface context resolves the same canonical resources,
  - client cache normalization no longer depends on capability-mode parsing,
  - `customScreenRoutes` registration and `mapCustomScreenError` coverage stay
    explicit if the route family changes,
  - `mapContentEntryError` coverage stays explicit if the shared content-entry
    seam changes,
  - content-entry route error details remain available to the new editor UI.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Navigation, prefetch, route helpers, and assistant context all point to one
   canonical workspace flow.
2. Custom Screen client records no longer expose legacy capability modes as an
   active-path requirement.
3. Shared entry route errors remain reusable by the new editor UI.
