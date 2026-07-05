# TASK-482-02-L02: `POST /auth/install/admin` route (rate-limit + audit + optional session)
# FileName: TASK-482-02-L02-Install-Admin-Route.md

**Parent Subtask:** TASK-482-02
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-02-L01, TASK-482-01-L02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Expose `createFirstAdmin` as `POST /auth/install/admin` behind the
  fail-closed no-users gate, the `auth` rate-limit bucket, strong-password
  validation, and an audit entry. Optionally issue a session on success so the
  installer can hand straight to the Phase-2 wizard; the default/safe path is to
  return success and let the user log in (03-L02 decides the handoff).
- **Owning module(s) to create/extend:** extend
  `core/server/routes/installRoutes.ts` (from 01-L02) with the `POST` handler;
  add `installAdminSchema` to a new `core/server/validation/installSchemas.ts`
  (owns the schema; the route re-exports/uses it, never re-declares). Reuse
  `createSession` + `buildSessionCookieOptions` + `SESSION_COOKIE_NAME` from
  `core/services/auth/sessionService.ts` if the optional session is issued.
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/RBAC_SPEC.md`, `_docs/CMS_API.md`, `_docs/AUDIT_SPEC.md`.
- **Out-of-scope:** the create logic + TOCTOU (02-L01); the UI (03); the spec
  docs `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md` and
  `_docs/AUDIT_SPEC.md` (all written solely by TASK-482-09-L02 — this leaf only
  cites them as source-of-truth).
- **Coordination:** bound by the "Coordination & Pins" section in
  TASK-482-02-First-Admin-Bootstrap.md (shared remote test DB, forbidden paths,
  changelog pin 1220 at the 09 closure, and land order). Shared surfaces this
  leaf touches: `core/server/routes/index.ts` (additive) and
  `core/server/httpServer.ts` — the latter is **one minimal, clearly-delimited
  edit** to the existing `identifierFromBody` conditional (see Rate-limit
  bucket), now enumerated in the parent's shared-surfaces contract. This leaf
  does **NOT** edit the spec docs (`_docs/AUTH_SPEC.md` / `_docs/SECURITY_SPEC.md`
  / `_docs/CMS_API.md` / `_docs/AUDIT_SPEC.md` are all written solely by
  TASK-482-09-L02; this leaf cites them as source-of-truth only). It also does
  **NOT** edit
  `tests/security/codersoSecurityGate.test.ts` (no route-expectation inventory;
  matching 06-L02's stance — see Testing Requirements). No board/changelog
  edits from this leaf.

## Security Contract

- **Endpoint visibility:** **public** — `POST /auth/install/admin` is the
  pre-auth write. This is intentional and is the highest-risk surface in the
  task.
- **Auth model:** **session-less**. There is no actor and therefore **no CSRF
  token can exist**. The compensating boundary is, in order: (1) the fail-closed
  no-users gate (`isFirstRun()` checked at the route AND enforced inside the
  create transaction in 02-L01 via `pg_advisory_xact_lock` + re-check); (2) the
  `auth` rate-limit bucket; (3) strong password validation; (4) an audit
  record. The `SECURITY_SPEC.md` write-up of this trade-off is **owned by
  TASK-482-09-L02** (single writer per doc) — this leaf does NOT edit
  `SECURITY_SPEC.md`.
- **RBAC permission(s):** none applicable (no session). The no-users invariant
  is the authorization.
- **CSRF on internal writes:** **exempt by absence, with no code change** —
  `enforceCsrf` (`core/server/middleware/csrf.ts`, called from `httpServer.ts`
  line 358) auto-skips any request without a session: `if (!ctx.sessionId)
  return;`. There is **no CSRF path/exemption list** to edit; the session-less
  install POST inherits this absence-based skip exactly as the session-less
  `/auth/login` and `/auth/reset` POSTs do. Do **not** add a path entry — assert
  in tests that the session-less POST is accepted without a CSRF token (the skip
  applies precisely because there is no `ctx.sessionId`).
- **Rate-limit bucket:** `auth` — inherited via the `/auth*` prefix
  (`httpServer.ts:328` `isAuthRoute`, `:332` selects the `auth` bucket).
  **Identifier semantics (verified against code):** for any `/auth*` request
  the limiter identifier is taken from `body.email` when present
  (`httpServer.ts:341-346`), and the key is `bucket:ip:ua[:id]`
  (`core/server/middleware/rateLimit.ts:40-45`) — so, unmodified, an attacker
  rotating emails from one IP gets a fresh window per email, and the install
  body always carries an email. This leaf must therefore make **one minimal,
  clearly-delimited edit** to the single existing `identifierFromBody`
  conditional at `httpServer.ts:340-346` — change `isAuthRoute && ctx.body ...`
  to `isAuthRoute && !pathname.startsWith("/auth/install") && ctx.body ...` — so
  the pre-install key degrades to `ip + ua`. This is a **modification of an
  existing line** in the shared request pipeline (NOT a pure append), so it is
  now enumerated in the parent's shared-surfaces contract; coordinate with the
  483/484 streams before landing and escalate to the orchestrator if they also
  edit this rate-limit region. Burst tests must cover both a fixed email AND
  rotating emails to prove the throttle holds either way.
- **Validation schema-owner module:** `installSchemas.ts` →
  `installAdminSchema` with `required: ["name","email","password"]`,
  `additionalProperties: false` (`.strict` — reject unknown keys), `email`
  min/format, `password` `minLength: 8` (align with `authResetConfirmSchema`).
- **Anti-abuse for public writes:** the no-users gate makes this a one-shot
  surface (it self-disables after the first success), so a nonce/HMAC is not
  required; the `auth` bucket covers brute-force of the open window. Optionally
  honour bot-protection (`enforceBotProtection`) if enabled, matching
  `/auth/login`.
- **Secret/PII handling:** never log the password; the audit `metadata` includes
  only the (redacted-as-usual) email per `AUDIT_SPEC.md` PII rules. If a session
  is issued, set it via `ctx.setCookie` with `buildSessionCookieOptions` (httpOnly,
  secure, sameSite=strict) — never return the raw token in the body.

## Implementation Pseudocode

```ts
// Extend InstallRouteDeps (01-L02) with an injectable create seam so route
// tests never touch the real users table (AuthRouteDeps pattern,
// core/server/routes/authRoutes.ts:40-54):
//   createFirstAdmin?: typeof createFirstAdmin;

