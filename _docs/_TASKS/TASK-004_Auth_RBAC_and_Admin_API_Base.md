# TASK-004: Auth, RBAC, and Admin API Base
# FileName: TASK-004_Auth_RBAC_and_Admin_API_Base.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Large
**Dependencies:** TASK-001
**Status:** To Do

---

## Overview

Implement authentication, sessions, RBAC middleware, and the base REST admin
API layer. Required by all admin endpoints (pages, content, media, plugins).

**Goals:**
- Login/logout endpoints with session cookies.
- RBAC enforcement per route.
- Consistent API error format.

---

## Architecture

```
core/server/
  router.ts
  errorHandler.ts
  middleware/
    auth.ts
    rbac.ts
core/server/routes/
  authRoutes.ts
core/services/auth/
  password.ts
  sessionService.ts
  userService.ts
  roleService.ts

core/server/validation/
  authSchemas.ts

tests/unit/auth/
  password.test.ts
  sessionService.test.ts
  rbac.test.ts
```

---

## Sub-Tasks

### TASK-004-01_Password_hashing_and_sessions

**Status:** To Do

Implement password hashing and session creation.

Rules:
- Use argon2id for password hashing (see `AUTH_SPEC.md`).
- Store only session token hash (sha256) in DB.
- Session TTL default 14 days (configurable).

Example:

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

Session fields:
- `ip` and `user_agent` recorded on login.
- `revoked_at` set on logout.
- Update `users.last_login_at` on successful login.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/auth/password.ts` | hash + verify helpers |
| `core/services/auth/sessionService.ts` | create/revoke/find sessions |

Session service sketch:

```ts
export async function createSession(input) {
  return db.insert(sessions).values({
    userId: input.userId,
    tokenHash: input.tokenHash,
    ip: input.ip,
    userAgent: input.userAgent,
    expiresAt: input.expiresAt,
  }).returning();
}
```

---

### TASK-004-02_Auth_middleware

**Status:** To Do

Middleware attaches user to request context.

Steps:
1) Read session cookie.
2) Hash token and fetch session.
3) Reject if expired or revoked.
4) Load user and attach to request context.

Example:

```ts
export async function requireAuth(req, res, next) {
  const session = await getSessionFromCookie(req);
  if (!session) return res.status(401).end();
  req.user = await getUser(session.userId);
  return next();
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/middleware/auth.ts` | requireAuth + optionalAuth |
| `core/services/auth/userService.ts` | getUser helpers |

User service sketch:

```ts
export async function getUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
```

---

### TASK-004-03_RBAC_middleware

**Status:** To Do

Permission checks per request.

Rules:
- Permissions are merged from all roles.
- `*` grants all permissions (admin).

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/middleware/rbac.ts` | requirePermission |
| `core/services/auth/roleService.ts` | role lookup + permission merge |

Role service sketch:

```ts
export async function getUserPermissions(userId: string) {
  const roles = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  return mergePermissions(roles);
}
```

---

### TASK-004-04_Auth_routes_and_base_API_layer

**Status:** To Do

Implement login/logout/me endpoints and base router with error format.

Error format:

```json
{
  "error": { "code": "auth_failed", "message": "Invalid credentials" }
}
```

Endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/csrf`

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/authRoutes.ts` | auth endpoints |
| `core/server/router.ts` | base router + route groups |
| `core/server/errorHandler.ts` | standard error format |
| `core/server/validation/authSchemas.ts` | login payload schema |

Auth routes sketch:

```ts
router.post("/auth/login", async (req) => {
  const user = await login(req.body.email, req.body.password, req.ip, req.ua);
  return json({ user });
});
```

---

## Testing Requirements

- [ ] `tests/unit/auth/password.test.ts` verifies hash/verify.
- [ ] `tests/unit/auth/sessionService.test.ts` creates/revokes sessions.
- [ ] `tests/unit/auth/rbac.test.ts` verifies permission checks.
- [ ] `tests/integration/routes/auth.test.ts` covers login/logout/me.
- [ ] `tests/integration/routes/auth.test.ts` rejects invalid credentials.

Test sketch (sessionService.test.ts):

```ts
it("revokes session", async () => {
  const session = await createSession({ userId, tokenHash, expiresAt });
  await revokeSession(session.id);
  const loaded = await getSessionById(session.id);
  expect(loaded.revokedAt).not.toBeNull();
});
```

---

## New Files to Create

- `core/services/auth/password.ts`
- `core/services/auth/sessionService.ts`
- `core/services/auth/userService.ts`
- `core/services/auth/roleService.ts`
- `core/server/middleware/auth.ts`
- `core/server/middleware/rbac.ts`
- `core/server/routes/authRoutes.ts`
- `core/server/validation/authSchemas.ts`
- `core/server/errorHandler.ts`
- `tests/unit/auth/password.test.ts`
- `tests/unit/auth/sessionService.test.ts`
- `tests/unit/auth/rbac.test.ts`
- `tests/integration/routes/auth.test.ts`

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` (auth flow details).
- `_docs/SECURITY_SPEC.md` (auth middleware).
- `_docs/CMS_API.md` (auth endpoints).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-rbac-admin-api.md`
- Notes: auth, RBAC, session cookies, base REST layer.

---

## Additional Docs

- `_docs/RBAC_SPEC.md`
