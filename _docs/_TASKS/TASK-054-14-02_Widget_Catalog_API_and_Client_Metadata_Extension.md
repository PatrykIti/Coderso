# TASK-054-14-02: Widget Catalog API and Client Metadata Extension
# FileName: TASK-054-14-02_Widget_Catalog_API_and_Client_Metadata_Extension.md

**Priority:** High  
**Category:** API + Admin Client  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-14-01  
**Status:** Done (2026-02-20)

---

## Overview
Rozszerzyć `/widgets` catalog payload o metadata composite-first i zsynchronizować kontrakt klienta admina.

## Scope
1. Dodać metadata pola do `WidgetCatalogItem`.
2. Zmapować metadata dla core/template items.
3. Utrzymać kompatybilność cache/localStorage.

## Security Contract
- **Visibility:** internal (`GET /admin/api/widgets`).
- **Auth path:** session + RBAC `widgets:read`.
- **Rate-limit bucket:** `admin_read`.
- **Abuse surface:** read-only metadata payload; brak publicznych endpointów.

## Files
- `core/services/widgets/widgetCatalogService.ts`
- `core/server/routes/widgetRoutes.ts` (contract only)
- `core/admin/services/widgetsClient.ts`
- `tests/unit/widgets/widgetCatalogService.test.ts`
- `tests/unit/admin/widgetsClient.test.ts`

## Pseudocode
```ts
type WidgetCatalogItem = {
  complexity: "composite" | "atomic";
  audience: "beginner" | "intermediate" | "advanced";
  module: string;
  presets: Array<{ id: string; label: string; description?: string }>;
  requires: string[];
}
```

## Testing Requirements
- Unit: catalog payload contains metadata for both `core` and `template`.
- Unit: client cache hydration supports extended shape.

## Documentation Updates Required
- `_docs/CMS_API.md` (widgets catalog shape)

## Completion Notes (2026-02-20)
- Extended catalog payload and admin client contract with metadata:
  - `complexity`, `audience`, `module`, `presets`, `requires`.
- Preserved backward compatibility via deterministic fallback mapping for legacy defs.
