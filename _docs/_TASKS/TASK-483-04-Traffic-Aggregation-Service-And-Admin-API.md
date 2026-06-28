# TASK-483-04: Traffic Aggregation Service And Admin API
# FileName: TASK-483-04-Traffic-Aggregation-Service-And-Admin-API.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Services / Admin API
**Estimated Effort:** Large
**Dependencies:** TASK-483-01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

Compute real traffic metrics from the ingested rows: pageviews, unique visitors,
sessions, bounce rate, traffic sources, devices, referrers, and a **real**
top-pages-by-views ranking that replaces the synthetic `computeScore`. Expose the
results through new internal `/admin/api/analytics/traffic*` endpoints with strict
validation and `map*Error` mapping, and keep a CSV export consistent with the
existing `top-content/export` affordance.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-04-L01 | Traffic Aggregation Contract And Types | Medium | ⏳ To Do |
| TASK-483-04-L02 | Aggregation Queries Replacing computeScore | Large | ⏳ To Do |
| TASK-483-04-L03 | Traffic Analytics Admin API And CSV Export | Medium | ⏳ To Do |

## Dependencies

- TASK-483-01 (tables + repository readers). May start once 01 lands. L02
  depends on L01; L03 depends on L02.

## Testing Requirements

- **Vitest** for L01 (types/normalizers) and the CSV serializer in L03 (pure).
- **Bun** for L02 (DB-backed aggregation queries with scoped fixtures) and L03
  route integration (`tests/integration/routes/*`) including `map*Error`
  coverage and unknown-query rejection.
- DB suites: `set -a && source .env && set +a`, scoped fixtures, owned-row cleanup.
