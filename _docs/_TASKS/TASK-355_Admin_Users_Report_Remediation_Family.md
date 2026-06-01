# TASK-355: Admin Users Report Remediation Family
# FileName: TASK-355_Admin_Users_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + RBAC + Users + Security UX + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-360-01 shared permission snapshot contract, TASK-360-02 shared confirm action pattern, TASK-360-04 no-op control gate, TASK-360-05 drawer/sheet accessibility gate, TASK-360-06 server-side query conventions, TASK-001 auth foundation, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md` audit evidence
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
- `core/admin/ui/roles/RoleEditor.tsx`
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

## Refinement Checklist

These refinements are part of the execution contract, not optional polish.

1. **Endpoint inventory:** before coding, list every route/client used by
   `UsersRolesPage` and classify it as read, write, destructive, or
   auth-sensitive. The implementation may not add UI gating without preserving
   backend RBAC tests for the same route.
2. **Fixture lifecycle:** the Playwright regression must create role/user,
   exercise restricted UI, exercise admin destructive cleanup, and assert no
   test records remain by stable unique email/role slug.
3. **Permission refresh:** when a write receives 403 after the UI allowed it,
   the page must refresh the permission snapshot instead of leaving stale
   controls active.
4. **Keyboard/a11y:** every new confirm/reset/invite flow must be operable by
   keyboard, preserve focus return, and expose title/description semantics.
5. **No placeholder replacement:** a disabled control is acceptable only when it
   has user-facing unavailable copy and a test asserting it cannot submit.
6. **Partial-read modes:** `/admin/users` must support `users:read` without
   `roles:read` and `roles:read` without `users:read` without triggering
   avoidable UI-originated 403s. Role cards, role filters, user rows, and empty
   states must degrade independently.

## Sub-Tasks

Physical execution leaves:

- `TASK-355-01_Current_User_Permission_Propagation_for_Users.md`
- `TASK-355-02_Reset_Password_and_Login_Capable_Invite_Flow.md`
- `TASK-355-03_Destructive_Action_Confirmation.md`
- `TASK-355-04_Filter_and_Notification_Affordance_Truthfulness.md`
- `TASK-355-05_Mobile_Drawer_Accessibility.md`

## Implementation Order

1. Consume the shared permission snapshot from `TASK-360-01` before changing
   Users UI controls; do not create a second local permission model.
2. Land the shared confirm, no-op, drawer a11y, and query conventions required
   by `TASK-360-02`, `TASK-360-04`, `TASK-360-05`, and `TASK-360-06` before
   closing the dependent Users leaves.
3. Add route/client tests for permission bootstrap and Users/Roles partial-read
   modes before hiding controls.
4. Implement reset/invite and destructive-confirm flows after write gating is
   in place, so restricted fixtures prove controls are unavailable before API
   submit.
5. Close filter/notification/mobile-a11y truthfulness once the security flows
   are stable.

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
- Partial-read mode:
  - `users:read` only: fetch users, hide role cards, replace role filter with
    unavailable copy, and display role names only when already included in the
    user payload.
  - `roles:read` only: fetch roles/cards, hide user table and invite controls,
    and show a "User list unavailable" read-only state.
  - neither read permission: access denied before any users/roles fetch.

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
- Vitest UI: `users:read` only and `roles:read` only modes do not call
  unauthorized clients.
- Playwright: restricted fixture can search/read but cannot open submit-ready
  create/edit/delete flows.
- Route registration/auth test: `/admin/api/auth/me` or equivalent current-user
  endpoint returns the permission snapshot with redacted user fields only.
- `mapAuthBootstrapError` or equivalent mapping covers permission snapshot
  failures as stable `auth_permission_snapshot_invalid` /
  `auth_permission_snapshot_forbidden` API errors.

Security Contract for permission bootstrap:

- Endpoint visibility: internal admin bootstrap (`GET /admin/api/auth/me` or
  equivalent).
- Auth model: authenticated admin session; anonymous users receive the existing
  unauthenticated response.
- RBAC: no additional permission required to read the caller's own effective
  permission snapshot, but payload is scoped to current user only.
- CSRF: not required for GET; route must remain read-only.
- Rate-limit bucket: `admin_read` for admin permission bootstrap reads, with
  in-flight client dedupe to avoid Settings-style `auth/me` request bursts.
- Reject unknown validation: no request body; query params rejected unless
  explicitly supported.
- Anti-abuse: internal session route only; no nonce/HMAC/captcha.
- Secret handling: no password hashes, reset tokens, session ids, cookies, API
  keys, or provider secrets in the response/cache/debug payload.
- Tests: route registration, unauthenticated response, authenticated redacted
  payload, stale/invalid permission source mapping, and client 403-refresh.

