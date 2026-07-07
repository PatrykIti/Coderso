# TASK-480-03-L02: Layout Routes (GET/PUT)
# FileName: TASK-480-03-L02-Layout-Routes.md

**Parent Subtask:** TASK-480-03
**Priority:** High
**Category:** `dashboard` / `admin-api`
**Estimated Effort:** Medium
**Dependencies:** TASK-480-03-L01 (repository + normalizer). Adds a new
`dashboard:write` permission (catalog + RBAC docs + admin seed).
**Status:** ✅ Done
**Started:**
**Completed:** 2026-07-05
---

## Overview

- **Goal:** Expose the per-user dashboard layout over internal admin routes:
  `GET /dashboard/layout` (read, with default for unsaved users), `PUT
  /dashboard/layout` (save), and `POST /dashboard/layout/reset` (reset to
  default). Routes stay orchestration-only; all validation/normalization lives in
  the L01 domain owner.
- **Owning module/service:** `core/server/routes/dashboardRoutes.ts`
  (orchestration), `core/server/validation/dashboardSchemas.ts` (re-export of the
  domain schema for the `validate` dep), `core/services/dashboard/*` (logic).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/RBAC_SPEC.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** widget-data resolution (L03), client caching (L04), migration
  (L01).

---

## Security Contract

- **Endpoint visibility:** `internal` — `/admin/api/dashboard/layout`,
  `/admin/api/dashboard/layout/reset` (admin `apiClient` prefixes `/admin/api`;
  the route file registers bare `/dashboard/layout`).
- **Auth model:** session. The handler resolves `ctx.user.id`; missing id →
  `auth_required`.
- **RBAC:**
  - `GET /dashboard/layout` → `requirePermission("content:read")` (consistent
    with the existing `GET /dashboard`).
  - `PUT /dashboard/layout` and `POST /dashboard/layout/reset` →
    `requirePermission("dashboard:write")` (NEW permission).
- **CSRF:** required on `PUT` and `POST /reset` (admin writes). Enforced centrally
  by `core/server/middleware/csrf.ts`; the route must not opt out.
- **Rate-limit buckets:** `GET /dashboard/layout` uses `admin_read`; `PUT
  /dashboard/layout` and `POST /dashboard/layout/reset` use `admin_write`
  (method-based admin buckets in `core/server/httpServer.ts`).
- **Validation:** `validate(dashboardLayoutWriteSchema, ctx.body)` then
  `writeDashboardLayout` re-normalizes (defense in depth). The schema rejects
  unknown fields. `mapDashboardError` converts domain/Zod errors to `ApiError`
  with stable codes (`dashboard_layout_invalid` → 400) at the boundary only.
- **Anti-abuse:** widget cap enforced in the normalizer (L01); request body size
  bounded by the existing admin body limit.
- **Secret handling:** layout is presentation/config only; no secret is read or
  written. Errors never echo raw payloads.

### New permission: `dashboard:write`

Add to the catalog so Roles UI + enforcement recognize it:

- `core/services/admin/permissionsCatalog.ts` — new group:
  ```ts
  {
    id: "dashboard",
    label: "Dashboard",
    permissions: [
      { id: "dashboard:write", label: "Customize dashboard",
        description: "Add, arrange, resize, and save dashboard widgets" },
    ],
  }
  ```
- `core/admin/ui/roles/permissionCatalog.ts` — mirror the same entry for the
  Roles matrix UI.
- `core/admin/ui/roles/rolePermissionRisk.ts` — `dashboard:write` is **not**
  high-risk (per-user personalization, no security/data-destruction scope); do not
  add it to the high-risk taxonomy.
- Admin role seed (`core/db/seed.ts` and any default-role bootstrap) — grant
  `dashboard:write` to Admin by default. Editors/Viewers get it only if the
  product wants self-service personalization (default: Admin-only; document the
  choice in `_docs/RBAC_SPEC.md`).
- Read uses the existing `content:read`, so no new read permission is needed.

---

## Implementation Pseudocode

### Validation re-export (`core/server/validation/dashboardSchemas.ts`)

```ts
// Route layer imports from the 480-02 schema owner; it does NOT redefine the schema.
import { dashboardLayoutSchema as dashboardLayoutWriteSchema }
  from "../../services/dashboard/dashboardWidgetContract";
export { dashboardLayoutWriteSchema };
```

> `dashboardLayoutWriteSchema` is the `dashboardLayoutSchema` owned by TASK-480-02
> (`dashboardWidgetContract.ts`, the strict envelope), re-exported under an explicit
> name so the generic `validate(schema, body)` dep can consume it like other route
> schemas (e.g. `menuSchemas.ts`). The route never re-declares it.

