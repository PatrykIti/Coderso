# TASK-491-04: Real integration health checks + admin UI + docs
# FileName: TASK-491-04-Health-Checks-And-UI.md

**Parent Task:** TASK-491
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Medium
**Dependencies:** TASK-491-01, TASK-491-02, TASK-491-03
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Replace the always-`healthy` display with a real per-integration health check.
Today `toSummary` in `core/services/integrations/integrationsService.ts` sets
`healthStatus` to `"healthy"` for any connected integration regardless of whether
the credential works (`row?.healthStatus ?? (status === "connected" ? "healthy"
: "unknown")`). This subtask adds a deterministic health evaluator, a manual
"Test connection" endpoint that persists the result to the existing
`healthStatus / lastCheckedAt / lastError` columns, stops the cosmetic
`healthy` default, and surfaces real status (plus a refresh action) in the admin
UI. Documentation is updated here as the closing leaf.

### Leaves

| ID              | Title                                  | Effort | Status   |
| --------------- | -------------------------------------- | ------ | -------- |
| TASK-491-04-L01 | Integration health service + check route | Medium | ⏳ To Do |
| TASK-491-04-L02 | Health UI surface + docs                 | Small  | ⏳ To Do |

---

## Dependencies

- Builds on the runtime work of 01-03: the evaluator validates GA id format,
  reflects Slack/Zapier last-delivery health (written by 02-L02's
  `recordIntegrationHealth`), and validates the Sentry DSN shape.
- L02 depends on L01 (the route + summary change must exist before the UI binds
  to them).
- No DB migration: the `integrations.healthStatus / lastCheckedAt / lastError`
  columns and `integrations_health_idx` already exist (`core/db/schema.ts`).

---

## Testing Requirements

- Vitest (`tests/vitest/*`) — the pure `evaluateIntegrationHealth` matrix and the
  corrected `toSummary` (no auto-`healthy`).
- Bun (`tests/integration/routes/*`, `tests/security/*`) — the
  `POST /settings/integrations/:id/check` route: auth/RBAC/CSRF, validation,
  DB persistence, error mapping, and secret non-exposure.
- Vitest (`tests/vitest/ui-integration/*`) — the admin card/drawer rendering real
  health + the "Test connection" action calling the client.
