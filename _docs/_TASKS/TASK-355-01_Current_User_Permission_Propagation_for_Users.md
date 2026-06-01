# TASK-355-01: Current User Permission Propagation for Users
# FileName: TASK-355-01_Current_User_Permission_Propagation_for_Users.md

**Priority:** High
**Category:** Admin UI + Users + Roles + RBAC + Security UX
**Estimated Effort:** Large
**Dependencies:** TASK-355, TASK-360-01
**Status:** To Do

---

## Overview

Make `/admin/users` consume the shared current-user permission snapshot instead
of guessing write access from successful or failed API calls. The page must
support read-only and partial-read modes without avoidable UI-originated 403s.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/ui/users/UserFilters.tsx`
- `core/admin/ui/users/UserList.tsx`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/users/UserEditor.tsx`
- `core/admin/ui/users/InviteUserDialog.tsx`
- `core/admin/ui/roles/RoleEditor.tsx`
- `core/admin/services/adminUsersClient.ts`
- `core/admin/services/adminRolesClient.ts`
- `core/admin/services/authClient.ts`
- `core/server/routes/authRoutes.ts`
- `core/services/auth/roleService.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/server/routes/authRoutes.ts` | Extend the existing `GET /auth/me` handler so it loads the caller's effective permissions from `getUserPermissions(ctx.user.id)` instead of returning only `ctx.user`. |
| `core/services/auth/roleService.ts` | Reuse the existing permission resolver; do not duplicate role traversal in the route or browser. |
| `core/admin/services/authClient.ts` | Return the effective permission snapshot from the current-user bootstrap client without secrets. |
| `core/admin/app/AdminApp.tsx` or current auth provider | Build a stable `can(permission)` helper from the bootstrap payload. |
| `core/admin/ui/users/UsersRolesPage.tsx` | Route-gate Users by `users:read` / `roles:read`, pass explicit access flags, and refresh permissions after stale 403s. |
| `core/admin/ui/users/*` | Hide or disable write controls based on explicit `canWriteUsers` / `canWriteRoles` flags. |
| `tests/vitest/ui/*users*` | Cover admin, read-only, `users:read` only, and `roles:read` only modes. |
| Bun route/auth tests | Cover current-user payload redaction, permissions, unauthenticated response, and mapped errors. |

## Implementation Pseudocode

```ts
type AdminPermission = string;

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  permissions: AdminPermission[];
};

function createPermissionChecker(user: AuthUser | null) {
  const permissions = new Set(user?.permissions ?? []);
  return (permission: AdminPermission) =>
    permissions.has(permission) || permissions.has("*");
}

function resolveUsersAccess(can: (permission: string) => boolean) {
  return {
    canReadUsers: can("users:read"),
    canWriteUsers: can("users:write"),
    canReadRoles: can("roles:read"),
    canWriteRoles: can("roles:write"),
  };
}
```

Data flow:

- Existing `GET /auth/me` currently returns `ctx.user`; extend that route to
  call `getUserPermissions(ctx.user.id)` and attach only redacted permission
  ids to the current-user payload.
- Auth bootstrap loads the caller's redacted effective permission list.
- Admin shell exposes a stable `can(permission)` helper to route guards,
  navigation, and page components.
- `UsersRolesPage` derives access once per bootstrap state and fetches only the
  allowed user/role resources.
- Write controls receive explicit flags; they do not infer permissions from
  local data shape.
- If a mutation still returns 403, show a clear permission-stale message and
  refresh the permission snapshot.

Error handling:

- Missing or malformed permission snapshots fail closed for write controls.
- No `users:read` and no `roles:read` renders the shared access-denied state
  before any users/roles fetch.
- `users:read` only fetches users, hides role cards and role filter controls,
  and displays role names only when included in the user payload.
- `roles:read` only fetches roles/cards, hides the user table and invite
  controls, and shows a read-only "User list unavailable" state.

## Security Contract

- Endpoint visibility: internal admin bootstrap, e.g.
  `GET /admin/api/auth/me` or the existing equivalent.
- Auth model: authenticated admin session; anonymous users receive the existing
  unauthenticated response.
- RBAC: no extra permission is required to read the caller's own effective
  permission snapshot; payload is scoped to the current user only.
- CSRF: not required for GET; the route must remain read-only.
- Rate-limit bucket: `admin_read` for admin permission bootstrap reads, with
  client in-flight dedupe to avoid request bursts.
- Reject unknown validation: no request body; reject unsupported query params.
- Anti-abuse: internal session route only; no nonce, HMAC, or captcha.
- Secret handling: no password hashes, reset tokens, session IDs, cookies, API
  keys, provider secrets, or privileged settings in response/cache/debug data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI tests for restricted/admin/partial-read Users modes.
- Bun auth route tests for authenticated redacted payload, unauthenticated
  response, stale/invalid permission source mapping, and 403-refresh behavior.
- Route registration and centralized `map*Error` coverage for permission
  snapshot failures such as `auth_permission_snapshot_invalid` and
  `auth_permission_snapshot_forbidden`.
- Playwright restricted fixture confirms read-only Users UI cannot open
  submit-ready create/edit/delete flows.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/AUTH_SPEC.md`
- `_docs/RBAC_SPEC.md`
- `docs/guide/screens/users.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- `/admin/users` renders correct admin, read-only, `users:read` only, and
  `roles:read` only states.
- UI write controls are unavailable before API submit when permissions are
  missing.
- Backend RBAC remains the source of truth and still rejects unauthorized
  writes.
