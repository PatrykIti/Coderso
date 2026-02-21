# TASK-058-04: Admin Prefetch Policy Rework and Request Budgeting
# FileName: TASK-058-04_Admin_Prefetch_Policy_Rework_and_Request_Budgeting.md

**Priority:** High  
**Category:** Performance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-058-02  
**Status:** Done (2026-02-21)

---

## Overview
Przebudowac prefetch tak, aby byl przewidywalny i tani: prefetch ma ogrzewac cache, nie odswiezac na sile i nie konkurowac z aktywnym ekranem.

## Scope
1. Zmienic `adminPrefetch` default na `force: false` dla route warmup.
2. Pominac prefetch dla aktywnej trasy oraz dla tras juz "fresh" (TTL/cooldown).
3. Dodac limit rownoleglych prefetchy i kolejke low-priority.
4. Utrzymac trigger tylko na intencji usera (`hover/focus`) + cooldown.
5. Dodac per-route request budget i testy regresyjne.

## Sub-Tasks
1. Zmienic prefetch entries na `force: false`.
2. Dodac skip dla aktywnej trasy i "fresh" cache.
3. Dodac limit rownoleglych prefetchy + cooldown.
4. Dodac testy budzetu i polityki prefetch.

## Files to Create / Change
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/ui/contexts/AdminRouterContext.tsx`
- `core/admin/ui/shared/AdminLink.tsx`
- `tests/unit/admin/admin-prefetch-policy.test.ts` (new)
- `tests/perf/admin-prefetch-budget.test.ts` (new)

## Pseudocode
```ts
prefetchRoute(href):
  if (href is activeRoute) return
  if (isFresh(matchKey)) return
  scheduleLowPriority(() => entry.run({ force: false }))

entry.run():
  return listCached({ force: false })
```

## Acceptance Criteria
1. Prefetch nie powoduje burst requestow przy samym poruszaniu myszka po sidebarze.
2. Prefetch nie wymusza stale `force: true`.
3. Przejscia pozostaja szybkie (cache warm), ale API jest odciazone.

## Testing Requirements
- Unit: active-route skip, cooldown, force policy.
- Perf: liczba requestow z prefetch miesci sie w budzecie.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (prefetch policy + budgets)
- `_docs/ARCHITECTURE.md` (prefetch as cache warmup pattern)

## Completion Notes (2026-02-21)
- Reworked `core/admin/utils/adminPrefetch.ts`:
  - prefetch defaults to cache warmup (`prefetchWarmupOptions = { force: false }`),
  - added active-route/module skip (`activeHref` support),
  - added fresh-window (`freshMs`) + cooldown throttling,
  - added low-priority queue with max concurrency (`maxConcurrency`),
  - retained canonical route matching/legacy alias behavior.
- Updated `core/admin/ui/contexts/AdminRouterContext.tsx` to pass current route to prefetch (`activeHref: path`).
- Added prefetch policy and budget tests:
  - `tests/unit/admin/admin-prefetch-policy.test.ts`
  - `tests/perf/admin-prefetch-budget.test.ts`
- Documentation synced:
  - `_docs/ADMIN_CACHE.md`
  - `_docs/ARCHITECTURE.md`
- Verified checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/admin/adminPrefetch.test.ts tests/unit/admin/admin-prefetch-policy.test.ts tests/perf/admin-prefetch-budget.test.ts`
