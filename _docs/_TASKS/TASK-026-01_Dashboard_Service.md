# TASK-026-01: Dashboard Service
# FileName: TASK-026-01_Dashboard_Service.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002, TASK-003, TASK-005, TASK-014  
**Status:** To Do  

---

## Overview

Agregacja danych do Dashboardu w jednym serwisie. Dane mają pochodzić
z istniejących tabel (pages, content entries, media, audit logs).

---

## Contract

```ts
type DashboardStats = {
  totals: {
    pages: number;
    entries: number;
    media: number;
    users: number;
  };
  recentEdits: Array<{
    id: string;
    title: string;
    type: "page" | "entry" | "media";
    updatedAt: string;
    author?: string | null;
  }>;
  storage: {
    usedBytes: number;
    limitBytes: number | null;
    usedPercent: number;
  };
  security: {
    status: "ok" | "warning" | "critical";
    issues: number;
  };
};
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/dashboard/dashboardService.ts` | new | agreguje metryki |
| `core/services/dashboard/dashboardTypes.ts` | new | typy kontraktu |
| `tests/unit/dashboard/dashboardService.test.ts` | new | metryki i edge cases |

**Rules:**
- `recentEdits`: ostatnie 10 zmian (pages + entries + media).
- `security`: proste heurystyki (np. liczba failed logins z audit logs).
- `storage`: suma rozmiarow media z DB.

---

## Testing Requirements

- correct totals
- recentEdits sorted by updatedAt desc
- storage percent is clamped 0..100

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-service.md`
