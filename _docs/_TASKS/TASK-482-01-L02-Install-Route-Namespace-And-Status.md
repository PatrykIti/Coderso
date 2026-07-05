# TASK-482-01-L02: `/auth/install` namespace + `GET /auth/install/status` + audit taxonomy
# FileName: TASK-482-01-L02-Install-Route-Namespace-And-Status.md

**Parent Subtask:** TASK-482-01
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
  - Register the `auth.install.admin.created` and `auth.install.blocked` audit
    actions in code (the `auth.install.*` taxonomy). The **doc write** for these
    in `_docs/AUDIT_SPEC.md` is NOT done here: `_docs/AUDIT_SPEC.md` is written
    solely by TASK-482-09-L02 (single 482-stream writer per spec doc); this leaf
    only cites it as source-of-truth. `GET /auth/install/status` emits **no**
    audit entry, so there is **no** `auth.install.status` action (its emitters
    are in 02-L02).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/AUDIT_SPEC.md`.
- **Out-of-scope:** the `POST /auth/install/admin` write (02-L02); the UI (03).

## Coordination (pinned facts for the TASK-482 stream)

- **Changelog number:** the TASK-482 stream's closure (TASK-482-09) creates
  `_docs/_CHANGELOG/1220-*.md`. Numbers `1219` (TASK-510, in flight in the
  shared main tree — may be absent from this worktree's checkout, do NOT
  reallocate it), `1221` (TASK-483) and `1222` (TASK-484) are RESERVED by
  parallel streams.
- **Parallel streams:** TASK-483 (analytics) and TASK-484 (backups) run
  concurrently on sibling branches/worktrees. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any
  analytics/backups route modules, `core/db/schema.ts`,
  `core/db/migrations/**`.
- **Shared surfaces — additive only:** this leaf edits the code surfaces all
  three streams touch: `core/server/routes/index.ts` and
  `core/server/httpServer.ts` (confirm-only for the GET — the actual identifier
  edit lands in 02-L02). Every edit must be strictly additive and scoped to
  install-specific lines/sections (e.g. one added `registerInstallRoutes(...)`
  call) — never restructure, reorder, or reformat these files, so the 483/484
  streams can append their own additions without conflict. This leaf does **NOT**
  edit the spec docs: `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md` and `_docs/AUDIT_SPEC.md` are written solely by
  TASK-482-09-L02 (single 482-stream writer per doc); this leaf only cites them
  as source-of-truth.
  `tests/security/codersoSecurityGate.test.ts` is a shared surface too, but
  TASK-482 does **NOT** edit it (it has no per-route expectation inventory —
  matching 06-L02's stance); the install-route contract lives in a dedicated
  new test file (see Testing Requirements).
- **Shared remote test DB:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). No test may delete or
  truncate `users`, flip the real DB into a global no-users install state, or
  reset shared settings rows (see Testing Requirements).
- **Board/changelog discipline:** only the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf must not touch
  them.

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
  status `GET` emits **no** audit entry (there is no `auth.install.status`
  action); the audited install actions (`auth.install.admin.created` /
  `auth.install.blocked`, both in 02-L02) must not log PII.

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

// Returns `ApiError | null` to match the repo convention (see
// `emailSettingsRoutes.ts` / `pageRoutes.ts` map*Error helpers): a mapped
// domain error is returned, anything unexpected returns `null` so the route
// re-throws the original for the top-level handler. 02-L02 EXTENDS this same
// helper for the admin POST route and MUST keep the null-returning contract.
const mapInstallRouteError = (error: unknown): ApiError | null => {
  if (error instanceof ApiError) return error;
  return null;
};

export function registerInstallRoutes(router: Router, deps: InstallRouteDeps) {
  const firstRun = deps.isFirstRun ?? isFirstRun;

  router.get("/auth/install/status", async (ctx: RouteContext) => {
    assertNoInstallStatusQuery(ctx.query); // 400 install_query_invalid on any param
    try {
      return { available: await firstRun() };
    } catch (error) {
      const mapped = mapInstallRouteError(error);
      if (mapped) throw mapped;
      throw error;
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
- **Regression-test shape:** injected `isFirstRun` stub (via
  `InstallRouteDeps.isFirstRun`) returns `true` ⇒ `200 { available: true }`;
  stub returns `false` (a user exists) ⇒ `200 { available: false }`; request
  with `?x=1` ⇒ `400`; the route is reachable **without** a session cookie.
  Never engineer a real empty-`users` DB state — the DB is shared (see
  Coordination + Testing Requirements).

## Testing Requirements

- **Lane:** Bun route-integration — runtime/route flow.
  `tests/integration/routes/install.test.ts`.
- **Harness (mandatory):** the deps-injection harness — fake in-memory router
  plus an injected `isFirstRun` through `InstallRouteDeps.isFirstRun` (the
  seam in the pseudocode above), mirroring the dominant pattern in
  `tests/integration/routes/adminUsers.test.ts` (`makeRouter` + `findRoute` +
  `runRoute`). Do NOT write real-DB "empty DB" tests: `DATABASE_URL` in
  `.env` is the ONE remote Postgres shared with TASK-483/484 and the owner
  (some suites in this folder, e.g. `pages.test.ts`/`menus.test.ts`, do hit
  the real DB — that style is forbidden here for the availability cases). If
  any real-DB assertion is added at all, it must be additive-only: create one
  uniquely-scoped user, assert `available: false`, then delete only that row.
- Cases (via injected stubs): public reachability (no session/user on the
  route context) returns 200; `available` reflects the injected `isFirstRun`;
  self-disable transition (stub flips `true` → `false` across calls ⇒
  `available` flips); unknown query param ⇒ 400.
- **Rate-limit case (unit lane, not this harness):** bucket selection happens
  in the `httpServer.ts` request pipeline
  (`isAuthRoute = pathname.startsWith("/auth")` at `:328`, bucket selection
  at `:331-339`, `checkRateLimit` at `:347`), NOT in the route module this
  leaf creates, so the fake-router harness cannot exercise throttling. Cover
  it with a unit-level assertion mirroring
  `tests/unit/security/rateLimit.test.ts`: the `auth` bucket throttles a
  burst beyond its threshold, plus an assertion that
  `"/auth/install/status".startsWith("/auth")` holds so the path maps to the
  `auth` bucket. Do not place a burst-throttle case in
  `tests/integration/routes/install.test.ts`; only a full-`httpServer`
  harness could run that middleware, and one is not required here.
- **Security gate:** `tests/security/codersoSecurityGate.test.ts` contains NO
  route list, public-endpoint expectations, or CSRF-exemption registry to
  "update" — it currently unit-tests forms/booking submission access, nonce
  helpers and `SECURITY_SETTINGS_DEFAULTS`. Do **NOT** edit it — it is a pinned
  shared surface with the parallel TASK-483/484 streams and has no
  route-expectation inventory to extend (matching 06-L02's stance). Instead,
  assert the `/auth/install/status` contract in the dedicated new file
  `tests/integration/routes/install.test.ts`: public GET, no CSRF because
  `enforceCsrf` exempts `SAFE_METHODS` (`core/server/middleware/csrf.ts:9,25`),
  and auth-bucket rate limiting via the `/auth` path prefix. 08-L02 only keeps
  `codersoSecurityGate.test.ts` green; only introduce a route-expectation
  inventory there via an explicit cross-stream decision.
- No migration artifacts.
