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

## Tests

- `tests/unit/auth/rbac.test.ts`

---

## Documentation Updates

- `_docs/RBAC_SPEC.md`

---

## Changelog Entry

- `_docs/_CHANGELOG/004-2026-01-25-auth-rbac-admin-api.md`
