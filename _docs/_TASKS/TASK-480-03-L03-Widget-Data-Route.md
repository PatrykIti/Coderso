# TASK-480-03-L03: Batched Widget-Data Route
# FileName: TASK-480-03-L03-Widget-Data-Route.md

**Parent Subtask:** TASK-480-03
**Priority:** High
**Category:** `dashboard` / `admin-api`
**Estimated Effort:** Medium
**Dependencies:** TASK-480-02 (widget/layout contract + data-source resolvers:
`DASHBOARD_WIDGET_TYPES`, `normalizeDashboardWidgetConfig`, `resolveWidgetData`),
TASK-480-03-L01 (layout repository), TASK-480-03-L02 (`mapDashboardError`).
**Status:** ✅ Done
**Started:**
**Completed:** 2026-07-05
---

## Overview

- **Goal:** Serve the **resolved live data** for the widgets in a dashboard
  layout through one batched internal admin route, so the builder/runtime fetches
  all panel data in a single round-trip instead of N requests. Returns a
  per-instance map keyed by widget instance id.
- **Owning module/service:** `core/server/routes/dashboardRoutes.ts`
  (orchestration), `core/services/dashboard/dashboardWidgetData.ts` (batch
  orchestrator that fans out to the 480-02 resolvers), `core/services/dashboard/*`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/DASHBOARD_WIDGETS_SPEC.md`.
- **Out of scope:** the resolvers themselves (480-02 — each widget type's query
  lives there), client caching (L04), layout storage/migration (L01).

### Shape decision

**Batched POST is chosen** over per-widget GETs: a layout has many widgets, the
builder needs them together, and a request body lets the client send the exact
instance set (id + type + config) to resolve. We use `POST
/dashboard/widget-data` (read-only semantics, but a body is required) and treat it
as a query — CSRF still applies because it is an admin-authenticated POST. An
optional `GET /dashboard/widget-data` (no body) resolves data for the **saved**
layout for first-paint convenience.

---

## Security Contract

- **Endpoint visibility:** `internal` — `/admin/api/dashboard/widget-data`.
- **Auth model:** session; resolve `ctx.user.id`.
- **RBAC:** `requirePermission("content:read")`. Every resolver operates strictly
  within the `content:read` read-model (totals, content counts, content-over-time
  series, recent activity, storage usage, security **summary** — the same
  non-secret projection `getDashboardData()` already returns). A resolver must
  never expose data the caller could not already read.
- **CSRF:** required on the `POST` form (admin POST). The `GET` form (saved
  layout, no body) is a safe read and does not require CSRF.
- **Rate-limit buckets:** `GET /dashboard/widget-data` uses `admin_read`;
  `POST /dashboard/widget-data` uses `admin_write` because it is a
  body-carrying admin POST, even though the domain operation is read-only.
- **Validation:** `validate(dashboardWidgetDataRequestSchema, ctx.body)` —
  reject-unknown; cap instance count at `DASHBOARD_MAX_WIDGETS`; each requested
  instance is normalized through the 480-02 contract
  (`normalizeDashboardWidgetConfig`) before resolution, so an unknown `type` or
  malformed `config` is rejected, not resolved.
- **Anti-abuse:** instance-count cap + per-resolver internal bounds (e.g. recent
  activity limit, chart range clamp) owned by 480-02. Resolution failures are
  isolated per widget (one failing widget does not 500 the batch).
- **Secret handling:** resolved payloads carry presentation data only. The
  security widget returns the existing `DashboardSecuritySummary` (status/issues/
  checks) — never raw `SecuritySettings`. No secret enters the response, cache, or
  logs.

---

## Implementation Pseudocode

### Request schema (domain owner; re-export for route)

`core/services/dashboard/dashboardWidgetData.ts`

```ts
import {
  normalizeDashboardWidgetConfig,            // 480-02 per-type config validator
  DASHBOARD_MAX_WIDGETS,                      // 480-02 cap
} from "./dashboardWidgetContract";
import {
  DASHBOARD_WIDGET_TYPES,
  type DashboardWidgetData,
  type DashboardWidgetType,
} from "./dashboardTypes"; // 480-02 type/data owner
import { resolveWidgetData } from "./dashboardDataSources"; // 480-02 resolver registry

