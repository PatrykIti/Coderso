# TASK-355-02: Reset Password and Login-Capable Invite Flow
# FileName: TASK-355-02_Reset_Password_and_Login_Capable_Invite_Flow.md

**Priority:** High
**Category:** Admin UI + Users + Auth + Security UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-355-01, TASK-360-02
**Status:** Done (2026-06-01)

---

## Overview

Replace the misleading Users `Reset password` behavior and non-login-capable
invite path with a real set-password invitation/reset contract. QA must be able
to create a user through supported UI, assign a role, set a password through
the supported flow, log in as that user, and verify RBAC behavior.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/users/InviteUserDialog.tsx`
- `core/admin/services/adminUsersClient.ts`
- Existing auth reset/password routes and services
- `_docs/AUTH_SPEC.md`
- `_docs/CMS_API.md`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Admin users route/service modules | Add schema-first invite and password-reset endpoints or wire existing equivalents. |
| Auth reset-confirm route/service modules | Reuse the existing public single-use token confirmation endpoint, externally `POST /admin/api/auth/reset/confirm` and client path `/auth/reset/confirm`. |
| Admin user schemas/services | Decide the legacy `password` field contract: deprecate/reject it for normal admin UI create/update or keep a tightly audited compatibility path with tests. |
| `core/admin/services/adminUsersClient.ts` | Add typed `inviteUserWithSetPassword` and `requestAdminPasswordReset` clients with CSRF for admin writes. |
| `core/admin/ui/users/InviteUserDialog.tsx` | Create a login-capable invited user and show delivery/blocking error states. |
| `core/admin/ui/users/UserDetailsDrawer.tsx` | Replace no-op reset with a real confirm + submit flow. |
| Route/service/UI tests | Cover schemas, token lifecycle, RBAC, CSRF, delivery failures, and UI states. |

## Implementation Pseudocode

```ts
type InviteUserRequest = {
  email: string;
  name?: string;
  roleIds: string[];
  sendSetPasswordInvite: true;
};

type ResetPasswordRequest = {
  userId: string;
  delivery: "email";
};

type SetPasswordRequest = {
  token: string;
  password: string;
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

Data flow:

- `POST /admin/api/admin-users` creates a `status: "pending"` user and a
  single-use set-password token transactionally; do not introduce a new
  invited or active-pending-password status unless the enum, schemas, docs, and
  migrations are explicitly updated.
- `POST /admin/api/admin-users/:id/password-reset` invalidates previous
  outstanding set-password tokens and creates a new token.
- Delivery uses email when configured; if delivery is unavailable, the UI shows
  a blocking error instead of pretending the user can log in.
- Existing `POST /admin/api/auth/reset/confirm` accepts the public token plus
  password, validates TTL/single-use/hash lookup, sets the password, and
  consumes token.

Error handling:

- Store only hashed tokens server-side.
- Token errors map to stable machine-readable errors:
  `set_password_token_invalid`, `set_password_token_expired`,
  `set_password_token_used`.
- Do not log, cache, copy to reports, or return passwords/reset tokens outside
  an explicitly designed one-time display boundary.
- Admins do not type another user's password.
- Existing `password` fields in admin user create/update schemas and services
  must be explicitly retired from normal UI flows or kept only behind a
  documented audited compatibility path; do not leave a silent parallel way to
  set another user's password.

## Security Contract

Admin invite/reset endpoints:

- Endpoint visibility: internal admin only, e.g. `/admin/api/admin-users*`.
- Auth model: authenticated admin session.
- RBAC: `users:write` required; password reset also emits an explicit audit
  event.
- CSRF: required for POST/PATCH/DELETE/PUT admin writes.
- Rate-limit bucket: `admin_write` for admin invite/reset-token generation.
  Public reset-confirm uses the existing `auth` bucket.
- Reject unknown validation: strict body schemas for invite and reset payloads.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: no password hashes or reset tokens in browser cache, logs,
  localStorage, reports, or debug payloads.

Public set-password endpoint:

- Endpoint visibility: public auth endpoint, e.g.
  `POST /admin/api/auth/reset/confirm` existing reset confirmation route.
- Auth model: unauthenticated token bearer; authenticated sessions may use it
  only when the token belongs to that account.
- RBAC: none; valid unguessable single-use token is the authorization factor.
- CSRF: match existing auth reset convention.
- Rate-limit bucket: existing `auth` bucket by IP and token hash.
- Reject unknown validation: strict `token` and `password` body schema.
- Anti-abuse: unguessable nonce plus signature/HMAC-backed token, hashed at
  rest, single-use, TTL, optional captcha only if existing reset policy requires
  it.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Service schema tests for unknown fields, missing `userId`, invalid role IDs,
  token TTL, single-use, and hash lookup.
- Bun route tests for `users:write`, CSRF, 403 without permission, delivery
  failure, and mapped token errors.
- Vitest UI tests for reset confirm cancel, submit success, submit error,
  invite delivery unavailable, and invite success.
- Playwright fixture creates a role, invites a user through UI, completes
  set-password, logs in as that user, verifies RBAC, then cleans up.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/AUTH_SPEC.md`
- `_docs/CMS_API.md`
- `docs/guide/screens/users.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- `Reset password` is no longer a no-op.
- Invite creates a user who can complete a supported set-password flow and log
  in.
- Tokens are single-use, TTL-bound, hashed at rest, and never leaked to client
  caches or reports.

## Completion Notes

- Added strict admin set-password delivery contracts:
  `POST /admin-users/invite` creates a pending user, creates a hashed
  single-use token, sends the token only in email body/link form, and returns
  delivery status without token data.
- Added `POST /admin-users/:id/password-reset` for admin-triggered reset email
  delivery with `users:write`, strict `{ delivery: "email" }` validation,
  centralized error mapping, and explicit audit events.
- Retired the normal admin HTTP `password` field from create/update schemas,
  client types, and service inputs; admins no longer type another user's
  password through Users UI.
- Reset tokens now invalidate previous outstanding tokens, remain hashed at
  rest, and classify invalid/expired/used states as
  `set_password_token_invalid`, `set_password_token_expired`, and
  `set_password_token_used`.
- Public reset requests now use configured email delivery instead of creating
  and discarding a token; reset-confirm activates only `pending` accounts while
  preserving explicit inactive accounts.
- Users UI now wires reset password through a confirm dialog and real API
  submit, removes the reset no-op marker, and keeps invite dialogs open on
  delivery errors.
- `UserEditor` create mode is no longer a separate invite-without-email path:
  new-user creation through that surface also sends a set-password invitation.
- Validation run:
  `bun run test:vitest -- tests/vitest/admin/adminUsersClient.test.ts tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui/invite-user.test.tsx tests/vitest/ui/user-editor-wave.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx`
- Validation run:
  `set -a && source .env && set +a && bun test tests/unit/auth/passwordResetService.test.ts tests/integration/routes/adminUsers.test.ts tests/integration/routes/auth.test.ts tests/unit/admin/usersService.test.ts tests/unit/email/emailSettingsService.test.ts`
- Validation run: `bun --cwd core lint`
- Validation run: `bun --cwd core lint:types`
- Validation run: `bun run gates:coderso`
- Advisory security scans run: `bun run scan:semgrep`,
  `bun run scan:trivy`, and `bun run scan:gitleaks:worktree`.
