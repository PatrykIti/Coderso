# TASK-360-01: Admin Permission Snapshot Contract
# FileName: TASK-360-01_Admin_Permission_Snapshot_Contract.md

**Priority:** High
**Category:** Admin UI + Auth Bootstrap + RBAC
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** To Do

---

## Overview

Define the shared Admin permission snapshot consumed by Users, Roles Matrix,
Settings, sidebar links, route guards, and component-level write controls. UI
gating must use one helper and fail closed when permissions are absent/stale.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/services/authClient.ts`
- Area adoption tasks: TASK-355, TASK-356, TASK-359

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Current-user auth route/service | Return redacted effective permissions/roles for the current admin user. |
| `core/admin/services/authClient.ts` | Type and normalize permission snapshot payload. |
| Admin auth provider/hook | Provide stable `can(permission)` helper. |
| Admin shell/router/nav | Use shared helper for route/menu visibility. |
| Tests | Cover payload redaction, missing/unknown permissions fail-closed, route/nav/component use, and stale 403 refresh. |

## Implementation Pseudocode

```ts
type AdminPermissionSnapshot = {
  permissions: string[];
  roles: Array<{ id: string; slug: string; name: string }>;
};

function canAdmin(permission: string, snapshot: AdminPermissionSnapshot | null) {
  if (!snapshot) return false;
  return snapshot.permissions.includes("*") ||
    snapshot.permissions.includes(permission);
}

function useAdminCan() {
  const auth = useAdminAuth();
  return useCallback(
    (permission: string) => canAdmin(permission, auth.user?.permissionSnapshot ?? null),
    [auth.user]
  );
}
```

Data flow:

- Backend resolves effective permissions from current user's roles.
- Current-user endpoint returns only redacted identity, safe role labels, and
  effective permission strings.
- Auth client normalizes payload into `AdminPermissionSnapshot`.
- Admin app exposes one `can(permission)` helper to shell, routes, and pages.
- API 403 remains defense-in-depth and triggers permission refresh when stale.

Error handling:

- Missing snapshot, malformed permissions, or auth bootstrap failure fail closed.
- Unknown permission strings are treated as absent unless backend grants `*`.
- Payload must not block route rendering indefinitely; denied state is explicit.

## Security Contract

- Endpoint visibility: internal admin current-user/bootstrap route.
- Auth model: authenticated admin session.
- RBAC: no extra permission to read the caller's own effective permission
  snapshot.
- CSRF: none for read-only GET.
- Rate-limit bucket: admin/auth bootstrap read with in-flight client dedupe.
- Reject unknown validation: no body; reject unsupported query params.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Secret handling: no cookies, session ids, password hashes, reset tokens, API
  key secrets, provider credentials, or privileged settings in payload/cache.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun route/service tests for authenticated payload, unauthenticated response,
  redaction, malformed source mapping, and route registration.
- Vitest UI tests for `can(permission)`, wildcard, missing snapshot fail-closed,
  sidebar route visibility, and stale 403 permission refresh.
- Area smoke tests can consume the helper without duplicating permission logic.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/AUTH_SPEC.md`
- `_docs/RBAC_SPEC.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Users, Roles Matrix, and Settings consume one shared permission contract.
- Sidebar route links and route guards use the same helper.
- Missing/stale permission data fails closed without leaking secrets.

