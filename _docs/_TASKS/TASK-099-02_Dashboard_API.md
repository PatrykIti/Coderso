# TASK-099-02: Dashboard API
# FileName: TASK-099-02_Dashboard_API.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-099-01, TASK-004-05, TASK-099  
**Status:** To Do  

---

## Overview

REST endpoint zwracajacy payload dashboardu agregowany przez `dashboardService`.
Endpoint ma byc prosty (single read), bez query params na MVP.

---

## Endpoint

- `GET /dashboard` (runtime path; finalnie wywolywany jako `/admin/api/dashboard`)

**Permission strategy (MVP):**
- uzyj `content:read` (zgodnie z obecnym modelem RBAC, bez nowej migracji permission catalog),
- nowy granularny `dashboard:read` mozna dodac pozniej poza `TASK-099`.

---

## Response Shape

```ts
type DashboardApiResponse = DashboardPayload;
```

Brak envelope `data` na MVP (spojne z istniejacymi endpointami read-only).

---

## Pseudo-Implementation

```ts
// core/server/routes/dashboardRoutes.ts
import { getDashboardData } from "../../services/dashboard/dashboardService";

export function registerDashboardRoutes(router: Router, deps: DashboardRouteDeps) {
  router.get("/dashboard", deps.requirePermission("content:read"), async () => {
    return getDashboardData();
  });
}
```

```ts
// core/server/routes/index.ts
import { registerDashboardRoutes } from "./dashboardRoutes";
// ...
registerDashboardRoutes(router, {
  requirePermission: deps.requirePermission,
});
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/dashboardRoutes.ts` | new | endpoint `GET /dashboard` |
| `core/server/routes/index.ts` | update | register `registerDashboardRoutes` |
| `tests/integration/routes/dashboard.test.ts` | new | route wiring + path assertion |

---

## Testing Requirements

Integration test checklist:
- `registerDashboardRoutes` rejestruje `GET /dashboard`,
- route ma handler permission middleware + route handler,
- basic contract smoke test (response object shape) przez stub service.

Suggested command:
- `bun test tests/integration/routes/dashboard.test.ts`

---

## Documentation Updates Required

- `_docs/CMS_API.md` (`GET /dashboard` contract + permission + error mapping)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-api.md`
