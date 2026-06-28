# TASK-482-08-L02: Self-disable boundary assertions (installer + wizard)
# FileName: TASK-482-08-L02-Self-Disable-Boundary.md

**Parent Subtask:** TASK-482-08
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-08-L01, TASK-482-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Lock in the cross-cutting self-disable invariant as an explicit,
  permanent security boundary: once **any** user exists, the pre-auth installer
  is closed server-side (status `available:false`, create returns 409), and once
  `setup.completed` is true the post-login wizard never renders. This leaf owns
  the dedicated boundary test that asserts both, and confirms the env
  `seedAdmin()` path coexists (a seeded user also disables the installer).
- **Owning module(s):** no new product code beyond hardening assertions; this is
  primarily a **security test** plus any small fixes uncovered (e.g. ensuring the
  status endpoint and create endpoint share the **same** `isFirstRun` source so
  they cannot disagree).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`.
- **Out-of-scope:** finalize logic (08-L01); installer UI (03).

## Security Contract

- **Endpoint visibility:** asserts the public `/auth/install/*` surface and the
  internal wizard gate.
- **Auth model:** the installer endpoints are session-less and gated purely by
  `isFirstRun()`; the wizard gate is session-bound.
- **RBAC permission(s):** none for the installer (no-users gate is the control);
  `settings:read` to observe `setup.completed`.
- **CSRF:** status is GET (none); create is the documented CSRF-exempt session-
  less write (02-L02).
- **Rate-limit bucket:** `auth` for installer endpoints.
- **Validation:** unchanged; this leaf asserts behaviour.
- **Anti-abuse — the invariant under test:**
  - `countUsers() > 0` ⇒ `GET /auth/install/status` returns `{ available:false }`.
  - `countUsers() > 0` ⇒ `POST /auth/install/admin` returns 409
    `install_unavailable` (gate re-checked in tx, 02-L01).
  - A user created via `seedAdmin()` (env path) disables the installer exactly
    like an installer-created admin — both increment the same count.
  - `setup.completed === true` ⇒ `shouldShowSetupWizard(...)` is false.
- **Secret/PII handling:** status leaks only a boolean; assert no count/email in
  the response.

## Implementation Pseudocode

```ts
// Boundary test outline (Bun):
test("installer self-disables once any user exists", async () => {
  // 1. Fresh DB: status.available === true
  expect((await GET("/auth/install/status")).available).toBe(true);

  // 2. Create the first admin (installer OR seedAdmin()).
  await POST("/auth/install/admin", validAdminBody); // or run seedAdmin()

  // 3. Installer is now closed.
  expect((await GET("/auth/install/status")).available).toBe(false);
  const second = await POST("/auth/install/admin", validAdminBody);
  expect(second.status).toBe(409); // install_unavailable

  // 4. Status body carries no count/PII.
  expect(Object.keys(await GET("/auth/install/status"))).toEqual(["available"]);
});

test("seedAdmin path also disables installer", async () => {
  await seedAdmin(); // env ADMIN_EMAIL/ADMIN_PASSWORD
  expect((await GET("/auth/install/status")).available).toBe(false);
});
```

- **Data flow:** DB user count + `setup.completed` flag → endpoint/gate responses.
- **Error handling:** the second create maps `first_run_unavailable` → 409 via
  `mapInstallRouteError`.
- **Regression-test shape:** the four invariant bullets above, each asserted.

## Testing Requirements

- **Lane:** Bun security lane — `tests/security/installerSelfDisable.test.ts`
  (runtime/route + DB state ⇒ Bun). Plus a Vitest unit for
  `shouldShowSetupWizard`/`shouldShowInstaller` with `setupCompleted:true` /
  users-present.
- Keep `tests/security/codersoSecurityGate.test.ts` green.
- No migration artifacts.
