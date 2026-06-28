# TASK-482-01-L02: `/auth/install` namespace + `GET /auth/install/status` + audit taxonomy
# FileName: TASK-482-01-L02-Install-Route-Namespace-And-Status.md

**Parent Subtask:** TASK-482-01
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Stand up the public `/auth/install` route namespace and its
  read-only status endpoint `GET /auth/install/status`, which reports whether the
  installer is available (`available === isFirstRun()`). This is the
  self-disable contract: `available` flips to `false` the instant any user
  exists. Also register the `auth.install.*` audit taxonomy.
- **Owning module(s) to create/extend:**
  - Create `core/server/routes/installRoutes.ts` exporting
    `registerInstallRoutes(router, deps)` (mirrors `authRoutes.ts` shape).
  - Extend `core/server/routes/index.ts` to call `registerInstallRoutes` in
    `registerAllRoutes` (deps: `validate` only for now; `requireAuth`/
    `requirePermission` are deliberately **not** wired here).
  - Add the `/auth/install` prefix to the auth-bucket / public reachability
    logic in `core/server/httpServer.ts` (it already treats any
    `pathname.startsWith("/auth")` as the `auth` rate-limit bucket — confirm
    `/auth/install/*` inherits that; no public-write or CSRF path needed for a
    GET).
  - Document the `auth.install.status`, `auth.install.admin.created`,
    `auth.install.blocked` actions in `_docs/AUDIT_SPEC.md` (taxonomy list).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/AUDIT_SPEC.md`.
- **Out-of-scope:** the `POST /auth/install/admin` write (02-L02); the UI (03).

## Security Contract

- **Endpoint visibility:** **public** — `GET /auth/install/status` is reachable
  without a session (the installer renders pre-login). It is the **only**
  status surface; it must leak nothing beyond a boolean availability flag.
- **Auth model:** none (session-less). The route handler must **not** call
  `requireAuth`.
- **RBAC permission(s):** none.
- **CSRF:** N/A — read-only `GET`; `enforceCsrf` in `httpServer.ts` (line 358)
  only guards unsafe methods. Confirm `GET` is exempt.
- **Rate-limit bucket:** `auth` — inherited because the path starts with
  `/auth` (`httpServer.ts:328` sets `isAuthRoute = pathname.startsWith("/auth")`
  and `:332` selects the `auth` bucket for any `/auth*` route). No new bucket.
- **Validation:** none (no body/params). Reject any query params with a 400
  using the same `assertNo*Query` pattern as `authRoutes.ts`
  (`assertNoAuthMeQuery`) to keep the surface tight (`.strict`-equivalent).
- **Anti-abuse:** public read; the `auth` bucket throttles enumeration. No
  nonce/HMAC needed for a read that returns only a boolean.
- **Secret/PII handling:** response body is `{ available: boolean }` only —
  **never** include user counts, emails, or whether a seed admin exists. The
  audit entry (if any) must not log PII.

## Implementation Pseudocode

```ts
// core/server/routes/installRoutes.ts
import { ApiError } from "../errorHandler";
import type { Router, RouteContext } from "../router";
import { isFirstRun } from "../../services/admin/firstRunService";
import { logAudit } from "../../services/audit/auditService";

export type InstallRouteDeps = {
  validate: (schema: unknown, payload: unknown) => void;
  isFirstRun?: typeof isFirstRun; // injectable for tests
  logAudit?: typeof logAudit;
};

const mapInstallRouteError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  return new ApiError("install_error", "Could not complete installer request.", 500);
};

export function registerInstallRoutes(router: Router, deps: InstallRouteDeps) {
  const firstRun = deps.isFirstRun ?? isFirstRun;

  router.get("/auth/install/status", async (ctx: RouteContext) => {
    rejectUnknownQuery(ctx.query); // 400 install_query_invalid on any param
    try {
      return { available: await firstRun() };
    } catch (error) {
      throw mapInstallRouteError(error);
    }
  });
}
```

- **Wiring:** in `core/server/routes/index.ts`, add
  `registerInstallRoutes(router, { validate: deps.validate });` alongside
  `registerAuthRoutes(...)`.
- **Data flow:** request → `isFirstRun()` (01-L01) → `{ available }`.
- **Error handling:** machine-readable codes mapped at the boundary via
  `mapInstallRouteError`; `install_query_invalid` for stray params.
- **Regression-test shape:** empty DB ⇒ `200 { available: true }`; after a user
  exists ⇒ `200 { available: false }`; request with `?x=1` ⇒ `400`; the route is
  reachable **without** a session cookie.

## Testing Requirements

- **Lane:** Bun route-integration — runtime/route flow.
  `tests/integration/routes/install.test.ts`.
- Cases: public reachability (no auth header) returns 200; `available` reflects
  `isFirstRun`; self-disable transition (seed a user → `available:false`);
  unknown query param ⇒ 400; the `auth` rate-limit bucket applies (a burst
  beyond the auth threshold is throttled).
- Update `tests/security/codersoSecurityGate.test.ts` expectations to include
  `/auth/install/status` as an intentionally public, no-CSRF GET.
- No migration artifacts.
