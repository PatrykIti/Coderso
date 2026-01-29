# TASK-026-02: Dashboard API
# FileName: TASK-026-02_Dashboard_API.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-026-01, TASK-004-05  
**Status:** To Do  

---

## Overview

REST endpoint zwracający dane Dashboardu.

---

## Endpoint

- `GET /admin/api/dashboard`

**Permissions:** `dashboard:read` (lub fallback `admin:read` jeśli brak granularnych permów).

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/dashboardRoutes.ts` | new | GET /dashboard |
| `core/server/routes/index.ts` | update | register routes |
| `tests/integration/routes/dashboard.test.ts` | new | wiring test |

---

## Testing Requirements

- returns 200 + dashboard contract
- rejects without permission

---

## Documentation Updates Required

- `_docs/CMS_API.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-api.md`
