# TASK-004-04: Auth Middleware
# FileName: TASK-004-04_Auth_middleware.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-03
**Status:** Done (2026-01-27)

---

## Overview

Middleware auth zakonczony. Odpowiada za podpiecie usera do kontekstu
requestu oraz enforce login.

---

## Implementation Summary

Zaimplementowane w:
- `core/server/middleware/auth.ts`
  - `attachUserFromSession(ctx)`
  - `requireAuth()`
- `core/services/auth/userService.ts`
  - `getUserById`

Zasady:
- Odczyt cookie `SESSION_COOKIE_NAME`.
- Sesja musi byc aktywna i nie wygasla.
- Uzytkownik musi miec status `active`.

---

## Implementation Details (reference)

**Flow:**
1) Parsuj `Cookie` header.\n
2) Pobierz token sesji.\n
3) `getSessionByToken(token)` -> sprawdz `expiresAt` + `revokedAt`.\n
4) `getUserById(session.userId)`.\n
5) Jesli `user.status !== "active"` -> ignore.\n
6) Ustaw `ctx.user` i `ctx.sessionId`.\n

**Errors:**
- `requireAuth()` rzuca `auth_required` (mapowane na 401).\n

**OptionalAuth (jesli dodasz):**
- nie rzuca erroru; tylko ustawia `ctx.user` gdy jest sesja.\n

---

## Reference Snippet

```ts
export async function attachUserFromSession(ctx: AuthContext) {
  const token = ctx.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return;

  const session = await getSessionByToken(token);
  if (!session) return;

  const user = await getUserById(session.userId);
  if (!user || user.status !== "active") return;

  ctx.user = { id: user.id, email: user.email, name: user.name };
  ctx.sessionId = session.id;
}
```

---

## Tests (templates)

```ts
const ctx = { cookies: { session: token } };
await attachUserFromSession(ctx);
expect(ctx.user?.id).toBe(userId);
```

```ts
const guard = requireAuth();
await expect(guard({} as AuthContext)).rejects.toThrow("auth_required");
```

---

## Tests

- `tests/unit/auth/sessionService.test.ts`
- `tests/unit/auth/rbac.test.ts` (posrednio przez attach)

---

## Documentation Updates

- `_docs/AUTH_SPEC.md`
- `_docs/SECURITY_SPEC.md`

---

## Changelog Entry

- `_docs/_CHANGELOG/004-2026-01-25-auth-rbac-admin-api.md`
