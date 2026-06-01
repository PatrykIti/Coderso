# TASK-355: Admin Users Report Remediation Family
# FileName: TASK-355_Admin_Users_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + RBAC + Users + Security UX + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-1034 audit evidence, TASK-001 auth foundation
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md` into an
execution-ready remediation family for the `/admin/users` surface. The goal is
to fix every Users report finding, not just hide the most visible no-op.

The report proves that the backend correctly rejects unauthorized write
requests, but the frontend still exposes write actions to users without
`users:write` / `roles:write`. It also proves a mixed production/placeholder
surface: some user and role mutations work on fixtures, while `Reset password`,
filter icon behavior, notification switches, and mobile sheet semantics are
misleading.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/ui/users/UserFilters.tsx`
- `core/admin/ui/users/UserList.tsx`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/users/UserEditor.tsx`
- `core/admin/ui/users/InviteUserDialog.tsx`
- `core/admin/ui/users/RoleEditor.tsx`
- `core/admin/services/adminUsersClient.ts`
- `core/admin/services/adminRolesClient.ts`
- `core/admin/services/authClient.ts`

## Remediation Scope

This family must close all Users report rows:

| Finding | Required outcome |
|---|---|
| Frontend does not know effective permissions | Current user permission snapshot gates route, menu, toolbar, row actions, dialogs, and mutating controls before API submit. |
| `Reset password` is a no-op | Implement a real reset/set-password flow or disable/hide with clear product copy until the backend exists. |
| Invite User cannot create login-capable users | Implement a conscious invite/set-password contract so QA can create and log in as a user entirely through supported flows. |
| Filter icon has no handler | Connect it to advanced filters or remove/disable it with a tooltip. |
| Email notification switches are static | Persist through user preferences or render as read-only/coming-soon state. |
| Destructive user/role actions lack confirmation | Add confirm dialogs for deactivate, activate where risky, delete user, delete role, and duplicate/delete role cleanup paths. |
| Mobile details sheet lacks semantic title/description | Add `SheetTitle` and `SheetDescription` or visually hidden equivalents. |

## Sub-Tasks

### TASK-355-01: Current User Permission Propagation for Users

**Status:** To Do

Implementation shape:

- Extend the current-user bootstrap contract so admin UI can answer
  `can("users:read")`, `can("users:write")`, `can("roles:read")`, and
  `can("roles:write")` without guessing.
- Do not hardcode default write access in `UsersRolesPage`.
- Route-level access:
  - No `users:read` and no `roles:read`: show the shared Admin access-denied
    state instead of rendering the Users shell.
  - Read-only permissions: render list/cards read-only and hide/disable all
    write actions.
- Component-level access:
  - `Invite User`: require `users:write`.
  - `Edit user`, status toggle, reset password, delete user: require
    `users:write`.
  - `Create Role`, duplicate role, delete role, role editor save: require
    `roles:write`.

Pseudocode:

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
  return (permission: AdminPermission) => permissions.has(permission) || permissions.has("*");
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

1. Auth bootstrap loads the effective permission list from the backend.
2. `AdminApp` builds a stable `can(permission)` helper.
3. Sidebar and route guards use `can` to show/hide Users.
4. `UsersRolesPage` receives explicit access flags and never infers write
   access locally.
5. API 403 remains defense-in-depth and is surfaced as an error toast/alert.

Error handling:

- Missing permission snapshot must fail closed for write controls.
- A backend 403 after UI gating must show a clear "You no longer have
  permission" message and refresh the permission snapshot.

Regression tests:

- Vitest UI: restricted user sees read-only Users and no write controls.
- Vitest UI: admin user sees write controls.
- Playwright: restricted fixture can search/read but cannot open submit-ready
  create/edit/delete flows.
- Route registration/auth test: `/admin/api/auth/me` or equivalent current-user
  endpoint returns the permission snapshot with redacted user fields only.

### TASK-355-02: Reset Password and Login-Capable Invite Flow

**Status:** To Do

Implementation options must be decided explicitly before coding:

1. Preferred product flow: Invite sends a reset/set-password token and the UI
   displays a clear "Invitation sent" state.
2. Admin-set password flow: Role-protected admin can set a temporary password
   at invite time and optionally force password change on next login.
3. Temporary deferral: hide/disable reset and password fields with a tooltip
   until the backend contract exists.

Required behavior if implemented:

- `Reset password` opens a confirm dialog.
- Submit calls a real endpoint and shows success/error feedback.
- Invite User can create a login-capable user through a supported path; QA must
  no longer need a direct API fixture to activate/set password.
- Passwords or reset tokens must never be logged, cached, copied into reports,
  or returned after the one-time display boundary.

Pseudocode:

```ts
type ResetPasswordRequest = {
  userId: string;
  delivery: "email" | "one_time_token";
  forceChangeOnLogin?: boolean;
};

