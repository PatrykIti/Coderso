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

## Sub-Tasks (detailed)

- `TASK-026-01_Dashboard_Service.md`
- `TASK-026-02_Dashboard_API.md`
- `TASK-026-03_Dashboard_UI_Wiring.md`

Kazdy sub-task zawiera szczegolowe checklisty, przyklady i testy.
