# TASK-004-05: RBAC Middleware
# FileName: TASK-004-05_RBAC_middleware.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-03
**Status:** Done (2026-01-27)

---

## Overview

RBAC middleware zakonczony. Odpowiada za sprawdzanie uprawnien per route.

---

## Implementation Summary

Zaimplementowane w:
- `core/server/middleware/rbac.ts`
  - `requirePermission(permission)`
- `core/services/auth/roleService.ts`
  - `getUserPermissions`
  - `mergePermissions`
  - `hasPermission`

Zasady:
- `*` = full access.
- Permissions agregowane z wielu rol.

---

## Implementation Details (reference)

**Permission merge:**
- `mergePermissions` powinien unikac duplikatow.\n
- `hasPermission` zwraca true gdy `permissions.includes("*")`.\n

**RBAC flow:**
1) `requirePermission(permission)`.\n
2) Jesli `ctx.user.id` brak -> `auth_required`.\n
3) Pobierz role + permissions.\n
4) Jesli brak -> `forbidden`.\n

---

## Reference Snippet

```ts
export function requirePermission(permission: string) {
  return async (ctx: RbacContext) => {
    if (!ctx.user?.id) throw new Error("auth_required");
    const permissions = await getUserPermissions(ctx.user.id);
    if (!hasPermission(permissions, permission)) {
      throw new Error("forbidden");
    }
  };
}
```

---

## Tests (templates)

```ts
expect(hasPermission(["*"], "pages:write")).toBe(true);
expect(hasPermission(["pages:read"], "pages:write")).toBe(false);
```

```ts
const guard = requirePermission("pages:write");
await expect(guard({ user: { id: "u1" } })).rejects.toThrow("forbidden");
```

---

## Tests

- `tests/unit/auth/rbac.test.ts`

---

## Documentation Updates

- `_docs/RBAC_SPEC.md`

---

## Changelog Entry

- `_docs/_CHANGELOG/004-2026-01-25-auth-rbac-admin-api.md`
