# TASK-482-09-L01: Fresh-DB E2E onboarding flow (installer → login → Basic → starter → Advanced → finalize)
# FileName: TASK-482-09-L01-E2E-Onboarding-Flow.md

**Parent Subtask:** TASK-482-09
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-08
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A single Bun integration test that drives the entire onboarding
  pipeline against a freshly migrated, empty database and asserts each boundary
  in sequence, including the self-disable edge.
- **Owning module(s) to create:** `tests/integration/routes/onboardingFlow.test.ts`
  (new). Uses the existing route test harness (same setup as
  `tests/integration/routes/install.test.ts` / `settings.test.ts`).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** unit-level coverage (owned per leaf); visual/Playwright
  checks (optional, not required for the gate).

## Security Contract

- **Endpoint visibility:** exercises both the public `/auth/install/*` surface and
  the internal `/admin/api/*` settings + starter-content endpoints.
- **Auth model:** starts session-less (installer), then session-bound (post-login
  wizard). The test must assert the transition (no session before create; valid
  session after login).
- **RBAC permission(s):** verifies the first admin has `['*']` (can write
  settings + install starter content).
- **CSRF:** asserts the install create is accepted without CSRF (session-less)
  while internal settings/starter writes **require** CSRF.
- **Rate-limit bucket:** optional — may assert the `auth` bucket throttles a
  burst on the installer.
- **Validation:** asserts strict-schema rejections at each step.
- **Anti-abuse:** asserts the post-install self-disable (status flips, second
  create 409).
- **Secret/PII handling:** asserts Advanced secrets are not echoed back in any
  GET during the flow.

## Implementation Pseudocode

```ts
test("fresh DB onboarding end to end", async () => {
  // PHASE 1 — installer
  expect((await GET("/auth/install/status")).available).toBe(true);
  await POST("/auth/install/admin", { name, email, password });             // 200
  expect((await GET("/auth/install/status")).available).toBe(false);        // self-disable
  expect((await POST("/auth/install/admin", { name, email, password })).status).toBe(409);

  // LOGIN
  const session = await POST("/auth/login", { email, password });           // cookie set
  const csrf = await GET("/auth/csrf", session);

  // PHASE 2 — Basic (incl. new site.timezone)
  await PATCH("/settings", { "site.name": "Acme", "site.timezone": "Europe/Warsaw",
    "site.publicBaseUrl": "https://acme.test" }, { session, csrf });
  expect((await GET("/settings/site.timezone", session)).value).toBe("Europe/Warsaw");

  // Starter content
  const preview = await POST("/setup/starter-content/preview", { blueprintKey: "default" }, { session, csrf });
  expect(preview.summary.total).toBeGreaterThan(0);
  const applied = await POST("/setup/starter-content/apply", { blueprintKey: "default" }, { session, csrf });
  expect((await GET("/settings", session))["site.homepageId"]).toBeTruthy();

  // Advanced (e.g. storage) — secret not echoed
  await PATCH("/settings/storage", validStoragePatch, { session, csrf });

  // FINALIZE — install-lock
  await PATCH("/settings", { "setup.completed": true }, { session, csrf });
  expect((await GET("/settings", session))["setup.completed"]).toBe(true);
});
```

- **Data flow:** the full pipeline; each assertion guards one contract.
- **Error handling:** the test fails loudly on any unexpected status/shape.
- **Regression-test shape:** the sequence above is the regression artifact.

## Testing Requirements

- **Lane:** Bun integration (`tests/integration/routes/onboardingFlow.test.ts`) —
  runtime, multi-route, DB-stateful flow ⇒ Bun, never Vitest.
- Must run against a fresh/empty users table (reset between runs per the harness).
- No migration artifacts.
