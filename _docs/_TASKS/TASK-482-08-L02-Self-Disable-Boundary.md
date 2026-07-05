# TASK-482-08-L02: Self-disable boundary assertions (installer + wizard)
# FileName: TASK-482-08-L02-Self-Disable-Boundary.md

**Parent Subtask:** TASK-482-08
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-08-L01, TASK-482-02-L02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Lock in the cross-cutting self-disable invariant as an explicit,
  permanent security boundary: once **any** user exists, the pre-auth installer
  is closed server-side (status `available:false`, create returns 409), and once
  `setup.completed` is true the post-login wizard never renders. This leaf owns
  the dedicated boundary test that asserts both, and confirms the env
  `seedAdmin()` path (`core/db/seed.ts`) coexists: a seeded user also disables
  the installer, asserted at the `countUsers` seam — never by running the real
  `seedAdmin()` in tests (see the shared-DB pin below).
- **Shared-DB pin (coordination, mandatory):** all TASK-482/483/484 streams and
  the owner share ONE remote Postgres (render.com, `DATABASE_URL` in `.env`).
  This leaf's tests MUST NOT delete/truncate `users`, flip the real DB into a
  global no-users install state, run the real `seedAdmin()` (env
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`), or reset shared settings rows. First-run /
  no-users gates are tested exclusively via service-level seams and injected
  fakes (the `InstallRouteDeps.isFirstRun` seam from 01-L02 and the
  `countUsers`/`countUsersTx` seam from 01-L01/02-L01). Real-DB TOCTOU/count
  behaviour is owned by 02-L01's `tests/security/firstAdminRace.test.ts` with
  its uniquely-scoped, self-restoring fixtures — this leaf does not duplicate
  it.
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
// Boundary test outline (Bun, tests/security/installerSelfDisable.test.ts).
// NO real DB: fake-router + injected-deps pattern, exactly like
// tests/integration/routes/adminUsers.test.ts (makeRouter/findRoute/runRoute
// helpers, bun:test). Register the real route module with fakes:
//   registerInstallRoutes(router, { validate, isFirstRun: fake, ... })
// via the InstallRouteDeps.isFirstRun seam (01-L02). If 02-L02's create
// handler binds createFirstAdmin directly, extend InstallRouteDeps with an
// optional injectable createFirstAdmin (additive, same pattern as isFirstRun).

test("status is open only while isFirstRun() is true", async () => {
  // isFirstRun fake → true: status handler returns { available: true }.
  // isFirstRun fake → false: returns { available: false }.
  // Same injected isFirstRun drives both — status and create cannot disagree.
});

test("create returns 409 install_unavailable once any user exists", async () => {
  // createFirstAdmin fake throws first_run_unavailable (the 02-L01 domain
  // code); assert mapInstallRouteError maps it to ApiError 409.
});

test("status body carries no count/PII", async () => {
  // Object.keys(statusBody) is exactly ["available"] — no count, no email.
});

test("seedAdmin coexists via the same countUsers source", async () => {
  // Source-agnostic invariant, asserted at the service seam WITHOUT running
  // the real seedAdmin(): isFirstRun() === (countUsers() === 0), so ANY row
  // in users — installer-created or seeded by core/db/seed.ts#seedAdmin —
  // closes the installer. Stub countUsers → 1 and assert isFirstRun-derived
  // availability is false regardless of how the user row originated.
});
```

- **Data flow:** injected `isFirstRun`/`countUsers` fakes (standing in for the
  DB user count) + `setup.completed` flag → endpoint/gate responses. Real-DB
  count/TOCTOU coverage lives in 02-L01's `firstAdminRace.test.ts` only.
- **Error handling:** a create attempted while users exist maps
  `first_run_unavailable` → 409 via `mapInstallRouteError`.
- **Regression-test shape:** the four invariant bullets above, each asserted.

## Testing Requirements

- **Lane:** Bun security lane — `tests/security/installerSelfDisable.test.ts`
  (route/runtime + security boundary ⇒ Bun), using the fake-router +
  injected-deps pattern from `tests/integration/routes/adminUsers.test.ts` —
  no real-DB access, per the shared-DB pin above. Plus a Vitest unit for
  `shouldShowSetupWizard`/`shouldShowInstaller` with `setupCompleted:true` /
  users-present.
- Keep `tests/security/codersoSecurityGate.test.ts` green.
- No migration artifacts.
