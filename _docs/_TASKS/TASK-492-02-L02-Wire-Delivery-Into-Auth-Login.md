# TASK-492-02-L02: Wire delivery into `POST /auth/login`

# FileName: TASK-492-02-L02-Wire-Delivery-Into-Auth-Login.md

**Parent Subtask:** TASK-492-02
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-02-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-05
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Invoke the login-alert delivery service from the existing `shouldAlert` branch in
`POST /auth/login`, behind an injectable dependency, so a new-device/new-location
login produces an actual notification in addition to the `auth.login.alert` audit
record — without ever blocking or failing the login response.

### Owning module(s) to create-or-extend
- `core/server/routes/authRoutes.ts` — extend `AuthRouteDeps` (lines 40-53) with
  `deliverLoginAlert?: typeof deliverLoginAlert` (default = the real service from
  TASK-492-02-L01); resolve it in `registerAuthRoutes` (lines 161-173, e.g.
  `const sendLoginAlert = deps.deliverLoginAlert ?? deliverLoginAlert`); call it in
  the `shouldAlert` branch (the `if (shouldAlert)` block, lines 237-252) after
  writing the `auth.login.alert` audit record.
- **Test-harness reality (read before writing the route test):** the existing
  `tests/integration/routes/auth.test.ts` harness injects only
  `validate`/`logAudit`/`requireAuth`/`resolvePermissionSnapshot`/
  `consumeResetTokenWithStatus` and exercises `GET /auth/me` and
  `POST /auth/reset/confirm` — there is **no `POST /auth/login` happy-path test**,
  and the login handler reaches the `shouldAlert` branch only after
  `getSecuritySettings`, `enforceBotProtection`, `getUserByEmail`, `verifyPassword`,
  `getLastSessionFingerprint`, `evaluateLoginAlert`, `createSession` and
  `updateLastLogin` — all **module-level imports, not in `AuthRouteDeps`**
  (lines 40-53). To assert delivery fires iff `shouldAlert`, this leaf must **also
  widen `AuthRouteDeps`** with the login-gate prerequisites needed to drive a
  successful login in the route lane (at minimum injectable `getSecuritySettings`,
  `getUserByEmail`, `verifyPassword`, `getLastSessionFingerprint` +
  `evaluateLoginAlert`, and `createSession`, each defaulting to the real import) —
  **or** move the behavioral assertion to a service-level test (see Testing
  Requirements). Pick one and keep the pseudocode + test sections consistent with it.

### Source-of-truth docs
- `_docs/AUTH_SPEC.md` (login flow; session cookie; alert behavior)
- `_docs/SECURITY_SPEC.md` (auth rate-limit + bot protection on login)
- `_docs/CMS_API.md` (`POST /auth/login`, lines ~3370; public auth endpoints)

### Out-of-scope
- The delivery service internals (TASK-492-02-L01).
- Admin UI (TASK-492-03).

## Security Contract
- **Endpoint visibility:** public — `POST /auth/login`
  (`core/server/routes/authRoutes.ts:185`). No new endpoint is added; this leaf
  only adds a side-effect inside the existing handler.
- **Auth model:** credential verification already happened above the branch
  (`verifyPassword`, line 202). Delivery runs only after a successful login.
- **CSRF:** N/A for the public login endpoint (it issues the session/CSRF token).
- **Rate-limit bucket:** `auth` (already applied to `/auth/login`); plus
  `enforceBotProtection({ action: "login" })` (lines 190-195). Delivery adds no
  new client-controllable amplification: it fires at most once per successful
  alerting login, and the delivery service itself bounds attempts/timeout.
- **Validation:** the login body is already validated by `authLoginSchema`
  (line 186); no new input.
- **Anti-abuse for public writes:** unchanged (login is not a public content
  write; existing nonce/captcha-equivalent is bot protection on the login action).
- **Secret/PII handling:** pass the **already PII-resolved** email via the
  existing `resolveUserEmail(user)` helper (line 70) — do not re-decrypt or log
  the raw encrypted email. The delivery call is wrapped so a delivery failure is
  swallowed (logged into `deliveryError` by the service) and never alters the
  `200` login response or leaks an error to the client.

## Implementation Pseudocode

