# TASK-058: Admin Cache, Prefetch, and Request Stability
# FileName: TASK-058_Admin_Cache_Prefetch_Request_Stability.md

**Priority:** High  
**Category:** Performance/UX Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-053-07, TASK-053-08  
**Status:** Done (2026-02-21)

---

## Overview
Ustabilizowac warstwe cache + prefetch w Admin UI tak, aby wyeliminowac petle fetchy, ograniczyc duplikaty requestow i utrzymac "WordPress-like" szybkie przejscia bez niepotrzebnego odpytywania API.

## Architecture Rules (Clean Architecture)
1. Dane i polityka odswiezania pozostaja w warstwie `services`/`utils`, nie w komponentach widoku.
2. Komponenty `ui/*` tylko orkiestruja stan ekranu i wywoluja jawne akcje (`refresh`, `prefetch`, `invalidate`).
3. Cache musi byc deterministiczny:
   - klucz,
   - TTL,
   - in-flight dedupe,
   - jasne trigger points invalidacji.
4. Prefetch nie moze wymuszac `force: true` bez uzasadnienia biznesowego.
5. "Global reads" (np. `status`, `user-settings`, `theme profiles`) musza miec wspolna strategie dedupe i budzet wywolan.

## Existing Point Fix Reconciliation
1. `core/admin/utils/cacheRefresh.ts` pozostaje tymczasowo i jest traktowany jako helper przejsciowy.
2. W `TASK-058-03` helper jest albo:
   - utrzymany jako standardowy utility (jesli faktycznie redukuje duplikacje), albo
   - usuniety, jezeli finalny flow refresh nie bedzie go potrzebowal.
3. Kazdy punktowy fix wykonany przed TASK-058 (np. Pages/Menus/Widget Template refresh) musi byc:
   - zweryfikowany metrykami z `TASK-058-01`,
   - zmergowany do finalnej polityki,
   - albo usuniety jako dead path.

## Scope
1. Wprowadzic diagnostyke request storm (baseline + metryki).
2. Dodac deduplikacje i cache dla globalnych odczytow admina.
3. Naprawic strategie hydration/refresh w `pages` i `menus`.
4. Zmienic polityke prefetch na "cache warmup", nie "forced refetch".
5. Ograniczyc globalne requesty odpalane przy kazdym mount/nawigacji.
6. Zamknac temat testami, dokumentacja i wpisami do changelogu.

## Sub-Tasks
- `TASK-058-01`: Request Storm Instrumentation and Baseline
- `TASK-058-02`: Shared Dedupe Cache for Global Admin Reads
- `TASK-058-03`: Pages/Menus Hydration and Force Refresh Policy
- `TASK-058-04`: Prefetch Policy Rework and Request Budgeting
- `TASK-058-05`: Admin Shell Global Request Minimization
- `TASK-058-06`: Regression Tests, Docs, Changelog, and Closure

## Implementation Order
1. `058-01` (pomiar + baseline)
2. `058-02` (fundament dedupe)
3. `058-03` + `058-04` (najwieksze zrodla petli i nadmiarowych fetchy)
4. `058-05` (global topbar/shell)
5. `058-06` (pelna walidacja i dokumentacja)

## Testing Requirements
- Unit:
  - dedupe cache (`hit/miss/inFlight/ttl/invalidacja`),
  - prefetch scheduler (`cooldown`, `active route skip`, `force policy`).
- Integration UI:
  - `pages` i `menus` bez petli requestow,
  - brak wielokrotnych fetchy przy zwyklym przejsciu miedzy ekranami.
- Perf gate:
  - budzet request count per route transition,
  - budzet dla globalnych endpointow (`status`, `user-settings`, `admin-theme-profiles`, `me`).

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Completion Notes (2026-02-21)
- TASK-058-01..06 were completed and validated end-to-end.
- Finalized architecture outcomes:
  - request-storm instrumentation + baseline perf gates,
  - shared read-through dedupe cache for global admin reads,
  - pages/menus hydration refresh policy without mount-force loops,
  - prefetch strategy switched to cache warmup with route-aware throttling,
  - shell/global reads minimized (`/auth/me`, assistant runtime, admin theme profiles).
- Final closure checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`
- Result confirms no request-loop regressions in the covered admin flows and a stable cache/prefetch contract for future modules.