export const dashboardWidgetDataRequestSchema = z.object({
  widgets: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(DASHBOARD_WIDGET_TYPES),
    config: z.unknown().optional(),
  }).strict()).max(DASHBOARD_MAX_WIDGETS),
}).strict();

export type DashboardWidgetDataEntry =
  | { id: string; type: DashboardWidgetType; status: "ok"; data: DashboardWidgetData }
  | { id: string; type: DashboardWidgetType; status: "error"; code: string };

export type DashboardWidgetDataResponse = {
  generatedAt: string;
  entries: DashboardWidgetDataEntry[];
};

export async function resolveWidgetDataBatch(
  input: unknown
): Promise<DashboardWidgetDataResponse> {
  const parsed = dashboardWidgetDataRequestSchema.parse(input); // reject-unknown
  const widgets = parsed.widgets.map((w) => ({
    id: w.id,
    type: w.type,
    config: normalizeDashboardWidgetConfig(w.type, w.config), // 480-02 per-type validate
    position: { x: 0, y: 0, w: 0, h: 0 },
  }));
  const entries = await Promise.all(widgets.map(async (w) => {
    // 480-02 registry resolves a single widget and converts resolver failures to
    // `{ type, error }`; request-level schema/config errors already threw above.
    const resolved = await resolveWidgetData(w);
    return "error" in resolved
      ? { id: w.id, type: w.type, status: "error" as const, code: resolved.error }
      : { id: w.id, type: w.type, status: "ok" as const, data: resolved };
  }));
  return { generatedAt: new Date().toISOString(), entries };
}

// Convenience: resolve the saved layout (GET form).
export async function resolveSavedLayoutWidgetData(userId: string) {
  const { widgets } = await readDashboardLayout(userId);
  return resolveWidgetDataBatch({ widgets: widgets.map(({ id, type, config }) => ({ id, type, config })) });
}
```

### Routes (orchestration-only, in `dashboardRoutes.ts`)

```ts
router.get("/dashboard/widget-data", requirePermission("content:read"), async (ctx) =>
  withDashboardErrors(async () => {
    const userId = requireUserId(ctx);
    return resolveSavedLayoutWidgetData(userId);
  }));

router.post("/dashboard/widget-data", requirePermission("content:read"), async (ctx) =>
  withDashboardErrors(async () => {
    validate(dashboardWidgetDataRequestSchema, ctx.body); // reject-unknown
    return resolveWidgetDataBatch(ctx.body);
  }));
```

> Reuse the same `withDashboardErrors` / `mapDashboardError` from L02. Unknown
> widget `type` or bad `config` surfaces as a ZodError →
> `dashboard_layout_invalid` 400 at the boundary for the **whole-request**
> schema; **per-widget** resolver failures are returned inline as
> `status:"error"` so a single broken data source never fails the batch.

**Data flow:** request → permission/CSRF(POST)/rate-limit → validate body →
`resolveWidgetDataBatch` fans out to 480-02 resolvers under `content:read` →
per-instance `{ status, data | code }` map. Routes hold no query logic.

**Error handling:** request-level schema violation → 400 at boundary;
per-widget resolver error → inline `status:"error"` with a bounded machine code;
unmapped → global handler.

**Regression-test shape:**

- Route (Bun): registers `GET` + `POST /dashboard/widget-data` with
  `content:read`; POST rejects unknown body fields; instance cap enforced; a
  resolver throw yields an inline `status:"error"` entry (HTTP 200), not a 500.
- Domain (Vitest): `resolveWidgetDataBatch` returns one entry per requested id,
  preserves order, isolates failures, and rejects unknown `type` at the schema
  level; security widget returns summary shape only (no raw settings keys).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/dashboard.test.ts` (widget-data registration
  + RBAC + reject-unknown + per-widget isolation).
- `bun --cwd core test:vitest -- dashboardWidgetData` (batch fan-out, isolation,
  no-secret assertion).
- `bun test tests/security/codersoSecurityGate.test.ts`.
- DB-backed resolver tests run under `set -a && source .env && set +a` when a
  resolver hits the database.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — `GET`/`POST /admin/api/dashboard/widget-data` (request body,
  per-instance response, error codes, isolation behavior).
- `_docs/DASHBOARD_WIDGETS_SPEC.md` — batched data-resolution contract; explicit
  note that resolvers run under `content:read` and emit no secrets.
- Board status; changelog entry.
