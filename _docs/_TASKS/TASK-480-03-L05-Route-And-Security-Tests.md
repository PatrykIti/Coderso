# TASK-480-03-L05: Route & Security Tests
# FileName: TASK-480-03-L05-Route-And-Security-Tests.md

**Parent Subtask:** TASK-480-03
**Priority:** High
**Category:** `dashboard` / `testing`
**Estimated Effort:** Medium
**Dependencies:** TASK-480-03-L01..L04 (storage, layout routes, widget-data route,
cached client).
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Gate the persistence/API subtask with the correct test lanes:
  Bun route-registration + RBAC/CSRF + reject-unknown + `mapDashboardError`
  coverage in `tests/integration/routes`, DB-backed round-trip + per-user
  isolation, and the security gate in `tests/security`. Record commands +
  closure evidence.
- **Owning module/service:** `tests/integration/routes/dashboard.test.ts`
  (extend), `tests/integration/routes/dashboardLayout.test.ts` (new, DB-backed),
  `tests/security/codersoSecurityGate.test.ts` (extend), plus the Vitest
  domain/client lanes asserted by L01/L03/L04.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`,
  `_docs/CODERSO_RELEASE_GATES.md`, `_docs/SECURITY_SPEC.md`.
- **Out of scope:** new production code (lives in L01–L04); UI builder tests
  (480-04/05).

---

## Security Contract

- **Endpoint visibility:** n/a (test-only). Tests **assert** the contract:
  `internal` routes, `content:read` reads, `dashboard:write` writes, CSRF on
  writes, `admin` rate-limit bucket, reject-unknown, no-secret responses.
- **Validation:** the security lane confirms reject-unknown and that the
  security-summary widget response contains no raw settings keys
  (`password`/`secret`/`token`/`apiKey`/`connectionString`).
- **Secret handling:** a dedicated assertion scans serialized widget-data + layout
  responses for forbidden secret-shaped keys.

---

## Implementation Pseudocode

### A) Route registration + RBAC + reject-unknown (Bun, no DB)

Extend `tests/integration/routes/dashboard.test.ts` (current harness already
captures `method path` and the `requirePermission` arg). Add `put`/`post` to the
mock router and capture per-route permission + validate calls.

```ts
const makeRouter = () => {
  const routes: Route[] = [];
  const r = {
    get: (p, ...h) => routes.push({ method: "GET", path: p, handlers: h }),
    put: (p, ...h) => routes.push({ method: "PUT", path: p, handlers: h }),
    post: (p, ...h) => routes.push({ method: "POST", path: p, handlers: h }),
  };
  return { routes, router: r };
};

test("wires layout + widget-data routes with correct permissions", () => {
  const perms: Record<string, string> = {};
  registerDashboardRoutes(router, {
    requirePermission: (p) => { const h = async () => undefined; (h as any).perm = p; return h; },
    validate: () => {},
  });
  // assert presence:
  expect(paths).toEqual(expect.arrayContaining([
    "GET /dashboard", "GET /dashboard/layout", "PUT /dashboard/layout",
    "POST /dashboard/layout/reset", "GET /dashboard/widget-data",
    "POST /dashboard/widget-data",
  ]));
  // assert read=content:read, write=dashboard:write (inspect captured perm on guard handler)
});

test("PUT /dashboard/layout rejects unknown fields", async () => {
  // validate dep throws on unknown -> handler maps to dashboard_layout_invalid/400
  // call the captured PUT handler with { widgets: [...], bogus: 1 } and a throwing validate
  // expect ApiError code === "dashboard_layout_invalid", status 400
});

test("missing user id -> auth_required", async () => {
  // call GET /dashboard/layout handler with ctx.user undefined
  // expect ApiError code auth_required / 401
});

test("widget-data resolver failure is isolated (no 500)", async () => {
  // stub one resolver to throw; POST handler returns entries with status:"error" code, HTTP-level resolves
});
```

### B) DB round-trip + per-user isolation (Bun, DB)

New `tests/integration/routes/dashboardLayout.test.ts`. Guard with the project's
DB-available helper (skip pattern used by other DB route tests) and load env.

```ts
test("layout persists per user and isolates", async () => {
  const a = await writeDashboardLayout(userA, validLayout);
  const b = await readDashboardLayout(userB);     // userB unsaved -> default
  expect(b).toEqual(DEFAULT_DASHBOARD_LAYOUT);    // 480-02 owns DEFAULT_DASHBOARD_LAYOUT
  const a2 = await readDashboardLayout(userA);
  expect(a2.widgets.map(w => w.type)).toEqual(validLayout.widgets.map(w => w.type));
});

test("write rejects unknown widget type / oversize", async () => {
  await expect(writeDashboardLayout(userA, { widgets: [{ ...x, type: "nope" }] }))
    .rejects.toThrow();                            // dashboard_layout_invalid
});

test("reset deletes the row -> default", async () => {
  await writeDashboardLayout(userA, validLayout);
  expect(await resetDashboardLayout(userA)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
});
```

### C) Security gate (Bun)

Extend `tests/security/codersoSecurityGate.test.ts`:

- The three write paths (`PUT /dashboard/layout`, `POST /dashboard/layout/reset`,
  `POST /dashboard/widget-data`) appear in the CSRF-required / `admin`
  rate-limit-bucket buckets.
- `dashboard:write` exists in `listPermissionIds()` and is **not** in the public
  permission surface.
- No-secret assertion: serialize a sample widget-data response and assert it has
  no key matching `/password|secret|token|apikey|connectionstring/i`.

### D) Domain + client (Vitest) — asserted by L01/L03/L04, run here as the gate

- `dashboardLayout`: normalize/reject-unknown, dup-id, cap, migrate-default.
- `dashboardWidgetData`: batch fan-out + per-widget isolation + no-secret summary.
- `dashboardClient`: cache hydrate/revalidate, cacheBus invalidation, type-guard,
  no mount-force refetch.

**Data flow:** registration tests use the mock router (no server boot); DB tests
call the repository directly under a transaction/cleanup; security tests assert
the static contract registry. No live network.

**Error handling:** assert mapped `ApiError` codes/status, not raw throws.

---

## Testing Requirements

Load env before DB lanes: `set -a && source .env && set +a`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/dashboard.test.ts`
- `bun test tests/integration/routes/dashboardLayout.test.ts` (DB; skip-with-reason
  if no database)
- `bun test tests/security/codersoSecurityGate.test.ts`
- `bun --cwd core test:vitest -- dashboardLayout dashboardWidgetData dashboardClient`

Record exact pass/fail counts in the closeout. If the DB lane is skipped, state it
explicitly and why (no silent skips).

---

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md` — note the dashboard persistence lanes if a new file
  is introduced.
- Subtask `TASK-480-03` closure: paste command results.
- Board status; changelog entry on subtask closure.

---

## Closure Checklist

- [ ] Bun route registration + RBAC + reject-unknown + error-map tests green.
- [ ] DB round-trip + per-user isolation green (or skip justified).
- [ ] Security gate green; `dashboard:write` recognized; no-secret assertion passes.
- [ ] Vitest domain + client lanes green.
- [ ] Evidence recorded; board + changelog synced.
