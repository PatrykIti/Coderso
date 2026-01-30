# TASK-082-01: Analytics Service
# FileName: TASK-082-01_Analytics_Service.md

**Priority:** Medium  
**Category:** CMS/Analytics  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Implement analytics service that aggregates existing DB data for KPIs and top content.

## Service API

Create `core/services/analytics/analyticsService.ts`:

- `getAnalyticsOverview(rangeDays: number)`
  - counts: total pages, published pages, entries, media, users
  - simple trend arrays (last N days) using `createdAt`

- `getTopContent(limit: number, type?: "page" | "entry")`
  - return most recently updated items (v1 proxy for popularity)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/analytics/analyticsService.ts` | data aggregation |
| `core/services/analytics/analyticsTypes.ts` | shared response types |
| `tests/unit/analytics/analyticsService.test.ts` | KPIs + top content |

## Testing Requirements

- Verify counts return numeric values.
- Ensure `limit` is respected.

## Documentation Updates Required

- `_docs/CMS_API.md` describe metrics meaning (v1 = DB counts).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-analytics-service.md`