router.post("/auth/install/admin", async (ctx) => {
  validate(installAdminSchema, ctx.body); // .strict

  const create = deps.createFirstAdmin ?? createFirstAdmin;
  const audit = deps.logAudit ?? logAudit;

  try {
    const admin = await create(ctx.body as CreateFirstAdminInput); // 02-L01

    await audit({
      actorId: admin.id,
      action: "auth.install.admin.created",
      targetType: "user",
      targetId: admin.id,
      metadata: { email: admin.email }, // redaction seam applies
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    // Optional: issue a session for seamless handoff to Phase 2.
    // const { token, ttlDays } = await createSession({ userId: admin.id, ip: ctx.ip, userAgent: ctx.userAgent });
    // ctx.setCookie?.(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(ttlDays));

    return { ok: true, user: { id: admin.id, email: admin.email, name: admin.name } };
  } catch (error) {
    // Boundary convention (core/server/routes/pageRoutes.ts:100-102,
    // emailSettingsRoutes.ts:79-81): map*Error returns `ApiError | null`; an
    // unmapped/unexpected error must re-throw so it surfaces as a proper 500,
    // never `throw null`.
    const mapped = mapInstallRouteError(error); // maps first_run_unavailable→409, first_admin_invalid→400
    if (mapped) throw mapped;
    throw error;
  }
});
```

- **Data flow:** validated body → `createFirstAdmin` → audit → (optional
  session cookie) → `{ ok, user }`.
- **Error handling:** extend `mapInstallRouteError` (01-L02), which returns
  `ApiError | null` per the codebase boundary convention
  (`core/server/routes/pageRoutes.ts:64,100-102`;
  `emailSettingsRoutes.ts:34,79-81`) — `first_run_unavailable` →
  `ApiError("install_unavailable", ..., 409)`; `first_admin_invalid` →
  `ApiError("install_admin_invalid", ..., 400)`; unmapped/unexpected errors
  return `null` so the route re-throws them (`if (mapped) throw mapped; throw
  error;`) and they surface as a real 500 rather than `throw null`; log
  `auth.install.blocked` when the gate rejects a post-install attempt.
- **Regression-test shape (isolated, never against the shared users table):**
  first-run state simulated via injected `isFirstRun`/`createFirstAdmin` deps ⇒
  POST returns 200 with `{ ok, user }` and no secrets; injected
  `first_run_unavailable` (post-install state) ⇒ 409 `install_unavailable`;
  weak password ⇒ 400; unknown body key ⇒ 400 (strict); audit call captured via
  injected `logAudit`. Login-compatibility of the created account (argon2 hash,
  `status: "active"`) is asserted at the service level in 02-L01 via
  `verifyPassword`, not by draining the shared DB and performing a live
  `/auth/login`.

## Testing Requirements

> **Shared-DB isolation (mandatory):** Bun lanes connect to the ONE remote
> Postgres shared with the owner and the parallel TASK-483/484 streams
> (`tests/utils/db.ts` imports the real `core/db/client`). Tests in this leaf
> must NEVER truncate/delete `users`, reach a global no-users state, or leave a
> real, active, `['*']`-role admin with a test-known password in the shared DB.
> See "Coordination & Pins" in TASK-482-02-First-Admin-Bootstrap.md.

- **Lane:** Bun route-integration (`tests/integration/routes/install.test.ts`,
  extend) + Bun security lane (`tests/security/installAdmin.test.ts`), both
  driving an **in-process router** with injected
  `createFirstAdmin`/`isFirstRun`/`logAudit` deps (matching the existing
  `AuthRouteDeps` injection pattern, `core/server/routes/authRoutes.ts:40-54`)
  rather than the real users table. If a live-DB case is genuinely needed, it
  must use a uniquely scoped fixture plus teardown that restores prior state
  (delete exactly the rows it created) and must not simulate first-run by
  emptying `users`.
- Route cases: create succeeds (injected create returns an admin summary),
  returned shape has no secrets, optional session cookie (if enabled) is
  httpOnly/secure, login-handoff contract per the regression-test shape above.
- Security cases: post-install create ⇒ 409 (fail-closed, via injected
  `first_run_unavailable`); weak/short password ⇒ 400; strict-schema rejects
  extra keys; `auth` bucket throttles a burst (fixed email AND rotating emails
  — see Rate-limit bucket); the session-less POST is accepted with no CSRF
  token (absence-based skip), while a session-bound `/admin/api` write still
  requires CSRF; audit `auth.install.admin.created` emitted (captured via
  injected `logAudit`).
- **Security gate — do NOT edit `tests/security/codersoSecurityGate.test.ts`:**
  as of HEAD it is a forms/booking submission-access + nonce **service** gate
  (imports only `evaluateSubmissionAccess`/`assert*SubmissionNonce` and
  `SECURITY_SETTINGS_DEFAULTS`) with no per-route CSRF/RBAC expectation registry
  to append to, and it is a pinned shared surface with the concurrent
  TASK-483/484 streams (matching 06-L02's stance). Assert the install POST's
  intentional contract (public, session-less/CSRF-skipped by absence,
  `auth`-bucket throttled) in the dedicated new file
  `tests/security/installAdmin.test.ts` (already the security lane for this
  leaf, above); leave the shared gate file untouched — 08-L02 only keeps it
  green. Only introduce a route-expectation inventory there via an explicit
  cross-stream decision.
- No migration artifacts.
