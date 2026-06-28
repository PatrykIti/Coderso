# TASK-493-04-L02: Search-Performance & Overview Read Routes
# FileName: TASK-493-04-L02-Search-Performance-Read-Routes.md

**Parent Subtask:** TASK-493-04
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Small
**Dependencies:** TASK-493-04-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Expose the aggregation from L01 to the admin via internal read
  routes the SEO Manager (subtask 05) consumes.
- **Owning module(s) to create-or-extend:**
  - `core/server/routes/seoRoutes.ts` (**extend** — register
    `GET /seo/overview`, `GET /seo/search-performance`; orchestration-only,
    calling the L01 service).
  - `core/server/validation/seoSchemas.ts` (**extend** —
    `seoSearchPerformanceQuerySchema`, `additionalProperties: false`).
- **Source-of-truth docs:** `_docs/CMS_API.md` (SEO Manager endpoints — synced in
  06-L02), `_docs/SECURITY_SPEC.md`, `_docs/SEARCH_SPEC.md`.
- **Out of scope:** the aggregation math (L01); the sync/submit writes (02/03);
  UI wiring (05).

---

## Security Contract

- **Endpoint visibility:** **internal** — `GET /seo/overview`,
  `GET /seo/search-performance` under `${adminPath}/api` (`httpServer.ts:510`).
- **Auth model:** session admin via `requirePermission`
  (`registerSeoRoutes`, `routes/index.ts:96`).
- **RBAC:** `content:read` (read surface, matching the existing `GET /seo` in
  `seoRoutes.ts:73`). No `seo:*` permission exists.
- **CSRF:** n/a (GET, no state change).
- **Rate-limit bucket:** `admin_read`.
- **Validation:** `seoSearchPerformanceQuerySchema`
  (owner = `core/server/validation/seoSchemas.ts`), `additionalProperties: false`;
  optional `{ targetId?, startDate?, endDate?, limit? }`, `limit` clamped server
  side. Query params parsed to the schema before the service call.
- **Anti-abuse:** internal read — RBAC + `admin_read` rate-limit.
- **Secret/PII handling:** responses carry only aggregate counts + public query
  strings; **no** credential/token. Confirm the GSC config is never echoed.

---

## Implementation Pseudocode

```ts
// core/server/routes/seoRoutes.ts (extend)
router.get("/seo/overview", requirePermission("content:read"), () => getSeoOverview());

router.get("/seo/search-performance", requirePermission("content:read"), async (ctx) => {
  try {
    validate(seoSearchPerformanceQuerySchema, ctx.query);
    return await getSearchPerformance({
      targetId: ctx.query.targetId,
      startDate: ctx.query.startDate,
      endDate: ctx.query.endDate,
      limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
    });
  } catch (error) { throwMappedSeoError(error); }
});
```

**Data flow:** validate query (reject-unknown) → call L01 aggregation → return
shape. Routes stay orchestration-only; no schema/enum re-declaration (re-import
from the validation + service modules).

**Error handling:** validation failures → `validation_error` at the route
boundary; any unexpected service error → `seo_error` 500 via the existing
`throwMappedSeoError` (`seoRoutes.ts:61`).

**Regression-test shape:**
- Route: registration, `content:read` gate, reject-unknown query, `limit` clamp,
  response shape matches `SeoOverview` / `SeoSearchPerformance`.
- Empty-data path returns zeroed totals (not an error).

---

## Testing Requirements

- **Bun** (`tests/integration/routes/seo-performance.test.ts`) — read-route
  integration with seeded 01-table rows. Route/runtime flow ⇒ Bun lane.
- `bun run lint` + `bun run typecheck`.