### TASK-355-02: Reset Password and Login-Capable Invite Flow

**Status:** To Do

Implementation decision:

- Use a set-password invitation flow. Admins do not type another user's
  password. Invite and reset actions create a single-use set-password token,
  deliver it by email when email is configured, and expose a one-time admin
  review state only in local/test mode if the product already supports that
  pattern. If delivery is unavailable, the UI must show a blocking error rather
  than silently creating a user who cannot log in.

Required behavior if implemented:

- `Reset password` opens a confirm dialog.
- Submit calls a real endpoint and shows success/error feedback.
- Invite User creates the user and sends a set-password invitation token in the
  same supported flow; QA must no longer need a direct API fixture to
  activate/set password.
- Passwords or reset tokens must never be logged, cached, copied into reports,
  or returned after the one-time display boundary.

Pseudocode:

```ts
type ResetPasswordRequest = {
  userId: string;
  delivery: "email";
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

type InviteUserRequest = {
  email: string;
  name?: string;
  roleIds: string[];
  sendSetPasswordInvite: true;
};

type SetPasswordRequest = {
  token: string;
  password: string;
};
```

Routes and client shape:

- `POST /admin/api/admin-users`
  - body: `InviteUserRequest`
  - creates invited/active-pending-password user and token transactionally.
- `POST /admin/api/admin-users/:id/password-reset`
  - body: `ResetPasswordRequest`
  - invalidates older outstanding set-password tokens and creates a new token.
- `POST /admin/api/auth/reset/confirm`
  - public token-confirm endpoint reused from the existing reset-password
    flow; admin client path is `/auth/reset/confirm`.
  - body: `SetPasswordRequest`.

Token rules:

- Single use.
- TTL: use the existing auth reset TTL setting.
- Store only hashed token server-side.
- Token errors map to `set_password_token_invalid`,
  `set_password_token_expired`, or `set_password_token_used`.
- Public endpoint is rate-limited and may add captcha only if existing auth
  reset flows already require it.

Regression tests:

- Service schema rejects unknown fields and missing `userId`.
- Route tests cover `users:write`, CSRF, and 403 without permission.
- Public set-password route tests cover TTL, single-use, token hash lookup,
  strict body validation, rate limit, and mapped token errors.
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
  status?: "active" | "inactive" | "pending";
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
- Rate-limit bucket: `admin_write` for mutations; public reset-confirm uses the
  existing `auth` bucket. A new security-sensitive bucket must be defined in
  `_docs/SECURITY_SPEC.md`, runtime bucket selection, route tests, and gates
  before this task depends on it.
- Reject unknown validation: all new request payloads schema-first and
  unknown-field rejecting.
- Anti-abuse: admin users/roles routes have no public write endpoint. No
  nonce/HMAC/captcha required because those routes are internal admin session
  routes; the public reset-confirm route is covered separately below.
- Secret handling: passwords/reset tokens may appear only in one-time server
  responses when explicitly designed; never in localStorage, reports, logs, or
  cache payloads.
- Audit: user status changes, delete user, delete role, duplicate role, invite,
  and reset-password actions must emit machine-readable audit events.

Set-password public endpoint contract:

- Endpoint visibility: public auth endpoint
  (`POST /admin/api/auth/reset/confirm` existing auth reset equivalent).
- Auth model: unauthenticated token bearer; authenticated sessions may use it
  only when token belongs to that account.
- RBAC: none; possession of a valid single-use token is the authorization
  factor.
- CSRF: not required for token-auth public write if existing reset-password
  route is CSRF-free; otherwise match the existing auth reset convention.
- Rate-limit bucket: existing `auth` bucket by IP and token hash.
- Reject unknown validation: strict body schema for `token` and `password`.
- Anti-abuse: unguessable nonce plus signature/HMAC-backed token, hashed at
  rest, single-use, TTL, optional captcha only if existing auth reset policy
  requires it.
- Secret handling: token never logged or cached; password is validated and
  hashed immediately.

## Testing Requirements

Minimum validation for the implementation PR:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI suites for Users components.
- Targeted Bun route/service tests for admin users/roles/password reset routes.
- Route registration tests and centralized `map*Error` coverage for
  `admin_user_invalid`, `admin_user_not_found`, `admin_user_conflict`,
  `admin_role_invalid`, `admin_role_not_found`, `admin_role_conflict`,
  `last_admin`, and set-password token errors.
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
- `docs/guide/screens/users.md` for read-only modes, invite/set-password,
  reset-password, and destructive confirmations.
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
- The final report explicitly states whether Invite User supports password,
  invitation reset token, or a disabled/unavailable state; no ambiguous partial
  login path remains.
