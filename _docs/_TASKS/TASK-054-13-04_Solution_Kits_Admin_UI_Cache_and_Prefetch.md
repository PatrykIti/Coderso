# TASK-054-13-04: Solution Kits Admin UI, Cache, and Prefetch
# FileName: TASK-054-13-04_Solution_Kits_Admin_UI_Cache_and_Prefetch.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-03  
**Status:** To Do

---

## Overview
Dodać ekran Coderso Solution Kits spójny z obecnym stylem admina (WordPress-like) oraz szybkim UX (cache + prefetch + SPA).

## Scope
1. Strona `/admin/coderso/solution-kits`.
2. Grid kart kitów + panel szczegółów.
3. Sekcja AI Plan preview (inputs + wynik).
4. Integracja z local cache, cache bus i admin prefetch.

## Files
- `core/admin/services/solutionKitsClient.ts` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx` (new)
- `core/admin/ui/kits/SolutionKitCard.tsx` (new)
- `core/admin/ui/kits/hooks/useSolutionKits.ts` (new)
- `core/admin/app/AdminApp.tsx` (route)
- `core/admin/services/cachePolicy.ts` (keys)
- `core/admin/utils/adminPrefetch.ts` (prefetch)
- `tests/unit/admin/solutionKitsClient.test.ts` (new)
- `tests/unit/ui/solution-kits-page.test.tsx` (new)

## Pseudocode
```ts
const kits = await listSolutionKitsCached();
const plan = await previewSolutionKitPlan(input);
renderCards(kits);
renderPlan(plan);
```

## Testing Requirements
- UI render: loading + cached data path.
- Client: endpoint calls + cache hits.
- Prefetch: `/coderso/solution-kits` wywołuje preload cache.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (mapa cache/prefetch)