async function requestAdminPasswordReset(input: ResetPasswordRequest) {
  return apiRequest<ResetPasswordResult>(
    `/admin-users/${input.userId}/password-reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}
```

Regression tests:

- Service schema rejects unknown fields and missing `userId`.
- Route tests cover `users:write`, CSRF, and 403 without permission.
- UI tests cover confirm cancel, confirm submit success, and API error state.
- Playwright fixture creates a user through the UI and logs in without direct
  database/API mutation.

### TASK-355-03: Destructive Action Confirmation

**Status:** To Do

Add shared confirm flows for:

- Deactivate user.
- Activate user when re-enabling risky accounts.
- Delete user.
- Delete role.
- Duplicate role only when source permissions include `*` or high-risk scopes.

Implementation shape:

- Use the existing shared confirm dialog pattern if present.
- Dialog body must include the target name/email/role.
- Confirm button must be destructive for delete/deactivate.
- Cancel must not call the API.
- Confirm must call the existing client once and then refresh only the affected
  list/card state.

Regression tests:

- Cancel path asserts no client call.
- Confirm path asserts exact client payload.
- Restricted user cannot open destructive confirm.
- Playwright fixture verifies delete user/delete role cleanup still works.

### TASK-355-04: Filter and Notification Affordance Truthfulness

**Status:** To Do

User filters:

- Either connect the ghost filter button to an advanced filters drawer or remove
  it entirely.
- If a drawer is added, it must own stable state for status, role, and optional
  search facets and use the existing list reload path.
- The button must have an accessible name and visible active-filter count.

Notification switches:

- Either persist user notification preferences through a schema-first admin API
  or render the switches read-only with "managed elsewhere" copy.
- Static `defaultChecked` switches must not remain active-looking.

Pseudocode:

```ts
type UserAdvancedFilters = {
  status?: "active" | "inactive" | "invited";
  roleId?: string;
};

function buildAdminUsersQuery(query: string, filters: UserAdvancedFilters) {
  return rejectUnknownAndNormalize({
    query: query.trim() || undefined,
    status: filters.status,
    roleId: filters.roleId,
  });
}
```

Regression tests:

- Filter button opens/closes drawer or is absent.
- Active filters affect the API query and visible count.
- Notification controls are either persisted or disabled/read-only.

### TASK-355-05: Mobile Drawer Accessibility

**Status:** To Do

- Add `SheetTitle` and `SheetDescription` to the mobile user details sheet.
- If the visual design already has headings, use visually hidden title/desc to
  satisfy Radix semantics without duplicate visible text.
- Add a console-warning regression test for the mobile sheet open path.

## Security Contract

Route family: admin users and roles.

- Endpoint visibility: internal admin only (`/admin/api/admin-users*`,
  `/admin/api/admin-roles*`, password reset route if added).
- Auth model: authenticated admin session via existing admin auth middleware.
- RBAC:
  - Read endpoints require `users:read` / `roles:read`.
  - Writes require `users:write` / `roles:write`.
  - Password reset requires `users:write` plus explicit audit event.
- CSRF: required for all POST/PATCH/DELETE/PUT admin writes.
- Rate-limit bucket: admin write for mutations; auth-sensitive/password reset
  route should also use the auth/security-sensitive bucket if available.
- Reject unknown validation: all new request payloads schema-first and
  unknown-field rejecting.
- Anti-abuse: no public write endpoint. No nonce/HMAC/captcha required because
  routes are internal admin session routes.
- Secret handling: passwords/reset tokens may appear only in one-time server
  responses when explicitly designed; never in localStorage, reports, logs, or
  cache payloads.
- Audit: user status changes, delete user, delete role, duplicate role, invite,
  and reset-password actions must emit machine-readable audit events.

## Testing Requirements

Minimum validation for the implementation PR:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI suites for Users components.
- Targeted Bun route/service tests for admin users/roles/password reset routes.
- Playwright fixture test:
  - create role,
  - invite/create login-capable user,
  - restricted login sees read-only UI,
  - admin destructive actions require confirm,
  - cleanup succeeds.
- `bun run gates:coderso` if auth/RBAC release gates are touched.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/AUTH_SPEC.md` if current-user permission shape changes.
- `_docs/RBAC_SPEC.md` for permission propagation and reset-password role.
- `_docs/CMS_API.md` for new/changed admin user routes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1045-2026-06-01-task-355-admin-users-remediation-family.md`

## Acceptance Criteria

- Restricted users cannot see or trigger Users/Roles write actions in UI.
- Backend 403 remains covered for every write route.
- `Reset password` is no longer a silent no-op.
- Invite User has a supported path to create a login-capable user or clearly
  states why login is not available yet.
- Every active-looking control in `/admin/users` either works or is visibly
  disabled/read-only.
- Mobile details sheet opens without Radix title/description warnings.
- Report findings are updated with fix evidence and test commands.

