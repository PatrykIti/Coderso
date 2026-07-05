# TASK-483-04: Traffic Aggregation Service And Admin API
# FileName: TASK-483-04-Traffic-Aggregation-Service-And-Admin-API.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Services / Admin API
**Estimated Effort:** Large
**Dependencies:** TASK-483-01, TASK-483-02, TASK-483-03 (pinned strictly sequential land order)
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

Compute real traffic metrics from the ingested rows: pageviews, unique visitors,
sessions, bounce rate, traffic sources, devices, referrers, and a **real**
top-pages-by-views ranking that replaces the synthetic `computeScore`. Expose the
results through new internal `/admin/api/analytics/traffic*` endpoints with strict
validation and `map*Error` mapping, and keep a CSV export consistent with the
existing `top-content/export` affordance.

## Security Contract

This subtask adds **internal admin read** API surface only; the operative,
op-level Security Contract lives in **TASK-483-04-L03** (L01/L02 add no new route
surface — L01 is pure types/normalizers, L02 is DB-backed aggregation queries).
Summary contract for the surface, consistent with the stream-level Security
Contract in the parent (`TASK-483_Real_Web_Analytics_Pipeline.md`):

- **Endpoint visibility:** **internal** `/admin/api/analytics/traffic/*` (GET
  reads only), registered through `registerAnalyticsRoutes`
  (`core/server/routes/analyticsRoutes.ts`) exactly like the existing
  overview/top-content routes.
- **Auth model:** authenticated admin session (same as existing analytics routes).
- **RBAC:** `requirePermission("content:read")` per op — reuses the existing
  analytics read permission; no new permission invented.
- **CSRF:** N/A — all new endpoints are GET reads; no mutations added.
- **Rate-limit bucket:** existing `admin_read`; authenticated requests bypass per
  current policy.
- **Strict validation:** JSON schemas in `analyticsSchemas.ts` with
  `additionalProperties: false`; unknown query keys are rejected via the existing
  `assertKnownQuery` helper (detail + schema shapes in L03).
- **Error boundary:** handlers stay orchestration-only with `map*Error` at the
  boundary — L03 ADDS a module-local `withAnalyticsErrors` wrapper (mirroring
  `withContentEntryErrors`) because `analyticsRoutes.ts` has no ambient error
  boundary today; it re-throws `ApiError` and maps plain errors via
  `mapAnalyticsError` (landed first by TASK-483-02-L02, same file).
- **Secret/PII handling:** responses and CSV expose only aggregate counts +
  path/host strings; never `visitor_hash`. CSV cells pass the existing
  `escapeCsvCell` formula-injection guard.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-04-L01 | Traffic Aggregation Contract And Types | Medium | ✅ Done |
| TASK-483-04-L02 | Aggregation Queries Replacing computeScore | Large | ✅ Done |
| TASK-483-04-L03 | Traffic Analytics Admin API And CSV Export | Medium | ✅ Done |

## Dependencies

- TASK-483-01 (tables + repository readers) is the material data dependency,
  but 04 starts **only after TASK-483-03 lands** — the pinned land order is
  01 → 02 → 03 → 04 → 05 → 06, strictly sequential, single writer per source
  file. Concretely, TASK-483-04-L03 EXTENDS the shared `mapAnalyticsError`
  that TASK-483-02-L02 lands first in `core/server/routes/analyticsRoutes.ts`
  (same source file); starting 04 before 02 has fully landed would collide on
  that file or force a duplicate declaration.
- L02 depends on L01; L03 depends on L02 (and on TASK-483-02-L02 having
  landed `mapAnalyticsError`).

## Testing Requirements

- **Bun** (`tests/unit/analytics/*`) for L01 normalizers and the L03 CSV
  serializer: both are pure functions but they live in
  `trafficAggregationService.ts`, which imports `db/client`
  (`core/db/client.ts` throws without `DATABASE_URL` and opens a `postgres()`
  pool at import), so importing that module for unit checks belongs to the Bun
  lane — matching the existing `serializeTopContentCsv` precedent in the
  db/client-coupled `analyticsService.ts` (a pure function tested in the Bun lane
  at `tests/unit/analytics/analyticsService.test.ts:142` precisely because
  importing that module pulls in `db/client`, which throws without
  `DATABASE_URL`), NOT Vitest. Type-shape
  correctness for L01 is enforced by `lint:types`.
- **Bun** for L02 (DB-backed aggregation queries with scoped fixtures, at
  `tests/integration/analytics/trafficAggregation.test.ts` — the directory is
  added to the `test:bun` glob by TASK-483-01-L02, which lands first) and L03 route
  integration (`tests/integration/routes/*`) including `map*Error` coverage and
  unknown-query rejection.
- DB suites: `set -a && source .env && set +a`, scoped fixtures anchored to a
  per-run unique historical time window, owned-row cleanup only — never
  truncate shared tables or assume global emptiness (shared remote test DB).
