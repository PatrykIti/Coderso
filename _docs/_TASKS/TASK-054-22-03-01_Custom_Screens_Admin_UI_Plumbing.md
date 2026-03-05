# TASK-054-22-03-01: Custom Screens Admin UI Plumbing
# FileName: TASK-054-22-03-01_Custom_Screens_Admin_UI_Plumbing.md

**Priority:** High  
**Category:** Admin/UI + Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-22-02  
**Status:** Done (2026-03-05)

---

## Overview
Dodac warstwe admin UI plumbing dla custom screens: klient API, cache, routing, nav, prefetch.

## Scope
1. Admin API client dla custom screens z cache + invalidacja.
2. Hook `useCustomScreens` do listy + cache refresh.
3. Cache keys dla list/detail custom screens.
4. Admin routing/aliasy/prefetch dla nowego modulu.
5. Dodac modul do `Coderso` registry + nav.

## Files to Create / Change
- `core/admin/services/customScreensClient.ts` (new)
- `core/admin/ui/custom-screens/hooks/useCustomScreens.ts` (new)
- `core/admin/services/cachePolicy.ts` (add keys)
- `core/admin/utils/adminPrefetch.ts` (custom screens warmup)
- `core/admin/utils/adminPaths.ts` (alias `/custom-screens`)
- `core/admin/ui/navigation/codersoModules.ts` (registry + nav)
- `core/admin/app/AdminApp.tsx` (routes for list/editor)
- `tests/unit/ui/coderso-modules.test.ts` (registry updates)
- `tests/unit/ui/admin-nav.test.tsx` + `tests/unit/ui/admin-shell-nav.test.tsx` (nav snapshot expectations)

## Pseudocode
```ts
const items = await listCustomScreensCached({ force });
return items;
```

## Testing Requirements
- Unit: registry counts + nav includes custom screens.
- Unit: admin UI render smoke for list/editor (covered in 03-02).

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (new module entry)
- `_docs/ARCHITECTURE.md` (Coderso IA update)

## Completion Notes (2026-03-05)
- Added custom screens admin client with cache keys and cache bus invalidation.
- Wired admin routes, nav registry entry, aliases, and prefetch warmup for `/coderso/custom-screens`.
- Updated nav-related unit tests for the new module.
```
