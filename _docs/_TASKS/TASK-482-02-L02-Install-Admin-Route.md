# TASK-482-02-L02: `POST /auth/install/admin` route (rate-limit + audit + optional session)
# FileName: TASK-482-02-L02-Install-Admin-Route.md

**Parent Subtask:** TASK-482-02
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-02-L01, TASK-482-01-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
- **Out-of-scope:** the create logic + TOCTOU (02-L01); the UI (03).

## Security Contract

- **Endpoint visibility:** **public** — `POST /auth/install/admin` is the
  pre-auth write. This is intentional and is the highest-risk surface in the
  task.
- **Auth model:** **session-less**. There is no actor and therefore **no CSRF
  token can exist**. The compensating boundary is, in order: (1) the fail-closed
  no-users gate (`isFirstRun()` checked at the route AND re-checked inside the
  create transaction in 02-L01); (2) the `auth` rate-limit bucket; (3) strong
  password validation; (4) an audit record. Document this trade-off explicitly
  in `SECURITY_SPEC.md`.
- **RBAC permission(s):** none applicable (no session). The no-users invariant
  is the authorization.
- **CSRF on internal writes:** **exempt by necessity** — `enforceCsrf`
  (`httpServer.ts` line 358) must skip this route (session-bound CSRF cannot
  apply to a session-less request). Add it to the CSRF exemption list the same
  way `/auth/login` and `/auth/reset` are exempt, and assert the exemption is
  scoped to exactly this path.
- **Rate-limit bucket:** `auth` — inherited via the `/auth*` prefix
  (`httpServer.ts` line 331). The bucket identifier should fall back to IP (no
  trustworthy email identity pre-install). Confirm a burst is throttled.
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
router.post("/auth/install/admin", async (ctx) => {
  validate(installAdminSchema, ctx.body); // .strict

  try {
    const admin = await createFirstAdmin(ctx.body as CreateFirstAdminInput); // 02-L01

    await logAudit({
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
    throw mapInstallRouteError(error); // maps first_run_unavailable→409, first_admin_invalid→400
  }
});
```

- **Data flow:** validated body → `createFirstAdmin` → audit → (optional
  session cookie) → `{ ok, user }`.
- **Error handling:** extend `mapInstallRouteError` (01-L02) — `first_run_unavailable`
  → `ApiError("install_unavailable", ..., 409)`; `first_admin_invalid` →
  `ApiError("install_admin_invalid", ..., 400)`; log
  `auth.install.blocked` when the gate rejects a post-install attempt.
- **Regression-test shape:** empty DB POST ⇒ 200 + admin can immediately
  `POST /auth/login`; second POST ⇒ 409 `install_unavailable`; weak password ⇒
  400; unknown body key ⇒ 400 (strict); audit row written.

## Testing Requirements

- **Lane:** Bun route-integration (`tests/integration/routes/install.test.ts`,
  extend) + Bun security lane (`tests/security/installAdmin.test.ts`).
- Route cases: create succeeds, created admin can log in, returned shape has no
  secrets, optional session cookie (if enabled) is httpOnly/secure.
- Security cases: second create ⇒ 409 (fail-closed); weak/short password ⇒ 400;
  strict-schema rejects extra keys; `auth` bucket throttles a burst; CSRF
  exemption is scoped to this path only (other `/admin/api` writes still require
  CSRF); audit `auth.install.admin.created` emitted.
- Update `tests/security/codersoSecurityGate.test.ts` to register this as an
  intentional public, CSRF-exempt, rate-limited write.
- No migration artifacts.
