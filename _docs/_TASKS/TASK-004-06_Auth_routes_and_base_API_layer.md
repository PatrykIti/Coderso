# TASK-004-06: Auth Routes and Base API Layer
# FileName: TASK-004-06_Auth_routes_and_base_API_layer.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-03, TASK-004-04, TASK-004-05
**Status:** In Progress (2026-01-27)

---

## Overview

Podstawowa warstwa admin API + login/logout/me endpoints. Czesc
zaimplementowana, pozostale elementy sa zalezne od TASK-004-01 i TASK-004-02.

---

## Current State (already implemented)

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Zaimplementowane w:
- `core/server/routes/authRoutes.ts`
- `core/server/errorHandler.ts`
- `core/server/validation/authSchemas.ts`

**Behavior (obecnie):**
- `POST /auth/login` sprawdza haslo i status `active`.\n
- Ustawia cookie `SESSION_COOKIE_NAME`.\n
- Loguje audit `auth.login`.\n
- `GET /auth/me` zwraca `{ user }`.\n

---

## Remaining Work

- Rejestracja routow w `core/server/routes/index.ts` (z TASK-004-01).
- Podpiecie routera do HTTP servera (TASK-004-01).
- Dodanie `/auth/csrf` i reset/otp (TASK-004-02).
- Ujednolicenie error responses w HTTP handlerze.

---

## Implementation Checklist

| File | What to Add / Change |
| --- | --- |
| `core/server/routes/authRoutes.ts` | upewnic sie, ze login/logout/me zwracaja `ApiError` na bledy |
| `core/server/errorHandler.ts` | status mapping + error shape |
| `core/server/routes/index.ts` | rejestracja `registerAuthRoutes` |
| `core/server/validation/authSchemas.ts` | login schema + errors |

**Expected responses:**\n
- `POST /auth/login` success: `{ user, session: { expiresAt } }`\n
- error: `{ error: { code, message } }`\n

**Login validation:**\n
- email required, password min length 8.\n
- errors z `validate()` powinny mapowac na `validation_error`.\n

---

## Reference Snippets (routes)

```ts
router.post("/auth/login", async (ctx) => {
  validate(authLoginSchema, ctx.body);
  const { email, password } = ctx.body as { email: string; password: string };
  const user = await getUserByEmail(email);
  if (!user || user.status !== "active") {
    throw new ApiError("auth_failed", "Invalid credentials", 401);
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw new ApiError("auth_failed", "Invalid credentials", 401);

  const { token, session } = await createSession({ userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });
  ctx.setCookie?.(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
  await updateLastLogin(user.id);

  return { user: { id: user.id, email: user.email, name: user.name ?? null }, session: { expiresAt: session.expiresAt } };
});
```

```ts
router.post("/auth/logout", requireAuth, async (ctx) => {
  const token = ctx.cookies?.[SESSION_COOKIE_NAME];
  if (token) await revokeSessionByToken(token);
  ctx.clearCookie?.(SESSION_COOKIE_NAME);
  return { ok: true };
});
```

```ts
router.get("/auth/me", requireAuth, async (ctx) => {
  if (!ctx.user) throw new ApiError("auth_required", "Not authenticated", 401);
  return { user: ctx.user };
});
```

---

## Tests (detailed templates)

### `tests/unit/auth/authRoutes.test.ts`

```ts
import { expect, test } from "bun:test";
import { registerAuthRoutes } from "../../../core/server/routes/authRoutes";

test("registerAuthRoutes wires auth endpoints", () => {
  const routes: Array<{ method: string; path: string }> = [];
  const router = {
    routes,
    get: (path: string) => routes.push({ method: "GET", path }),
    post: (path: string) => routes.push({ method: "POST", path }),
    patch: () => undefined,
    put: () => undefined,
    delete: () => undefined,
    static: () => undefined,
  };
  registerAuthRoutes(router, { requireAuth: () => async () => undefined, validate: () => undefined });
  expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual(
    expect.arrayContaining([
      "POST /auth/login",
      "POST /auth/logout",
      "GET /auth/me",
    ])
  );
});
```

### `tests/integration/routes/auth.test.ts`

```ts
// spin http server from TASK-004-01\n
// POST /admin/api/auth/login -> 200 + session cookie\n
// GET /admin/api/auth/me -> 200 when cookie present\n
// POST /admin/api/auth/logout -> clears cookie\n
```

---

## Testing Requirements

- [ ] `tests/unit/auth/authRoutes.test.ts` (login/logout/me)
- [ ] `tests/integration/routes/auth.test.ts` (wymaga HTTP servera z TASK-004-01)

---

## Documentation Updates Required

- `_docs/CMS_API.md` (auth endpointy)
- `_docs/AUTH_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-routes-base-api.md`
- Notes: login/logout/me + base API layer.
