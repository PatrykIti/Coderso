# TASK-004: Auth, RBAC, and Admin API Base
# FileName: TASK-004_Auth_RBAC_and_Admin_API_Base.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Large
**Dependencies:** TASK-001
**Status:** To Do

---

## Overview

Implement authentication, sessions, RBAC middleware, and the base REST admin API
layer. This is required for all admin endpoints (pages, content, media, plugins).

**Goals:**
- Login/logout endpoints with session cookies.
- RBAC enforcement per route.
- CSRF protection for mutations.

---

## Architecture

```
core/server/
  router.ts
  middleware/
    auth.ts
    rbac.ts
    csrf.ts
core/services/auth/
  password.ts
  sessionService.ts
  userService.ts
```

---

## Sub-Tasks

### TASK-004-01_Password_hashing_and_sessions

**Status:** To Do

Example (pseudo):

```ts
const passwordHash = await passwordHasher.hash(password);
const ok = await passwordHasher.verify(passwordHash, password);
```

Session creation:

```ts
const token = randomToken();
await createSession(userId, tokenHash(token), ttl);
setCookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });
```

---

### TASK-004-02_Auth_middleware

**Status:** To Do

Example:

```ts
export async function requireAuth(req, res, next) {
  const session = await getSessionFromCookie(req);
  if (!session) return res.status(401).end();
  req.user = await getUser(session.userId);
  return next();
}
```

---

### TASK-004-03_RBAC_middleware

**Status:** To Do

Example:

```ts
export function requirePermission(permission: string) {
  return async (req, res, next) => {
    const roles = await getUserRoles(req.user.id);
    if (!hasPermission(roles, permission)) return res.status(403).end();
    return next();
  };
}
```

---

### TASK-004-04_REST_admin_API_base

**Status:** To Do

Implement base route grouping and error format per `CMS_API.md`.

---

## Testing Requirements

- [ ] Login success/fail.
- [ ] Session cookie issued and revoked.
- [ ] RBAC denies forbidden route.
- [ ] CSRF required for mutation endpoints.

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` (if auth flow changes).
- `_docs/SECURITY_SPEC.md` (if middleware changes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-rbac-admin-api.md`
- Notes: auth, RBAC, session cookies, base REST layer.

---

## Additional Docs

- `_docs/CMS_API.md` (auth endpoints).
