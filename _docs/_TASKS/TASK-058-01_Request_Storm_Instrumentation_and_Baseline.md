# TASK-058-01: Request Storm Instrumentation and Baseline
# FileName: TASK-058-01_Request_Storm_Instrumentation_and_Baseline.md

**Priority:** High  
**Category:** Performance/Observability  
**Estimated Effort:** Medium  
**Dependencies:** TASK-058  
**Status:** To Do

---

## Overview
Wprowadzic lekka instrumentacje requestow admin API, aby miec twarde dane: ile requestow idzie per ekran, per endpoint i per akcja nawigacji.

## Scope
1. Dodac mechanizm debugowy (dev-only) do zliczania requestow z `apiClient`.
2. Dodac agregacje metryk:
   - endpoint,
   - liczba wywolan,
   - okno czasowe,
   - route context.
3. Dodac prosty eksport/debug snapshot (np. `window.__NEXTLESS_ADMIN_NET_DEBUG__`).
4. Spisac baseline dla ekranow krytycznych:
   - `/admin/pages`,
   - `/admin/menus`,
   - `/admin/coderso/entries`.

## Sub-Tasks
1. Dodac collector request metrics (dev-only).
2. Podlaczyc collector pod `apiClient` bez zmiany kontraktu `apiRequest`.
3. Dodac snapshot API dla debugowania i baseline export.
4. Dodac testy jednostkowe i test baseline dla kluczowych ekranow.

## Files to Create / Change
- `core/admin/services/apiClient.ts`
- `core/admin/utils/requestMetrics.ts` (new)
- `tests/unit/admin/request-metrics.test.ts` (new)
- `tests/perf/admin-request-baseline.test.ts` (new)

## Pseudocode
```ts
apiRequest(path, init):
  if (isDev && metricsEnabled):
    metrics.track({ path, method, route: currentAdminRoute() })
  return fetch(...)

requestMetrics.snapshot(windowMs):
  return groupByPathAndRoute(events.filter(ts >= now - windowMs))
```

## Acceptance Criteria
1. Mozna odczytac liczbe requestow per endpoint i route.
2. Mamy baseline test/perf dla krytycznych ekranow.
3. Instrumentacja nie zmienia runtime behavior produkcyjnego.

## Testing Requirements
- Unit: tracking i agregacja metryk dziala deterministycznie.
- Perf: baseline test zapisuje budzet dla route transitions.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (sekcja "Diagnostics & Baselines")
