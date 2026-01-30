# TASK-028-02: Analytics API Routes
# FileName: TASK-028-02_Analytics_API_Routes.md

**Priority:** Medium  
**Category:** CMS/Analytics  
**Estimated Effort:** Medium  
**Dependencies:** TASK-028-01, TASK-020  
**Status:** Done (2026-01-30)

---

## Overview

Expose analytics data via admin API.

## Routes

Add `core/server/routes/analyticsRoutes.ts` and register it in `routes/index.ts`:

- `GET /analytics/overview?rangeDays=30`
- `GET /analytics/top-content?limit=10&type=page`

## Validation

Add `core/server/validation/analyticsSchemas.ts`:

- `overviewQuerySchema` (rangeDays 1–365)
- `topContentQuerySchema` (limit 1–50, optional type)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/analyticsRoutes.ts` | endpoints |
| `core/server/validation/analyticsSchemas.ts` | query validation |
| `tests/integration/routes/analytics.test.ts` | routes registered |

## Documentation Updates Required

- `_docs/CMS_API.md` add analytics endpoints + response examples.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-analytics-api.md`
