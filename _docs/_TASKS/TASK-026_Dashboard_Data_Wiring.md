# TASK-026: Dashboard Data Wiring (Functional)
# FileName: TASK-026_Dashboard_Data_Wiring.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-006-01, TASK-002, TASK-004, TASK-005, TASK-014, TASK-020  
**Status:** To Do

---

## Overview

Podlaczenie Dashboard UI do realnych danych: statystyki, ostatnie edycje,
storage usage, stan security. Dodaj endpoint backendowy i serwis agregujacy.

**Goals:**
- `GET /admin/api/dashboard` zwraca metryki.
- Dashboard UI renderuje dane z API (loading + error states).
- Lista ostatnich edycji bazuje na pages/content/media.

---

## Architecture

```
core/services/dashboard/
  dashboardService.ts
core/server/routes/
  dashboardRoutes.ts
core/admin/services/
  dashboardClient.ts
core/admin/ui/dashboard/
  DashboardPage.tsx

tests/unit/dashboard/
  dashboardService.test.ts
tests/integration/routes/
  dashboard.test.ts
tests/integration/ui/
  dashboard.test.tsx
```

---

## Sub-Tasks

### TASK-026-01_Dashboard_service

**Status:** To Do

- Agreguj statystyki z pages/content/media/users.
- Wykorzystaj istniejące serwisy (pageService, contentService, mediaService).
- Zwracaj spójny kontrakt `DashboardStats`.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/dashboard/dashboardService.ts` | agregacja metryk |

Contract sketch:

```ts
type DashboardStats = {
  totals: { pages: number; entries: number; media: number; users: number };
  recentEdits: Array<{ id: string; title: string; type: string; updatedAt: string }>;
  storage: { usedPercent: number };
  security: { status: "ok" | "warning" | "critical"; issues: number };
};
```

---

### TASK-026-02_Dashboard_route

**Status:** To Do

- Dodaj route `/admin/api/dashboard`.
- Zabezpiecz przez auth + RBAC (`dashboard:read` lub `admin:read`).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/dashboardRoutes.ts` | GET /dashboard |
| `core/server/routes/index.ts` | rejestracja routa |

---

### TASK-026-03_Dashboard_UI_wiring

**Status:** To Do

- Dodaj `dashboardClient` (fetch + error handling).
- DashboardPage przyjmuje dane przez props lub hook.
- Dodaj loading/error states (placeholder).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/services/dashboardClient.ts` | fetch `GET /admin/api/dashboard` |
| `core/admin/ui/dashboard/DashboardPage.tsx` | render real data |

---

## Testing Requirements

- [ ] `tests/unit/dashboard/dashboardService.test.ts` agregacja metryk.
- [ ] `tests/integration/routes/dashboard.test.ts` endpoint zwraca kontrakt.
- [ ] `tests/integration/ui/dashboard.test.tsx` renderuje real data.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (dashboard endpoint).
- `_docs/CMS_SPEC.md` (dashboard metrics list).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-data-wiring.md`
- Notes: dashboard data API + UI wiring.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md`
