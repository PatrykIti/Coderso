# TASK-482-09-L01: E2E onboarding flow via injected-service harness (installer → login → Basic → starter → Advanced → finalize)
# FileName: TASK-482-09-L01-E2E-Onboarding-Flow.md

**Parent Subtask:** TASK-482-09
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-08
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** A single Bun integration test that drives the entire onboarding
  pipeline and asserts each boundary in sequence, including the self-disable
  edge. **Shared-DB constraint (mandatory):** the test DB is ONE remote
  Postgres (render.com, `DATABASE_URL` in `.env`) shared with the owner and the
  parallel TASK-483/484 streams. The no-users/first-run state is therefore
  simulated via **dependency-injected service seams** (the `deps.isFirstRun` /
  `deps.createFirstAdmin` injection points defined in 01-L02/02-L02), NEVER by
  truncating/deleting `users`, resetting shared settings rows, or otherwise
  flipping the real DB into a global no-users install state.
- **Owning module(s) to create:** `tests/integration/routes/onboardingFlow.test.ts`
  (new). Model: the existing **stub-router DI harness** — a local `makeRouter`
  that records `{ method, path, handlers }`, `findRoute` + `runRoute(route, ctx)`
  executing the handler chain (incl. middleware) with a hand-built
  `RouteContext`, and services injected via each register function's `deps`
  parameter — following the SAME generic `{ method, path, handlers }` contract as
  `tests/integration/routes/auth.test.ts` and
  `tests/integration/routes/settings.test.ts` (both exist at HEAD).
  **Do NOT literally copy either reference `makeRouter` — each records only a
  subset of verbs and would silently drop routes for this PATCH-heavy flow:**
  `auth.test.ts`'s `makeRouter` records `GET`/`POST` but stubs
  `patch`/`put`/`delete` as no-ops that return `undefined` and never push to
  `routes` (so `findRoute(routes, "PATCH", "/settings")` would throw
  `Missing route`); `settings.test.ts`'s `makeRouter` records only `GET`/`PATCH`
  (no `POST`, so every installer/setup `POST` would be dropped). This flow drives
  `GET` (install status), `POST` (install/admin, setup preview+apply) AND `PATCH`
  (/settings), so `onboardingFlow.test.ts`'s `makeRouter` must record the
  **superset — `GET` + `POST` + `PATCH`** (each pushing `{ method, path, handlers }`),
  reusing the identical `findRoute`/`runRoute` helpers. Note this
  harness has **no HTTP server, no cookie/session round-trip, no CSRF
  middleware pipeline, and no DB lifecycle** — session/CSRF expectations are
  asserted structurally (handler-chain composition + middleware run with
  crafted ctx), not via real cookies. `tests/integration/routes/install.test.ts`
  does not exist yet at HEAD — it is created by 01-L02/02-L02 and will exist by
  land order when this leaf runs; treat it as a third reference, not the model.
  If a true live-HTTP smoke is additionally wanted (optional), anchor it on the
  `startHttpServer` pattern from `core/server/httpServer.ts` used by
  `tests/integration/server/*.test.ts` (e.g. `mediaDeliveryAccess.test.ts`,
  which snapshots and restores real settings rows in `beforeAll`/`afterAll`) —
  with uniquely-scoped, self-restoring fixtures that NEVER require the real
  `users` table to be empty and skip via `testIfDb` when `DATABASE_URL` is
  absent.
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** unit-level coverage (owned per leaf); visual/Playwright
  checks (optional, not required for the gate).

## Security Contract

- **Endpoint visibility:** exercises both the public `/auth/install/*` surface and
  the internal `/admin/api/*` settings + starter-content endpoints.
- **Auth model:** starts session-less (installer), then session-bound (post-login
  wizard). The test must assert the transition (installer handlers run with
  `ctx.user` undefined; internal handlers run with an authenticated ctx and
  their `requireAuth` middleware passes/fails accordingly) — in the stub
  harness this is a ctx-level assertion, not a cookie round-trip.
- **RBAC permission(s):** verifies the first admin has `['*']` (can write
  settings + install starter content).