```ts
// authRoutes.ts
import { deliverLoginAlert } from "../../services/auth/loginAlertDeliveryService";

// AuthRouteDeps (add):
//   deliverLoginAlert?: typeof deliverLoginAlert;

// registerAuthRoutes (resolve default):
const sendLoginAlert = deps.deliverLoginAlert ?? deliverLoginAlert;

// inside POST /auth/login, the existing shouldAlert branch (lines 232-252):
if (shouldAlert) {
  await writeAudit({
    actorId: user.id,
    action: "auth.login.alert",
    targetType: "user",
    targetId: user.id,
    metadata: {
      newDevice: alertFlags.newDevice,
      newLocation: alertFlags.newLocation,
      lastIp: lastFingerprint?.ip ?? null,
      lastUserAgent: lastFingerprint?.userAgent ?? null,
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  // NEW: best-effort, FIRE-AND-FORGET delivery (audit M3): detached, never
  // awaited inline, never blocks/fails the login response. The service is
  // designed not to throw; the catch is a defensive guard on the detached task.
  try {
    void sendLoginAlert({
      user: { id: user.id, email: resolveUserEmail(user), name: user.name ?? null },
      flags: alertFlags,
      current: { ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null },
      at: new Date(),
    }).catch(() => undefined);
  } catch {
    // delivery service is designed not to throw; defensive guard only.
  }
}

return { user: toPublicUser(user), session: { expiresAt: session.expiresAt } };
```

- **Data flow:** successful login → detect alert (existing) → audit (existing) →
  `sendLoginAlert` (new, FIRE-AND-FORGET — invoked via `void ... .catch()`,
  detached, never awaited inline) → unchanged `200` response.
- **Error handling:** the delivery service returns a status union and self-records
  `deliveryError`; the route wraps the call in a defensive `try/catch` so no
  domain error reaches the client. No new `map*Error` codes.
- **No DB migration.**

### Regression-test shape (Bun, route integration)
Extend `tests/integration/routes/auth.test.ts`. The existing harness injects only
`validate`/`logAudit`/`requireAuth` and drives **no** successful login, so first
widen `AuthRouteDeps` (see Owning module(s)) and inject stubs for the login-gate
prerequisites — `getSecuritySettings` → `loginAlerts` enabled + a flag;
`getUserByEmail` → an active user; `verifyPassword` → `true`;
`getLastSessionFingerprint` + `evaluateLoginAlert` → a `newDevice`/`newLocation`
flag; `createSession` → a fake session — plus a spy `deliverLoginAlert` and a stub
`logAudit`:
```ts
test("login invokes deliverLoginAlert when shouldAlert is true", ...);  // spy dep
test("login does NOT invoke deliverLoginAlert when settings disabled / no flag", ...);
test("login still returns 200 when deliverLoginAlert rejects", ...);    // reject dep
test("deliverLoginAlert receives PII-resolved email + alert flags", ...);
```
If widening `AuthRouteDeps` with the login-gate prerequisites is judged too broad,
move the "invoked-iff-`shouldAlert` / payload / swallows-rejection" behavioral
assertions to a service-level test around `deliverLoginAlert` (TASK-492-02-L01's
lane) and keep only a route-registration assertion here. State which path was taken.

## Testing Requirements
- **Lane:** Bun (`tests/integration/routes/auth.test.ts`) — route-integration /
  runtime flow using the file's `makeRouter` + `AuthRouteDeps` injection (no real
  db/SMTP). Caveat: the existing file has **no login happy-path test** and the login
  handler's prerequisites (`getSecuritySettings`/`getUserByEmail`/`verifyPassword`/
  `getLastSessionFingerprint`/`evaluateLoginAlert`/`createSession`) are module-level,
  not injectable — so this leaf must **widen `AuthRouteDeps`** with those login-gate
  prerequisites (see Owning module(s)) before the `shouldAlert` branch is reachable,
  **or** relocate the behavioral assertion to a service-level test around
  `deliverLoginAlert` and keep only a route-registration check here. Say which in the
  implementation.
- Assert: delivery invoked iff `shouldAlert`; login response unaffected by
  delivery rejection; correct payload (PII-resolved email, flags) handed to the
  dep.
- No DB migration artifacts.