### Error mapping (`core/server/routes/dashboardRoutes.ts`)

```ts
import { ApiError } from "../errorHandler";
import {
  DASHBOARD_LAYOUT_INVALID,
  DashboardLayoutError,
} from "../../services/dashboard/dashboardLayoutService"; // 480-03 error layer (schema stays in 480-02)
import {
  DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH,
} from "../../services/dashboard/dashboardWidgetContract";

const mapDashboardError = (error: unknown): ApiError | null => {
  if (error instanceof DashboardLayoutError) {
    return new ApiError(DASHBOARD_LAYOUT_INVALID, "Dashboard layout invalid", 400, {
      field: error.field,
    });
  }
  // ZodError from the strict schema -> 400 reject-unknown
  if (error && typeof error === "object" && (error as any).name === "ZodError") {
    return new ApiError(DASHBOARD_LAYOUT_INVALID, "Dashboard layout invalid", 400);
  }
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "auth_required": return new ApiError("auth_required", "Authentication required", 401);
    case DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH:
      return new ApiError(DASHBOARD_LAYOUT_INVALID, "Dashboard layout invalid", 400);
    default: return null;
  }
};

const withDashboardErrors = async <T>(fn: () => Promise<T>) => {
  try { return await fn(); }
  catch (error) {
    const mapped = mapDashboardError(error);
    if (mapped) throw mapped;
    throw error;
  }
};
```

### Routes (orchestration-only)

```ts
export type DashboardRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerDashboardRoutes(router: Router, deps: DashboardRouteDeps) {
  const { requirePermission, validate } = deps;

  // existing fixed payload stays for back-compat / 479-07 shell
  router.get("/dashboard", requirePermission("content:read"), async () =>
    getDashboardData());

  router.get("/dashboard/layout", requirePermission("content:read"), async (ctx) =>
    withDashboardErrors(async () => {
      const userId = requireUserId(ctx);          // throws auth_required if missing
      const layout = await readDashboardLayout(userId);
      return { layout };
    }));

  router.put("/dashboard/layout", requirePermission("dashboard:write"), async (ctx) =>
    withDashboardErrors(async () => {
      const userId = requireUserId(ctx);
      validate(dashboardLayoutWriteSchema, ctx.body);   // reject-unknown at boundary
      const { layout, updatedAt } = await writeDashboardLayout(userId, ctx.body);
      return { layout, updatedAt };
    }));

  router.post("/dashboard/layout/reset", requirePermission("dashboard:write"), async (ctx) =>
    withDashboardErrors(async () => {
      const userId = requireUserId(ctx);
      const layout = await resetDashboardLayout(userId);
      return { layout };
    }));
}
```

> `Router` type in `dashboardRoutes.ts` must gain `put` and `post` (currently only
> `get`); `DashboardRouteDeps` must gain `validate`. Update the registration call
> in `core/server/routes/index.ts`:
> `registerDashboardRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });`

**Data flow:** request → permission/CSRF/rate-limit middleware → handler resolves
`userId` → `validate(schema)` (writes) → repository normalizes + persists → return
`{ layout }`. No business logic in the route.

**Error handling:** all domain/Zod errors map via `mapDashboardError` →
`ApiError`; unmapped errors rethrow to the global handler. `auth_required` → 401,
invalid layout → 400.

**Regression-test shape (Bun route lane):**

- `registerDashboardRoutes` wires `GET /dashboard`, `GET /dashboard/layout`,
  `PUT /dashboard/layout`, `POST /dashboard/layout/reset` with the correct
  `requirePermission` argument captured per route.
- Write route rejects unknown fields (asserts `dashboard_layout_invalid`/400).
- Write route requires `dashboard:write`; read route requires `content:read`.
- Missing `ctx.user.id` → `auth_required`/401.
- CSRF: covered by the central middleware test in L05.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/dashboard.test.ts` (registration + RBAC args
  + reject-unknown + error mapping).
- DB round-trip lane (env first: `set -a && source .env && set +a`):
  `bun test tests/integration/routes/dashboardLayout.test.ts`.
- `bun test tests/security/codersoSecurityGate.test.ts` (new permission + route
  visibility buckets).

---

## Documentation Updates Required

- `_docs/CMS_API.md` — document `GET/PUT /admin/api/dashboard/layout` and
  `POST /admin/api/dashboard/layout/reset` (request/response shapes, codes,
  permissions).
- `_docs/RBAC_SPEC.md` — add `dashboard:write`; note Admin-default grant and
  read = `content:read`.
- `core/services/admin/permissionsCatalog.ts` + `core/admin/ui/roles/permissionCatalog.ts`
  updated (these are code, but call them out so they are not missed).
- Board status; changelog entry.