- **CSRF:** `enforceCsrf` is **centralized in the httpServer request pipeline**
  (`core/server/httpServer.ts:358`), NOT composed into per-route `handlers`
  chains (as 02-L02's "CSRF on internal writes" bullet (lines 64-71) and
  06-L02's "CSRF on internal writes" bullet both state), so the
  stub-router harness — which runs only `route.handlers` and has no pipeline —
  **cannot** assert CSRF via handler-chain composition. Instead: (a) unit-assert
  `enforceCsrf` (`core/server/middleware/csrf.ts`) semantics directly — it
  skips SAFE_METHODS and any session-less request (`csrf.ts:25-26`: `if
  (!ctx.sessionId) return;`, which is exactly why the session-less installer
  POST is accepted without a token) and enforces a token match for a
  session-bound POST; and/or (b) assert CSRF end-to-end only in the optional
  live-HTTP `startHttpServer` smoke below (where the real pipeline runs). Do NOT
  claim CSRF middleware is present-in / absent-from the route handler chains.
- **Rate-limit bucket:** optional — may assert the `auth` bucket throttles a
  burst on the installer.
- **Validation:** asserts strict-schema rejections at each step.
- **Anti-abuse:** asserts the post-install self-disable (status flips, second
  create 409).
- **Secret/PII handling:** asserts Advanced secrets are not echoed back in any
  GET during the flow.

## Implementation Pseudocode

```ts
// tests/integration/routes/onboardingFlow.test.ts — stub-router DI harness
// (same findRoute/runRoute helpers as auth.test.ts/settings.test.ts, but a
// makeRouter that records the GET+POST+PATCH SUPERSET — auth.test.ts stubs
// patch as a no-op and settings.test.ts omits post, so neither may be copied
// verbatim without dropping routes this flow drives).
// Shared in-memory world simulates the DB — the REAL shared Postgres is never
// mutated and never needs to be empty.
const world = {
  users: [] as Array<{ id: string; email: string; permissions: string[] }>,
  settings: new Map<string, unknown>(),
};

const { routes, router } = makeRouter();

// PHASE 1 — install routes with injected first-run gate + creation seam
registerInstallRoutes(router, {
  validate,                                   // real strict-schema validator
  isFirstRun: async () => world.users.length === 0,   // InstallRouteDeps seam (01-L02)
  createFirstAdmin: async (input) => {                // service seam (02-L01) — stubbed
    if (world.users.length > 0) throw new Error("first_run_unavailable"); // route's isFirstRun gate + mapInstallRouteError already surface this as 409 install_unavailable
    const admin = { id: "u1", email: input.email, permissions: ["*"] };
    world.users.push(admin);
    return admin;
  },
} as InstallRouteDeps);

// Auth/settings/setup routes with injected deps (AuthRouteDeps / SettingsRouteDeps
// / SetupRouteDeps), sessions + RBAC simulated via ctx.user, CSRF via handler-chain
// composition (see below).
registerAuthRoutes(router, authDepsStub);
registerSettingsRoutes(router, settingsDepsStub(world.settings));
registerSetupRoutes(router, setupDepsStub);

test("onboarding end to end (injected no-users state)", async () => {
  // PHASE 1 — installer (no-users gate via seam, NOT via a truncated real table)
  expect(await run("GET", "/auth/install/status")).toEqual({ available: true });
  await run("POST", "/auth/install/admin", { body: { name, email, password } }); // ok
  expect(await run("GET", "/auth/install/status")).toEqual({ available: false }); // self-disable
  await expect(run("POST", "/auth/install/admin", { body: { name, email, password } }))
    .rejects.toMatchObject({ status: 409, code: "install_unavailable" });

  // SESSION TRANSITION — installer handlers ran with ctx.user undefined; from
  // here every internal route runs with ctx.user = world.users[0] (perms ['*'])
  // and requireAuth/requirePermission middleware in the chain must pass.
  const ctxAuthed = { user: world.users[0] };

  // CSRF: enforceCsrf lives in the httpServer PIPELINE (httpServer.ts:358),
  // not in route.handlers — the stub harness has no pipeline, so assert CSRF
  // by calling enforceCsrf(csrf.ts) directly: session-less installer POST is
  // skipped (ctx.sessionId undefined ⇒ accepted, no token), a session-bound
  // POST with a mismatched/absent token is rejected. (Do NOT assert per-chain
  // middleware presence — there is none.) Full pipeline CSRF is left to the
  // optional live-HTTP startHttpServer smoke below.

  // PHASE 2 — Basic (incl. new site.timezone)
  await run("PATCH", "/settings", { ...ctxAuthed, body: { "site.name": "Acme",
    "site.timezone": "Europe/Warsaw", "site.publicBaseUrl": "https://acme.test" } });
  expect(world.settings.get("site.timezone")).toBe("Europe/Warsaw");

  // Starter content (setupRoutes, 06-L02)
  const preview = await run("POST", "/setup/starter-content/preview",
    { ...ctxAuthed, body: { blueprintKey: "default" } });
  expect(preview.summary.total).toBeGreaterThan(0);
  await run("POST", "/setup/starter-content/apply",
    { ...ctxAuthed, body: { blueprintKey: "default" } });
  expect(world.settings.get("site.homepageId")).toBeTruthy();

  // Advanced — strict-schema rejection + secret never echoed by any GET
  await expect(run("PATCH", "/settings", { ...ctxAuthed, body: { unknownKey: 1 } }))
    .rejects.toMatchObject({ status: 400 });

  // FINALIZE — install-lock
  await run("PATCH", "/settings", { ...ctxAuthed, body: { "setup.completed": true } });
  expect(world.settings.get("setup.completed")).toBe(true);
});
```

- **Data flow:** the full pipeline through the real registered handler chains
  (middleware included); only the service seams behind the routes are stubbed
  with the in-memory `world`. Each assertion guards one contract.
- **Error handling:** the test fails loudly on any unexpected status/shape;
  gate rejections are asserted via the mapped `ApiError` codes
  (`install_unavailable` 409, validation 400).
- **Regression-test shape:** the sequence above is the regression artifact.
- **Injection note:** `InstallRouteDeps` already exposes `isFirstRun`
  (01-L02); if 02-L02 lands `createFirstAdmin` as a direct import rather than
  a dep, extend `InstallRouteDeps` with an optional `createFirstAdmin`
  override (test-only seam, default = real service) rather than mutating the
  real DB.
- **Optional live-HTTP smoke (additive, not a substitute):** may be added
  under `tests/integration/server/` using `startHttpServer`
  (`core/server/httpServer.ts`) with the `mediaDeliveryAccess.test.ts`
  pattern — `testIfDb` skip without `DATABASE_URL`, snapshot/restore any
  touched settings rows in `beforeAll`/`afterAll`, and it must NOT assert
  `available: true` (the shared DB has users) nor create/delete users.

## Testing Requirements

- **Lane:** Bun integration (`tests/integration/routes/onboardingFlow.test.ts`) —
  runtime, multi-route flow ⇒ Bun, never Vitest.
- **Shared-DB safety (mandatory):** the remote Postgres is shared with the
  owner and the TASK-483/484 streams. The test must NEVER delete/truncate
  `users`, flip the real DB into a global no-users install state, or reset
  shared settings rows. The `available: true` first-run assertion is
  service-seam-only (injected `isFirstRun` / in-memory `world`), never a claim
  about the real database.
- No migration artifacts.
