# TASK-026-03: Dashboard UI Wiring
# FileName: TASK-026-03_Dashboard_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-026-02, TASK-006-01  
**Status:** To Do  

---

## Overview

Podlaczenie Dashboard UI do realnego API. UI powinno renderowac
loading/error states i w pełni korzystac z danych z `/admin/api/dashboard`.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/dashboardClient.ts` | new | GET /dashboard |
| `core/admin/ui/dashboard/DashboardPage.tsx` | update | use API data |
| `tests/unit/admin/dashboardClient.test.ts` | new | endpoint tests |
| `tests/integration/ui/dashboard.test.tsx` | update | render with data |

**UI behavior:**
- skeletons while loading
- error banner when API fails
- cards map to `DashboardStats.totals`
- recent edits list uses API data

---

## Testing Requirements

- DashboardPage renders totals + recent edits
- DashboardPage handles error

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-ui-wiring.md`
